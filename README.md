# Visa Social Media Cleanup

AI-powered tool that scans your social media accounts for content that could raise concerns at a US visa interview. Claude AI flags posts and likes for review — nothing is deleted automatically. Includes a mock officer interview to help you prepare.

**Live:** https://visa-cleanup.fly.dev

---

## Features

### Post & Like Scanner
Scan your own posts, comments, and likes across 5 platforms. Claude AI flags content that a consular officer might find concerning, grouped by severity.

### The Officer's Desk
After scanning, generate an intelligence-style dossier written in officer voice — the same perspective a consular officer would have reviewing your file. Then:
- **Mock Interview** — Claude plays the officer and asks pointed questions based on your flagged posts. You answer, Claude coaches you.
- **Prep Package** — predicted interview questions with suggested talking points. Export-ready.
- **Rewrite instead of delete** — Claude rewrites risky posts in a softer tone while keeping your voice.

### Twitter Following Audit
Separate tool that scans every account you follow (not your posts) and flags:
- 🚨 **Red flags** — extremist, anti-US, or terrorist-adjacent content in their bio
- 🏛️ **Politicians & parties** — elected officials, party accounts (BJP, INC, AAP, GOP, Labour, etc.)
- 📰 **Journalists & news outlets** — reporters, correspondents, major media accounts
- ✅ **Clean** — no flags

Lets you bulk-unfollow flagged accounts in one click with confirmation.

---

## Platforms

| Platform  | Posts | Likes/Upvotes | Following Audit | Auth |
|-----------|:-----:|:-------------:|:---------------:|------|
| Reddit    | ✅ | ✅ | ❌ | OAuth 2.0 popup |
| Twitter/X | ✅ | ✅ | ✅ | OAuth 2.0 (posts) + OAuth 1.0a (following) |
| Facebook  | ✅ | ✅ | ❌ | OAuth 2.0 popup |
| Instagram | ✅ | ❌ | ❌ | Username + password |
| LinkedIn  | ✅ | ❌ | ❌ | OAuth 2.0 popup |

---

## What Gets Flagged

Claude flags content that could be seen as concerning by a US immigration officer:

- Anti-US government or military sentiment
- Support for organizations designated as terrorist or extremist
- Support for US-adversarial countries
- Extreme criticism of US immigration policy
- Anti-American values (anti-democracy, anti-rule-of-law)

Normal political commentary, mild criticism, and cultural expression are **not** flagged.

**Severity levels:** High · Medium · Low — choose your threshold before scanning.

---

## Hosted Version

The app is deployed at **https://visa-cleanup.fly.dev** — no local setup needed. Add your credentials through the Settings UI (stored securely on the server volume, never committed to git).

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

Open **http://localhost:5173** and click **Settings** to add your API keys.

### 3. Scan

Select platforms, choose severity threshold, click **Start Scan**. Flagged items include direct links for manual review.

---

## Credentials

| Service | Where to get it | Used for |
|---------|----------------|---------|
| **Anthropic API Key** | [console.anthropic.com](https://console.anthropic.com) → API keys | Content analysis — **required** |
| **Reddit** Client ID + Secret | [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) → create "web app" | Post/comment/upvote scan |
| **Twitter** Client ID + Secret | [developer.twitter.com](https://developer.twitter.com) → OAuth 2.0 settings | Tweet/like scan |
| **Twitter** API Key + Secret | [developer.twitter.com](https://developer.twitter.com) → Consumer Keys | Following list audit |
| **Facebook** App ID + Secret | [developers.facebook.com/apps](https://developers.facebook.com/apps) | Post scan |
| **Instagram** | Username + password | Post scan (no public OAuth for personal accounts) |
| **LinkedIn** Client ID + Secret | [linkedin.com/developers](https://www.linkedin.com/developers) | Post scan |

All platforms except Instagram use an OAuth popup flow — click Connect, approve in the browser, done. No manual token copying.

**Twitter needs two separate credential sets:**
- OAuth 2.0 (Client ID / Secret) — for scanning your own tweets and likes
- OAuth 1.0a (API Key / API Secret, found under "Consumer Keys") — for the following list audit, because the v2 following API requires a paid tier

---

## Project Structure

```
visa-social-cleanup/
├── server.py                  # FastAPI backend + WebSocket scan
├── analyzer.py                # Claude AI content analysis with SHA-256 caching
├── analyzer_interview.py      # Officer's Desk: dossier, mock interview, rewrite, prep package
├── oauth_routes.py            # OAuth 2.0 + 1.0a popup flows for all platforms
├── token_store.py             # JSON token persistence (DATA_DIR aware for Fly volumes)
├── config.py                  # Credential loader (.env + Fly secrets)
├── main.py                    # CLI entry point
├── platforms/
│   ├── twitter_client.py      # OAuth 2.0 scan + OAuth 1.0a following audit + pattern detection
│   ├── reddit_client.py
│   ├── facebook_client.py
│   ├── instagram_client.py
│   └── linkedin_client.py
├── frontend/src/
│   ├── App.jsx                # View router
│   └── components/
│       ├── Dashboard.jsx      # Platform selector + scan settings
│       ├── ConnectAccounts.jsx# OAuth popup UI for all platforms
│       ├── QuickSetupModal.jsx# Inline credential modal when scanning unconfigured platforms
│       ├── ScanProgress.jsx   # Real-time WebSocket progress
│       ├── Results.jsx        # Flagged content list
│       ├── ResultCard.jsx     # Per-item card with delete/unlike button
│       ├── Dossier.jsx        # Intelligence brief (officer voice)
│       ├── MockInterview.jsx  # Chat-style officer interview
│       ├── PrepPackage.jsx    # Predicted questions + Visa-Ready score
│       └── TwitterFollowingAudit.jsx  # Full following audit UI
├── Dockerfile                 # Multi-stage build (Node → Python)
├── fly.toml                   # Fly.io config (512mb VM, persistent volume)
└── requirements.txt
```

---

## Deployment (Fly.io)

```bash
fly launch   # first time
fly deploy   # subsequent deploys

# Set secrets (used instead of .env on Fly)
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
fly secrets set APP_URL=https://visa-cleanup.fly.dev
```

The app uses a persistent Fly volume (`/data`) for token and credential storage across deploys.

---

## Privacy & Security

- Credentials stored only in `.env` locally or Fly secrets in production — never committed to git
- OAuth tokens stored in `.tokens.json` on the Fly volume — not in the codebase
- Content sent only to the Anthropic Claude API for analysis
- Nothing is auto-deleted — you review and confirm every action
- Following audit unfollows require explicit confirmation with a 0.5s delay between each
