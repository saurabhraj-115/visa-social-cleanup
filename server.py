"""
FastAPI server — serves the React UI and handles scan WebSocket sessions.
"""
import asyncio
import importlib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import os

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import config
import analyzer as anlz
import analyzer_interview as interview_anlz
import token_store
from oauth_routes import router as oauth_router
from platforms.oauth_flow import save_env_token

app = FastAPI()
app.include_router(oauth_router)
executor = ThreadPoolExecutor(max_workers=2)

# Allow Vite dev server in development; APP_URL covers the Fly.io domain in production
_app_url = os.environ.get("APP_URL", "")
_allowed_origins = ["http://localhost:5173", "http://localhost:5174"]
if _app_url:
    _allowed_origins.append(_app_url)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
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

# Credential keys that can be saved via /api/credentials
_CRED_KEYS = {
    "ANTHROPIC_API_KEY",
    "REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET",
    "TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET",
    "TWITTER_API_KEY", "TWITTER_API_SECRET",
    "FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET",
    "INSTAGRAM_USERNAME", "INSTAGRAM_PASSWORD",
    "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET",
}


@app.get("/api/status")
def get_status():
    """Return per-platform connection and credential status."""
    connected = token_store.get_connected()

    def _cfg(*keys):
        return all(bool(getattr(config, k, "").strip()) for k in keys)

    return {
        # True = OAuth token exists (or username/password for Instagram)
        "platforms": {
            "reddit":    connected.get("reddit", False),
            "twitter":   connected.get("twitter", False) or bool(token_store.get_token("twitter_browser")),
            "facebook":  connected.get("facebook", False),
            "instagram": connected.get("instagram_following", False) or _cfg("INSTAGRAM_USERNAME", "INSTAGRAM_PASSWORD"),
            "linkedin":  connected.get("linkedin", False),
        },
        # True = client_id/secret are saved (needed before OAuth popup)
        "credentials_configured": {
            "reddit":   _cfg("REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET"),
            "twitter":  _cfg("TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"),
            "facebook": _cfg("FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"),
            "linkedin": _cfg("LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"),
            "twitter_following": _cfg("TWITTER_API_KEY", "TWITTER_API_SECRET"),
        },
        "has_anthropic_key": bool(config.ANTHROPIC_API_KEY),
        "twitter_following_connected": connected.get("twitter_following", False),
        "twitter_browser_connected": bool(token_store.get_token("twitter_browser")),
    }


@app.post("/api/credentials")
def update_credentials(request: Request, body: dict):
    """Save non-empty credential values to .env and hot-reload config."""
    # Accept requests that come from our own frontend (browser enforces Origin header)
    # or carry a valid ADMIN_SECRET token for non-browser access.
    origin = request.headers.get("origin", "")
    admin_token = request.headers.get("x-admin-token", "")
    origin_ok = any(origin.startswith(o) for o in _allowed_origins) if origin else False
    token_ok = bool(config.ADMIN_SECRET and admin_token == config.ADMIN_SECRET)
    if not origin_ok and not token_ok:
        raise HTTPException(status_code=403, detail="Forbidden: valid Origin or X-Admin-Token required")

    from urllib.parse import unquote
    for key, value in body.items():
        if key in _CRED_KEYS and isinstance(value, str) and value.strip():
            clean = unquote(value.strip()).replace('\n', '').replace('\r', '')
            save_env_token(key, clean)
            os.environ[key] = clean
    importlib.reload(config)
    return get_status()


@app.post("/api/delete")
def delete_item(body: dict):
    """Delete or unlike a specific content item via its platform client."""
    platform = body.get("platform", "").lower()
    item_id = body.get("item_id", "")
    content_type = body.get("content_type", "")
    module_path = PLATFORM_MODULES.get(platform)
    if not module_path:
        return {"ok": False, "error": f"Unknown platform: {platform}"}
    try:
        module = importlib.import_module(module_path)
        module.delete_item(item_id, content_type)
        return {"ok": True}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


@app.post("/api/dossier")
def generate_dossier(body: dict):
    flagged = body.get("flagged", [])
    dossier = interview_anlz.generate_dossier(flagged)
    return {"dossier": dossier}


@app.post("/api/prep-package")
def generate_prep_package(body: dict):
    flagged = body.get("flagged", [])
    dossier = body.get("dossier", "")
    package = interview_anlz.generate_prep_package(dossier, flagged)
    return package


@app.post("/api/rewrite")
def rewrite_item(body: dict):
    rewritten = interview_anlz.rewrite_content(body)
    return {"rewritten": rewritten}


@app.post("/api/interview/question")
def get_interview_question(body: dict):
    dossier = body.get("dossier", "")
    history = body.get("history", [])
    flagged = body.get("flagged", [])
    question = interview_anlz.get_interview_question(dossier, history, flagged)
    return {"question": question}


@app.post("/api/interview/evaluate")
def evaluate_answer(body: dict):
    question = body.get("question", "")
    answer = body.get("answer", "")
    flagged_item = body.get("flagged_item")
    result = interview_anlz.evaluate_answer(question, answer, flagged_item)
    return result


@app.websocket("/ws/scan")
async def scan_ws(websocket: WebSocket):
    await websocket.accept()
    loop = asyncio.get_event_loop()

    try:
        payload = await websocket.receive_json()
        platforms: list[str] = payload.get("platforms", [])
        limit = payload.get("limit") or None
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


@app.websocket("/ws/twitter/following")
async def twitter_following_ws(websocket: WebSocket):
    """Stream following list fetch + bio scan results."""
    await websocket.accept()
    loop = asyncio.get_event_loop()
    try:
        from platforms import twitter_client as tc
        queue: asyncio.Queue = asyncio.Queue()
        _DONE = object()

        def run():
            try:
                def on_progress(count, phase):
                    loop.call_soon_threadsafe(queue.put_nowait, {
                        "type": "progress", "phase": phase, "count": count,
                    })

                accounts = tc.fetch_following(progress_cb=on_progress)
                loop.call_soon_threadsafe(queue.put_nowait, {
                    "type": "fetch_done", "total": len(accounts),
                })

                results = tc.scan_following(accounts)
                loop.call_soon_threadsafe(queue.put_nowait, {
                    "type": "done",
                    "red_flags": results["red_flags"],
                    "political": results["political"],
                    "journalists": results["journalists"],
                    "clean_count": len(results["clean"]),
                    "total": len(accounts),
                })
            except PermissionError as exc:
                loop.call_soon_threadsafe(queue.put_nowait, {"type": "session_expired", "error": str(exc)})
            except Exception as exc:
                loop.call_soon_threadsafe(queue.put_nowait, {"type": "error", "error": str(exc)})
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, _DONE)

        loop.run_in_executor(executor, run)

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


@app.get("/api/twitter/session-status")
def twitter_session_status():
    stored = token_store.get_token("twitter_browser")
    return {"stored": bool(stored and stored.get("cookies"))}


@app.post("/api/twitter/cookies")
def twitter_set_cookies(body: dict):
    """Accept a raw cookie dict from the Chrome extension and store it."""
    cookies = body.get("cookies", {})
    if not cookies.get("auth_token"):
        raise HTTPException(status_code=400, detail="auth_token not found in cookies — make sure you're logged in to X/Twitter")
    if not cookies.get("ct0"):
        raise HTTPException(status_code=400, detail="ct0 (CSRF token) not found in cookies")
    token_store.set_token("twitter_browser", {"cookies": cookies})
    # Extract user_id from twid cookie — value may be URL-encoded: "u%3D123" or plain "u=123"
    from urllib.parse import unquote
    import re as _re
    twid = unquote(cookies.get("twid", ""))
    m = _re.match(r"u=(\d+)", twid)
    user_id = m.group(1) if m else None
    return {"ok": True, "user_id": user_id}


@app.get("/api/instagram/session-status")
def instagram_session_status():
    stored = token_store.get_token("instagram_following")
    return {"stored": bool(stored and stored.get("cookies"))}


@app.post("/api/instagram/cookies")
def instagram_set_cookies(body: dict):
    """Accept a raw cookie dict from the Chrome extension and store it."""
    cookies = body.get("cookies", {})
    if not cookies.get("sessionid"):
        raise HTTPException(status_code=400, detail="sessionid not found in cookies")
    if not cookies.get("ds_user_id"):
        raise HTTPException(status_code=400, detail="ds_user_id not found in cookies")
    token_store.set_token("instagram_following", {"cookies": cookies})
    return {"ok": True, "user_id": cookies.get("ds_user_id")}


@app.post("/api/instagram/parse-curl")
def instagram_parse_curl(request: Request, body: dict):
    """Parse a cURL command, extract cookies, store server-side, return user info."""
    origin = request.headers.get("origin", "")
    if not any(origin.startswith(o) for o in _allowed_origins):
        raise HTTPException(status_code=403, detail="Forbidden")
    curl_text = body.get("curl", "")
    if not curl_text:
        raise HTTPException(status_code=400, detail="curl field required")
    try:
        from platforms import instagram_client as igc
        cookies = igc.parse_cookies_from_curl(curl_text)
        token_store.set_token("instagram_following", {"cookies": cookies})
        return {"ok": True, "user_id": cookies.get("ds_user_id")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.websocket("/ws/instagram/following")
async def instagram_following_ws(websocket: WebSocket):
    """Stream Instagram following fetch + bio scan."""
    await websocket.accept()
    loop = asyncio.get_event_loop()
    try:
        from platforms import instagram_client as igc
        stored = token_store.get_token("instagram_following")
        if not stored or not stored.get("cookies"):
            await websocket.send_json({"type": "error", "error": "No Instagram session — paste a cURL first."})
            return

        cookies = stored["cookies"]
        queue: asyncio.Queue = asyncio.Queue()
        _DONE = object()

        def run():
            try:
                def on_following(count, _phase):
                    loop.call_soon_threadsafe(queue.put_nowait, {
                        "type": "progress", "phase": "following", "count": count,
                    })

                accounts = igc.fetch_following_ig(cookies, progress_cb=on_following)
                loop.call_soon_threadsafe(queue.put_nowait, {
                    "type": "fetch_done", "total": len(accounts),
                })

                def on_bio(current, total):
                    loop.call_soon_threadsafe(queue.put_nowait, {
                        "type": "bio_progress", "current": current, "total": total,
                    })

                results = igc.scan_following_ig(accounts, cookies, progress_cb=on_bio)
                loop.call_soon_threadsafe(queue.put_nowait, {
                    "type": "done",
                    "red_flags": results["red_flags"],
                    "political": results["political"],
                    "journalists": results["journalists"],
                    "clean_count": len(results["clean"]),
                    "total": len(accounts),
                })
            except PermissionError as exc:
                loop.call_soon_threadsafe(queue.put_nowait, {"type": "session_expired", "error": str(exc)})
            except Exception as exc:
                loop.call_soon_threadsafe(queue.put_nowait, {"type": "error", "error": str(exc)})
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, _DONE)

        loop.run_in_executor(executor, run)

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


@app.post("/api/instagram/unfollow")
async def instagram_unfollow(body: dict):
    pks = body.get("pks", [])
    if not pks:
        return {"ok": False, "error": "No pks provided"}
    stored = token_store.get_token("instagram_following")
    if not stored or not stored.get("cookies"):
        return {"ok": False, "error": "No Instagram session — paste a cURL first."}
    cookies = stored["cookies"]
    from platforms import instagram_client as igc
    try:
        results = await asyncio.get_event_loop().run_in_executor(
            executor, lambda: igc.unfollow_users_ig(pks, cookies)
        )
        succeeded = sum(1 for r in results if r["ok"])
        return {"ok": True, "succeeded": succeeded, "failed": len(results) - succeeded, "results": results}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


@app.post("/api/twitter/unfollow")
async def twitter_unfollow(body: dict):
    user_ids = body.get("user_ids", [])
    if not user_ids:
        return {"ok": False, "error": "No user IDs provided"}
    from platforms import twitter_client as tc
    try:
        results = await asyncio.get_event_loop().run_in_executor(
            executor, lambda: tc.unfollow_users(user_ids)
        )
        succeeded = sum(1 for r in results if r["ok"])
        return {"ok": True, "succeeded": succeeded, "failed": len(results) - succeeded, "results": results}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


# Serve built frontend in production (after `npm run build`)
_dist = Path("frontend/dist")
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
