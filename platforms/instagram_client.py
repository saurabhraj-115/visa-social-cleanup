import re
import time
import requests as _requests
from instagrapi import Client
from instagrapi.exceptions import LoginRequired
import config
import token_store
from platforms import ContentItem

# ── Instagram web app ID (hardcoded — Instagram's own web client ID) ───────────
_IG_APP_ID = "936619743392459"

# ── Detection patterns ─────────────────────────────────────────────────────────
_PATTERNS = {
    "anti_us": [
        r"\banti[- ]americ", r"\bdeath to america\b", r"\bfuck america\b",
        r"\bdown with (usa|america|us imperialism)\b",
        r"\bamerica is (evil|cancer|terrorist)\b", r"\bus imperialism\b",
    ],
    "political_extremism": [
        r"\bjihad\b", r"\bmujahideen\b", r"\bisis\b", r"\bisil\b",
        r"\btaliban\b", r"\bhamas\b", r"\bhezbollah\b",
        r"\bintifada\b", r"\bmartyrdom\b", r"\bshaheed\b",
        r"\bwhite supremac", r"\bneo[- ]?nazi\b", r"\balt[- ]right\b",
        r"\bgreat replacement\b", r"\brace war\b", r"\bfascis[tm]\b",
        r"\bkhalistan\b", r"\beelam\b", r"\bseparatis[tm]\b",
    ],
    "communist_socialist": [
        r"\bcommunis[tm]\b", r"\bmarxis[tm]\b", r"\bleninis[tm]\b", r"\bmaois[tm]\b",
        r"\bsocialist\b.{0,20}\b(party|revolution|state)\b",
        r"\bproletariat\b", r"\bclass struggle\b", r"\bworkers.{0,10}revolution\b",
        r"\bnaxal\b", r"\bnaxalit\b", r"\bcpim\b",
        r"\bdown with capitalism\b", r"\banti[- ]capitalist\b",
    ],
    "political_figure_party": [
        r"\bbjp\b", r"\brss\b", r"\bhindutva\b", r"\bhindu rashtra\b",
        r"\bcongress party\b", r"\baam aadmi party\b",
        r"\bpolitician\b", r"\belected (official|representative|mp|mla)\b",
        r"\b(chief|prime)\s+minister\b", r"\bmember of parliament\b",
        r"\bsenator\b", r"\bcongressman\b",
        r"\brepublican party\b", r"\bdemocratic party\b",
    ],
    "political_activist": [
        r"\bactivis[tm]\b",
        r"\bblack lives matter\b", r"\bdefund the police\b",
        r"\bfree palestine\b", r"\banarchis[tm]\b",
        r"\bfreedom fighter\b",
    ],
    "news_media": [
        r"\bjournalist\b", r"\breporter\b", r"\bcorrespondent\b", r"\bnewsroom\b",
        r"\bnews (agency|channel|network|outlet)\b",
        r"\bndtv\b", r"\bcnn\b", r"\bbbc\b", r"\breuters\b", r"\bbloomberg\b",
        r"\btimesofindia\b", r"\bindianexpress\b", r"\bthehindu\b",
        r"\bwashingtonpost\b", r"\bnytimes\b", r"\bguardian\b",
        r"\brepublictv\b", r"\bzeenews\b", r"\babpnews\b",
        r"\bthequint\b", r"\bthewire\b", r"\btheprint\b", r"\bfirstpost\b",
    ],
}
_COMPILED = {cat: [re.compile(p, re.IGNORECASE) for p in pats]
             for cat, pats in _PATTERNS.items()}

_IG_HEADERS = {
    "x-ig-app-id": _IG_APP_ID,
    "x-requested-with": "XMLHttpRequest",
    "origin": "https://www.instagram.com",
    "user-agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
}


INSTAGRAM_HELP = (
    "Instagram login failed. This is common — Instagram aggressively blocks "
    "automated logins. Try: (1) log in manually on instagram.com first, "
    "(2) disable 2FA temporarily, or (3) use a fresh session from a new network. "
    "Your other platforms were still scanned."
)


def fetch_items(limit: int = None) -> list[ContentItem]:
    if not config.INSTAGRAM_USERNAME or not config.INSTAGRAM_PASSWORD:
        raise RuntimeError("Instagram credentials not configured")
    cl = Client()
    try:
        cl.login(config.INSTAGRAM_USERNAME, config.INSTAGRAM_PASSWORD)
    except Exception as e:
        msg = str(e)
        if "429" in msg or "rate" in msg.lower() or "wait" in msg.lower():
            raise RuntimeError(
                "Instagram is rate-limiting this server (429). "
                "Wait a few hours before trying again, or skip Instagram for now. "
                "Your other platforms were still scanned."
            ) from e
        raise RuntimeError(INSTAGRAM_HELP) from e

    items: list[ContentItem] = []

    try:
        user_id = cl.user_id_from_username(config.INSTAGRAM_USERNAME)
        medias = cl.user_medias(user_id, amount=limit or 0)
        for media in medias:
            caption = media.caption_text or ""
            shortcode = media.code
            items.append(ContentItem(
                platform="Instagram",
                content_type="post",
                text=caption,
                url=f"https://www.instagram.com/p/{shortcode}/",
                created_at=str(media.taken_at),
                item_id=str(media.pk),
            ))
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(
            f"Instagram: fetched login but couldn't retrieve posts ({type(e).__name__}). "
            "This usually means your session was invalidated. Try logging in again."
        ) from e

    return items


# ── Following audit (browser-cookie approach) ──────────────────────────────────

def parse_cookies_from_curl(curl_text: str) -> dict:
    """Extract cookie dict from a cURL command copied from DevTools."""
    m = re.search(r"-H\s+['\"]cookie:\s*([^'\"]+)['\"]", curl_text, re.IGNORECASE)
    if not m:
        m = re.search(r"(?:-b|--cookie)\s+['\"]([^'\"]+)['\"]", curl_text, re.IGNORECASE)
    if not m:
        raise ValueError(
            "No cookie header found. Paste a full cURL command from Instagram DevTools "
            "(Network tab → any instagram.com request → right-click → Copy as cURL)."
        )
    cookies: dict = {}
    for part in m.group(1).split(";"):
        part = part.strip()
        if "=" in part:
            k, v = part.split("=", 1)
            cookies[k.strip()] = v.strip()
    if not cookies.get("sessionid"):
        raise ValueError("sessionid not found in cookies — paste a cURL from when you are logged in.")
    if not cookies.get("ds_user_id"):
        raise ValueError("ds_user_id not found in cookies — make sure you copy a request from instagram.com.")
    return cookies


def _ig_session(cookies: dict) -> _requests.Session:
    s = _requests.Session()
    s.cookies.update(cookies)
    s.headers.update(_IG_HEADERS)
    s.headers["x-csrftoken"] = cookies.get("csrftoken", "")
    return s


def fetch_following_ig(cookies: dict, progress_cb=None) -> list:
    """Fetch full Instagram following list using web-session cookies.
    Returns list of user dicts from the API (no bios yet).
    """
    user_id = cookies["ds_user_id"]
    session = _ig_session(cookies)
    accounts: list = []
    max_id = None

    while True:
        params: dict = {"count": 100}
        if max_id:
            params["max_id"] = max_id

        resp = session.get(
            f"https://www.instagram.com/api/v1/friendships/{user_id}/following/",
            params=params,
            timeout=30,
        )
        if resp.status_code == 429:
            time.sleep(60)
            continue
        resp.raise_for_status()
        data = resp.json()

        batch = data.get("users", [])
        accounts.extend(batch)
        if progress_cb:
            progress_cb(len(accounts), "following")

        next_max_id = data.get("next_max_id")
        has_more = data.get("has_more", False)
        if not has_more or not next_max_id:
            break
        max_id = next_max_id
        time.sleep(0.3)

    return accounts


def _fetch_bio(pk: str, session: _requests.Session) -> dict:
    """Fetch full user info for a single account (includes biography and category)."""
    try:
        resp = session.get(
            f"https://www.instagram.com/api/v1/users/{pk}/info/",
            timeout=15,
        )
        if resp.status_code == 429:
            time.sleep(30)
            resp = session.get(f"https://www.instagram.com/api/v1/users/{pk}/info/", timeout=15)
        if not resp.ok:
            return {}
        return resp.json().get("user", {})
    except Exception:
        return {}


def scan_following_ig(accounts: list, cookies: dict, progress_cb=None) -> dict:
    """Fetch bios and scan each account. Returns {red_flags, political, journalists, clean}."""
    session = _ig_session(cookies)
    red_flags, political, journalists, clean = [], [], [], []

    for i, user in enumerate(accounts):
        if progress_cb:
            progress_cb(i + 1, len(accounts))

        pk = str(user.get("pk") or user.get("id") or user.get("pk_id") or "")
        info = _fetch_bio(pk, session) if pk else {}
        bio = info.get("biography") or ""
        ig_category = info.get("category") or ""
        full_name = user.get("full_name") or ""
        username = user.get("username") or ""

        combined = f"{username} {full_name} {bio} {ig_category}".lower()

        matched: dict = {}
        for cat, rxs in _COMPILED.items():
            hits = [rx.pattern for rx in rxs if rx.search(combined)]
            if hits:
                matched[cat] = hits

        # Instagram's own category field is reliable — trust it
        cat_lc = ig_category.lower()
        if any(x in cat_lc for x in ("politician", "political party", "government official")):
            matched.setdefault("political_figure_party", []).append(f"category:{ig_category}")
        if any(x in cat_lc for x in ("journalist", "news", "media website", "tv channel")):
            matched.setdefault("news_media", []).append(f"category:{ig_category}")

        account_data = {
            "pk": pk,
            "username": username,
            "full_name": full_name,
            "biography": bio,
            "category": ig_category,
            "profile_pic_url": user.get("profile_pic_url") or "",
            "is_verified": user.get("is_verified", False),
            "matched_patterns": sum(matched.values(), []),
        }

        if not matched:
            clean.append(account_data)
        elif any(k in matched for k in ("anti_us", "political_extremism")):
            red_flags.append(account_data)
        elif any(k in matched for k in ("political_figure_party", "communist_socialist", "political_activist")):
            political.append(account_data)
        elif "news_media" in matched:
            journalists.append(account_data)
        else:
            clean.append(account_data)

        time.sleep(0.4)

    return {"red_flags": red_flags, "political": political, "journalists": journalists, "clean": clean}


def unfollow_users_ig(pks: list, cookies: dict) -> list:
    """Unfollow a list of accounts by pk. Returns per-pk result list."""
    session = _ig_session(cookies)
    session.headers.update({
        "content-type": "application/x-www-form-urlencoded",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
    })
    results = []
    for pk in pks:
        try:
            resp = session.post(
                f"https://www.instagram.com/api/v1/web/friendships/{pk}/unfollow/",
                data=f"user_id={pk}",
                timeout=15,
            )
            results.append({"pk": pk, "ok": resp.status_code == 200})
        except Exception as e:
            results.append({"pk": pk, "ok": False, "error": str(e)})
        time.sleep(1.5)
    return results
