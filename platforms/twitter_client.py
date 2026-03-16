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
    auth = tweepy.OAuth1UserHandler(
        config.TWITTER_API_KEY,
        config.TWITTER_API_SECRET,
        config.TWITTER_ACCESS_TOKEN,
        config.TWITTER_ACCESS_SECRET,
    )
    api_v1 = tweepy.API(auth)

    client = tweepy.Client(
        consumer_key=config.TWITTER_API_KEY,
        consumer_secret=config.TWITTER_API_SECRET,
        access_token=config.TWITTER_ACCESS_TOKEN,
        access_token_secret=config.TWITTER_ACCESS_SECRET,
    )

    items: list[ContentItem] = []
    username = config.TWITTER_USERNAME.lstrip("@")

    # Get own user ID
    try:
        me = client.get_me(user_auth=True)
        user_id = me.data.id
    except Exception as e:
        print(f"[Twitter] Could not get user info: {e}")
        return items

    # Own tweets
    try:
        max_results = min(limit or 100, 100)
        paginator = tweepy.Paginator(
            client.get_users_tweets,
            id=user_id,
            max_results=max_results,
            tweet_fields=["created_at", "text"],
            user_auth=True,
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

    # Liked tweets
    try:
        paginator = tweepy.Paginator(
            client.get_liked_tweets,
            id=user_id,
            max_results=min(limit or 100, 100),
            tweet_fields=["created_at", "text", "author_id"],
            expansions=["author_id"],
            user_fields=["username"],
            user_auth=True,
        )
        count = 0
        for response in paginator:
            if not response.data:
                continue
            # Build author_id -> username map
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
        print(f"[Twitter] Could not fetch liked tweets: {e}")

    return items
