# Visa Social Media Cleanup

AI-powered tool that scans your social media accounts for content that could raise concerns at a US visa interview. Claude AI flags posts and likes for review — nothing is deleted automatically. Includes a mock officer interview simulator to help you prepare.

**Live:** https://visa-cleanup.fly.dev

---

## Features

### Post & Like Scanner
Scans your own posts, comments, and likes across 5 platforms. Claude AI flags content a consular officer might find concerning, grouped by severity (High / Medium / Low).

### Following Audit
Scans every account you follow on Twitter and Instagram — not your own posts — and flags:
- 🚨 **Red flags** — extremist, anti-US, or terrorist-adjacent content in their bio
- 🏛️ **Politicians & parties** — elected officials, party accounts
- 📰 **Journalists & news outlets** — reporters, correspondents, major media
- ✅ **Clean** — no flags

Bulk-unfollow flagged accounts with a single confirmation click.

### The Officer's Desk
After scanning, generate an intelligence-style dossier written in officer voice — the same perspective a consular officer would have reviewing your file. Then:
- **Mock Interview** — Claude plays the officer and asks pointed questions based on your flagged posts. You answer, Claude coaches you.
- **Prep Package** — predicted interview questions with suggested talking points, export-ready.
- **Rewrite instead of delete** — Claude rewrites risky posts in a softer tone while keeping your voice.

### Chrome Extension — One-click Connect
Install the bundled Chrome extension to connect Instagram and Twitter with one click — no API keys, no DevTools copy-paste, no OAuth setup needed.

---

## Platforms

| Platform  | Post scan | Following audit | How to connect |
|-----------|:---------:|:---------------:|----------------|
| Reddit    | ✅ | ❌ | OAuth popup (Client ID + Secret) |
| Twitter/X | ✅ | ✅ | **Chrome extension** (zero setup) or OAuth popup |
| Facebook  | ✅ | ❌ | OAuth popup (App ID + Secret) |
| Instagram | ✅ | ✅ | **Chrome extension** or paste cURL from DevTools |
| LinkedIn  | ✅ | ❌ | OAuth popup (Client ID + Secret) |

---

## What Gets Flagged

Claude flags content that could be seen as concerning by a US immigration officer:

- Anti-US government or military sentiment
- Support for organizations designated as terrorist or extremist
- Support for US-adversarial countries
- Extreme criticism of US immigration policy
- Anti-American values (anti-democracy, anti-rule-of-law)

Normal political commentary, mild criticism, and cultural expression are **not** flagged.

---

## Chrome Extension (Recommended for Instagram & Twitter)

The extension reads your browser session cookies directly from Chrome — the only way to access `httpOnly` cookies like `sessionid` and `auth_token` — and sends them to the app. No API keys or developer accounts needed.

### Install

1. Clone this repo and open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `extension/` folder
4. The **V** icon appears in your toolbar

### Use

1. Log in to **instagram.com** and/or **x.com** in Chrome
2. Click the extension icon
3. Set the **App URL** (`http://localhost:8000` or `https://visa-cleanup.fly.dev`)
4. Click **Connect Instagram** and/or **Connect Twitter**

Done — both platforms show as connected in the app with no credential setup.

---

## Hosted Version

The app runs at **https://visa-cleanup.fly.dev** — no local setup needed.

Add credentials through the **Settings** UI (stored on the server volume, never committed to git). For Instagram and Twitter, use the Chrome extension pointing at `https://visa-cleanup.fly.dev`.

---

## Running Locally

### 1. Install dependencies

```bash
# Python backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

### 2. Start servers

```bash
# Terminal 1 — backend (port 8000)
uvicorn server:app --host 0.0.0.0 --port 8000

# Terminal 2 — frontend dev server (port 5173)
cd frontend && npm run dev
```

Open **http://localhost:5173** → click **Settings** to add credentials, or use the Chrome extension pointing at `http://localhost:8000`.

---

## Credentials Reference

| Service | Where to get it | Used for |
|---------|----------------|---------|
| **Anthropic API Key** | [console.anthropic.com](https://console.anthropic.com) → API keys | Content analysis — **required** |
| **Reddit** Client ID + Secret | [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) → create "web app" | Post/comment/upvote scan |
| **Twitter** | Chrome extension (zero setup) | Tweet/like scan + following audit |
| **Twitter** Client ID + Secret | [developer.twitter.com](https://developer.twitter.com) → OAuth 2.0 | Alternative to extension for post scan |
| **Facebook** App ID + Secret | [developers.facebook.com/apps](https://developers.facebook.com/apps) | Post scan |
| **Instagram** | Chrome extension (zero setup) | Post scan + following audit |
| **Instagram** cURL | DevTools → Network → any request → Copy as cURL | Alternative to extension |
| **LinkedIn** Client ID + Secret | [linkedin.com/developers](https://www.linkedin.com/developers) | Post scan |

---

## Project Structure

```
visa-social-cleanup/
├── server.py                  # FastAPI server — REST + WebSocket scan
├── analyzer.py                # Claude AI content analysis with caching
├── analyzer_interview.py      # Officer's Desk: dossier, mock interview, rewrite, prep
├── oauth_routes.py            # OAuth 2.0 + 1.0a popup flows
├── token_store.py             # Token/cookie persistence (Fly volume aware)
├── config.py                  # Credential loader (.env + Fly secrets)
├── platforms/
│   ├── twitter_client.py      # Browser-cookie + OAuth scan, following audit
│   ├── reddit_client.py
│   ├── facebook_client.py
│   ├── instagram_client.py    # Browser-cookie scan + following audit + cURL parser
│   └── linkedin_client.py
├── extension/                 # Chrome extension — one-click session connect
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   └── README.md
├── frontend/src/
│   ├── App.jsx                # View router + WebSocket state
│   └── components/
│       ├── Dashboard.jsx           # Platform selector + scan settings
│       ├── ConnectAccounts.jsx     # Full credentials/session management
│       ├── QuickSetupModal.jsx     # Inline setup modal before scan
│       ├── ScanTabsView.jsx        # Unified scan progress + results tabs
│       ├── ResultCard.jsx          # Per-item card with delete/unlike
│       ├── Dossier.jsx             # Intelligence brief (officer voice)
│       ├── MockInterview.jsx       # Chat-style officer interview
│       ├── PrepPackage.jsx         # Predicted questions + Visa-Ready score
│       ├── TwitterFollowingAudit.jsx
│       └── InstagramFollowingAudit.jsx
├── Dockerfile                 # Multi-stage build (Node → Python)
├── fly.toml                   # Fly.io config (512 MB VM, persistent volume)
└── requirements.txt
```

---

## Deployment (Fly.io)

```bash
# First deploy
fly launch

# Build frontend then deploy
npm --prefix frontend run build && fly deploy

# Secrets (use instead of .env on Fly)
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
fly secrets set APP_URL=https://visa-cleanup.fly.dev
fly secrets set ADMIN_SECRET=$(openssl rand -hex 32)
```

The app uses a persistent Fly volume (`/data`) for token and credential storage across deploys.

---

## Privacy & Security

- Credentials stored only in `.env` locally or Fly secrets in production — never committed to git
- OAuth tokens and browser session cookies stored on the Fly volume — not in the codebase
- Content sent only to the Anthropic Claude API for analysis
- Nothing is auto-deleted — you review and confirm every action
- Unfollow operations require explicit confirmation; 0.5–1.5s delay between each to avoid rate limits
- `/api/credentials` protected by origin check; non-browser access requires `X-Admin-Token` matching `ADMIN_SECRET`
- OAuth `postMessage` handlers validate `event.origin` before processing
- `/api/instagram/parse-curl` and `/api/instagram/cookies` validate required cookie fields before storing
