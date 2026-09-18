"""Keys, CSRs, certificates and signatures (ECDSA P-256 / ES256)."""
import base64
import datetime as dt
import hashlib
import json
import secrets

from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID


def canonical(obj) -> bytes:
    """Deterministic JSON bytes, so both sides sign and verify exactly the same thing."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# --- keys -------------------------------------------------------------------

def new_key() -> ec.EllipticCurvePrivateKey:
    return ec.generate_private_key(ec.SECP256R1())


def key_to_pem(key) -> str:
    return key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()


def load_key(pem: str):
    return serialization.load_pem_private_key(pem.encode(), password=None)


def public_key_to_pem(public_key) -> str:
    return public_key.public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()


def load_public_key(pem: str):
    return serialization.load_pem_public_key(pem.encode())


# --- signatures ---------------------------------------------------------------

def sign(key, data: bytes) -> str:
    return base64.b64encode(key.sign(data, ec.ECDSA(hashes.SHA256()))).decode()


def verify(public_key, data: bytes, signature_b64: str) -> bool:
    try:
        public_key.verify(base64.b64decode(signature_b64), data, ec.ECDSA(hashes.SHA256()))
        return True
    except (InvalidSignature, ValueError, TypeError):
        return False


# --- CSRs and certificates ----------------------------------------------------

def make_csr(key, ans_name: str, host: str) -> str:
    csr = (
        x509.CertificateSigningRequestBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, host)]))
        .add_extension(x509.SubjectAlternativeName([x509.UniformResourceIdentifier(ans_name)]), critical=False)
        .sign(key, hashes.SHA256())
    )
    return csr.public_bytes(serialization.Encoding.PEM).decode()


def load_csr(pem: str) -> x509.CertificateSigningRequest:
    return x509.load_pem_x509_csr(pem.encode())


def load_cert(pem: str) -> x509.Certificate:
    return x509.load_pem_x509_certificate(pem.encode())


def cert_to_pem(cert: x509.Certificate) -> str:
    return cert.public_bytes(serialization.Encoding.PEM).decode()


def cert_fingerprint(cert: x509.Certificate) -> str:
    return "sha256:" + cert.fingerprint(hashes.SHA256()).hex()


def cert_uris(cert: x509.Certificate) -> list[str]:
    try:
        san = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName)
    except x509.ExtensionNotFound:
        return []
    return san.value.get_values_for_type(x509.UniformResourceIdentifier)


def cert_issued_by(cert: x509.Certificate, ca_cert: x509.Certificate) -> bool:
    try:
        ca_cert.public_key().verify(
            cert.signature, cert.tbs_certificate_bytes, ec.ECDSA(cert.signature_hash_algorithm)
        )
        return cert.issuer == ca_cert.subject
    except (InvalidSignature, ValueError, TypeError):
        return False


def cert_valid_now(cert: x509.Certificate) -> bool:
    now = dt.datetime.now(dt.timezone.utc)
    return cert.not_valid_before_utc <= now <= cert.not_valid_after_utc


def make_ca(common_name: str) -> tuple:
    key = new_key()
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, common_name)])
    now = dt.datetime.now(dt.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - dt.timedelta(minutes=1))
        .not_valid_after(now + dt.timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
        .sign(key, hashes.SHA256())
    )
    return key, cert


def issue_cert(ca_key, ca_cert: x509.Certificate, csr_pem: str, days: int = 30) -> x509.Certificate:
    csr = load_csr(csr_pem)
    if not csr.is_signature_valid:
        raise ValueError("CSR signature is invalid")
    san = csr.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    now = dt.datetime.now(dt.timezone.utc)
    return (
        x509.CertificateBuilder()
        .subject_name(csr.subject)
        .issuer_name(ca_cert.subject)
        .public_key(csr.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - dt.timedelta(minutes=1))
        .not_valid_after(now + dt.timedelta(days=days))
        .add_extension(san, critical=False)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.ExtendedKeyUsage([ExtendedKeyUsageOID.CLIENT_AUTH, ExtendedKeyUsageOID.SERVER_AUTH]),
            critical=False,
        )
        .sign(ca_key, hashes.SHA256())
    )


def nonce() -> str:
    return secrets.token_hex(16)
