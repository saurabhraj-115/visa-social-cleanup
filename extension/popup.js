const DEFAULT_APP_URL = 'http://localhost:8000'
const STORAGE_KEY = 'visaCleanupAppUrl'

const appUrlInput = document.getElementById('appUrl')

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAppUrl() {
  return (appUrlInput.value.trim() || DEFAULT_APP_URL).replace(/\/$/, '')
}

function showStatus(el, type, msg) {
  el.className = 'status ' + type
  el.textContent = msg
}

async function getAllCookies(domain) {
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll({ domain }, (cookies) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve(cookies || [])
    })
  })
}

function cookieArrayToDict(cookies) {
  const dict = {}
  for (const c of cookies) dict[c.name] = c.value
  return dict
}

// ── On load: restore app URL + check existing connections ─────────────────────

chrome.storage.local.get([STORAGE_KEY], (res) => {
  appUrlInput.value = res[STORAGE_KEY] || DEFAULT_APP_URL
  checkStatuses()
})

appUrlInput.addEventListener('change', () => {
  chrome.storage.local.set({ [STORAGE_KEY]: appUrlInput.value.trim() })
  checkStatuses()
})

async function checkStatuses() {
  const appUrl = getAppUrl()
  try {
    const [igRes, twRes] = await Promise.all([
      fetch(`${appUrl}/api/instagram/session-status`).then(r => r.json()).catch(() => null),
      fetch(`${appUrl}/api/twitter/session-status`).then(r => r.json()).catch(() => null),
    ])
    if (igRes?.stored) showStatus(document.getElementById('igStatus'), 'success', '✓ Connected to app')
    if (twRes?.stored) showStatus(document.getElementById('twStatus'), 'success', '✓ Connected to app')
  } catch {}
}

// ── Instagram ─────────────────────────────────────────────────────────────────

document.getElementById('igBtn').addEventListener('click', async () => {
  const btn = document.getElementById('igBtn')
  const statusEl = document.getElementById('igStatus')
  btn.disabled = true
  showStatus(statusEl, 'info', 'Reading Instagram cookies…')

  try {
    const cookies = cookieArrayToDict(await getAllCookies('.instagram.com'))

    if (!cookies.sessionid) {
      showStatus(statusEl, 'error', 'Not logged in to Instagram. Open instagram.com and log in first.')
      return
    }

    showStatus(statusEl, 'info', 'Sending to app…')
    const resp = await fetch(`${getAppUrl()}/api/instagram/cookies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookies }),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.detail || `Server error ${resp.status}`)
    showStatus(statusEl, 'success', `✓ Connected${data.user_id ? ` (id: ${data.user_id})` : ''}`)
  } catch (err) {
    showStatus(statusEl, 'error', err.message || 'Failed to connect')
  } finally {
    btn.disabled = false
  }
})

// ── Twitter / X ───────────────────────────────────────────────────────────────

document.getElementById('twBtn').addEventListener('click', async () => {
  const btn = document.getElementById('twBtn')
  const statusEl = document.getElementById('twStatus')
  btn.disabled = true
  showStatus(statusEl, 'info', 'Reading Twitter cookies…')

  try {
    // Collect from both twitter.com and x.com
    const [twCookies, xCookies] = await Promise.all([
      getAllCookies('.twitter.com'),
      getAllCookies('.x.com'),
    ])
    // twitter.com takes precedence for auth_token (it's always set there)
    const cookies = { ...cookieArrayToDict(xCookies), ...cookieArrayToDict(twCookies) }

    if (!cookies.auth_token) {
      showStatus(statusEl, 'error', 'Not logged in to Twitter/X. Open x.com and log in first.')
      return
    }

    // twid is URL-encoded on some browsers: "u%3D1234" → "u=1234"
    if (cookies.twid) {
      cookies.twid = decodeURIComponent(cookies.twid)
    }

    showStatus(statusEl, 'info', 'Sending to app…')
    const resp = await fetch(`${getAppUrl()}/api/twitter/cookies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookies }),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.detail || `Server error ${resp.status}`)
    showStatus(statusEl, 'success', `✓ Connected${data.user_id ? ` (id: ${data.user_id})` : ''}`)
  } catch (err) {
    showStatus(statusEl, 'error', err.message || 'Failed to connect')
  } finally {
    btn.disabled = false
  }
})
