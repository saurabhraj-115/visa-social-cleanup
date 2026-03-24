from datetime import datetime, timezone
import tweepy
import config
from platforms import ContentItem


def _ts(dt) -> str:
    if dt is None:
        return "unknown"
    if isinstance(dt, str):
        return dt
    return dt.strftime("%Y-%m-%d %H:%M UTC")


def fetch_items(limit: int = None) -> list[ContentItem]:
    if not config.TWITTER_BEARER_TOKEN or not config.TWITTER_USERNAME:
        raise RuntimeError("Twitter credentials not configured")

    client = tweepy.Client(bearer_token=config.TWITTER_BEARER_TOKEN)
    username = config.TWITTER_USERNAME.lstrip("@")
    items: list[ContentItem] = []

    # Resolve username → user ID
    try:
        resp = client.get_user(username=username)
        user_id = resp.data.id
    except Exception as e:
        print(f"[Twitter] Could not resolve username @{username}: {e}")
        return items

    # Own tweets
    try:
        paginator = tweepy.Paginator(
            client.get_users_tweets,
            id=user_id,
            max_results=min(limit or 100, 100),
            tweet_fields=["created_at", "text"],
        )
        count = 0
        for tweet in paginator.flatten(limit=limit):
            items.append(ContentItem(
                platform="Twitter",
                content_type="tweet",
                text=tweet.text,
                url=f"https://x.com/{username}/status/{tweet.id}",
                created_at=_ts(tweet.created_at),
                item_id=str(tweet.id),
            ))
            count += 1
            if limit and count >= limit:
                break
    except Exception as e:
        print(f"[Twitter] Could not fetch tweets: {e}")

    # Liked tweets (requires user context — skip gracefully if not allowed)
    try:
        paginator = tweepy.Paginator(
            client.get_liked_tweets,
            id=user_id,
            max_results=min(limit or 100, 100),
            tweet_fields=["created_at", "text", "author_id"],
            expansions=["author_id"],
            user_fields=["username"],
        )
        count = 0
        for response in paginator:
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
                count += 1
                if limit and count >= limit:
                    break
            if limit and count >= limit:
                break
    except Exception as e:
        print(f"[Twitter] Could not fetch liked tweets (may need elevated access): {e}")

    return items
