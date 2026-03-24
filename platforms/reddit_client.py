from datetime import datetime, timezone
import praw
import config
from platforms import ContentItem
from platforms.oauth_flow import get_auth_code, save_env_token

REDIRECT_URI = "http://localhost:8080"
SCOPES = ["identity", "history", "mysubreddits"]
USER_AGENT = "visa_cleanup_agent/1.0"


def _ts(utc_timestamp: float) -> str:
    return datetime.fromtimestamp(utc_timestamp, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _submission_url(submission) -> str:
    return f"https://reddit.com{submission.permalink}"


def _comment_url(comment) -> str:
    return f"https://reddit.com{comment.permalink}"


def _get_reddit() -> praw.Reddit:
    """Return an authenticated Reddit instance, running OAuth if needed."""
    if config.REDDIT_REFRESH_TOKEN:
        return praw.Reddit(
            client_id=config.REDDIT_CLIENT_ID,
            client_secret=config.REDDIT_CLIENT_SECRET,
            refresh_token=config.REDDIT_REFRESH_TOKEN,
            user_agent=USER_AGENT,
        )

    # First-time OAuth flow
    reddit = praw.Reddit(
        client_id=config.REDDIT_CLIENT_ID,
        client_secret=config.REDDIT_CLIENT_SECRET,
        redirect_uri=REDIRECT_URI,
        user_agent=USER_AGENT,
    )
    auth_url = reddit.auth.url(scopes=SCOPES, state="visa_cleanup", duration="permanent")
    params = get_auth_code(auth_url)

    if "error" in params:
        raise RuntimeError(f"Reddit OAuth error: {params['error']}")
    if "code" not in params:
        raise RuntimeError(f"Reddit OAuth: unexpected redirect params: {params}")

    refresh_token = reddit.auth.authorize(params["code"])
    save_env_token("REDDIT_REFRESH_TOKEN", refresh_token)
    print("[Reddit] Refresh token saved to .env — won't need to log in again.")
    return reddit


def fetch_items(limit: int = None) -> list[ContentItem]:
    if not config.REDDIT_CLIENT_ID or not config.REDDIT_CLIENT_SECRET:
        raise RuntimeError("Reddit credentials not configured")
    try:
        reddit = _get_reddit()
    except Exception as e:
        print(f"[Reddit] Auth failed: {e}")
        return []

    items: list[ContentItem] = []
    me = reddit.user.me()

    # Own posts
    for sub in me.submissions.new(limit=limit):
        items.append(ContentItem(
            platform="Reddit",
            content_type="post",
            text=f"[Title] {sub.title}\n{sub.selftext}".strip(),
            url=_submission_url(sub),
            created_at=_ts(sub.created_utc),
            item_id=sub.id,
        ))

    # Own comments
    for comment in me.comments.new(limit=limit):
        items.append(ContentItem(
            platform="Reddit",
            content_type="comment",
            text=comment.body,
            url=_comment_url(comment),
            created_at=_ts(comment.created_utc),
            item_id=comment.id,
        ))

    # Upvoted items
    try:
        for item in me.upvoted(limit=limit):
            if hasattr(item, "selftext"):
                items.append(ContentItem(
                    platform="Reddit",
                    content_type="upvote",
                    text=f"[Title] {item.title}\n{item.selftext}".strip(),
                    url=_submission_url(item),
                    created_at=_ts(item.created_utc),
                    item_id=item.id,
                ))
            else:
                items.append(ContentItem(
                    platform="Reddit",
                    content_type="upvote",
                    text=item.body,
                    url=_comment_url(item),
                    created_at=_ts(item.created_utc),
                    item_id=item.id,
                ))
    except Exception as e:
        print(f"[Reddit] Could not fetch upvoted items: {e}")

    return items
