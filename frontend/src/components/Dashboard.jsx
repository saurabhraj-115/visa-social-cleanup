import { ArrowRight, AlertCircle, Sparkles } from 'lucide-react'
import PlatformCard from './PlatformCard'

const ALL_PLATFORMS = ['reddit', 'twitter', 'facebook', 'instagram', 'linkedin']

const SEVERITY_OPTIONS = [
  { value: 'low',    label: 'Low & above',   sub: 'Most thorough' },
  { value: 'medium', label: 'Medium & above', sub: 'Recommended'  },
  { value: 'high',   label: 'High only',      sub: 'Strictest'    },
]

const LIMIT_OPTIONS = [
  { value: '',    label: 'All items'  },
  { value: '25',  label: 'Last 25'   },
  { value: '50',  label: 'Last 50'   },
  { value: '100', label: 'Last 100'  },
  { value: '200', label: 'Last 200'  },
]

export default function Dashboard({ platformStatus, statusData, scanConfig, setScanConfig, onStartScan, onOpenSetup, error }) {
  const isLoading = platformStatus === null
  const nothingConfigured = !isLoading && !statusData?.has_anthropic_key && Object.values(platformStatus ?? {}).every((v) => !v)
  const configuredCount = Object.values(platformStatus ?? {}).filter(Boolean).length

  const togglePlatform = (platform) => {
    setScanConfig((c) => ({
      ...c,
      platforms: c.platforms.includes(platform)
        ? c.platforms.filter((p) => p !== platform)
        : [...c.platforms, platform],
    }))
  }

  const canScan = !isLoading && scanConfig.platforms.length > 0

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 animate-fade-in-up">

      {/* ── Hero ───────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 mb-2">
          Social media scan
        </h1>
        <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">
          Scan your accounts before a US visa interview. Claude AI flags content that could raise concerns — nothing is deleted automatically.
        </p>
      </div>

      {/* ── Setup prompt ───────────────────────────────────── */}
      {nothingConfigured && (
        <button
          onClick={onOpenSetup}
          className="w-full mb-6 flex items-center gap-4 p-4 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 hover:bg-violet-100 dark:hover:bg-violet-500/15 transition-colors text-left group animate-fade-in"
        >
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Connect your accounts to get started</p>
            <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-0.5">Add API credentials — takes about 2 minutes</p>
          </div>
          <ChevronRight className="w-4 h-4 text-violet-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
        </button>
      )}

      {/* ── Error ──────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/8 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ── Platforms ──────────────────────────────────────── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="label">Platforms</h2>
          {!isLoading && (
            <span className="text-xs text-gray-400 dark:text-zinc-600">
              {configuredCount} configured · {scanConfig.platforms.length} selected
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[88px] rounded-2xl bg-gray-100 dark:bg-zinc-900 animate-pulse" />
              ))
            : ALL_PLATFORMS.map((platform) => (
                <PlatformCard
                  key={platform}
                  platform={platform}
                  configured={!!platformStatus?.[platform]}
                  selected={scanConfig.platforms.includes(platform)}
                  onToggle={() => togglePlatform(platform)}
                />
              ))}
        </div>
      </section>

      {/* ── Settings ───────────────────────────────────────── */}
      <section className="mb-6 card p-5">
        <h2 className="label mb-4">Scan settings</h2>
        <div className="grid grid-cols-2 gap-6">

          {/* Severity */}
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-3">Flag threshold</p>
            <div className="space-y-2.5">
              {SEVERITY_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="severity"
                    value={opt.value}
                    checked={scanConfig.severity === opt.value}
                    onChange={() => setScanConfig((c) => ({ ...c, severity: opt.value }))}
                    className="accent-violet-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-zinc-100 transition-colors">
                    {opt.label}
                  </span>
                  {opt.sub === 'Recommended' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 font-medium">
                      {opt.sub}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Limit */}
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-3">Items per platform</p>
            <select
              value={scanConfig.limit ?? ''}
              onChange={(e) => setScanConfig((c) => ({ ...c, limit: e.target.value ? Number(e.target.value) : null }))}
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-colors cursor-pointer"
            >
              {LIMIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1.5">Fewer items = faster scan</p>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <button
        onClick={onStartScan}
        disabled={!canScan}
        className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
          canScan
            ? 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white shadow-lg shadow-violet-600/25 hover:shadow-violet-500/30 hover:scale-[1.01] active:scale-[0.99]'
            : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed'
        }`}
      >
        {isLoading ? 'Loading…' : canScan ? (
          <>Start scan <ArrowRight className="w-4 h-4" /></>
        ) : (
          'Select at least one platform'
        )}
      </button>

      <p className="text-center text-xs text-gray-400 dark:text-zinc-700 mt-4">
        Content is sent only to Claude AI · Nothing is deleted automatically
      </p>
    </main>
  )
}
