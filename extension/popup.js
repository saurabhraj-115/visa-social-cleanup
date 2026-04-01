const DEFAULT_APP_URL = 'http://localhost:8000'
const STORAGE_KEY = 'visaCleanupAppUrl'

const appUrlInput = document.getElementById('appUrl')

// Restore saved app URL
chrome.storage.local.get([STORAGE_KEY], (res) => {
  appUrlInput.value = res[STORAGE_KEY] || DEFAULT_APP_URL
})
appUrlInput.addEventListener('change', () => {
  chrome.storage.local.set({ [STORAGE_KEY]: appUrlInput.value.trim() })
})

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
      else resolve(cookies)
    })
  })
}

function cookieArrayToDict(cookies) {
  const dict = {}
  for (const c of cookies) dict[c.name] = c.value
  return dict
}

// ── Instagram ────────────────────────────────────────────────────────────────

document.getElementById('igBtn').addEventListener('click', async () => {
  const btn = document.getElementById('igBtn')
  const statusEl = document.getElementById('igStatus')
  btn.disabled = true
  showStatus(statusEl, 'info', 'Reading Instagram cookies…')

  try {
    const cookies = cookieArrayToDict(await getAllCookies('.instagram.com'))

    if (!cookies.sessionid) {
      showStatus(statusEl, 'error', 'Not logged in to Instagram. Open instagram.com and log in first.')
      btn.disabled = false
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
    showStatus(statusEl, 'success', `Connected! (user_id: ${data.user_id || '?'})`)
  } catch (err) {
    showStatus(statusEl, 'error', err.message || 'Failed to connect')
  } finally {
    btn.disabled = false
  }
})

// ── Twitter / X ──────────────────────────────────────────────────────────────

document.getElementById('twBtn').addEventListener('click', async () => {
  const btn = document.getElementById('twBtn')
  const statusEl = document.getElementById('twStatus')
  btn.disabled = true
  showStatus(statusEl, 'info', 'Reading Twitter cookies…')

  try {
    // Collect from both twitter.com and x.com (they share cookies via twitter.com domain)
    const [twCookies, xCookies] = await Promise.all([
      getAllCookies('.twitter.com'),
      getAllCookies('.x.com'),
    ])
    // Merge; x.com values take precedence if they differ
    const cookies = { ...cookieArrayToDict(twCookies), ...cookieArrayToDict(xCookies) }

    if (!cookies.auth_token) {
      showStatus(statusEl, 'error', 'Not logged in to Twitter/X. Open x.com and log in first.')
      btn.disabled = false
      return
    }

    showStatus(statusEl, 'info', 'Sending to app…')
    const resp = await fetch(`${getAppUrl()}/api/twitter/cookies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookies }),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.detail || `Server error ${resp.status}`)
    showStatus(statusEl, 'success', `Connected! (user_id: ${data.user_id || '?'})`)
  } catch (err) {
    showStatus(statusEl, 'error', err.message || 'Failed to connect')
  } finally {
    btn.disabled = false
  }
})
