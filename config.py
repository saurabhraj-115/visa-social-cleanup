import os
from dotenv import load_dotenv

load_dotenv()

def get(key: str, required: bool = False) -> str:
    val = os.getenv(key, "")
    if required and not val:
        raise EnvironmentError(f"Missing required environment variable: {key}")
    return val

# Anthropic
ANTHROPIC_API_KEY = get("ANTHROPIC_API_KEY")

# Reddit
REDDIT_CLIENT_ID = get("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = get("REDDIT_CLIENT_SECRET")
REDDIT_USERNAME = get("REDDIT_USERNAME")
REDDIT_PASSWORD = get("REDDIT_PASSWORD")

# Twitter/X
TWITTER_API_KEY = get("TWITTER_API_KEY")
TWITTER_API_SECRET = get("TWITTER_API_SECRET")
TWITTER_ACCESS_TOKEN = get("TWITTER_ACCESS_TOKEN")
TWITTER_ACCESS_SECRET = get("TWITTER_ACCESS_SECRET")
TWITTER_USERNAME = get("TWITTER_USERNAME")

# Facebook
FACEBOOK_ACCESS_TOKEN = get("FACEBOOK_ACCESS_TOKEN")

# Instagram
INSTAGRAM_USERNAME = get("INSTAGRAM_USERNAME")
INSTAGRAM_PASSWORD = get("INSTAGRAM_PASSWORD")
