import { useState } from 'react'
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { platformColor } from '../lib/platforms'

const SEVERITY_STYLES = {
  high: {
    border: '#ef4444',
    badge: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    label: 'High',
  },
  medium: {
    border: '#f59e0b',
    badge: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    label: 'Medium',
  },
  low: {
    border: '#6366f1',
    badge: { bg: 'rgba(99,102,241,0.15)', color: '#6366f1' },
    label: 'Low',
  },
}

export default function ResultCard({ item, index }) {
  const [expanded, setExpanded] = useState(false)
  const sev = SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.medium
  const color = platformColor(item.platform)
  const isLong = item.text?.length > 200

  return (
    <div
      className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden animate-fade-in-up"
      style={{
        borderLeftColor: sev.border,
        borderLeftWidth: 3,
        animationDelay: `${index * 40}ms`,
      }}
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Platform badge */}
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: color + '18', color }}
            >
              {item.platform}
            </span>
            {/* Type badge */}
            <span className="px-2.5 py-1 rounded-lg text-xs bg-zinc-800 text-zinc-400 capitalize">
              {item.content_type}
            </span>
            {/* Severity badge */}
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-semibold capitalize"
              style={sev.badge}
            >
              {sev.label} risk
            </span>
          </div>

          {/* Open link */}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs font-medium transition-colors"
          >
            Open
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Content preview */}
        <div className="mb-4">
          <p className={`text-sm text-zinc-300 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
            {item.text}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-1.5 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {expanded ? (
                <><ChevronUp className="w-3 h-3" /> Show less</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> Show more</>
              )}
            </button>
          )}
        </div>

        {/* Reason box */}
        <div
          className="p-3 rounded-xl border"
          style={{ backgroundColor: sev.border + '08', borderColor: sev.border + '25' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: sev.border + 'cc' }}>
            Why flagged
          </p>
          <p className="text-xs text-zinc-400 leading-relaxed">{item.reason}</p>
        </div>

        {/* Date */}
        {item.created_at && item.created_at !== 'unknown' && (
          <p className="text-xs text-zinc-600 mt-3">{item.created_at}</p>
        )}
      </div>
    </div>
  )
}
