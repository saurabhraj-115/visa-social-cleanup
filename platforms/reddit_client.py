from datetime import datetime, timezone
import praw
import config
import token_store
from platforms import ContentItem

USER_AGENT = "visa_cleanup_agent/1.0"


def _ts(utc_timestamp: float) -> str:
    return datetime.fromtimestamp(utc_timestamp, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _submission_url(submission) -> str:
    return f"https://reddit.com{submission.permalink}"


def _comment_url(comment) -> str:
    return f"https://reddit.com{comment.permalink}"


def _get_reddit() -> praw.Reddit:
    """Return an authenticated Reddit instance using token_store or legacy env token."""
    token_data = token_store.get_token("reddit")
    refresh_token = (token_data or {}).get("refresh_token") or config.REDDIT_REFRESH_TOKEN

    if not refresh_token:
        raise RuntimeError(
            "Reddit not connected. Open Settings and click 'Connect Reddit' to authorize."
        )
    return praw.Reddit(
        client_id=config.REDDIT_CLIENT_ID,
        client_secret=config.REDDIT_CLIENT_SECRET,
        refresh_token=refresh_token,
        user_agent=USER_AGENT,
    )


def fetch_items(limit: int = None) -> list:
    if not config.REDDIT_CLIENT_ID or not config.REDDIT_CLIENT_SECRET:
        raise RuntimeError("Reddit Client ID / Secret not configured.")
    reddit = _get_reddit()
    items = []
    me = reddit.user.me()

    for sub in me.submissions.new(limit=limit):
        items.append(ContentItem(
            platform="Reddit",
            content_type="post",
            text=f"[Title] {sub.title}\n{sub.selftext}".strip(),
            url=_submission_url(sub),
            created_at=_ts(sub.created_utc),
            item_id=sub.id,
        ))

    for comment in me.comments.new(limit=limit):
        items.append(ContentItem(
            platform="Reddit",
            content_type="comment",
            text=comment.body,
            url=_comment_url(comment),
            created_at=_ts(comment.created_utc),
            item_id=comment.id,
        ))

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


def delete_item(item_id: str, content_type: str):
    reddit = _get_reddit()
    if content_type == "post":
        reddit.submission(id=item_id).delete()
    elif content_type == "comment":
        reddit.comment(id=item_id).delete()
    elif content_type == "upvote":
        # Remove the upvote (clear_vote resets to no vote)
        try:
            reddit.submission(id=item_id).clear_vote()
        except Exception:
            reddit.comment(id=item_id).clear_vote()
    else:
        raise ValueError(f"Unknown Reddit content_type: {content_type}")
