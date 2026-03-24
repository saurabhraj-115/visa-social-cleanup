import { PLATFORMS } from '../lib/platforms'

function StatusIcon({ status }) {
  if (status === undefined)
    return <span className="w-4 h-4 rounded-full border border-zinc-700 inline-block" />
  if (status === 'loading')
    return (
      <svg className="w-4 h-4 text-violet-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    )
  if (status === 'error')
    return (
      <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  // number
  return (
    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function ScanProgress({ progress, platforms }) {
  const pct = progress.total > 0 ? Math.round((progress.analyzed / progress.total) * 100) : 0

  const phaseLabel = {
    connecting: 'Connecting…',
    fetching:   'Fetching content…',
    analyzing:  'Analyzing with Claude AI…',
  }[progress.phase] ?? 'Starting…'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Pulsing background orb */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-[120px] animate-pulse-slow" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Animated scan icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-violet-400"
                style={{ animation: 'spin 2.4s linear infinite' }}
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path
                  className="opacity-90"
                  d="M12 2C6.477 2 2 6.477 2 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-violet-500" />
            </span>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-zinc-100 text-center mb-1.5">{phaseLabel}</h2>
        <p className="text-sm text-zinc-500 text-center mb-8">
          {progress.phase === 'analyzing'
            ? `${progress.analyzed} of ${progress.total} items evaluated`
            : 'Connecting to your accounts…'}
        </p>

        {/* ── Fetch status ─────────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Content fetch
          </p>
          <div className="space-y-2.5">
            {platforms.map((platform) => {
              const meta = PLATFORMS[platform]
              const status = progress.fetchStatus[platform]
              return (
                <div key={platform} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-6 h-6 rounded-md text-[10px] flex items-center justify-center font-bold"
                      style={{ backgroundColor: meta.color + '20', color: meta.color }}
                    >
                      {meta.letter[0]}
                    </div>
                    <span className="text-sm text-zinc-300">{meta.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {typeof status === 'number' && (
                      <span className="text-xs text-zinc-500">{status} items</span>
                    )}
                    {status === 'error' && (
                      <span className="text-xs text-red-400">failed</span>
                    )}
                    {status === undefined && (
                      <span className="text-xs text-zinc-700">queued</span>
                    )}
                    <StatusIcon status={status} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Analysis progress ────────────────────────────── */}
        {(progress.phase === 'analyzing' || progress.analyzed > 0) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                AI analysis
              </p>
              <span className="text-xs font-mono text-violet-400 tabular-nums">{pct}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600 tabular-nums">
                {progress.analyzed} / {progress.total}
              </span>
              {progress.flaggedCount > 0 && (
                <span className="text-xs text-amber-400">
                  {progress.flaggedCount} flagged so far
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
