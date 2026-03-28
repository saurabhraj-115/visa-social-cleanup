from datetime import datetime, timezone
import re
import time
import requests
import tweepy
import config
import token_store
from platforms import ContentItem


# ── Following audit — red-flag and journalist patterns ────────────────────────

_RED_FLAG_PATTERNS = [
    r"\bkill america\b", r"\bdeath to america\b", r"\bfuck america\b",
    r"\bdown with usa\b", r"\bamerica is evil\b",
    r"\bjihad\b", r"\bmujahideen\b", r"\bisis\b", r"\bisil\b",
    r"\bal[- ]qaeda\b", r"\btaliban\b", r"\bhamas\b", r"\bhezbollah\b",
    r"\bterrorist\b", r"\bmartyrdom\b", r"\bintifada\b",
    r"\bkill all\b", r"\bgenocide\b", r"\bethnic cleansing\b",
    r"\birgc\b", r"\bkhamenei\b", r"\bayatollah\b",
    r"\bwhite supremac", r"\bneo.?nazi\b", r"\bkkk\b",
    r"\bgreat replacement\b", r"\brace war\b",
    r"\bnarco\b", r"\bcartel\b",
]

_JOURNALIST_BIO_PATTERNS = [
    r"\bjournalist\b", r"\breporter\b", r"\bcorrespondent\b",
    r"\b(staff|senior|chief|deputy|managing|political|foreign|diplomatic)\s+(editor|reporter|writer|correspondent)\b",
    r"\bfreelance\s+(journalist|reporter|writer)\b",
    r"\bnewspaper\b", r"\bnews\s+agency\b", r"\bnewsroom\b",
    r"\bbreaking\s+news\b", r"\blatest\s+news\b", r"\bnews\s+updates?\b",
    r"\bcovering\b.{0,40}\b(news|politics|economy|world|sports)\b",
    r"\bnews\s+(editor|desk|bureau|anchor|producer)\b",
    r"\bcolumnist\b",
]

_JOURNALIST_NAME_PATTERNS = [
    r"\bBBC\b", r"\bCNN\b", r"\bNDTV\b", r"\bANI\b", r"\bPTI\b",
    r"\bReuters\b", r"\bAFP\b", r"\bBloomberg\b", r"\bAl\s+Jazeera\b",
    r"\bIndia\s+Today\b", r"\bHindustan\s+Times\b", r"\bThe\s+Hindu\b",
    r"\bIndian\s+Express\b", r"\bTimes\s+of\s+India\b",
    r"\bWSJ\b", r"\bNew\s+York\s+Times\b", r"\bWashington\s+Post\b",
    r"\bNewslaundry\b", r"\bNewsclick\b", r"\bThe\s+Wire\b", r"\bThe\s+Print\b",
    r"\bThe\s+Quint\b", r"\bScroll\b", r"\bFirstpost\b", r"\bWion\b",
]

_POLITICAL_BIO_PATTERNS = [
    r"\bpolitician\b",
    r"\belected official\b",
    r"\bsenator\b", r"\bcongressm(a|e)n\b", r"\bcongresswoman\b",
    r"\bgovernor\b", r"\bmayor\b",
    r"\bmember of parliament\b", r"\bmember of congress\b", r"\bMP\b", r"\bMLA\b", r"\bMLC\b",
    r"\blegislator\b", r"\blawmaker\b",
    r"\bprime minister\b", r"\bpresident of\b",
    r"\b(cabinet|union|state)\s+minister\b",
    r"\b(party|national)\s+(president|chairman|spokesperson|secretary|chief|leader|convener)\b",
    r"\bpolitical\s+(leader|activist|figure)\b",
    r"\bcandidate for\b",
    r"\bformer\s+(minister|senator|governor|mp|mla|mpp)\b",
    r"\bofficial account of.{0,30}(party|bjp|inc|aap|congress)\b",
]

_POLITICAL_NAME_PATTERNS = [
    # India — national parties
    r"\bBJP\b", r"\bBharatiya Janata\b",
    r"\bINC\b", r"\bIndian National Congress\b",
    r"\bAAP\b", r"\bAam Aadmi Party\b",
    r"\bNCP\b", r"\bShiv Sena\b", r"\bTMC\b", r"\bBSP\b",
    r"\bSamajwadi Party\b", r"\bCPM\b", r"\bCPI\b",
    r"\bRJD\b", r"\bJDU\b", r"\bTDP\b", r"\bYSRCP\b", r"\bBRS\b",
    # US
    r"\bRepublican Party\b", r"\bDemocratic Party\b", r"\bGOP\b",
    # UK
    r"\bLabour Party\b", r"\bConservative Party\b", r"\bLib Dems?\b",
    # Generic indicators in handle/name
    r"\bOfficial\s+BJP\b", r"\bOfficial\s+INC\b", r"\bOfficial\s+AAP\b",
]

_rf_compiled  = [re.compile(p, re.IGNORECASE) for p in _RED_FLAG_PATTERNS]
_jb_compiled  = [re.compile(p, re.IGNORECASE) for p in _JOURNALIST_BIO_PATTERNS]
_jn_compiled  = [re.compile(p, re.IGNORECASE) for p in _JOURNALIST_NAME_PATTERNS]
_pb_compiled  = [re.compile(p, re.IGNORECASE) for p in _POLITICAL_BIO_PATTERNS]
_pn_compiled  = [re.compile(p, re.IGNORECASE) for p in _POLITICAL_NAME_PATTERNS]


def _check_red_flags(text: str) -> list:
    return [p.pattern for p in _rf_compiled if p.search(text)]


def _is_journalist(bio: str, name: str) -> bool:
    return (
        any(p.search(bio) for p in _jb_compiled) or
        any(p.search(name) for p in _jn_compiled)
    )


def _is_political(bio: str, name: str) -> bool:
    return (
        any(p.search(bio) for p in _pb_compiled) or
        any(p.search(name) for p in _pn_compiled)
    )


def _ts(dt) -> str:
    if dt is None:
        return "unknown"
    if isinstance(dt, str):
        return dt
    return dt.strftime("%Y-%m-%d %H:%M UTC")


def _get_access_token() -> str:
    """Return a valid access token, refreshing via OAuth 2.0 if needed."""
    token_data = token_store.get_token("twitter")
    if not token_data:
        raise RuntimeError(
            "Twitter not connected. Open Settings and click 'Connect Twitter' to authorize."
        )

    # Refresh if expired
    if token_data.get("expires_at", 0) < time.time():
        if not token_data.get("refresh_token"):
            raise RuntimeError("Twitter token expired and no refresh token available. Reconnect in Settings.")
        resp = requests.post(
            "https://api.twitter.com/2/oauth2/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": token_data["refresh_token"],
                "client_id": config.TWITTER_CLIENT_ID,
            },
            auth=(config.TWITTER_CLIENT_ID, config.TWITTER_CLIENT_SECRET),
            timeout=30,
        )
        resp.raise_for_status()
        new_data = resp.json()
        token_data = {
            "access_token": new_data["access_token"],
            "refresh_token": new_data.get("refresh_token", token_data["refresh_token"]),
            "expires_at": time.time() + new_data.get("expires_in", 7200) - 60,
        }
        token_store.set_token("twitter", token_data)

    return token_data["access_token"]


def fetch_items(limit: int = None) -> list:
    access_token = _get_access_token()
    client = tweepy.Client(access_token=access_token)
    items = []

    try:
        me = client.get_me()
        user_id = me.data.id
        username = me.data.username
    except Exception as e:
        raise RuntimeError(f"Twitter: could not get user info — {e}")

    # Own tweets
    try:
        for tweet in tweepy.Paginator(
            client.get_users_tweets,
            id=user_id,
            max_results=min(limit or 100, 100),
            tweet_fields=["created_at", "text"],
        ).flatten(limit=limit):
            items.append(ContentItem(
                platform="Twitter",
                content_type="tweet",
                text=tweet.text,
                url=f"https://x.com/{username}/status/{tweet.id}",
                created_at=_ts(tweet.created_at),
                item_id=str(tweet.id),
            ))
    except Exception as e:
        print(f"[Twitter] Could not fetch tweets: {e}")

    # Liked tweets
    try:
        for response in tweepy.Paginator(
            client.get_liked_tweets,
            id=user_id,
            max_results=min(limit or 100, 100),
            tweet_fields=["created_at", "text", "author_id"],
            expansions=["author_id"],
            user_fields=["username"],
        ):
            if not response.data:
                continue
            users = {u.id: u.username for u in (response.includes.get("users") or [])}
            for tweet in response.data:
                author_username = users.get(tweet.author_id, "unknown")
                items.append(ContentItem(
                    platform="Twitter",
                    content_type="like",
                    text=tweet.text,
                    url=f"https://x.com/{author_username}/status/{tweet.id}",
                    created_at=_ts(tweet.created_at),
                    item_id=str(tweet.id),
                ))
    except Exception as e:
        print(f"[Twitter] Could not fetch liked tweets: {e}")

    return items


def delete_item(item_id: str, content_type: str):
    access_token = _get_access_token()
    client = tweepy.Client(access_token=access_token)

    if content_type == "tweet":
        client.delete_tweet(item_id)
    elif content_type == "like":
        me = client.get_me()
        client.unlike(me.data.id, item_id)
    else:
        raise ValueError(f"Unknown Twitter content_type: {content_type}")


# ── Following audit (OAuth 1.0a / v1.1 API) ──────────────────────────────────

def _get_following_api() -> tweepy.API:
    """Return a tweepy.API authenticated with the user's OAuth 1.0a tokens."""
    token_data = token_store.get_token("twitter_following")
    if not token_data:
        raise RuntimeError(
            "Twitter following audit not connected. Click 'Connect Following Audit' in settings."
        )
    auth = tweepy.OAuth1UserHandler(
        config.TWITTER_API_KEY,
        config.TWITTER_API_SECRET,
        token_data["access_token"],
        token_data["access_token_secret"],
    )
    return tweepy.API(auth, wait_on_rate_limit=True)


def fetch_following(progress_cb=None) -> list:
    """
    Fetch the full list of accounts the user follows via v1.1 API.
    Returns list of dicts: {user_id, screen_name, name, description, followers_count, profile_image}.
    Calls progress_cb(fetched_count, phase) periodically.
    """
    api = _get_following_api()

    # Phase 1: collect all following IDs (5000/page, cursor-paginated)
    following_ids = []
    for uid in tweepy.Cursor(api.get_friend_ids, count=5000).items():
        following_ids.append(uid)
        if len(following_ids) % 500 == 0 and progress_cb:
            progress_cb(len(following_ids), "ids")
    if progress_cb:
        progress_cb(len(following_ids), "ids")

    if not following_ids:
        return []

    # Phase 2: batch-fetch user details (100 per request)
    accounts = []
    for i in range(0, len(following_ids), 100):
        batch = following_ids[i:i + 100]
        try:
            users = api.lookup_users(user_id=batch)
            for u in users:
                accounts.append({
                    "user_id": str(u.id),
                    "screen_name": u.screen_name,
                    "name": u.name,
                    "description": u.description or "",
                    "followers_count": u.followers_count,
                    "profile_image": u.profile_image_url_https,
                })
        except Exception as exc:
            print(f"[Twitter following] lookup batch error: {exc}")
        if progress_cb:
            progress_cb(len(accounts), "details")

    return accounts


def scan_following(accounts: list) -> dict:
    """
    Scan following list for red-flag content, political accounts, and journalist/news accounts.
    Priority: red_flags > political > journalists > clean.
    Returns {red_flags, political, journalists, clean}.
    """
    red_flags = []
    political = []
    journalists = []
    clean = []

    for acc in accounts:
        bio = acc.get("description", "")
        name = acc.get("name", "")
        flags = _check_red_flags(bio)
        if flags:
            red_flags.append({**acc, "matched_patterns": flags})
        elif _is_political(bio, name):
            political.append(acc)
        elif _is_journalist(bio, name):
            journalists.append(acc)
        else:
            clean.append(acc)

    return {"red_flags": red_flags, "political": political, "journalists": journalists, "clean": clean}


def unfollow_users(user_ids: list, progress_cb=None) -> list:
    """Unfollow a list of user IDs with 0.5s delay between each. Returns per-user results."""
    api = _get_following_api()
    results = []
    for i, uid in enumerate(user_ids):
        try:
            api.destroy_friendship(user_id=int(uid))
            results.append({"user_id": uid, "ok": True})
        except Exception as exc:
            results.append({"user_id": uid, "ok": False, "error": str(exc)})
        if progress_cb:
            progress_cb(i + 1, len(user_ids))
        time.sleep(0.5)
    return results
