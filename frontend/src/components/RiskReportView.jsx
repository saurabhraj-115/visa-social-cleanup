import { useState } from 'react'
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'
import { platformColor } from '../lib/platforms'

// ── Tier config ────────────────────────────────────────────────────────────

const TIERS = {
  high: {
    label: 'High Risk',
    badge: 'Critical',
    outcome: 'Potential grounds for immediate denial',
    description: 'Content that may indicate national security concerns, criminal activity, or direct inadmissibility grounds. Consular officers are trained to probe these areas.',
    icon: AlertCircle,
    headerBg: 'bg-red-50 dark:bg-red-500/10',
    headerBorder: 'border-red-200 dark:border-red-500/25',
    headerText: 'text-red-700 dark:text-red-400',
    badgeBg: 'bg-red-600 text-white',
    cardBorder: 'border-red-200 dark:border-red-500/20',
    cardLeft: '#ef4444',
    reasonBg: 'bg-red-50 dark:bg-red-500/8 border-red-100 dark:border-red-500/15',
    reasonText: 'text-red-600 dark:text-red-400',
  },
  medium: {
    label: 'Medium Risk',
    badge: 'Caution',
    outcome: 'Likely to trigger additional scrutiny',
    description: 'Content that may raise questions about political views, lifestyle, or consistency with stated intentions. Expect probing questions if an officer sees this.',
    icon: AlertTriangle,
    headerBg: 'bg-amber-50 dark:bg-amber-500/10',
    headerBorder: 'border-amber-200 dark:border-amber-500/25',
    headerText: 'text-amber-700 dark:text-amber-400',
    badgeBg: 'bg-amber-500 text-white',
    cardBorder: 'border-amber-200 dark:border-amber-500/20',
    cardLeft: '#f59e0b',
    reasonBg: 'bg-amber-50 dark:bg-amber-500/8 border-amber-100 dark:border-amber-500/15',
    reasonText: 'text-amber-700 dark:text-amber-400',
  },
  low: {
    label: 'Low Risk',
    badge: 'Monitor',
    outcome: 'Minor concern — unlikely to affect outcome alone',
    description: 'Content that is borderline or context-dependent. On its own, unlikely to cause issues, but could compound higher-risk items.',
    icon: Info,
    headerBg: 'bg-indigo-50 dark:bg-indigo-500/10',
    headerBorder: 'border-indigo-200 dark:border-indigo-500/25',
    headerText: 'text-indigo-700 dark:text-indigo-400',
    badgeBg: 'bg-indigo-500 text-white',
    cardBorder: 'border-indigo-200 dark:border-indigo-500/20',
    cardLeft: '#6366f1',
    reasonBg: 'bg-indigo-50 dark:bg-indigo-500/8 border-indigo-100 dark:border-indigo-500/15',
    reasonText: 'text-indigo-600 dark:text-indigo-400',
  },
}

// ── Individual item card (read-only) ───────────────────────────────────────

function AssessmentCard({ item, tier, index }) {
  const [expanded, setExpanded] = useState(false)
  const color = platformColor(item.platform)
  const isLong = item.text?.length > 200

  return (
    <article
      className={`bg-white dark:bg-zinc-900 rounded-xl border ${tier.cardBorder} overflow-hidden`}
      style={{ borderLeftColor: tier.cardLeft, borderLeftWidth: 3, animationDelay: `${index * 30}ms` }}
    >
      <div className="p-4">
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold"
            style={{ backgroundColor: color + '18', color }}
          >
            {item.platform}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[11px] bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 font-medium capitalize">
            {item.content_type}
          </span>
          {item.created_at && item.created_at !== 'unknown' && (
            <span className="text-[11px] text-gray-400 dark:text-zinc-600 ml-auto">
              {item.created_at}
            </span>
          )}
        </div>

        {/* Text */}
        <p className={`text-sm text-gray-700 dark:text-zinc-300 leading-relaxed mb-3 ${expanded ? '' : 'line-clamp-3'}`}>
          {item.text}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="mb-3 inline-flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
          >
            {expanded
              ? <><ChevronUp className="w-3 h-3" /> Show less</>
              : <><ChevronDown className="w-3 h-3" /> Show more</>}
          </button>
        )}

        {/* Officer concern */}
        <div className={`p-3 rounded-lg border ${tier.reasonBg}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${tier.reasonText}`}>
            Officer concern
          </p>
          <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">{item.reason}</p>
        </div>
      </div>
    </article>
  )
}

// ── Tier section ───────────────────────────────────────────────────────────

function TierSection({ tierKey, items }) {
  const [collapsed, setCollapsed] = useState(false)
  const tier = TIERS[tierKey]
  const Icon = tier.icon

  return (
    <section>
      {/* Section header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className={`w-full flex items-start gap-3 p-4 rounded-2xl border ${tier.headerBg} ${tier.headerBorder} text-left mb-3 transition-opacity hover:opacity-90`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${tier.headerText}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-sm font-bold ${tier.headerText}`}>{tier.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tier.badgeBg}`}>
              {tier.badge}
            </span>
            <span className={`text-[11px] font-medium ml-auto ${tier.headerText} opacity-80`}>
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p className={`text-[11px] font-semibold ${tier.headerText} opacity-70 mb-0.5`}>
            {tier.outcome}
          </p>
          <p className="text-xs text-gray-500 dark:text-zinc-500 leading-relaxed">
            {tier.description}
          </p>
        </div>
        <div className="flex-shrink-0 ml-2 mt-0.5">
          {collapsed
            ? <ChevronDown className={`w-4 h-4 ${tier.headerText} opacity-50`} />
            : <ChevronUp className={`w-4 h-4 ${tier.headerText} opacity-50`} />}
        </div>
      </button>

      {/* Cards */}
      {!collapsed && (
        <div className="space-y-2 pl-2 mb-6">
          {items.map((item, i) => (
            <AssessmentCard key={item.item_id ?? i} item={item} tier={tier} index={i} />
          ))}
        </div>
      )}
    </section>
  )
}

// ── Summary bar ────────────────────────────────────────────────────────────

function SummaryBar({ byTier, total }) {
  const high = byTier.high?.length ?? 0
  const medium = byTier.medium?.length ?? 0
  const low = byTier.low?.length ?? 0
  const flagged = high + medium + low

  // Simple risk label
  const overallRisk = high > 0 ? { label: 'High Risk', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/15' }
    : medium > 2 ? { label: 'Medium Risk', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/15' }
    : medium > 0 ? { label: 'Low-Medium Risk', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/15' }
    : { label: 'Low Risk', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-500/15' }

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mb-0.5">{total} items analyzed</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
            {flagged === 0 ? 'No concerns found' : `${flagged} item${flagged !== 1 ? 's' : ''} flagged for review`}
          </p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${overallRisk.bg} ${overallRisk.color}`}>
          {overallRisk.label}
        </span>
      </div>

      {/* Bar breakdown */}
      {flagged > 0 && (
        <div className="space-y-1.5">
          {[
            { key: 'high',   count: high,   label: 'Critical',  bar: 'bg-red-500',   text: 'text-red-600 dark:text-red-400' },
            { key: 'medium', count: medium, label: 'Caution',   bar: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400' },
            { key: 'low',    count: low,    label: 'Monitor',   bar: 'bg-indigo-400',text: 'text-indigo-600 dark:text-indigo-400' },
          ].map(({ key, count, label, bar, text }) => count > 0 && (
            <div key={key} className="flex items-center gap-2">
              <span className={`w-14 text-right text-[10px] font-semibold ${text}`}>{label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full ${bar}`}
                  style={{ width: `${(count / flagged) * 100}%` }}
                />
              </div>
              <span className="w-6 text-[10px] text-gray-400 dark:text-zinc-500">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────

export default function RiskReportView({ flagged, totalAnalyzed }) {
  // Group by severity
  const byTier = { high: [], medium: [], low: [] }
  for (const item of flagged) {
    const key = item.severity?.toLowerCase()
    if (byTier[key]) byTier[key].push(item)
    else byTier.medium.push(item) // fallback
  }

  if (flagged.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-500/15 mb-4">
          <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-1">No concerns found</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-500">
          Your scanned content did not surface any flagged items.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <SummaryBar byTier={byTier} total={totalAnalyzed} />
      {['high', 'medium', 'low'].map(tier =>
        byTier[tier].length > 0 && (
          <TierSection key={tier} tierKey={tier} items={byTier[tier]} />
        )
      )}
    </div>
  )
}
