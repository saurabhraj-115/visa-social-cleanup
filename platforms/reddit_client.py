from datetime import datetime, timezone
from typing import Generator
import praw
import config
from platforms import ContentItem


def _ts(utc_timestamp: float) -> str:
    return datetime.fromtimestamp(utc_timestamp, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _submission_url(submission) -> str:
    return f"https://reddit.com{submission.permalink}"


def _comment_url(comment) -> str:
    return f"https://reddit.com{comment.permalink}"


def fetch_items(limit: int = None) -> list[ContentItem]:
    reddit = praw.Reddit(
        client_id=config.REDDIT_CLIENT_ID,
        client_secret=config.REDDIT_CLIENT_SECRET,
        username=config.REDDIT_USERNAME,
        password=config.REDDIT_PASSWORD,
        user_agent=f"visa_cleanup_agent/1.0 by u/{config.REDDIT_USERNAME}",
    )

    items: list[ContentItem] = []
    me = reddit.user.me()

    # Own posts
    for sub in me.submissions.new(limit=limit):
        text = sub.selftext or sub.title
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
        for item in reddit.user.me().upvoted(limit=limit):
            if hasattr(item, "selftext"):
                # It's a submission
                items.append(ContentItem(
                    platform="Reddit",
                    content_type="upvote",
                    text=f"[Title] {item.title}\n{item.selftext}".strip(),
                    url=_submission_url(item),
                    created_at=_ts(item.created_utc),
                    item_id=item.id,
                ))
            else:
                # It's a comment
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
