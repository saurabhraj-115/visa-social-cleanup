# Visa Social Media Cleanup

An AI-powered tool that scans your social media accounts for posts and likes that could raise concerns during a US visa interview. Claude AI analyzes your content and flags items for review — nothing is deleted automatically.

## Demo

![Dashboard](https://raw.githubusercontent.com/saurabhraj-115/visa-social-cleanup/master/docs/dashboard.png)

## Platforms Supported

| Platform  | Own Posts | Own Likes/Upvotes | Auth |
|-----------|:---------:|:-----------------:|------|
| Reddit    | ✅ | ✅ | OAuth 2.0 (client ID + secret) |
| Twitter/X | ✅ | ✅ | Bearer Token (free tier) |
| Facebook  | ✅ | ✅ | User Access Token |
| Instagram | ✅ | ❌ | Username + password |
| LinkedIn  | ✅ | ❌ | OAuth 2.0 (client ID + secret) |

## What It Flags

Content is analyzed by Claude and flagged if it could be seen as concerning by a US immigration officer:

- Anti-US government or military sentiment
- Support for organizations designated as terrorist or extremist by the US
- Support for US-adversarial countries (Russia, China, Iran, etc.)
- Extreme criticism of US immigration policy
- Anti-American values (anti-democracy, anti-rule-of-law)

Normal political commentary, mild criticism, or cultural expression is **not** flagged.

Severity levels: **High** · **Medium** · **Low** — you choose the threshold before scanning.

## Running the App

### 1. Install dependencies

```bash
# Python backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### 2. Start the servers

```bash
# Terminal 1 — backend (port 8000)
py -m uvicorn server:app --host 0.0.0.0 --port 8000

# Terminal 2 — frontend dev server (port 5173)
cd frontend
npm run dev
```

### 3. Open the app

Go to **http://localhost:5173** in your browser.

Click **Credentials** in the top-right to add your API keys — they are saved to a local `.env` file and never leave your machine.

### 4. Scan

Select the platforms you want to scan, choose a severity threshold, and click **Start Scan**. Results appear with direct links so you can review and remove flagged items manually.

---

## Getting Credentials

| Service | Where to get it |
|---------|----------------|
| **Anthropic** | [console.anthropic.com](https://console.anthropic.com) → API keys — **required** |
| **Reddit** | [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) → create "web app", redirect URI: `http://localhost:8080` |
| **Twitter/X** | [developer.twitter.com](https://developer.twitter.com) → your app → Keys and Tokens → Bearer Token |
| **Facebook** | [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer) → generate user token |
| **Instagram** | Just your login username + password |
| **LinkedIn** | [linkedin.com/developers](https://www.linkedin.com/developers) → create app, add "Sign In with LinkedIn" + "Share on LinkedIn" products, redirect URI: `http://localhost:8080` |

Reddit and LinkedIn use a browser-based OAuth flow on first scan — a browser tab opens, you approve access, and the token is saved automatically for future runs.

---

## CLI (optional)

You can also run scans from the command line without the UI:

```bash
python main.py --platforms reddit twitter --limit 50 --severity medium
```

```
--platforms   Platforms to scan (reddit twitter facebook instagram linkedin)
--severity    Minimum severity: low | medium | high  (default: medium)
--limit       Max items per platform — 50 for a quick test (default: all)
--output      Base filename for reports (default: report)
```

Generates `report.json` and `report.html` with clickable links to each flagged item.

---

## Project Structure

```
visa_cleanup/
├── server.py                 # FastAPI + WebSocket backend
├── main.py                   # CLI entry point
├── analyzer.py               # Claude AI content analysis
├── config.py                 # Credential loader (.env)
├── platforms/
│   ├── reddit_client.py
│   ├── twitter_client.py
│   ├── facebook_client.py
│   ├── instagram_client.py
│   ├── linkedin_client.py
│   └── oauth_flow.py         # Shared OAuth browser flow
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── Dashboard.jsx
│           ├── Setup.jsx     # Credential entry UI
│           ├── ScanProgress.jsx
│           ├── Results.jsx
│           └── ResultCard.jsx
├── requirements.txt
└── .env.example
```

## Privacy & Security

- Credentials are stored only in `.env` on your machine — never committed to git, never sent to any server
- Content is sent only to the Anthropic Claude API for analysis
- The tool only reads your posts — it never modifies or deletes anything
- Nothing is auto-deleted — you review and act manually
