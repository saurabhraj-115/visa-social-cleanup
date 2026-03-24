import { PLATFORMS } from '../lib/platforms'

function StatusDot({ status }) {
  if (status === undefined)
    return <span className="w-2 h-2 rounded-full bg-gray-200 dark:bg-zinc-700 inline-block" />
  if (status === 'loading')
    return (
      <svg className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    )
  if (status === 'error')
    return (
      <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  return (
    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function ScanProgress({ progress, platforms, onCancel }) {
  const pct = progress.total > 0 ? Math.round((progress.analyzed / progress.total) * 100) : 0

  const phaseLabel = {
    connecting: 'Connecting…',
    fetching:   'Fetching content…',
    analyzing:  'Analyzing with Claude AI…',
  }[progress.phase] ?? 'Starting…'

  const phaseStep = progress.phase === 'analyzing' ? 2 : 1

  return (
    <main className="max-w-lg mx-auto px-4 py-12 animate-fade-in-up">

      {/* Header */}
      <div className="text-center mb-10">
        {/* Animated icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 mb-5 relative">
          <svg
            className="w-7 h-7 text-violet-600 dark:text-violet-400"
            style={{ animation: 'spin 2s linear infinite' }}
            fill="none" viewBox="0 0 24 24"
          >
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path className="opacity-90" d="M12 2C6.477 2 2 6.477 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-50" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500" />
          </span>
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-1">{phaseLabel}</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-500">
          {progress.phase === 'analyzing'
            ? `${progress.analyzed} of ${progress.total} items evaluated`
            : 'Connecting to your accounts…'}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        {['Fetching content', 'AI analysis'].map((label, i) => {
          const step = i + 1
          const active = phaseStep === step
          const done = phaseStep > step
          return (
            <div key={label} className={`flex items-center gap-2 flex-1 ${i > 0 ? 'justify-end' : ''}`}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                done  ? 'bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400' :
                active ? 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400' :
                         'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500'
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  done ? 'bg-green-500 text-white' : active ? 'bg-violet-600 text-white' : 'bg-gray-300 dark:bg-zinc-600 text-white'
                }`}>
                  {done ? '✓' : step}
                </span>
                {label}
              </div>
              {i === 0 && <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-800 mx-1" />}
            </div>
          )
        })}
      </div>

      {/* Fetch status card */}
      <div className="card p-4 mb-3">
        <p className="label mb-3">Content fetch</p>
        <div className="space-y-3">
          {platforms.map((platform) => {
            const meta = PLATFORMS[platform]
            const status = progress.fetchStatus[platform]
            return (
              <div key={platform} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: meta?.color + '20', color: meta?.color }}
                  >
                    {meta?.letter?.[0]}
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">{meta?.name ?? platform}</span>
                </div>
                <div className="flex items-center gap-2">
                  {typeof status === 'number' && (
                    <span className="text-xs text-gray-400 dark:text-zinc-500">{status} items</span>
                  )}
                  {status === 'error' && (
                    <span className="text-xs text-red-500 dark:text-red-400">failed</span>
                  )}
                  {status === undefined && (
                    <span className="text-xs text-gray-300 dark:text-zinc-700">queued</span>
                  )}
                  <StatusDot status={status} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Analysis progress card */}
      {(progress.phase === 'analyzing' || progress.analyzed > 0) && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="label">AI analysis</p>
            <span className="text-xs font-mono font-semibold text-violet-600 dark:text-violet-400 tabular-nums">{pct}%</span>
          </div>

          <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-2.5">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-violet-600"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-zinc-600 tabular-nums">
              {progress.analyzed} / {progress.total} items
            </span>
            {progress.flaggedCount > 0 && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {progress.flaggedCount} flagged so far
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          onClick={onCancel}
          className="text-xs text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 transition-colors"
        >
          Cancel scan
        </button>
      </div>
    </main>
  )
}
