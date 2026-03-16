# Visa Social Media Cleanup Agent

An AI-powered agent that scans your social media accounts for posts and likes that could raise concerns during a US visa interview. It uses Claude to analyze content and generates a report with direct links so you can review and remove flagged items.

## Platforms Supported

| Platform  | Own Posts | Own Likes/Upvotes | Notes |
|-----------|-----------|-------------------|-------|
| Reddit    | ✅ | ✅ | Free API via PRAW |
| Twitter/X | ✅ | ✅ | Requires Basic tier ($100/mo) |
| Facebook  | ✅ | ✅ | Free via Graph API |
| Instagram | ✅ | ❌ | Own posts only (unofficial API) |

## What It Flags

Content is analyzed by Claude and flagged if it could be seen as concerning by a US immigration officer, including:

- Anti-US government or military sentiment
- Support for US-adversarial countries (Russia, China, Iran, etc.)
- Support for organizations designated as terrorist or extremist by the US
- Extreme criticism of US immigration policy
- Anti-American values (anti-democracy, anti-rule-of-law)

Normal political commentary, mild criticism, or cultural expression is **not** flagged.

## Output

The agent generates:
- A color-coded terminal table (red = high severity, yellow = medium)
- `report.json` — machine-readable full report
- `report.html` — browser-friendly report with **clickable direct links** to each flagged item

The agent **never auto-deletes** anything — you stay in control.

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure credentials

```bash
cp .env.example .env
```

Fill in `.env` with your API credentials. See **[SETUP.md](SETUP.md)** for step-by-step instructions on getting credentials for each platform.

You'll need:
- **Anthropic API key** — [console.anthropic.com](https://console.anthropic.com)
- **Reddit** — free app at [reddit.com/prefs/apps](https://reddit.com/prefs/apps)
- **Twitter/X** — developer account at [developer.twitter.com](https://developer.twitter.com)
- **Facebook** — Meta Developer app at [developers.facebook.com](https://developers.facebook.com)
- **Instagram** — just your username and password

### 3. Run

```bash
# Test on Reddit only (free, no setup cost)
python main.py --platforms reddit --limit 50

# Scan all platforms
python main.py --platforms reddit twitter facebook instagram

# Open the HTML report with clickable links
start report.html   # Windows
open report.html    # Mac
```

## CLI Options

```
--platforms   Which platforms to scan (default: all)
--severity    Minimum severity to report: high or medium (default: medium)
--limit       Max items per platform — use 50 for a quick test (default: all)
--output      Base filename for reports (default: report)
```

## Project Structure

```
visa_cleanup/
├── main.py                   # CLI entry point
├── analyzer.py               # Claude API content analysis
├── reporter.py               # Terminal + JSON + HTML reports
├── config.py                 # Credential loader
├── platforms/
│   ├── reddit_client.py
│   ├── twitter_client.py
│   ├── facebook_client.py
│   └── instagram_client.py
├── requirements.txt
├── .env.example
└── SETUP.md                  # Credential setup guide
```

## Privacy & Security

- Your `.env` file is in `.gitignore` and will never be committed
- No data is sent anywhere except to the Claude API for analysis
- The agent only reads and reports — it never modifies your accounts
