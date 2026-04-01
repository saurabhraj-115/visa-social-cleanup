import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, AlertTriangle, Newspaper, Check, Loader2, ExternalLink, Eye, EyeOff, Users, Landmark } from 'lucide-react'

function wsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws/twitter/following`
}

// ── Connect section ───────────────────────────────────────────────────────────

function ConnectSection({ credentialsConfigured, onConnected }) {
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  const saveAndConnect = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) { setError('Fill in both fields.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ TWITTER_API_KEY: apiKey, TWITTER_API_SECRET: apiSecret }),
      })
      if (!res.ok) throw new Error('Failed to save credentials')
      setSaving(false)
      openPopup()
    } catch (e) { setError(e.message); setSaving(false) }
  }

  const openPopup = () => {
    setConnecting(true); setError(null)
    const popup = window.open('/oauth/twitter_following/start', 'oauth_tf', 'width=600,height=700,scrollbars=yes')
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.platform !== 'twitter_following') return
      window.removeEventListener('message', onMsg)
      clearInterval(poll)
      setConnecting(false)
      if (e.data.type === 'oauth_success') onConnected()
      else setError(e.data.message || 'Authorization failed.')
    }
    window.addEventListener('message', onMsg)
    const poll = setInterval(() => {
      if (popup?.closed) {
        clearInterval(poll); window.removeEventListener('message', onMsg); setConnecting(false)
        onConnected() // re-check status
      }
    }, 500)
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-[#1d9bf020] flex items-center justify-center text-sm font-bold text-[#1d9bf0]">X</div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Twitter Following Audit</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Requires OAuth 1.0a credentials</p>
          </div>
        </div>

        {/* Extension shortcut */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#1d9bf0]/8 border border-[#1d9bf0]/20 text-xs text-[#0e6da8] dark:text-[#60c0f8]">
          <span className="text-base leading-none flex-shrink-0">⚡</span>
          <span>
            <strong>Fastest:</strong> Install the{' '}
            <a href="https://github.com/saurabhraj-115/visa-social-cleanup/tree/master/extension"
              target="_blank" rel="noopener noreferrer" className="underline">
              Chrome extension
            </a>{' '}
            — one click, no API keys needed. Or use the OAuth flow below.
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-zinc-500 leading-relaxed">
          The following list API requires <strong>Consumer Key / Secret</strong> (OAuth 1.0a), found under
          <strong> Keys and tokens → Consumer Keys</strong> in your{' '}
          <a href="https://developer.twitter.com/en/portal/projects-and-apps" target="_blank" rel="noopener noreferrer"
            className="underline hover:text-gray-700 dark:hover:text-zinc-300">Twitter developer app</a>.
          {' '}These are different from the Client ID/Secret used for post scanning.
        </p>

        {!credentialsConfigured ? (
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">API Key (Consumer Key)</label>
              <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-sm text-gray-900 dark:text-zinc-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d9bf0]/40 focus:border-[#1d9bf0] transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">API Secret (Consumer Secret)</label>
              <div className="relative">
                <input type={showSecret ? 'text' : 'password'} value={apiSecret} onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="••••••••••••••••••••••••••••••••••••••••••••••••••"
                  className="w-full px-3 py-2 pr-9 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-sm text-gray-900 dark:text-zinc-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d9bf0]/40 focus:border-[#1d9bf0] transition-all" />
                <button type="button" onClick={() => setShowSecret((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <button onClick={saveAndConnect} disabled={saving || connecting}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {(saving || connecting) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'Saving…' : connecting ? 'Opening Twitter…' : 'Save & Connect →'}
            </button>
          </div>
        ) : (
          <button onClick={openPopup} disabled={connecting}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {connecting ? 'Opening Twitter…' : 'Connect Twitter →'}
          </button>
        )}

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{error}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Progress screen ───────────────────────────────────────────────────────────

function ProgressScreen({ phase, count }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <Loader2 className="w-10 h-10 text-[#1d9bf0] animate-spin" />
      <p className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
        {phase === 'ids' ? 'Fetching following list…' : 'Loading account details…'}
      </p>
      <p className="text-sm text-gray-500 dark:text-zinc-500">
        {count > 0 ? `${count.toLocaleString()} accounts so far` : 'Starting up…'}
      </p>
      <p className="text-xs text-gray-400 dark:text-zinc-600 max-w-xs text-center">
        Large lists can take a minute. Rate-limit aware — no risk of ban.
      </p>
    </div>
  )
}

// ── Account card ──────────────────────────────────────────────────────────────

function AccountCard({ account, checked, onToggle, category }) {
  const categoryColor = category === 'red_flag'
    ? 'border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5'
    : category === 'political'
    ? 'border-purple-200 dark:border-purple-500/20 bg-purple-50/50 dark:bg-purple-500/5'
    : category === 'journalist'
    ? 'border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5'
    : 'border-gray-200 dark:border-zinc-700'

  return (
    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${categoryColor} ${checked ? 'opacity-100' : 'opacity-60'}`}>
      <input type="checkbox" checked={checked} onChange={onToggle}
        className="mt-1 accent-[#1d9bf0] cursor-pointer flex-shrink-0" />
      <img src={account.profile_image?.replace('_normal', '_mini') || ''} alt=""
        className="w-8 h-8 rounded-full flex-shrink-0 bg-gray-200 dark:bg-zinc-700"
        onError={(e) => { e.target.style.display = 'none' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">{account.name}</span>
          <span className="text-xs text-gray-400 dark:text-zinc-500 truncate">@{account.screen_name}</span>
        </div>
        {account.description && (
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5 line-clamp-2">{account.description}</p>
        )}
        {account.matched_patterns?.length > 0 && (
          <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5 font-medium">
            Matched: {account.matched_patterns.slice(0, 2).join(', ')}
          </p>
        )}
      </div>
      <a href={`https://x.com/${account.screen_name}`} target="_blank" rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-gray-300 dark:text-zinc-600 hover:text-[#1d9bf0] transition-colors flex-shrink-0 mt-0.5">
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </label>
  )
}

// ── Results ───────────────────────────────────────────────────────────────────

function Results({ data, onNewScan }) {
  const { red_flags, political, journalists, clean_count, total } = data

  const initSelected = () => {
    const s = {}
    red_flags.forEach((a) => { s[a.user_id] = true })
    political.forEach((a) => { s[a.user_id] = true })
    journalists.forEach((a) => { s[a.user_id] = true })
    return s
  }
  const [selected, setSelected] = useState(initSelected)
  const [unfollowing, setUnfollowing] = useState(false)
  const [done, setDone] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState(null)

  const toggleAll = (accounts, val) => {
    setSelected((prev) => {
      const next = { ...prev }
      accounts.forEach((a) => { next[a.user_id] = val })
      return next
    })
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const allFlagged = [...red_flags, ...political, ...journalists]

  const doUnfollow = async () => {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k)
    setUnfollowing(true); setError(null)
    try {
      const res = await fetch('/api/twitter/unfollow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: ids }),
      })
      const data = await res.json()
      if (data.ok) setDone(data)
      else setError(data.error || 'Unfollow failed')
    } catch (e) { setError(e.message) }
    setUnfollowing(false)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/15 flex items-center justify-center">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">Done</h2>
        <p className="text-gray-500 dark:text-zinc-400">
          Unfollowed <strong>{done.succeeded}</strong> account{done.succeeded !== 1 ? 's' : ''}.
          {done.failed > 0 && ` ${done.failed} failed (already unfollowed or protected).`}
        </p>
        <button onClick={onNewScan}
          className="mt-4 px-6 py-2.5 rounded-xl bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-sm font-semibold transition-colors">
          Run another audit
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Red flags',   count: red_flags.length,  color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-500/10' },
          { label: 'Political',   count: political.length,   color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
          { label: 'Journalists', count: journalists.length, color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Clean',       count: clean_count,        color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-500/10' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-3 text-center`}>
            <p className={`text-xl font-bold ${color}`}>{count.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 dark:text-zinc-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {allFlagged.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-3xl mb-3">✅</div>
          <p className="font-semibold text-gray-900 dark:text-zinc-100">All clear</p>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            No red flags, political, or journalist accounts found in your {total.toLocaleString()} follows.
          </p>
        </div>
      ) : (
        <>
          {/* Red flags */}
          {red_flags.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4" /> Red flags ({red_flags.length})
                </h3>
                <div className="flex gap-2 text-xs text-gray-500">
                  <button onClick={() => toggleAll(red_flags, true)} className="hover:text-gray-900 dark:hover:text-zinc-100">All</button>
                  <span>/</span>
                  <button onClick={() => toggleAll(red_flags, false)} className="hover:text-gray-900 dark:hover:text-zinc-100">None</button>
                </div>
              </div>
              <div className="space-y-2">
                {red_flags.map((a) => (
                  <AccountCard key={a.user_id} account={a} category="red_flag"
                    checked={!!selected[a.user_id]}
                    onToggle={() => setSelected((s) => ({ ...s, [a.user_id]: !s[a.user_id] }))} />
                ))}
              </div>
            </section>
          )}

          {/* Political */}
          {political.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-400">
                  <Landmark className="w-4 h-4" /> Politicians & parties ({political.length})
                </h3>
                <div className="flex gap-2 text-xs text-gray-500">
                  <button onClick={() => toggleAll(political, true)} className="hover:text-gray-900 dark:hover:text-zinc-100">All</button>
                  <span>/</span>
                  <button onClick={() => toggleAll(political, false)} className="hover:text-gray-900 dark:hover:text-zinc-100">None</button>
                </div>
              </div>
              <div className="space-y-2">
                {political.map((a) => (
                  <AccountCard key={a.user_id} account={a} category="political"
                    checked={!!selected[a.user_id]}
                    onToggle={() => setSelected((s) => ({ ...s, [a.user_id]: !s[a.user_id] }))} />
                ))}
              </div>
            </section>
          )}

          {/* Journalists */}
          {journalists.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  <Newspaper className="w-4 h-4" /> Journalists & news ({journalists.length})
                </h3>
                <div className="flex gap-2 text-xs text-gray-500">
                  <button onClick={() => toggleAll(journalists, true)} className="hover:text-gray-900 dark:hover:text-zinc-100">All</button>
                  <span>/</span>
                  <button onClick={() => toggleAll(journalists, false)} className="hover:text-gray-900 dark:hover:text-zinc-100">None</button>
                </div>
              </div>
              <div className="space-y-2">
                {journalists.map((a) => (
                  <AccountCard key={a.user_id} account={a} category="journalist"
                    checked={!!selected[a.user_id]}
                    onToggle={() => setSelected((s) => ({ ...s, [a.user_id]: !s[a.user_id] }))} />
                ))}
              </div>
            </section>
          )}

          {/* Confirm unfollow */}
          <div className="card p-5 space-y-3">
            {!confirmed ? (
              <>
                <p className="text-sm text-gray-700 dark:text-zinc-300">
                  <strong>{selectedCount}</strong> account{selectedCount !== 1 ? 's' : ''} selected to unfollow.
                  Uncheck any you want to keep.
                </p>
                <button
                  onClick={() => setConfirmed(true)}
                  disabled={selectedCount === 0}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Review & Confirm Unfollow →
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                  Unfollow {selectedCount} account{selectedCount !== 1 ? 's' : ''}?
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  This cannot be undone automatically. Twitter adds a 0.5s delay between each unfollow.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmed(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                    Cancel
                  </button>
                  <button onClick={doUnfollow} disabled={unfollowing}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                    {unfollowing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {unfollowing ? 'Unfollowing…' : 'Unfollow now'}
                  </button>
                </div>
              </>
            )}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TwitterFollowingAudit({ statusData, onBack, compact }) {
  const oauthConnected = statusData?.twitter_following_connected ?? false
  const browserConnected = statusData?.twitter_browser_connected ?? false
  const credentialsConfigured = statusData?.credentials_configured?.twitter_following ?? false

  const [phase, setPhase] = useState('idle') // idle | connecting | fetching | done | error | session_expired
  const [progress, setProgress] = useState({ phase: null, count: 0 })
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [expiredMessage, setExpiredMessage] = useState(null)
  const [isConnected, setIsConnected] = useState(oauthConnected || browserConnected)
  const wsRef = useRef(null)

  const handleConnected = async () => {
    try {
      const res = await fetch('/api/status')
      const data = await res.json()
      setIsConnected((data.twitter_following_connected || data.twitter_browser_connected) ?? false)
    } catch {}
  }

  const startAudit = () => {
    setPhase('connecting')
    setError(null)
    setResults(null)

    const ws = new WebSocket(wsUrl())
    wsRef.current = ws

    ws.onopen = () => setPhase('fetching')

    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data)
      if (msg.type === 'progress') {
        setProgress({ phase: msg.phase, count: msg.count })
      } else if (msg.type === 'fetch_done') {
        setProgress({ phase: 'details', count: msg.total })
      } else if (msg.type === 'done') {
        setResults(msg)
        setPhase('done')
        ws.close()
      } else if (msg.type === 'session_expired') {
        setExpiredMessage(msg.error || 'Twitter session expired — reconnect via the extension.')
        setIsConnected(false)
        setPhase('idle')
        ws.close()
      } else if (msg.type === 'error') {
        setError(msg.error)
        setPhase('error')
        ws.close()
      }
    }

    ws.onerror = () => { setError('WebSocket error.'); setPhase('error') }
  }

  const reset = () => {
    wsRef.current?.close()
    setPhase('idle')
    setResults(null)
    setError(null)
    setProgress({ phase: null, count: 0 })
  }

  const inner = (
    <>
      {!isConnected ? (
        <>
          {expiredMessage && (
            <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
              <div>
                <p className="font-medium">Session expired</p>
                <p className="text-xs mt-0.5">{expiredMessage}</p>
                <p className="text-xs mt-1">
                  Use the <strong>Chrome extension</strong> or the OAuth button below to reconnect.
                </p>
              </div>
            </div>
          )}
          <ConnectSection credentialsConfigured={credentialsConfigured} onConnected={handleConnected} />
        </>
      ) : phase === 'idle' ? (
        <div className="card p-6 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#1d9bf0]" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Ready to audit</p>
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  {browserConnected ? 'Browser session' : 'OAuth 1.0a'} · Fetches your full following list and scans each bio
                </p>
              </div>
            </div>
            <button onClick={startAudit}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1d9bf0] hover:bg-[#1a8cd8] transition-colors flex-shrink-0">
              Start audit →
            </button>
          </div>
          <button onClick={() => setIsConnected(false)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 underline">
            Use a different session
          </button>
        </div>
      ) : phase === 'fetching' || phase === 'connecting' ? (
        <ProgressScreen phase={progress.phase || 'ids'} count={progress.count} />
      ) : phase === 'error' ? (
        <div className="card p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button onClick={reset}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            Try again
          </button>
        </div>
      ) : phase === 'done' && results ? (
        <Results data={results} onNewScan={reset} />
      ) : null}
    </>
  )

  if (compact) return inner

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 animate-fade-in-up">
      <button onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-[#1d9bf020] flex items-center justify-center text-sm font-bold text-[#1d9bf0]">X</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Twitter Following Audit</h1>
        </div>
        <p className="text-gray-500 dark:text-zinc-400 text-sm leading-relaxed">
          Scans every account you follow for red-flag content and journalist bios. Lets you bulk unfollow before your visa interview.
        </p>
      </div>
      {inner}
    </main>
  )
}
