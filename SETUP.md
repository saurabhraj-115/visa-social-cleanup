# Credential Setup Guide

Follow these steps to get API credentials for each platform. After each step, add the values to your `.env` file (copy `.env.example` to `.env` first).

---

## 1. Anthropic API Key (required for content analysis)

1. Go to **console.anthropic.com**
2. Sign in or create an account
3. Click **API Keys** in the left sidebar
4. Click **Create Key**, name it `visa-cleanup`
5. Copy the key and add it to `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

---

## 2. Reddit

Reddit has a free API — this is the easiest platform to set up.

1. Log in to Reddit
2. Go to **reddit.com/prefs/apps**
3. Scroll down and click **"create another app..."**
4. Fill in:
   - **Name:** visa-cleanup
   - **Type:** Select **script**
   - **Redirect URI:** `http://localhost:8080`
5. Click **Create app**
6. You'll see your app. Copy:
   - **client_id**: the string under your app name (looks like `abc123def456`)
   - **client_secret**: labeled "secret"
7. Add to `.env`:
   ```
   REDDIT_CLIENT_ID=abc123def456
   REDDIT_CLIENT_SECRET=your_secret_here
   REDDIT_USERNAME=your_reddit_username
   REDDIT_PASSWORD=your_reddit_password
   ```

---

## 3. Twitter / X

> **Important:** You need at least the **Basic tier** ($100/month) to read your liked tweets and delete tweets via the API. The free tier is read-only with very heavy restrictions. If you don't want to pay, skip Twitter and manually review your likes at **x.com/i/likes**.

1. Go to **developer.twitter.com**
2. Sign in with your X account
3. Click **"Sign up for Free Account"** or upgrade to Basic
4. Create a new **Project** and **App** inside it
5. In your app settings, go to **"Keys and Tokens"**
6. Under **"User authentication settings"**, enable OAuth 1.0a with **Read and Write** permissions
7. Generate and copy:
   - **API Key** (Consumer Key)
   - **API Secret** (Consumer Secret)
   - **Access Token**
   - **Access Token Secret**
8. Add to `.env`:
   ```
   TWITTER_API_KEY=your_api_key
   TWITTER_API_SECRET=your_api_secret
   TWITTER_ACCESS_TOKEN=your_access_token
   TWITTER_ACCESS_SECRET=your_access_token_secret
   TWITTER_USERNAME=your_twitter_handle
   ```

---

## 4. Facebook

1. Go to **developers.facebook.com**
2. Click **"My Apps"** → **"Create App"**
3. Choose **"Consumer"** type, give it a name like `visa-cleanup`
4. In the app dashboard, go to **Tools → Graph API Explorer**
5. In the top-right, select your app from the dropdown
6. Click **"Generate Access Token"** and log in with your Facebook account
7. In the **Permissions** section, add:
   - `user_posts`
   - `user_likes`
   - `public_profile`
8. Click **"Generate Access Token"**
9. To get a long-lived token (60 days), click the **"i"** icon next to the token → **"Open in Access Token Debugger"** → **"Extend Access Token"**
10. Copy the token and add to `.env`:
    ```
    FACEBOOK_ACCESS_TOKEN=EAABsbCS...
    ```

> **Note:** Facebook Graph API may require app review for `user_posts` and `user_likes` if you want to access other users' data — but for your own data in development mode, it works without review.

---

## 5. Instagram

> **Note:** Instagram's official API no longer supports personal accounts. This tool uses **instagrapi**, which accesses Instagram using the mobile app's private API. This works reliably but technically violates Instagram's Terms of Service. Use at your own discretion. The risk is low (your account won't be banned for just reading your posts), but be aware.

No developer account needed — just your Instagram login:

```
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password
```

If you have 2FA enabled on Instagram, you may need to temporarily disable it or handle the 2FA prompt when the script runs.

---

## Running the Agent

```bash
# Install dependencies
pip install -r requirements.txt

# Test on Reddit only first (free, easiest)
python main.py --platforms reddit --limit 50

# Run on all platforms
python main.py --platforms reddit twitter facebook instagram

# Open the HTML report in your browser for clickable links
# Windows:
start report.html
# Mac:
open report.html
```

## Tips

- Use `--limit 50` for a quick test run before scanning everything
- The HTML report (`report.html`) has clickable links to each flagged item
- Start with Reddit and Facebook as they have the best API access
- Twitter requires the paid Basic tier — if you skip it, manually review your likes at x.com/i/likes
