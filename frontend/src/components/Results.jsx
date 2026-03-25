import { useState } from 'react'
import { ArrowLeft, Download, CheckCircle2, ShieldCheck, FileSearch } from 'lucide-react'
import ResultCard from './ResultCard'
import { PLATFORMS, platformColor } from '../lib/platforms'

export default function Results({ results, onNewScan, onOpenDossier }) {
  const { flagged, totalAnalyzed } = results
  const [severityFilter, setSeverityFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')

  const high   = flagged.filter((r) => r.severity === 'high')
  const medium = flagged.filter((r) => r.severity === 'medium')
  const low    = flagged.filter((r) => r.severity === 'low')
  const platforms = [...new Set(flagged.map((r) => r.platform))]

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
    <main className="max-w-2xl mx-auto px-4 py-10 animate-fade-in-up">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <button
            onClick={onNewScan}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> New scan
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Scan results</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">
            {totalAnalyzed > 0 && `${totalAnalyzed} items analyzed · `}
            {flagged.length === 0
              ? 'No concerning content found'
              : `${flagged.length} item${flagged.length !== 1 ? 's' : ''} flagged for review`}
          </p>
        </div>
        {flagged.length > 0 && (
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 text-xs font-medium transition-colors shadow-card"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard value={high.length}   label="High"    color="#ef4444" />
        <StatCard value={medium.length} label="Medium"  color="#f59e0b" />
        <StatCard value={low.length}    label="Low"     color="#6366f1" />
        <StatCard
          value={flagged.length === 0 ? '✓' : totalAnalyzed - flagged.length}
          label="Clean"
          color="#22c55e"
        />
      </div>

      {/* Platform breakdown */}
      {platforms.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {platforms.map((p) => {
            const color = platformColor(p)
            const name = PLATFORMS[p.toLowerCase()]?.name ?? p
            return (
              <div
                key={p}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{ backgroundColor: color + '15', color }}
              >
                {name}
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: color + '25' }}>
                  {byPlatform[p]}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {flagged.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-500/15 mb-5">
            <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100 mb-2">You're all clear!</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-500 max-w-xs mx-auto">
            No concerning content was found across your scanned accounts.
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
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
                labels={Object.fromEntries([['all', 'All platforms'], ...platforms.map((p) => [p, PLATFORMS[p.toLowerCase()]?.name ?? p])])}
                value={platformFilter}
                onChange={setPlatformFilter}
              />
            )}
            <span className="ml-auto text-xs text-gray-400 dark:text-zinc-600 tabular-nums">
              {visible.length} / {flagged.length}
            </span>
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {visible.map((item, i) => (
              <ResultCard key={item.item_id ?? i} item={item} index={i} />
            ))}
          </div>

          {/* Officer's Desk CTA */}
          {onOpenDossier && (
            <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 border border-violet-200 dark:border-violet-500/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
                  <FileSearch className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">See yourself through the officer's eyes</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-500">Generate a pre-interview dossier, mock interview, and prep package.</p>
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

          {/* Footer note */}
          <div className="mt-4 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-500">Nothing was deleted automatically</p>
            </div>
            <p className="text-xs text-gray-400 dark:text-zinc-600">
              Use the <strong className="text-gray-500 dark:text-zinc-400">Open</strong> links to review and remove flagged content manually.
            </p>
          </div>
        </>
      )}
    </main>
  )
}

function StatCard({ value, label, color }) {
  return (
    <div
      className="p-4 rounded-2xl border text-center shadow-card"
      style={{ backgroundColor: color + '0d', borderColor: color + '30' }}
    >
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</div>
      <div className="text-xs mt-0.5 font-medium" style={{ color: color + 'aa' }}>{label}</div>
    </div>
  )
}

function FilterGroup({ options, labels, value, onChange }) {
  return (
    <div className="inline-flex bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-1 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize ${
            value === opt
              ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 shadow-sm'
              : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
          }`}
        >
          {labels[opt] ?? opt}
        </button>
      ))}
    </div>
  )
}
