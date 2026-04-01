import { useState, useEffect } from 'react'
import { X, Check, Loader2, Eye, EyeOff, AlertCircle, ExternalLink } from 'lucide-react'
// Eye/EyeOff used by FieldInput for OAuth secret fields

const PLATFORM_META = {
  reddit: {
    name: 'Reddit', color: '#ff4500', letter: 'R',
    docsUrl: 'https://www.reddit.com/prefs/apps', docsLabel: 'reddit.com/prefs/apps',
    credFields: [
      { key: 'REDDIT_CLIENT_ID',     label: 'Client ID',     secret: false },
      { key: 'REDDIT_CLIENT_SECRET', label: 'Client Secret', secret: true  },
    ],
  },
  linkedin: {
    name: 'LinkedIn', color: '#0a66c2', letter: 'in',
    docsUrl: 'https://www.linkedin.com/developers', docsLabel: 'linkedin.com/developers',
    credFields: [
      { key: 'LINKEDIN_CLIENT_ID',     label: 'Client ID',     secret: false },
      { key: 'LINKEDIN_CLIENT_SECRET', label: 'Client Secret', secret: true  },
    ],
  },
  facebook: {
    name: 'Facebook', color: '#1877f2', letter: 'F',
    docsUrl: 'https://developers.facebook.com/apps', docsLabel: 'developers.facebook.com',
    credFields: [
      { key: 'FACEBOOK_APP_ID',     label: 'App ID',     secret: false },
      { key: 'FACEBOOK_APP_SECRET', label: 'App Secret', secret: true  },
    ],
  },
}

function FieldInput({ label, envKey, secret, value, onChange }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type={secret && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(envKey, e.target.value)}
          placeholder={secret ? '••••••••' : ''}
          className="w-full px-3 py-2 pr-8 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-sm text-gray-900 dark:text-zinc-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
        />
        {secret && (
          <button type="button" onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  )
}

function OAuthPlatformSection({ platformId, onConfigured }) {
  const meta = PLATFORM_META[platformId]
  const [fields, setFields] = useState({})
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  const handleFieldChange = (key, val) => setFields((f) => ({ ...f, [key]: val }))

  const saveAndConnect = async () => {
    const hasAll = meta.credFields.every((f) => fields[f.key]?.trim())
    if (!hasAll) { setError('Fill in all fields first.'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error('Failed to save credentials')
      setSaving(false)
      openPopup()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const openPopup = () => {
    setConnecting(true)
    setError(null)
    const popup = window.open(
      `/oauth/${platformId}/start`,
      `oauth_${platformId}`,
      'width=600,height=700,scrollbars=yes,resizable=yes'
    )
    const onMessage = (e) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.platform !== platformId) return
      window.removeEventListener('message', onMessage)
      clearInterval(pollClosed)
      setConnecting(false)
      if (e.data.type === 'oauth_success') {
        setDone(true)
        onConfigured(platformId)
      } else {
        setError(e.data.message || 'Authorization failed.')
      }
    }
    window.addEventListener('message', onMessage)
    const pollClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(pollClosed)
        window.removeEventListener('message', onMessage)
        setConnecting(false)
        // Re-check status to see if token was saved
        fetch('/api/status').then(r => r.json()).then(data => {
          if (data.platforms?.[platformId]) {
            setDone(true)
            onConfigured(platformId)
          }
        }).catch(() => {})
      }
    }, 500)
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{ backgroundColor: meta.color + '20', color: meta.color }}>
          {meta.letter}
        </div>
        <span className="text-sm text-green-700 dark:text-green-400 font-medium">{meta.name} connected</span>
        <Check className="w-4 h-4 text-green-600 dark:text-green-400 ml-auto" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{ backgroundColor: meta.color + '20', color: meta.color }}>
          {meta.letter}
        </div>
        <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{meta.name}</span>
        <a href={meta.docsUrl} target="_blank" rel="noopener noreferrer"
          className="ml-auto text-gray-400 hover:text-violet-500 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      <p className="text-xs text-gray-500 dark:text-zinc-500">
        Create an app at <a href={meta.docsUrl} target="_blank" rel="noopener noreferrer"
          className="underline hover:text-gray-700 dark:hover:text-zinc-300">{meta.docsLabel}</a> then paste credentials:
      </p>
      <div className="space-y-2">
        {meta.credFields.map((f) => (
          <FieldInput key={f.key} label={f.label} envKey={f.key} secret={f.secret}
            value={fields[f.key] ?? ''} onChange={handleFieldChange} />
        ))}
      </div>
      <button onClick={saveAndConnect} disabled={saving || connecting}
        className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ backgroundColor: (saving || connecting) ? '#9ca3af' : meta.color }}>
        {(saving || connecting) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {saving ? 'Saving…' : connecting ? 'Opening browser…' : 'Save & Connect →'}
      </button>
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

function TwitterBrowserSection({ onConfigured }) {
  const [checking, setChecking] = useState(true)
  const [done, setDone] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [curl, setCurl] = useState('')
  const [loading, setLoading] = useState(false)

  // On mount: check if Twitter browser session already stored
  useEffect(() => {
    fetch('/api/twitter/session-status')
      .then(r => r.json())
      .then(data => {
        if (data.stored) { setDone(true); onConfigured('twitter') }
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [onConfigured])

  // OAuth popup fallback
  const openOAuth = () => {
    setConnecting(true); setError(null)
    const popup = window.open('/oauth/twitter/start', 'oauth_twitter', 'width=600,height=700,scrollbars=yes')
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.platform !== 'twitter') return
      window.removeEventListener('message', onMsg); clearInterval(poll)
      setConnecting(false)
      if (e.data.type === 'oauth_success') { setDone(true); onConfigured('twitter') }
      else setError(e.data.message || 'Authorization failed.')
    }
    window.addEventListener('message', onMsg)
    const poll = setInterval(() => {
      if (popup?.closed) {
        clearInterval(poll); window.removeEventListener('message', onMsg); setConnecting(false)
        fetch('/api/status').then(r => r.json()).then(d => {
          if (d.platforms?.twitter) { setDone(true); onConfigured('twitter') }
        }).catch(() => {})
      }
    }, 500)
  }

  if (checking) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-700">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-zinc-500">Checking Twitter session…</span>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold bg-[#1d9bf020] text-[#1d9bf0] flex-shrink-0">X</div>
        <span className="text-sm text-green-700 dark:text-green-400 font-medium">Twitter connected</span>
        <Check className="w-4 h-4 text-green-600 dark:text-green-400 ml-auto" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold bg-[#1d9bf020] text-[#1d9bf0] flex-shrink-0">X</div>
        <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Twitter / X</span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#1d9bf0]/10 text-[#1d9bf0] font-medium">Browser session</span>
      </div>

      {/* Extension — primary path */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#1d9bf0]/8 border border-[#1d9bf0]/20 text-xs text-[#0e6da8] dark:text-[#60c0f8]">
        <span className="text-base leading-none flex-shrink-0">⚡</span>
        <span>
          Fastest: install the{' '}
          <a href="https://github.com/anthropics/visa-social-cleanup/tree/master/extension"
            target="_blank" rel="noopener noreferrer" className="underline font-medium">Chrome extension</a>
          {' '}→ click Connect Twitter → come back here.
        </span>
      </div>

      {/* OAuth fallback */}
      <div className="space-y-2">
        <button onClick={() => setShowInstructions(s => !s)}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 underline text-left">
          {showInstructions ? 'Hide OAuth fallback ▲' : 'No extension? Use OAuth instead ▼'}
        </button>
        {showInstructions && (
          <button onClick={openOAuth} disabled={connecting}
            className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {connecting ? 'Opening Twitter…' : 'Connect via OAuth →'}
          </button>
        )}
      </div>

      {/* Manual re-check after extension use */}
      <button
        onClick={() => {
          fetch('/api/twitter/session-status').then(r => r.json()).then(d => {
            if (d.stored) { setDone(true); onConfigured('twitter') }
            else setError('No session found yet — connect via the extension first.')
          })
        }}
        className="w-full py-1.5 rounded-xl text-xs font-medium border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
        I connected via the extension — check again ↺
      </button>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

function InstagramSection({ onConfigured }) {
  const [curl, setCurl] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const [showInstructions, setShowInstructions] = useState(false)

  const parse = async () => {
    if (!curl.trim()) { setError('Paste a cURL command first.'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/instagram/parse-curl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curl: curl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to parse cURL')
      setDone(true)
      onConfigured('instagram')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold bg-pink-100 dark:bg-pink-500/20 text-pink-600 flex-shrink-0">IG</div>
        <span className="text-sm text-green-700 dark:text-green-400 font-medium">Instagram session connected</span>
        <Check className="w-4 h-4 text-green-600 dark:text-green-400 ml-auto" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold bg-pink-100 dark:bg-pink-500/20 text-pink-600 flex-shrink-0">IG</div>
        <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Instagram</span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 font-medium">Browser session</span>
      </div>
      <button onClick={() => setShowInstructions(s => !s)}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 underline text-left">
        {showInstructions ? 'Hide instructions ▲' : 'How to get a cURL ▼'}
      </button>
      {showInstructions && (
        <ol className="text-xs text-gray-500 dark:text-zinc-500 space-y-1 pl-4 list-decimal leading-relaxed">
          <li>Open <strong>instagram.com</strong> in Chrome (logged in)</li>
          <li>Open DevTools → <strong>Network</strong> tab</li>
          <li>Refresh the page</li>
          <li>Right-click any request → <strong>Copy as cURL (bash)</strong></li>
          <li>Paste below</li>
        </ol>
      )}
      <textarea value={curl} onChange={(e) => setCurl(e.target.value)} rows={3}
        placeholder={"curl 'https://www.instagram.com/...' \\\n  -H 'cookie: sessionid=...' ..."}
        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-zinc-200 placeholder:text-gray-400 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all" />
      <button onClick={parse} disabled={loading || !curl.trim()}
        className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-[#e1306c] hover:bg-[#c9175a] disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {loading ? 'Connecting…' : 'Connect Instagram →'}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export default function QuickSetupModal({ platforms, onDone, onClose }) {
  // platforms: array of platform ids that need setup, e.g. ['reddit', 'instagram']
  const [configured, setConfigured] = useState(new Set())

  const handleConfigured = (platformId) => {
    setConfigured((prev) => new Set([...prev, platformId]))
  }

  const allDone = platforms.every((p) => configured.has(p))

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-700 animate-fade-in-up">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Quick setup</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
              Configure {platforms.length === 1 ? 'this platform' : 'these platforms'} to start the scan
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform sections */}
        <div className="p-5 space-y-3">
          {platforms.map((platformId) =>
            platformId === 'instagram' ? (
              <InstagramSection key={platformId} onConfigured={handleConfigured} />
            ) : platformId === 'twitter' ? (
              <TwitterBrowserSection key={platformId} onConfigured={handleConfigured} />
            ) : (
              <OAuthPlatformSection key={platformId} platformId={platformId} onConfigured={handleConfigured} />
            )
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 px-5 py-4 rounded-b-2xl">
          <button
            onClick={onDone}
            disabled={!allDone}
            className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
              allDone
                ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/25'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed'
            }`}
          >
            {allDone ? (
              <><Check className="w-4 h-4" /> Start scan</>
            ) : (
              `Connect ${platforms.length - configured.size} more platform${platforms.length - configured.size !== 1 ? 's' : ''} to continue`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
