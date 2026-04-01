import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Check, ExternalLink, Loader2, Unlink, Eye, EyeOff, AlertCircle } from 'lucide-react'

const PLATFORMS = [
  {
    id: 'reddit',
    name: 'Reddit',
    color: '#ff4500',
    letter: 'R',
    description: 'Posts, comments, and upvotes',
    docsUrl: 'https://www.reddit.com/prefs/apps',
    docsLabel: 'reddit.com/prefs/apps',
    credFields: [
      { key: 'REDDIT_CLIENT_ID',     label: 'Client ID',     secret: false },
      { key: 'REDDIT_CLIENT_SECRET', label: 'Client Secret', secret: true  },
    ],
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    color: '#1d9bf0',
    letter: 'X',
    description: 'Tweets and likes',
    docsUrl: 'https://developer.twitter.com',
    docsLabel: 'developer.twitter.com',
    credFields: [
      { key: 'TWITTER_CLIENT_ID',     label: 'Client ID (OAuth 2.0)',     secret: false },
      { key: 'TWITTER_CLIENT_SECRET', label: 'Client Secret (OAuth 2.0)', secret: true  },
      { key: 'TWITTER_API_KEY',       label: 'API Key / Consumer Key (for Following Audit)',    secret: false },
      { key: 'TWITTER_API_SECRET',    label: 'API Secret / Consumer Secret (for Following Audit)', secret: true  },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: '#0a66c2',
    letter: 'in',
    description: 'Posts and shares',
    docsUrl: 'https://www.linkedin.com/developers',
    docsLabel: 'linkedin.com/developers',
    credFields: [
      { key: 'LINKEDIN_CLIENT_ID',     label: 'Client ID',     secret: false },
      { key: 'LINKEDIN_CLIENT_SECRET', label: 'Client Secret', secret: true  },
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877f2',
    letter: 'F',
    description: 'Posts and reactions',
    docsUrl: 'https://developers.facebook.com/apps',
    docsLabel: 'developers.facebook.com',
    credFields: [
      { key: 'FACEBOOK_APP_ID',     label: 'App ID',     secret: false },
      { key: 'FACEBOOK_APP_SECRET', label: 'App Secret', secret: true  },
    ],
  },
]

function PlatformCard({ platform, connected, serverReady, onConnect, onDisconnect }) {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [configuring, setConfiguring] = useState(false)
  const [fields, setFields] = useState({})
  const [saving, setSaving] = useState(false)

  const saveAndConnect = async () => {
    const hasAll = platform.credFields.every((f) => fields[f.key]?.trim())
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
      setConfiguring(false)
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
      `/oauth/${platform.id}/start`,
      `oauth_${platform.id}`,
      'width=600,height=700,scrollbars=yes,resizable=yes'
    )

    const onMessage = (e) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.platform !== platform.id) return
      window.removeEventListener('message', onMessage)
      clearInterval(pollClosed)
      setConnecting(false)
      if (e.data.type === 'oauth_success') {
        onConnect()
      } else if (e.data.type === 'oauth_error') {
        setError(e.data.message || 'Authorization failed.')
      }
    }
    window.addEventListener('message', onMessage)

    const pollClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(pollClosed)
        window.removeEventListener('message', onMessage)
        setConnecting(false)
        onConnect() // re-fetch status
      }
    }, 500)
  }

  return (
    <div className={`card px-5 py-4 transition-all ${!serverReady ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: platform.color + '18', color: platform.color }}
        >
          {platform.letter}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{platform.name}</span>
            {connected && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 font-semibold">
                <Check className="w-2.5 h-2.5" /> Connected
              </span>
            )}
            {!serverReady && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-500 font-medium">
                Not configured
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">{platform.description}</p>
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          {!serverReady ? (
            <button
              onClick={() => setConfiguring((c) => !c)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Configure
            </button>
          ) : connected ? (
            <button
              onClick={() => onDisconnect(platform.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <Unlink className="w-3 h-3" /> Disconnect
            </button>
          ) : (
            <button
              onClick={openPopup}
              disabled={connecting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: connecting ? '#9ca3af' : platform.color }}
            >
              {connecting && <Loader2 className="w-3 h-3 animate-spin" />}
              {connecting ? 'Opening…' : 'Connect →'}
            </button>
          )}
        </div>
      </div>

      {configuring && !connected && (
        <div className="mt-3 border-t border-gray-100 dark:border-zinc-800 pt-3 space-y-2.5">
          <p className="text-xs text-gray-400 dark:text-zinc-500">
            Create an app at <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">{platform.docsLabel}</a> and paste the credentials below.
          </p>
          {platform.credFields.map((f) =>
            f.secret
              ? <SecretInput key={f.key} label={f.label} envKey={f.key} onSave={(k, v) => setFields((prev) => ({ ...prev, [k]: v }))} />
              : <PlainInput  key={f.key} label={f.label} envKey={f.key} onSave={(k, v) => setFields((prev) => ({ ...prev, [k]: v }))} />
          )}
          <button
            onClick={saveAndConnect}
            disabled={saving}
            className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: platform.color }}
          >
            {saving ? 'Saving…' : 'Save & Connect →'}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

function AnthropicCard({ hasKey, onSaved }) {
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!key.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ANTHROPIC_API_KEY: key }),
      })
      const data = await res.json()
      onSaved(data)
      setKey('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card px-5 py-4">
      <div className="flex items-center gap-4 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 flex-shrink-0">
          AI
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Anthropic API Key</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 font-semibold">Required</span>
            {hasKey && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 font-semibold">
                <Check className="w-2.5 h-2.5" /> Set
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">Powers the AI content analysis</p>
        </div>
        <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors flex-shrink-0">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder={hasKey ? '••••••••••••••••••••••• (update)' : 'sk-ant-…'}
            className="w-full px-3 py-2 pr-9 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-sm text-gray-900 dark:text-zinc-200 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
          />
          <button type="button" onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <button
          onClick={save}
          disabled={!key.trim() || saving}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          {saving ? '…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function InstagramCard({ connected, onSaved }) {
  const [expanded, setExpanded] = useState(!connected)
  const [curl, setCurl] = useState('')
  const [loading, setLoading] = useState(false)
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
      // Re-fetch status so parent updates
      const status = await fetch('/api/status').then(r => r.json())
      onSaved(status)
      setExpanded(false)
      setCurl('')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="card px-5 py-4">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: '#e1306c18', color: '#e1306c' }}>IG</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Instagram</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 font-medium">Browser session</span>
            {connected && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 font-semibold">
                <Check className="w-2.5 h-2.5" /> Connected
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">
            Paste a cURL from instagram.com DevTools — no API keys or passwords needed.
          </p>
        </div>
        <button onClick={() => setExpanded(e => !e)}
          className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors flex-shrink-0">
          {connected ? 'Refresh' : 'Connect'}
        </button>
      </div>
      {expanded && (
        <div className="mt-4 space-y-3">
          {/* Extension shortcut hint */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-violet-50 dark:bg-violet-500/8 border border-violet-200 dark:border-violet-500/20 text-xs text-violet-700 dark:text-violet-300">
            <span className="text-base leading-none flex-shrink-0">⚡</span>
            <span>
              <strong>Faster:</strong> Install the{' '}
              <a href="https://github.com/saurabhraj-115/visa-social-cleanup/tree/master/extension"
                target="_blank" rel="noopener noreferrer"
                className="underline hover:text-violet-900 dark:hover:text-violet-100">
                Chrome extension
              </a>{' '}
              for one-click connect — no DevTools needed.
            </span>
          </div>

          <button onClick={() => setShowInstructions(s => !s)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 underline text-left">
            {showInstructions ? 'Hide manual instructions ▲' : 'Manual: copy cURL from DevTools ▼'}
          </button>
          {showInstructions && (
            <ol className="text-xs text-gray-500 dark:text-zinc-500 space-y-1 pl-4 list-decimal leading-relaxed border-l-2 border-gray-200 dark:border-zinc-700">
              <li>Open <strong>instagram.com</strong> in Chrome (logged in)</li>
              <li>Open DevTools → <strong>Network</strong> tab</li>
              <li>Refresh the page</li>
              <li>Right-click any request → <strong>Copy as cURL (bash)</strong></li>
              <li>Paste below</li>
            </ol>
          )}
          <textarea value={curl} onChange={(e) => setCurl(e.target.value)} rows={3}
            placeholder={"curl 'https://www.instagram.com/...' \\\n  -H 'cookie: sessionid=...' ..."}
            className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-zinc-200 placeholder:text-gray-400 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all" />
          <button onClick={parse} disabled={loading || !curl.trim()}
            className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-[#e1306c] hover:bg-[#c9175a] disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? 'Connecting…' : connected ? 'Refresh session →' : 'Connect Instagram →'}
          </button>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  )
}

export default function ConnectAccounts({ statusData, onBack, onSaved }) {
  const [status, setStatus] = useState(statusData)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/status')
      const data = await res.json()
      setStatus(data)
      onSaved(data)
    } catch {}
  }, [onSaved])

  const disconnect = async (platform) => {
    await fetch(`/oauth/${platform}`, { method: 'DELETE' })
    refresh()
  }

  const platforms = status?.platforms ?? {}
  const creds = status?.credentials_configured ?? {}

  return (
    <main className="max-w-xl mx-auto px-4 py-10 animate-fade-in-up">
      <button onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-1">Connect accounts</h1>
      <p className="text-sm text-gray-500 dark:text-zinc-500 mb-7">
        Click <strong>Connect</strong> — a popup opens, you approve, done. We never see your password.
      </p>

      {/* Anthropic */}
      <div className="mb-3">
        <AnthropicCard hasKey={status?.has_anthropic_key} onSaved={(s) => { setStatus(s); onSaved(s) }} />
      </div>

      {/* OAuth platforms */}
      <div className="space-y-3 mb-3">
        {PLATFORMS.map((p) => (
          <PlatformCard
            key={p.id}
            platform={p}
            connected={platforms[p.id] ?? false}
            serverReady={creds[p.id] ?? false}
            onConnect={refresh}
            onDisconnect={disconnect}
          />
        ))}
      </div>

      {/* Instagram */}
      <InstagramCard connected={platforms.instagram ?? false} onSaved={(s) => { setStatus(s); onSaved(s) }} />

      <p className="text-center text-xs text-gray-400 dark:text-zinc-700 mt-6">
        Tokens stored locally in <code className="text-gray-500 dark:text-zinc-600">.tokens.json</code> — never sent anywhere.
      </p>
    </main>
  )
}
