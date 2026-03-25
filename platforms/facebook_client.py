import facebook
import config
import token_store
from platforms import ContentItem


def _get_access_token() -> str:
    token_data = token_store.get_token("facebook")
    if token_data and token_data.get("access_token"):
        return token_data["access_token"]
    # Fallback to legacy env token
    if config.FACEBOOK_ACCESS_TOKEN:
        return config.FACEBOOK_ACCESS_TOKEN
    raise RuntimeError(
        "Facebook not connected. Open Settings and click 'Connect Facebook' to authorize."
    )


def _fetch_all_pages(graph, path: str, fields: str, limit: int = None) -> list:
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
        url = next_page.split("graph.facebook.com/v")[-1]
        if "/" in url:
            url = "/" + url.split("/", 1)[1]
        else:
            break
    return results


def fetch_items(limit: int = None) -> list:
    access_token = _get_access_token()
    graph = facebook.GraphAPI(access_token=access_token, version="17.0")
    items = []

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


def delete_item(item_id: str, content_type: str):
    access_token = _get_access_token()
    graph = facebook.GraphAPI(access_token=access_token, version="17.0")
    graph.delete_object(item_id)
