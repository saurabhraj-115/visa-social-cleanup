"""
LinkedIn client using OAuth 2.0.

Required LinkedIn app products (add in your app's Products tab):
  • "Sign In with LinkedIn using OpenID Connect"  → profile + openid scopes
  • "Share on LinkedIn"                           → r_member_social scope (read posts)

Set redirect URI to: http://localhost:8080 in your app's Auth settings.
"""
from datetime import datetime
import requests
import config
from platforms import ContentItem
from platforms.oauth_flow import get_auth_code, save_env_token

AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
REDIRECT_URI = "http://localhost:8080"
SCOPES = "openid profile r_member_social"
API_HEADERS = {
    "LinkedIn-Version": "202405",
    "X-Restli-Protocol-Version": "2.0.0",
}


def _ts(ms: int | None) -> str:
    if not ms:
        return "unknown"
    try:
        return datetime.utcfromtimestamp(ms / 1000).strftime("%Y-%m-%d %H:%M UTC")
    except Exception:
        return "unknown"


def _get_access_token() -> str:
    """Return a cached access token or run the OAuth flow to get one."""
    if config.LINKEDIN_ACCESS_TOKEN:
        return config.LINKEDIN_ACCESS_TOKEN

    import urllib.parse
    import secrets

    state = secrets.token_urlsafe(16)
    params = {
        "response_type": "code",
        "client_id": config.LINKEDIN_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "state": state,
    }
    auth_url = f"{AUTH_URL}?{urllib.parse.urlencode(params)}"
    callback = get_auth_code(auth_url)

    if "error" in callback:
        raise RuntimeError(f"LinkedIn OAuth error: {callback['error']} — {callback.get('error_description', '')}")
    if callback.get("state") != state:
        raise RuntimeError("LinkedIn OAuth: state mismatch (possible CSRF)")
    if "code" not in callback:
        raise RuntimeError(f"LinkedIn OAuth: unexpected redirect params: {callback}")

    # Exchange code for access token
    resp = requests.post(TOKEN_URL, data={
        "grant_type": "authorization_code",
        "code": callback["code"],
        "redirect_uri": REDIRECT_URI,
        "client_id": config.LINKEDIN_CLIENT_ID,
        "client_secret": config.LINKEDIN_CLIENT_SECRET,
    }, timeout=30)
    resp.raise_for_status()
    token_data = resp.json()
    access_token = token_data["access_token"]

    save_env_token("LINKEDIN_ACCESS_TOKEN", access_token)
    print("[LinkedIn] Access token saved to .env — won't need to log in again.")
    return access_token


def _get_person_id(token: str) -> str:
    """Return the authenticated user's LinkedIn person URN ID."""
    resp = requests.get(
        "https://api.linkedin.com/v2/userinfo",
        headers={"Authorization": f"Bearer {token}", **API_HEADERS},
        timeout=30,
    )
    resp.raise_for_status()
    sub = resp.json().get("sub", "")  # sub is the person URN ID
    return sub


def fetch_items(limit: int = None) -> list[ContentItem]:
    if not config.LINKEDIN_CLIENT_ID or not config.LINKEDIN_CLIENT_SECRET:
        raise RuntimeError("LinkedIn credentials not configured")
    try:
        token = _get_access_token()
    except Exception as e:
        print(f"[LinkedIn] Auth failed: {e}")
        return []

    items: list[ContentItem] = []

    try:
        person_id = _get_person_id(token)
    except Exception as e:
        print(f"[LinkedIn] Could not fetch profile: {e}")
        return []

    author_urn = f"urn:li:person:{person_id}"
    headers = {"Authorization": f"Bearer {token}", **API_HEADERS}

    # Fetch own posts via Posts API (requires r_member_social scope)
    try:
        start = 0
        count = min(limit or 100, 100)
        while True:
            resp = requests.get(
                "https://api.linkedin.com/rest/posts",
                headers=headers,
                params={
                    "q": "author",
                    "author": author_urn,
                    "count": count,
                    "start": start,
                },
                timeout=30,
            )
            if resp.status_code == 403:
                print(
                    "[LinkedIn] 403 Forbidden on posts — your app may need the "
                    "'Share on LinkedIn' product enabled to get r_member_social scope."
                )
                break
            resp.raise_for_status()
            data = resp.json()
            batch = data.get("elements", [])
            if not batch:
                break

            for post in batch:
                text = (
                    post.get("commentary", "")
                    or post.get("specificContent", {})
                       .get("com.linkedin.ugc.ShareContent", {})
                       .get("shareCommentary", {})
                       .get("text", "")
                    or ""
                )
                if not text:
                    continue
                urn = post.get("id", "")
                created_ms = post.get("publishedAt") or post.get("createdAt")
                items.append(ContentItem(
                    platform="LinkedIn",
                    content_type="post",
                    text=text,
                    url=f"https://www.linkedin.com/feed/update/{urn}/",
                    created_at=_ts(created_ms),
                    item_id=urn,
                ))
                if limit and len(items) >= limit:
                    return items

            start += len(batch)
            if len(batch) < count:
                break
    except Exception as e:
        print(f"[LinkedIn] Could not fetch posts: {e}")

    return items
