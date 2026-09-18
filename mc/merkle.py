"""Merkle tree helpers for the transparency log (RFC 6962 / RFC 9162 style).

Each log entry becomes a leaf. The tree root summarizes every entry; an inclusion
proof ("receipt") shows a given entry is in the tree without trusting the log operator.
"""
import hashlib

from . import crypto


def leaf_hash(entry: dict) -> bytes:
    return hashlib.sha256(b"\x00" + crypto.canonical(entry)).digest()


def _node(left: bytes, right: bytes) -> bytes:
    return hashlib.sha256(b"\x01" + left + right).digest()


def _split(n: int) -> int:
    """Largest power of two strictly less than n."""
    k = 1
    while k * 2 < n:
        k *= 2
    return k


def root(leaves: list[bytes]) -> bytes:
    n = len(leaves)
    if n == 0:
        return hashlib.sha256(b"").digest()
    if n == 1:
        return leaves[0]
    k = _split(n)
    return _node(root(leaves[:k]), root(leaves[k:]))


def inclusion_path(index: int, leaves: list[bytes]) -> list[bytes]:
    n = len(leaves)
    if n <= 1:
        return []
    k = _split(n)
    if index < k:
        return inclusion_path(index, leaves[:k]) + [root(leaves[k:])]
    return inclusion_path(index - k, leaves[k:]) + [root(leaves[:k])]


def verify_inclusion(leaf: bytes, index: int, tree_size: int, path: list[bytes], expected_root: bytes) -> bool:
    """RFC 9162 section 2.1.3.2."""
    if index >= tree_size:
        return False
    fn, sn, r = index, tree_size - 1, leaf
    for p in path:
        if sn == 0:
            return False
        if fn & 1 or fn == sn:
            r = _node(p, r)
            while not fn & 1 and fn != 0:
                fn >>= 1
                sn >>= 1
        else:
            r = _node(r, p)
        fn >>= 1
        sn >>= 1
    return sn == 0 and r == expected_root


def checkpoint_body(tree_size: int, root_hex: str) -> dict:
    return {"tree_size": tree_size, "root_hash": root_hex}


def verify_receipt(receipt: dict, log_public_key_pem: str) -> tuple[bool, str]:
    """Check a receipt from the log: the entry is in the tree, and the log signed that tree."""
    try:
        entry = receipt["entry"]
        cp = receipt["checkpoint"]
        path = [bytes.fromhex(h) for h in receipt["audit_path"]]
        tree_root = bytes.fromhex(cp["root_hash"])
        if not verify_inclusion(leaf_hash(entry), entry["index"], cp["tree_size"], path, tree_root):
            return False, "inclusion proof does not match the signed tree root"
        public_key = crypto.load_public_key(log_public_key_pem)
        body = crypto.canonical(checkpoint_body(cp["tree_size"], cp["root_hash"]))
        if not crypto.verify(public_key, body, cp["signature"]):
            return False, "tree root is not signed by the transparency log"
        return True, f"entry #{entry['index']} is in the signed log (size {cp['tree_size']})"
    except (KeyError, ValueError, TypeError) as exc:
        return False, f"malformed receipt ({exc})"
