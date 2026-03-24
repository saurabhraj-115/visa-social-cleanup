"""
FastAPI server — serves the React UI and handles scan WebSocket sessions.
"""
import asyncio
import importlib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import os

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import config
import analyzer as anlz
from platforms.oauth_flow import save_env_token

app = FastAPI()
executor = ThreadPoolExecutor(max_workers=2)

# Allow Vite dev server to call the API during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

PLATFORM_MODULES = {
    "reddit": "platforms.reddit_client",
    "twitter": "platforms.twitter_client",
    "facebook": "platforms.facebook_client",
    "instagram": "platforms.instagram_client",
    "linkedin": "platforms.linkedin_client",
}

CREDENTIAL_VARS = {
    "reddit": ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET"],
    "twitter": ["TWITTER_BEARER_TOKEN", "TWITTER_USERNAME"],
    "facebook": ["FACEBOOK_ACCESS_TOKEN"],
    "instagram": ["INSTAGRAM_USERNAME", "INSTAGRAM_PASSWORD"],
    "linkedin": ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
}


_ALL_CRED_KEYS = {k for vars in CREDENTIAL_VARS.values() for k in vars} | {"ANTHROPIC_API_KEY"}


@app.get("/api/status")
def get_status():
    """Return per-platform configuration status."""
    def _is_set(val):
        return bool(getattr(config, val, "").strip())

    platforms = {
        p: all(_is_set(v) for v in vars)
        for p, vars in CREDENTIAL_VARS.items()
    }
    keys_set = {k: _is_set(k) for k in _ALL_CRED_KEYS}
    return {
        "platforms": platforms,
        "has_anthropic_key": bool(config.ANTHROPIC_API_KEY),
        "keys_set": keys_set,
    }


@app.post("/api/credentials")
def update_credentials(body: dict):
    """Save non-empty credential values to .env and hot-reload config."""
    from urllib.parse import unquote
    for key, value in body.items():
        if key in _ALL_CRED_KEYS and isinstance(value, str) and value.strip():
            # Decode URL-encoded chars, strip whitespace and newlines to prevent .env corruption
            clean = unquote(value.strip()).replace('\n', '').replace('\r', '')
            save_env_token(key, clean)
            os.environ[key] = clean
    importlib.reload(config)
    return get_status()


@app.websocket("/ws/scan")
async def scan_ws(websocket: WebSocket):
    await websocket.accept()
    loop = asyncio.get_event_loop()

    try:
        payload = await websocket.receive_json()
        platforms: list[str] = payload.get("platforms", [])
        limit: int | None = payload.get("limit") or None
        severity: str = payload.get("severity", "medium")

        queue: asyncio.Queue = asyncio.Queue()
        _DONE = object()  # sentinel

        def run_scan():
            try:
                all_items = []

                # ── Phase 1: fetch ──────────────────────────────────────────
                for platform in platforms:
                    loop.call_soon_threadsafe(
                        queue.put_nowait,
                        {"type": "fetch_start", "platform": platform},
                    )
                    try:
                        module = importlib.import_module(PLATFORM_MODULES[platform])
                        items = module.fetch_items(limit=limit)
                    except Exception as exc:
                        items = []
                        loop.call_soon_threadsafe(
                            queue.put_nowait,
                            {"type": "fetch_error", "platform": platform, "error": str(exc)},
                        )
                    all_items.extend(items)
                    loop.call_soon_threadsafe(
                        queue.put_nowait,
                        {"type": "fetch_done", "platform": platform, "count": len(items)},
                    )

                if not all_items:
                    loop.call_soon_threadsafe(
                        queue.put_nowait,
                        {"type": "done", "flagged": [], "total_analyzed": 0},
                    )
                    return

                # ── Phase 2: analyze ────────────────────────────────────────
                loop.call_soon_threadsafe(
                    queue.put_nowait,
                    {"type": "analyze_start", "total": len(all_items)},
                )

                severity_order = {"high": 2, "medium": 1, "low": 0}
                min_sev = severity_order.get(severity, 1)

                def on_progress(current, total, item, result):
                    is_flagged = result.flag and severity_order.get(result.severity, 0) >= min_sev
                    loop.call_soon_threadsafe(
                        queue.put_nowait,
                        {
                            "type": "analyze_progress",
                            "current": current,
                            "total": total,
                            "platform": item.platform,
                            "flagged": is_flagged,
                        },
                    )

                content_analyzer = anlz.ContentAnalyzer()
                pairs = content_analyzer.analyze_batch(all_items, progress_callback=on_progress)

                flagged = []
                for item, result in pairs:
                    if result.flag and severity_order.get(result.severity, 0) >= min_sev:
                        flagged.append(
                            {
                                "platform": item.platform,
                                "content_type": item.content_type,
                                "text": item.text,
                                "url": item.url,
                                "created_at": item.created_at,
                                "item_id": item.item_id,
                                "severity": result.severity,
                                "reason": result.reason,
                            }
                        )

                flagged.sort(
                    key=lambda x: severity_order.get(x["severity"], 0), reverse=True
                )
                loop.call_soon_threadsafe(
                    queue.put_nowait,
                    {
                        "type": "done",
                        "flagged": flagged,
                        "total_analyzed": len(all_items),
                    },
                )

            except Exception as exc:
                loop.call_soon_threadsafe(
                    queue.put_nowait, {"type": "error", "error": str(exc)}
                )
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, _DONE)

        loop.run_in_executor(executor, run_scan)

        # Forward queue → WebSocket until sentinel arrives
        while True:
            msg = await queue.get()
            if msg is _DONE:
                break
            await websocket.send_json(msg)

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json({"type": "error", "error": str(exc)})
        except Exception:
            pass


# Serve built frontend in production (after `npm run build`)
_dist = Path("frontend/dist")
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
