"""
Local token storage — persists OAuth tokens to .tokens.json in the project root.
Never transmitted; only read/written by the local server process.
"""
import json
import os
from pathlib import Path

# DATA_DIR is /data on Fly.io (mounted volume), project root locally
TOKEN_FILE = Path(os.environ.get("DATA_DIR", str(Path(__file__).parent))) / ".tokens.json"


def _read() -> dict:
    if TOKEN_FILE.exists():
        try:
            return json.loads(TOKEN_FILE.read_text())
        except Exception:
            return {}
    return {}


def _write(data: dict):
    TOKEN_FILE.write_text(json.dumps(data, indent=2))


def get_token(platform: str):
    return _read().get(platform)


def set_token(platform: str, data: dict):
    tokens = _read()
    tokens[platform] = data
    _write(tokens)


def delete_token(platform: str):
    tokens = _read()
    tokens.pop(platform, None)
    _write(tokens)


def get_connected() -> dict:
    """Return {platform: True/False} for all platforms that have a stored token."""
    tokens = _read()
    return {p: bool(t) for p, t in tokens.items()}
