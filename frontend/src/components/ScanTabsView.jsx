import { useState } from 'react'
import { Loader2, AlertTriangle, CheckCircle2, FileSearch, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react'
import ResultCard from './ResultCard'
import { PLATFORMS } from '../lib/platforms'
import TwitterFollowingAudit from './TwitterFollowingAudit'
import InstagramFollowingAudit from './InstagramFollowingAudit'

// ── Platform scan card ────────────────────────────────────────────────────────

function PlatformCard({ platform, meta, ps, flagged, scanDone }) {
  const [expanded, setExpanded] = useState(true)

  const fetchPhase = ps.fetchPhase || 'idle'
  const isDone     = fetchPhase === 'done'
  const isError    = fetchPhase === 'error'
  const isLoading  = fetchPhase === 'loading'
  const isQueued   = fetchPhase === 'idle'
  const flaggedCount = flagged.length

  const statusText = () => {
    if (isQueued)   return 'Queued…'
    if (isLoading)  return 'Fetching…'
    if (isError)    return 'Error fetching'
    if (!scanDone)  return `${ps.fetchCount ?? 0} items — analyzing…`
    if (flaggedCount === 0) return `${ps.fetchCount ?? 0} items — clean`
    return `${flaggedCount} flagged`
  }

  return (
    <div className="card overflow-hidden">
      <button
        className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
          isDone && scanDone && flaggedCount > 0 ? 'hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer' : 'cursor-default'
        }`}
        onClick={() => isDone && scanDone && flaggedCount > 0 && setExpanded(e => !e)}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{ backgroundColor: meta?.color + '20', color: meta?.color }}
        >
          {meta?.letter}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{meta?.name ?? platform}</p>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{statusText()}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isLoading  && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          {isDone && !scanDone && <Loader2 className="w-4 h-4 animate-spin text-violet-500" />}
          {isError    && <AlertTriangle className="w-4 h-4 text-red-400" />}
          {isDone && scanDone && flaggedCount === 0 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {isDone && scanDone && flaggedCount > 0 && (
            <>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: meta?.color + '20', color: meta?.color }}
              >
                {flaggedCount}
              </span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
            </>
          )}
        </div>
      </button>

      {isError && ps.fetchError && (
        <div className="mx-4 mb-4 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-700 dark:text-red-300 leading-relaxed">
          {ps.fetchError}
        </div>
      )}

      {isDone && scanDone && flaggedCount > 0 && expanded && (
        <div className="border-t border-gray-100 dark:border-zinc-800 px-4 py-3 space-y-3">
          {flagged.map((item, i) => (
            <ResultCard key={item.item_id ?? i} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function ScanTabsView({
  platforms,
  platformScan,
  scanPhase,
  results,
  statusData,
  onNewScan,
  onOpenDossier,
}) {
  const hasFollowing = platforms.includes('twitter') || platforms.includes('instagram')
  const [tab, setTab]   = useState('posts')
  const scanDone        = scanPhase === 'done'
  const totalFlagged    = results.flagged.length

  // Flagged items per lowercase platform key
  const flaggedByPlatform = {}
  results.flagged.forEach(item => {
    const key = item.platform.toLowerCase()
    flaggedByPlatform[key] = flaggedByPlatform[key] || []
    flaggedByPlatform[key].push(item)
  })

  const tabs = [
    { id: 'posts', label: 'Posts & Likes' },
    ...(hasFollowing ? [{ id: 'following', label: 'Following Audit' }] : []),
  ]

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 animate-fade-in-up">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
            {scanDone ? 'Scan results' : 'Scanning…'}
          </h1>
          {scanDone && (
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">
              {results.totalAnalyzed} items analyzed ·{' '}
              {totalFlagged === 0 ? 'no concerns found' : `${totalFlagged} flagged for review`}
            </p>
          )}
          {!scanDone && (
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">
              Fetching and analyzing your content with Claude AI…
            </p>
          )}
        </div>
        <button
          onClick={onNewScan}
          className="text-xs text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 transition-colors whitespace-nowrap mt-1"
        >
          ← New scan
        </button>
      </div>

      {/* Tab bar */}
      {hasFollowing && (
        <div className="flex mb-6 border-b border-gray-200 dark:border-zinc-800">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Posts & Likes tab ── */}
      {tab === 'posts' && (
        <div className="space-y-3">
          {platforms.map(platform => (
            <PlatformCard
              key={platform}
              platform={platform}
              meta={PLATFORMS[platform]}
              ps={platformScan[platform] || {}}
              flagged={flaggedByPlatform[platform] || []}
              scanDone={scanDone}
            />
          ))}

          {/* Officer's Desk CTA */}
          {scanDone && totalFlagged > 0 && onOpenDossier && (
            <div className="mt-2 p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 border border-violet-200 dark:border-violet-500/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
                  <FileSearch className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">See yourself through the officer's eyes</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-500">Dossier · mock interview · prep package</p>
                </div>
              </div>
              <button
                onClick={onOpenDossier}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
              >
                Open the Officer's Desk →
              </button>
            </div>
          )}

          {/* All clear */}
          {scanDone && totalFlagged === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-500/15 mb-4">
                <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100 mb-2">All clear</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-500">
                No concerning content found across your accounts.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Following Audit tab ── */}
      {tab === 'following' && (
        <div className="space-y-8">
          {platforms.includes('twitter') && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-600 mb-3">
                Twitter / X
              </p>
              <TwitterFollowingAudit statusData={statusData} compact />
            </section>
          )}
          {platforms.includes('instagram') && (
            <section>
              {platforms.includes('twitter') && (
                <div className="border-t border-gray-100 dark:border-zinc-800 mb-6" />
              )}
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-600 mb-3">
                Instagram
              </p>
              <InstagramFollowingAudit compact />
            </section>
          )}
        </div>
      )}
    </main>
  )
}
