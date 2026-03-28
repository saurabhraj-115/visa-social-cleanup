import { useState, useRef } from 'react'
import { ArrowLeft, AlertTriangle, Newspaper, Check, Loader2, ExternalLink, Users, Landmark, ChevronDown, ChevronUp } from 'lucide-react'

function wsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws/instagram/following`
}

// ── Curl paste section ────────────────────────────────────────────────────────

function CurlSection({ onReady }) {
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
      onReady(data.user_id)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', opacity: 0.15 }}/>
          <div className="absolute w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 -translate-x-[0px]"
            style={{position:'relative',background:'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'}}>
            <span className="text-white font-bold text-sm">IG</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Instagram Following Audit</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Uses your browser session — no API keys needed</p>
          </div>
        </div>

        <button
          onClick={() => setShowInstructions((s) => !s)}
          className="w-full flex items-center justify-between text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors py-1">
          <span className="font-medium">How to get your cURL</span>
          {showInstructions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showInstructions && (
          <ol className="text-xs text-gray-500 dark:text-zinc-500 space-y-1.5 pl-4 list-decimal leading-relaxed border-l-2 border-gray-200 dark:border-zinc-700 ml-1">
            <li>Open <strong>instagram.com</strong> in Chrome and make sure you're logged in</li>
            <li>Open DevTools: <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 font-mono">F12</kbd> or <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 font-mono">Cmd+Option+I</kbd></li>
            <li>Go to the <strong>Network</strong> tab</li>
            <li>Refresh the page or click around — any request to instagram.com will do</li>
            <li>Right-click any request → <strong>Copy</strong> → <strong>Copy as cURL (bash)</strong></li>
            <li>Paste it below</li>
          </ol>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1.5">
            Paste cURL here
          </label>
          <textarea
            value={curl}
            onChange={(e) => setCurl(e.target.value)}
            rows={4}
            placeholder={'curl \'https://www.instagram.com/...\' \\\n  -H \'cookie: sessionid=...; csrftoken=...\' \\\n  ...'}
            className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-zinc-200 placeholder:text-gray-400 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#e1306c]/40 focus:border-[#e1306c] transition-all"
          />
        </div>

        <button
          onClick={parse}
          disabled={loading || !curl.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {loading ? 'Parsing session…' : 'Use this session →'}
        </button>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{error}
          </p>
        )}
      </div>

      <p className="text-[11px] text-gray-400 dark:text-zinc-600 text-center leading-relaxed px-2">
        Your cookies are stored only on this server's local volume and never transmitted elsewhere.
        They're used only to fetch your following list and perform unfollows you confirm.
      </p>
    </div>
  )
}

// ── Progress screen ───────────────────────────────────────────────────────────

function ProgressScreen({ phase, count, bioProgress }) {
  const pct = bioProgress.total > 0 ? Math.round((bioProgress.current / bioProgress.total) * 100) : 0

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-5">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#e1306c' }} />

      {phase === 'following' || phase === 'fetch' ? (
        <>
          <p className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Fetching following list…</p>
          <p className="text-sm text-gray-500 dark:text-zinc-500">
            {count > 0 ? `${count.toLocaleString()} accounts loaded` : 'Starting up…'}
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Scanning bios…</p>
          <p className="text-sm text-gray-500 dark:text-zinc-500">
            {bioProgress.current > 0
              ? `${bioProgress.current.toLocaleString()} / ${bioProgress.total.toLocaleString()} accounts`
              : 'Loading account details…'}
          </p>
          {bioProgress.total > 0 && (
            <div className="w-64 bg-gray-200 dark:bg-zinc-700 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#f09433,#e6683c,#dc2743)' }}
              />
            </div>
          )}
        </>
      )}

      <p className="text-xs text-gray-400 dark:text-zinc-600 max-w-xs text-center">
        Bio fetching has a rate-limit delay. Large lists (2000+) can take 20–25 min.
      </p>
    </div>
  )
}

// ── Account card ──────────────────────────────────────────────────────────────

function AccountCard({ account, checked, onToggle, category }) {
  const colors = {
    red_flag:   'border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5',
    political:  'border-purple-200 dark:border-purple-500/20 bg-purple-50/50 dark:bg-purple-500/5',
    journalist: 'border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5',
  }

  return (
    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${colors[category] ?? 'border-gray-200 dark:border-zinc-700'} ${checked ? 'opacity-100' : 'opacity-60'}`}>
      <input type="checkbox" checked={checked} onChange={onToggle}
        className="mt-1 cursor-pointer flex-shrink-0 accent-pink-500" />
      {account.profile_pic_url ? (
        <img src={account.profile_pic_url} alt=""
          className="w-8 h-8 rounded-full flex-shrink-0 bg-gray-200 dark:bg-zinc-700"
          onError={(e) => { e.target.style.display = 'none' }} />
      ) : (
        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gray-200 dark:bg-zinc-700" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">
            {account.full_name || account.username}
          </span>
          <span className="text-xs text-gray-400 dark:text-zinc-500">@{account.username}</span>
          {account.is_verified && <span className="text-[10px] text-blue-500">✓</span>}
        </div>
        {account.category && (
          <p className="text-[10px] text-gray-400 dark:text-zinc-600 mt-0.5">{account.category}</p>
        )}
        {account.biography && (
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5 line-clamp-2">{account.biography}</p>
        )}
        {account.matched_patterns?.length > 0 && (
          <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5 font-medium">
            Matched: {account.matched_patterns.slice(0, 3).join(', ')}
          </p>
        )}
      </div>
      <a href={`https://www.instagram.com/${account.username}/`} target="_blank" rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-gray-300 dark:text-zinc-600 hover:text-pink-500 transition-colors flex-shrink-0 mt-0.5">
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
    red_flags.forEach((a) => { s[a.pk] = true })
    political.forEach((a) => { s[a.pk] = true })
    journalists.forEach((a) => { s[a.pk] = true })
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
      accounts.forEach((a) => { next[a.pk] = val })
      return next
    })
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const allFlagged = [...red_flags, ...political, ...journalists]

  const doUnfollow = async () => {
    const pks = Object.entries(selected).filter(([, v]) => v).map(([k]) => k)
    setUnfollowing(true); setError(null)
    try {
      const res = await fetch('/api/instagram/unfollow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pks }),
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
          {done.failed > 0 && ` ${done.failed} failed (already unfollowed or private).`}
        </p>
        <button onClick={onNewScan}
          className="mt-4 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors"
          style={{ background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
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
          { label: 'Red flags',   count: red_flags.length,  color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-500/10' },
          { label: 'Political',   count: political.length,   color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
          { label: 'Journalists', count: journalists.length, color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Clean',       count: clean_count,        color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-500/10' },
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
                  <AccountCard key={a.pk} account={a} category="red_flag"
                    checked={!!selected[a.pk]}
                    onToggle={() => setSelected((s) => ({ ...s, [a.pk]: !s[a.pk] }))} />
                ))}
              </div>
            </section>
          )}

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
                  <AccountCard key={a.pk} account={a} category="political"
                    checked={!!selected[a.pk]}
                    onToggle={() => setSelected((s) => ({ ...s, [a.pk]: !s[a.pk] }))} />
                ))}
              </div>
            </section>
          )}

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
                  <AccountCard key={a.pk} account={a} category="journalist"
                    checked={!!selected[a.pk]}
                    onToggle={() => setSelected((s) => ({ ...s, [a.pk]: !s[a.pk] }))} />
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
                <button onClick={() => setConfirmed(true)} disabled={selectedCount === 0}
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
                  Instagram requires a 1.5s delay between each unfollow to avoid rate limiting.
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

export default function InstagramFollowingAudit({ onBack }) {
  const [phase, setPhase] = useState('idle') // idle | fetching | scanning | done | error
  const [progress, setProgress] = useState({ phase: null, count: 0 })
  const [bioProgress, setBioProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [sessionReady, setSessionReady] = useState(false)
  const wsRef = useRef(null)

  const handleSessionReady = (_userId) => {
    setSessionReady(true)
  }

  const startAudit = () => {
    setPhase('fetching')
    setError(null)
    setResults(null)
    setBioProgress({ current: 0, total: 0 })
    setProgress({ phase: 'following', count: 0 })

    const ws = new WebSocket(wsUrl())
    wsRef.current = ws

    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data)
      if (msg.type === 'progress') {
        setProgress({ phase: msg.phase, count: msg.count })
      } else if (msg.type === 'fetch_done') {
        setPhase('scanning')
        setBioProgress({ current: 0, total: msg.total })
      } else if (msg.type === 'bio_progress') {
        setBioProgress({ current: msg.current, total: msg.total })
      } else if (msg.type === 'done') {
        setResults(msg)
        setPhase('done')
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
    setSessionReady(false)
    setResults(null)
    setError(null)
    setProgress({ phase: null, count: 0 })
    setBioProgress({ current: 0, total: 0 })
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 animate-fade-in-up">
      <button onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>IG</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Instagram Following Audit</h1>
        </div>
        <p className="text-gray-500 dark:text-zinc-400 text-sm leading-relaxed">
          Scans every account you follow for political figures, journalists, and red-flag content.
          Uses your browser session — no API approval needed.
        </p>
      </div>

      {!sessionReady ? (
        <CurlSection onReady={handleSessionReady} />
      ) : phase === 'idle' ? (
        <div className="card p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5" style={{ color: '#e1306c' }} />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Session ready</p>
              <p className="text-xs text-gray-500 dark:text-zinc-500">Will fetch your full following list and scan each bio</p>
            </div>
          </div>
          <button onClick={startAudit}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
            Start audit →
          </button>
        </div>
      ) : phase === 'fetching' || phase === 'scanning' ? (
        <ProgressScreen
          phase={phase === 'fetching' ? 'following' : 'bio'}
          count={progress.count}
          bioProgress={bioProgress}
        />
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
    </main>
  )
}
