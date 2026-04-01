# Visa Cleanup — Social Connect (Chrome Extension)

One-click Instagram & Twitter session connector for the Visa Social Cleanup app.
Eliminates manual API key setup and DevTools copy-paste entirely.

## How it works

The extension reads your browser session cookies directly from Chrome using
the privileged `chrome.cookies` API (the only way to access `httpOnly` cookies
like `sessionid` and `auth_token`) and POSTs them to your running app.

| Platform | Cookies used | Replaces |
|---|---|---|
| Instagram | `sessionid`, `csrftoken`, `ds_user_id` | Manual cURL copy-paste from DevTools |
| Twitter / X | `auth_token`, `ct0`, `twid` | OAuth 1.0a API key setup |

## Install (unpacked / developer mode)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. The "V" icon appears in your toolbar

## Usage

1. Log in to **instagram.com** and/or **x.com** in Chrome
2. Click the extension icon
3. Set the **App URL** if different from `http://localhost:8000`
   (for Fly.io use `https://visa-cleanup.fly.dev`)
4. Click **Connect Instagram →** and/or **Connect Twitter →**
5. Done — the app shows both platforms as connected

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Chrome extension manifest (Manifest V3) |
| `popup.html` | Extension popup UI with per-platform connect buttons |
| `popup.js` | Reads cookies, POSTs to `/api/instagram/cookies` and `/api/twitter/cookies` |

## Permissions

- `cookies`, `storage` — read session cookies, save app URL preference
- `https://*.instagram.com/` — Instagram cookie scope
- `https://*.twitter.com/`, `https://*.x.com/` — Twitter cookie scope
- `https://visa-cleanup.fly.dev/`, `http://localhost:8000/` — allowed app URLs
