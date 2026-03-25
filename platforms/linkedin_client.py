"""
LinkedIn client using stored OAuth 2.0 token from token_store.
Required app products: "Sign In with LinkedIn using OpenID Connect" + "Share on LinkedIn"
Redirect URI to register: http://localhost:8000/oauth/linkedin/callback
"""
from datetime import datetime
import urllib.parse
import requests
import config
import token_store
from platforms import ContentItem

API_HEADERS = {
    "LinkedIn-Version": "202405",
    "X-Restli-Protocol-Version": "2.0.0",
}


def _ts(ms) -> str:
    if not ms:
        return "unknown"
    try:
        return datetime.utcfromtimestamp(ms / 1000).strftime("%Y-%m-%d %H:%M UTC")
    except Exception:
        return "unknown"


def _get_access_token() -> str:
    token_data = token_store.get_token("linkedin")
    if not token_data or not token_data.get("access_token"):
        # Fallback to legacy env token
        if config.LINKEDIN_ACCESS_TOKEN:
            return config.LINKEDIN_ACCESS_TOKEN
        raise RuntimeError(
            "LinkedIn not connected. Open Settings and click 'Connect LinkedIn' to authorize."
        )
    return token_data["access_token"]


def _get_person_id(token: str) -> str:
    resp = requests.get(
        "https://api.linkedin.com/v2/userinfo",
        headers={"Authorization": f"Bearer {token}", **API_HEADERS},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json().get("sub", "")


def fetch_items(limit: int = None) -> list:
    if not config.LINKEDIN_CLIENT_ID or not config.LINKEDIN_CLIENT_SECRET:
        raise RuntimeError("LinkedIn Client ID / Secret not configured.")
    token = _get_access_token()
    items = []

    try:
        person_id = _get_person_id(token)
    except Exception as e:
        raise RuntimeError(f"LinkedIn: could not get profile — {e}")

    author_urn = f"urn:li:person:{person_id}"
    headers = {"Authorization": f"Bearer {token}", **API_HEADERS}

    try:
        start = 0
        count = min(limit or 100, 100)
        while True:
            resp = requests.get(
                "https://api.linkedin.com/rest/posts",
                headers=headers,
                params={"q": "author", "author": author_urn, "count": count, "start": start},
                timeout=30,
            )
            if resp.status_code == 403:
                print("[LinkedIn] 403 — app may need 'Share on LinkedIn' product enabled.")
                break
            resp.raise_for_status()
            batch = resp.json().get("elements", [])
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


def delete_item(item_id: str, content_type: str):
    token = _get_access_token()
    headers = {"Authorization": f"Bearer {token}", **API_HEADERS}
    encoded = urllib.parse.quote(item_id, safe="")
    resp = requests.delete(
        f"https://api.linkedin.com/rest/posts/{encoded}",
        headers=headers,
        timeout=30,
    )
    if resp.status_code == 204:
        return  # success
    resp.raise_for_status()
