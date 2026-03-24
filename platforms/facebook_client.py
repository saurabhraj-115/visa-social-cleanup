import facebook
import config
from platforms import ContentItem


def _fetch_all_pages(graph, path: str, fields: str, limit: int = None) -> list[dict]:
    results = []
    url = f"{path}?fields={fields}&limit=100"
    while url:
        data = graph.get_object(url)
        for item in data.get("data", []):
            results.append(item)
            if limit and len(results) >= limit:
                return results
        next_page = data.get("paging", {}).get("next")
        if not next_page:
            break
        # Extract the relative path after the graph API base
        url = next_page.split("graph.facebook.com/v")[-1]
        if "/" in url:
            url = "/" + url.split("/", 1)[1]
        else:
            break
    return results


def fetch_items(limit: int = None) -> list[ContentItem]:
    if not config.FACEBOOK_ACCESS_TOKEN:
        raise RuntimeError("Facebook credentials not configured")
    graph = facebook.GraphAPI(access_token=config.FACEBOOK_ACCESS_TOKEN, version="17.0")
    items: list[ContentItem] = []

    # Own posts
    try:
        posts = _fetch_all_pages(graph, "me/posts", "id,message,story,permalink_url,created_time", limit)
        for post in posts:
            text = post.get("message") or post.get("story") or ""
            if not text:
                continue
            items.append(ContentItem(
                platform="Facebook",
                content_type="post",
                text=text,
                url=post.get("permalink_url", f"https://facebook.com/{post['id']}"),
                created_at=post.get("created_time", ""),
                item_id=post["id"],
            ))
    except Exception as e:
        print(f"[Facebook] Could not fetch posts: {e}")

    # Liked pages/items
    try:
        likes = _fetch_all_pages(graph, "me/likes", "id,name,link", limit)
        for like in likes:
            name = like.get("name", "")
            if not name:
                continue
            items.append(ContentItem(
                platform="Facebook",
                content_type="like",
                text=f"Liked page/item: {name}",
                url=like.get("link", f"https://facebook.com/{like['id']}"),
                created_at="",
                item_id=like["id"],
            ))
    except Exception as e:
        print(f"[Facebook] Could not fetch likes: {e}")

    return items
