"""
OAuth 2.0 popup flow for Reddit, Twitter, LinkedIn, Facebook.

Popup pattern:
  1. Frontend opens window.open('/oauth/{platform}/start', ...)
  2. This endpoint redirects to the platform's authorization page
  3. Platform redirects back to /oauth/{platform}/callback
  4. Callback exchanges code → token, stores in token_store
  5. Returns HTML that posts a message to opener and closes itself
"""
import hashlib
import base64
import os
import secrets
import time
import urllib.parse
import requests

from fastapi import APIRouter
from fastapi.responses import HTMLResponse, RedirectResponse

import config
import token_store

router = APIRouter(prefix="/oauth")

# In-memory state store (only needed for the duration of the OAuth popup)
_pending: dict = {}   # state → {platform, code_verifier?, ...}

# APP_URL is set to https://<app>.fly.dev in production; defaults to localhost
_APP_URL = os.environ.get("APP_URL", "http://localhost:8000").rstrip("/")
CALLBACK_BASE = f"{_APP_URL}/oauth"


# ── Popup HTML helpers ────────────────────────────────────────────────────────

def _success_html(platform: str) -> HTMLResponse:
    return HTMLResponse(f"""<!DOCTYPE html><html><head>
<title>Connected</title>
<style>body{{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb}}
.box{{text-align:center;padding:2rem}}.check{{font-size:3rem}}</style></head>
<body><div class="box"><div class="check">✓</div>
<h2 style="margin:.5rem 0;color:#16a34a">Connected!</h2>
<p style="color:#6b7280;font-size:.875rem">You can close this window.</p></div>
<script>
  try {{ window.opener.postMessage({{type:'oauth_success',platform:'{platform}'}}, '*') }} catch(e) {{}}
  setTimeout(() => window.close(), 800)
</script></body></html>""")


def _error_html(platform: str, message: str) -> HTMLResponse:
    safe = message.replace("'", "\\'").replace("\n", " ")[:200]
    return HTMLResponse(f"""<!DOCTYPE html><html><head><title>Error</title>
<style>body{{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fef2f2}}</style></head>
<body><div style="text-align:center;padding:2rem">
<div style="font-size:3rem">✗</div>
<h2 style="color:#dc2626">Connection failed</h2>
<p style="color:#6b7280;font-size:.875rem">{message[:200]}</p></div>
<script>
  try {{ window.opener.postMessage({{type:'oauth_error',platform:'{platform}',message:'{safe}'}}, '*') }} catch(e) {{}}
  setTimeout(() => window.close(), 3000)
</script></body></html>""", status_code=200)


# ── Reddit ────────────────────────────────────────────────────────────────────

@router.get("/reddit/start")
def reddit_start():
    if not config.REDDIT_CLIENT_ID or not config.REDDIT_CLIENT_SECRET:
        return _error_html("reddit", "Reddit Client ID and Secret not configured. Add them in Settings first.")
    state = secrets.token_urlsafe(16)
    _pending[state] = {"platform": "reddit"}
    params = urllib.parse.urlencode({
        "client_id": config.REDDIT_CLIENT_ID,
        "response_type": "code",
        "state": state,
        "redirect_uri": f"{CALLBACK_BASE}/reddit/callback",
        "duration": "permanent",
        "scope": "identity history mysubreddits edit",
    })
    return RedirectResponse(f"https://www.reddit.com/api/v1/authorize?{params}")


@router.get("/reddit/callback")
def reddit_callback(code: str = None, state: str = None, error: str = None):
    if error:
        return _error_html("reddit", f"Reddit denied access: {error}")
    if not state or state not in _pending:
        return _error_html("reddit", "Invalid state — try connecting again.")
    _pending.pop(state)

    resp = requests.post(
        "https://www.reddit.com/api/v1/access_token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": f"{CALLBACK_BASE}/reddit/callback",
        },
        auth=(config.REDDIT_CLIENT_ID, config.REDDIT_CLIENT_SECRET),
        headers={"User-Agent": "visa_cleanup/1.0"},
        timeout=30,
    )
    if not resp.ok:
        return _error_html("reddit", f"Token exchange failed: {resp.text[:200]}")
    data = resp.json()
    token_store.set_token("reddit", {
        "access_token": data.get("access_token", ""),
        "refresh_token": data.get("refresh_token", ""),
        "expires_at": time.time() + data.get("expires_in", 3600) - 60,
    })
    return _success_html("reddit")


# ── Twitter / X ───────────────────────────────────────────────────────────────
# Uses OAuth 2.0 PKCE (required for user-context actions like delete/unlike)

def _pkce_pair():
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    return verifier, challenge


@router.get("/twitter/start")
def twitter_start():
    if not config.TWITTER_CLIENT_ID:
        return _error_html("twitter", "Twitter Client ID not configured. Add it in Settings first.")
    state = secrets.token_urlsafe(16)
    verifier, challenge = _pkce_pair()
    _pending[state] = {"platform": "twitter", "code_verifier": verifier}
    params = urllib.parse.urlencode({
        "response_type": "code",
        "client_id": config.TWITTER_CLIENT_ID,
        "redirect_uri": f"{CALLBACK_BASE}/twitter/callback",
        "scope": "tweet.read tweet.write like.read like.write users.read offline.access",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    })
    return RedirectResponse(f"https://twitter.com/i/oauth2/authorize?{params}")


@router.get("/twitter/callback")
def twitter_callback(code: str = None, state: str = None, error: str = None):
    if error:
        return _error_html("twitter", f"Twitter denied access: {error}")
    if not state or state not in _pending:
        return _error_html("twitter", "Invalid state — try connecting again.")
    pending = _pending.pop(state)

    resp = requests.post(
        "https://api.twitter.com/2/oauth2/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": f"{CALLBACK_BASE}/twitter/callback",
            "code_verifier": pending["code_verifier"],
            "client_id": config.TWITTER_CLIENT_ID,
        },
        auth=(config.TWITTER_CLIENT_ID, config.TWITTER_CLIENT_SECRET),
        timeout=30,
    )
    if not resp.ok:
        return _error_html("twitter", f"Token exchange failed: {resp.text[:200]}")
    data = resp.json()
    token_store.set_token("twitter", {
        "access_token": data.get("access_token", ""),
        "refresh_token": data.get("refresh_token", ""),
        "expires_at": time.time() + data.get("expires_in", 7200) - 60,
    })
    return _success_html("twitter")


# ── LinkedIn ──────────────────────────────────────────────────────────────────

@router.get("/linkedin/start")
def linkedin_start():
    if not config.LINKEDIN_CLIENT_ID or not config.LINKEDIN_CLIENT_SECRET:
        return _error_html("linkedin", "LinkedIn Client ID and Secret not configured. Add them in Settings first.")
    state = secrets.token_urlsafe(16)
    _pending[state] = {"platform": "linkedin"}
    params = urllib.parse.urlencode({
        "response_type": "code",
        "client_id": config.LINKEDIN_CLIENT_ID,
        "redirect_uri": f"{CALLBACK_BASE}/linkedin/callback",
        "scope": "openid profile r_member_social w_member_social",
        "state": state,
    })
    return RedirectResponse(f"https://www.linkedin.com/oauth/v2/authorization?{params}")


@router.get("/linkedin/callback")
def linkedin_callback(code: str = None, state: str = None, error: str = None, error_description: str = None):
    if error:
        return _error_html("linkedin", f"LinkedIn denied access: {error_description or error}")
    if not state or state not in _pending:
        return _error_html("linkedin", "Invalid state — try connecting again.")
    _pending.pop(state)

    resp = requests.post(
        "https://www.linkedin.com/oauth/v2/accessToken",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": f"{CALLBACK_BASE}/linkedin/callback",
            "client_id": config.LINKEDIN_CLIENT_ID,
            "client_secret": config.LINKEDIN_CLIENT_SECRET,
        },
        timeout=30,
    )
    if not resp.ok:
        return _error_html("linkedin", f"Token exchange failed: {resp.text[:200]}")
    data = resp.json()
    token_store.set_token("linkedin", {
        "access_token": data.get("access_token", ""),
        "expires_at": time.time() + data.get("expires_in", 5184000) - 60,
    })
    return _success_html("linkedin")


# ── Facebook ──────────────────────────────────────────────────────────────────

@router.get("/facebook/start")
def facebook_start():
    if not config.FACEBOOK_APP_ID or not config.FACEBOOK_APP_SECRET:
        return _error_html("facebook", "Facebook App ID and Secret not configured. Add them in Settings first.")
    state = secrets.token_urlsafe(16)
    _pending[state] = {"platform": "facebook"}
    params = urllib.parse.urlencode({
        "client_id": config.FACEBOOK_APP_ID,
        "redirect_uri": f"{CALLBACK_BASE}/facebook/callback",
        "scope": "public_profile,user_posts",
        "state": state,
        "response_type": "code",
    })
    return RedirectResponse(f"https://www.facebook.com/v17.0/dialog/oauth?{params}")


@router.get("/facebook/callback")
def facebook_callback(code: str = None, state: str = None, error: str = None, error_description: str = None):
    if error:
        return _error_html("facebook", f"Facebook denied access: {error_description or error}")
    if not state or state not in _pending:
        return _error_html("facebook", "Invalid state — try connecting again.")
    _pending.pop(state)

    # Exchange code for short-lived token
    resp = requests.get(
        "https://graph.facebook.com/v17.0/oauth/access_token",
        params={
            "client_id": config.FACEBOOK_APP_ID,
            "redirect_uri": f"{CALLBACK_BASE}/facebook/callback",
            "client_secret": config.FACEBOOK_APP_SECRET,
            "code": code,
        },
        timeout=30,
    )
    if not resp.ok:
        return _error_html("facebook", f"Token exchange failed: {resp.text[:200]}")
    short_token = resp.json().get("access_token", "")

    # Exchange for long-lived token (60 days)
    resp2 = requests.get(
        "https://graph.facebook.com/v17.0/oauth/access_token",
        params={
            "grant_type": "fb_exchange_token",
            "client_id": config.FACEBOOK_APP_ID,
            "client_secret": config.FACEBOOK_APP_SECRET,
            "fb_exchange_token": short_token,
        },
        timeout=30,
    )
    if resp2.ok:
        long_data = resp2.json()
        access_token = long_data.get("access_token", short_token)
        expires_in = long_data.get("expires_in", 5184000)
    else:
        access_token = short_token
        expires_in = 5184000

    token_store.set_token("facebook", {
        "access_token": access_token,
        "expires_at": time.time() + expires_in - 60,
    })
    return _success_html("facebook")


# ── Disconnect ────────────────────────────────────────────────────────────────

@router.delete("/{platform}")
def disconnect(platform: str):
    token_store.delete_token(platform)
    return {"ok": True, "platform": platform}
