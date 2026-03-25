"""
Shared OAuth helper: opens the user's browser for authorization, starts a
temporary local HTTP server to catch the redirect, and returns the query
parameters (typically 'code' and 'state').
"""
import os
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse


class _CallbackHandler(BaseHTTPRequestHandler):
    params: dict = {}

    def do_GET(self):
        parsed = urlparse(self.path)
        _CallbackHandler.params = {k: v[0] for k, v in parse_qs(parsed.query).items()}
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(b"<h2>Authorization complete &mdash; you can close this tab.</h2>")

    def log_message(self, *args):
        pass  # suppress server output


def get_auth_code(auth_url: str, port: int = 8080) -> dict:
    """
    Open *auth_url* in the default browser, wait for the OAuth redirect to
    http://localhost:<port>, and return the parsed query parameters.

    Raises RuntimeError if no redirect is received within 2 minutes.
    """
    _CallbackHandler.params = {}
    server = HTTPServer(("localhost", port), _CallbackHandler)
    server.timeout = 120

    print(f"\nOpening browser for authorization...")
    webbrowser.open(auth_url)
    print(f"Waiting for redirect on http://localhost:{port}/ (timeout: 2 min)...")

    server.handle_request()
    server.server_close()

    if not _CallbackHandler.params:
        raise RuntimeError("No redirect received. Did you approve access in the browser?")
    return _CallbackHandler.params


def save_env_token(key: str, value: str, env_path: str = None) -> None:
    """Write or update a single KEY=value line in the .env file.
    Uses DATA_DIR if set (Fly.io volume), otherwise project root."""
    from pathlib import Path
    if env_path is None:
        data_dir = os.environ.get("DATA_DIR", str(Path(__file__).parent.parent))
        env_path = os.path.join(data_dir, ".env")

    lines: list[str] = []
    if os.path.exists(env_path):
        with open(env_path) as f:
            lines = f.readlines()

    for i, line in enumerate(lines):
        if line.startswith(f"{key}="):
            lines[i] = f"{key}={value}\n"
            break
    else:
        lines.append(f"{key}={value}\n")

    os.makedirs(os.path.dirname(env_path), exist_ok=True)
    with open(env_path, "w") as f:
        f.writelines(lines)
