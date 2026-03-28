import os
from pathlib import Path
from dotenv import load_dotenv

# Load project-root .env first, then DATA_DIR .env (Fly.io volume) — latter wins
load_dotenv()
data_dir = os.environ.get("DATA_DIR")
if data_dir:
    load_dotenv(Path(data_dir) / ".env", override=True)

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

# Twitter/X — OAuth 2.0 (developer.twitter.com → your app → Settings → OAuth 2.0)
TWITTER_CLIENT_ID     = get("TWITTER_CLIENT_ID")
TWITTER_CLIENT_SECRET = get("TWITTER_CLIENT_SECRET")
# Twitter/X — OAuth 1.0a Consumer Keys (developer.twitter.com → your app → Keys and tokens)
# Used for following list audit (v2 following API requires paid tier)
TWITTER_API_KEY    = get("TWITTER_API_KEY")
TWITTER_API_SECRET = get("TWITTER_API_SECRET")
# Legacy bearer-token fields kept for backward compatibility
TWITTER_BEARER_TOKEN = get("TWITTER_BEARER_TOKEN")
TWITTER_USERNAME     = get("TWITTER_USERNAME")

# Facebook — create an app at developers.facebook.com, add Web platform
FACEBOOK_APP_ID     = get("FACEBOOK_APP_ID")
FACEBOOK_APP_SECRET = get("FACEBOOK_APP_SECRET")
# Legacy single-token field kept for backward compatibility
FACEBOOK_ACCESS_TOKEN = get("FACEBOOK_ACCESS_TOKEN")

# Instagram
INSTAGRAM_USERNAME = get("INSTAGRAM_USERNAME")
INSTAGRAM_PASSWORD = get("INSTAGRAM_PASSWORD")

# LinkedIn (OAuth 2.0 — create an app at linkedin.com/developers, redirect URI: http://localhost:8080)
LINKEDIN_CLIENT_ID = get("LINKEDIN_CLIENT_ID")
LINKEDIN_CLIENT_SECRET = get("LINKEDIN_CLIENT_SECRET")
LINKEDIN_ACCESS_TOKEN = get("LINKEDIN_ACCESS_TOKEN")  # auto-saved after first OAuth login
