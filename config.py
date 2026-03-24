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

# Reddit (OAuth — create a "web" app at reddit.com/prefs/apps, redirect URI: http://localhost:8080)
REDDIT_CLIENT_ID = get("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = get("REDDIT_CLIENT_SECRET")
REDDIT_REFRESH_TOKEN = get("REDDIT_REFRESH_TOKEN")  # auto-saved after first OAuth login

# Twitter/X (Bearer token from developer.twitter.com → your app → Keys and Tokens)
TWITTER_BEARER_TOKEN = get("TWITTER_BEARER_TOKEN")
TWITTER_USERNAME = get("TWITTER_USERNAME")

# Facebook
FACEBOOK_ACCESS_TOKEN = get("FACEBOOK_ACCESS_TOKEN")

# Instagram
INSTAGRAM_USERNAME = get("INSTAGRAM_USERNAME")
INSTAGRAM_PASSWORD = get("INSTAGRAM_PASSWORD")

# LinkedIn (OAuth 2.0 — create an app at linkedin.com/developers, redirect URI: http://localhost:8080)
LINKEDIN_CLIENT_ID = get("LINKEDIN_CLIENT_ID")
LINKEDIN_CLIENT_SECRET = get("LINKEDIN_CLIENT_SECRET")
LINKEDIN_ACCESS_TOKEN = get("LINKEDIN_ACCESS_TOKEN")  # auto-saved after first OAuth login
