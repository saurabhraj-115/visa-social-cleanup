from dataclasses import dataclass


@dataclass
class ContentItem:
    platform: str       # "Reddit", "Twitter", "Facebook", "Instagram"
    content_type: str   # "post", "comment", "like", "upvote"
    text: str           # The content text
    url: str            # Direct link to the item
    created_at: str     # Human-readable timestamp
    item_id: str        # Platform-specific ID
