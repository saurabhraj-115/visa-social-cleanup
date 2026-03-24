import { useState } from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import ResultCard from './ResultCard'
import { PLATFORMS, platformColor } from '../lib/platforms'

export default function Results({ results, onNewScan }) {
  const { flagged, totalAnalyzed } = results
  const [severityFilter, setSeverityFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')

  const high   = flagged.filter((r) => r.severity === 'high')
  const medium = flagged.filter((r) => r.severity === 'medium')
  const low    = flagged.filter((r) => r.severity === 'low')
  const platforms = [...new Set(flagged.map((r) => r.platform))]

  // Per-platform breakdown: { platform → count }
  const byPlatform = platforms.reduce((acc, p) => {
    acc[p] = flagged.filter((r) => r.platform === p).length
    return acc
  }, {})

  const visible = flagged.filter((r) => {
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false
    if (platformFilter !== 'all' && r.platform !== platformFilter) return false
    return true
  })

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(flagged, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'visa-cleanup-results.json'
    a.click()
  }

  return (
    <div className="min-h-screen px-4 py-10">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-48 -right-48 w-[400px] h-[400px] rounded-full bg-violet-600/4 blur-[96px]" />
      </div>

      <div className="relative max-w-2xl mx-auto animate-fade-in-up">
        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <button
              onClick={onNewScan}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              New scan
            </button>
            <h1 className="text-2xl font-bold text-zinc-100">Scan Results</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {totalAnalyzed > 0 && `${totalAnalyzed} items analyzed · `}
              {flagged.length === 0
                ? 'No concerning content found'
                : `${flagged.length} item${flagged.length !== 1 ? 's' : ''} flagged for review`}
            </p>
          </div>

          {flagged.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
          )}
        </div>

        {/* ── Stat cards ───────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard value={high.length}   label="High"   color="#ef4444" />
          <StatCard value={medium.length} label="Medium" color="#f59e0b" />
          <StatCard value={low.length}    label="Low"    color="#6366f1" />
          <StatCard
            value={flagged.length === 0 ? '✓' : totalAnalyzed - flagged.length}
            label={flagged.length === 0 ? 'All clear' : 'Clean'}
            color="#22c55e"
          />
        </div>

        {/* ── Platform breakdown ───────────────────────────── */}
        {platforms.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            {platforms.map((p) => {
              const color = platformColor(p)
              const name = PLATFORMS[p]?.name ?? p
              return (
                <div
                  key={p}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                  style={{ backgroundColor: color + '15', color }}
                >
                  <span>{name}</span>
                  <span
                    className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                    style={{ backgroundColor: color + '25' }}
                  >
                    {byPlatform[p]}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────── */}
        {flagged.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-5 select-none">🎉</div>
            <h2 className="text-xl font-semibold text-zinc-200 mb-2">You're all clear!</h2>
            <p className="text-sm text-zinc-500 max-w-xs mx-auto">
              No concerning content was found across your scanned accounts.
            </p>
          </div>
        ) : (
          <>
            {/* ── Filters ──────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-wrap mb-5">
              <FilterGroup
                options={['all', 'high', 'medium', 'low']}
                labels={{ all: 'All', high: 'High', medium: 'Medium', low: 'Low' }}
                value={severityFilter}
                onChange={setSeverityFilter}
              />
              {platforms.length > 1 && (
                <FilterGroup
                  options={['all', ...platforms]}
                  labels={Object.fromEntries([['all', 'All platforms'], ...platforms.map((p) => [p, p])])}
                  value={platformFilter}
                  onChange={setPlatformFilter}
                />
              )}
              <span className="ml-auto text-xs text-zinc-600 tabular-nums">
                {visible.length} / {flagged.length} shown
              </span>
            </div>

            {/* ── Result cards ─────────────────────────────── */}
            <div className="space-y-3">
              {visible.map((item, i) => (
                <ResultCard key={item.item_id ?? i} item={item} index={i} />
              ))}
            </div>

            {/* ── Footer note ──────────────────────────────── */}
            <div className="mt-8 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
              <p className="text-xs text-zinc-500">
                Use the <strong className="text-zinc-400">Open</strong> links to review and remove flagged content manually.
                Nothing was deleted automatically.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ value, label, color }) {
  return (
    <div
      className="p-4 rounded-2xl border text-center"
      style={{ backgroundColor: color + '0d', borderColor: color + '30' }}
    >
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-xs mt-1" style={{ color: color + 'aa' }}>
        {label}
      </div>
    </div>
  )
}

function FilterGroup({ options, labels, value, onChange }) {
  return (
    <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize ${
            value === opt
              ? 'bg-zinc-700 text-zinc-100 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {labels[opt] ?? opt}
        </button>
      ))}
    </div>
  )
}
