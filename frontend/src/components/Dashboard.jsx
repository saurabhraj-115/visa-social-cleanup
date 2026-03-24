import { Shield, ArrowRight, AlertCircle, Settings, Sparkles } from 'lucide-react'
import PlatformCard from './PlatformCard'

const ALL_PLATFORMS = ['reddit', 'twitter', 'facebook', 'instagram', 'linkedin']

const SEVERITY_OPTIONS = [
  { value: 'low',    label: 'All (Low+)',    sub: 'Most thorough' },
  { value: 'medium', label: 'Medium + High', sub: 'Recommended'  },
  { value: 'high',   label: 'High only',     sub: 'Strictest'    },
]

const LIMIT_OPTIONS = [
  { value: '',    label: 'All items'  },
  { value: '25',  label: '25 items'   },
  { value: '50',  label: '50 items'   },
  { value: '100', label: '100 items'  },
  { value: '200', label: '200 items'  },
]

export default function Dashboard({ platformStatus, statusData, scanConfig, setScanConfig, onStartScan, onOpenSetup, error }) {
  const isLoading = platformStatus === null
  const nothingConfigured = !isLoading && !statusData?.has_anthropic_key && Object.values(platformStatus ?? {}).every((v) => !v)

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-48 -right-48 w-[500px] h-[500px] rounded-full bg-violet-600/6 blur-[96px]" />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full bg-indigo-600/6 blur-[96px]" />
      </div>

      <div className="relative w-full max-w-xl animate-fade-in-up">
        {/* ── Settings button ───────────────────────────────── */}
        <div className="flex justify-end mb-2">
          <button
            onClick={onOpenSetup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 text-xs transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
            Credentials
          </button>
        </div>

        {/* ── Hero ─────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-5">
            <Shield className="w-7 h-7 text-violet-400" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-100 mb-3">
            Visa{' '}
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Cleanup
            </span>
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto">
            Scan your social media before a US visa interview. Claude AI flags content that could raise concerns — nothing is deleted automatically.
          </p>
        </div>

        {/* ── Setup prompt ─────────────────────────────────── */}
        {nothingConfigured && (
          <div className="mb-6 p-4 rounded-2xl bg-violet-500/8 border border-violet-500/20 animate-fade-in-up">
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-violet-300 mb-0.5">Set up your accounts to get started</p>
                <p className="text-xs text-zinc-500">Add your API credentials so the scanner can access your social media history.</p>
              </div>
              <button
                onClick={onOpenSetup}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
              >
                Set up →
              </button>
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-sm animate-fade-in-up">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* ── Platform grid ─────────────────────────────────── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Platforms
            </h2>
            {!isLoading && (
              <span className="text-xs text-zinc-600">
                {scanConfig.platforms.length} selected
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-[88px] rounded-2xl bg-zinc-900 animate-pulse" />
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
        </div>

        {/* ── Settings ─────────────────────────────────────── */}
        <div className="mb-6 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
            Settings
          </h2>
          <div className="grid grid-cols-2 gap-6">
            {/* Severity */}
            <div>
              <p className="text-xs text-zinc-400 mb-2.5">Flag threshold</p>
              <div className="space-y-2">
                {SEVERITY_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="severity"
                      value={opt.value}
                      checked={scanConfig.severity === opt.value}
                      onChange={() => setScanConfig((c) => ({ ...c, severity: opt.value }))}
                      className="accent-violet-500 cursor-pointer"
                    />
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">
                      {opt.label}
                    </span>
                    <span className="text-xs text-zinc-600">{opt.sub}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Item limit */}
            <div>
              <p className="text-xs text-zinc-400 mb-2.5">Items per platform</p>
              <select
                value={scanConfig.limit ?? ''}
                onChange={(e) =>
                  setScanConfig((c) => ({
                    ...c,
                    limit: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
              >
                {LIMIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-600 mt-1.5">Fewer = faster scan</p>
            </div>
          </div>
        </div>

        {/* ── CTA ──────────────────────────────────────────── */}
        <button
          onClick={onStartScan}
          disabled={!canScan}
          className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
            canScan
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-[1.015] active:scale-[0.985]'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            'Loading...'
          ) : canScan ? (
            <>
              Start Scan
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            'Select at least one configured platform'
          )}
        </button>

        <p className="text-center text-xs text-zinc-700 mt-4">
          Content is sent only to Claude AI · Nothing is deleted automatically
        </p>
      </div>
    </div>
  )
}
