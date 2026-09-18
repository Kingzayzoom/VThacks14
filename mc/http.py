"""One shared HTTP client per process.

Creating an httpx client loads the TLS certificate bundle, which costs ~300 ms on some
machines. Reusing a single client keeps every call fast and reuses connections.
"""
import httpx

_client: httpx.AsyncClient | None = None


def client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=30,
            limits=httpx.Limits(max_connections=200, max_keepalive_connections=50),
        )
    return _client
