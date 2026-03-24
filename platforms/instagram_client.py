from instagrapi import Client
from instagrapi.exceptions import LoginRequired
import config
from platforms import ContentItem


def fetch_items(limit: int = None) -> list[ContentItem]:
    if not config.INSTAGRAM_USERNAME or not config.INSTAGRAM_PASSWORD:
        raise RuntimeError("Instagram credentials not configured")
    cl = Client()
    try:
        cl.login(config.INSTAGRAM_USERNAME, config.INSTAGRAM_PASSWORD)
    except Exception as e:
        print(f"[Instagram] Login failed: {e}")
        return []

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
    except Exception as e:
        print(f"[Instagram] Could not fetch posts: {e}")

    return items
