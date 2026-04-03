"""
Attorney Mode — client management for immigration lawyers.

Clients are stored as JSON files in the `clients/` directory,
one file per client: clients/{uuid}.json
"""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

CLIENTS_DIR = Path("clients")


def _ensure_dir():
    CLIENTS_DIR.mkdir(exist_ok=True)


def _client_path(client_id: str) -> Path:
    return CLIENTS_DIR / f"{client_id}.json"


def _load(client_id: str) -> dict:
    path = _client_path(client_id)
    if not path.exists():
        raise FileNotFoundError(f"Client {client_id} not found")
    return json.loads(path.read_text())


def _save(client: dict):
    _ensure_dir()
    _client_path(client["id"]).write_text(json.dumps(client, indent=2))


def list_clients() -> list[dict]:
    _ensure_dir()
    clients = []
    for path in sorted(CLIENTS_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            clients.append(json.loads(path.read_text()))
        except Exception:
            pass
    return clients


def get_client(client_id: str) -> dict:
    return _load(client_id)


def create_client(name: str, email: str = "") -> dict:
    _ensure_dir()
    client = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "scans": [],
        "cleared": False,
    }
    _save(client)
    return client


def save_scan_to_client(client_id: str, scan_data: dict) -> dict:
    """Append a scan result to a client's history and recompute cleared status."""
    client = _load(client_id)
    scan = {
        "scan_date": datetime.now(timezone.utc).isoformat(),
        "flagged_items": scan_data.get("flagged_items", []),
        "total_analyzed": scan_data.get("total_analyzed", 0),
        "visa_ready_score": scan_data.get("visa_ready_score"),
        "dossier": scan_data.get("dossier", ""),
    }
    client["scans"].insert(0, scan)  # most recent first
    # Mark cleared if latest score is ≥80
    score = scan.get("visa_ready_score")
    if isinstance(score, (int, float)):
        client["cleared"] = score >= 80
    _save(client)
    return client


def delete_client(client_id: str) -> None:
    path = _client_path(client_id)
    if not path.exists():
        raise FileNotFoundError(f"Client {client_id} not found")
    path.unlink()
