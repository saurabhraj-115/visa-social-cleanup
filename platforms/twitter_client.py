from datetime import datetime, timezone
import time
import requests
import tweepy
import config
import token_store
from platforms import ContentItem


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
