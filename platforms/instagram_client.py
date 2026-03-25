from instagrapi import Client
from instagrapi.exceptions import LoginRequired
import config
from platforms import ContentItem


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
