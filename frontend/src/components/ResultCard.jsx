import { useState } from 'react'
import { ExternalLink, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Info, Trash2, Loader2, CheckCircle2 } from 'lucide-react'
import { platformColor } from '../lib/platforms'

const SEVERITY = {
  high: {
    border: '#ef4444',
    icon: AlertCircle,
    pill: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    reason: 'bg-red-50 border-red-200 dark:bg-red-500/8 dark:border-red-500/20',
    reasonLabel: 'text-red-600 dark:text-red-400',
    label: 'High risk',
  },
  medium: {
    border: '#f59e0b',
    icon: AlertTriangle,
    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    reason: 'bg-amber-50 border-amber-200 dark:bg-amber-500/8 dark:border-amber-500/20',
    reasonLabel: 'text-amber-700 dark:text-amber-400',
    label: 'Medium risk',
  },
  low: {
    border: '#6366f1',
    icon: Info,
    pill: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
    reason: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/8 dark:border-indigo-500/20',
    reasonLabel: 'text-indigo-700 dark:text-indigo-400',
    label: 'Low risk',
  },
}

export default function ResultCard({ item, index }) {
  const [expanded, setExpanded] = useState(false)
  const [deleteState, setDeleteState] = useState('idle') // idle | confirm | deleting | deleted | error
  const [deleteError, setDeleteError] = useState(null)
  const sev = SEVERITY[item.severity] ?? SEVERITY.medium
  const color = platformColor(item.platform)
  const SevIcon = sev.icon
  const isLong = item.text?.length > 220

  const handleDelete = async () => {
    if (deleteState === 'idle') { setDeleteState('confirm'); return }
    if (deleteState !== 'confirm') return
    setDeleteState('deleting')
    try {
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: item.platform.toLowerCase(),
          item_id: item.item_id,
          content_type: item.content_type,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Delete failed')
      setDeleteState('deleted')
    } catch (e) {
      setDeleteError(e.message)
      setDeleteState('error')
    }
  }

  if (deleteState === 'deleted') {
    return (
      <article className="bg-gray-50 dark:bg-zinc-900/50 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden animate-fade-in-up opacity-60"
        style={{ animationDelay: `${index * 40}ms` }}>
        <div className="p-5 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span className="text-sm text-gray-500 dark:text-zinc-500 line-through">{item.text?.slice(0, 60)}…</span>
          <span className="text-xs text-green-600 dark:text-green-500 ml-auto">Deleted</span>
        </div>
      </article>
    )
  }

  return (
    <article
      className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-card hover:shadow-card-hover transition-shadow animate-fade-in-up"
      style={{ borderLeftColor: sev.border, borderLeftWidth: 3, animationDelay: `${index * 40}ms` }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: color + '18', color }}
            >
              {item.platform}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 font-medium capitalize">
              {item.content_type}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${sev.pill}`}>
              <SevIcon className="w-3 h-3" />
              {sev.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 text-xs font-medium transition-colors"
            >
              Open <ExternalLink className="w-3 h-3" />
            </a>

            {/* Delete button */}
            {deleteState === 'idle' && (
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:border-red-300 dark:hover:border-red-500/40 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs transition-colors"
                title="Delete this post"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
            {deleteState === 'confirm' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  className="px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
                >
                  Delete?
                </button>
                <button
                  onClick={() => setDeleteState('idle')}
                  className="px-2 py-1.5 rounded-lg text-gray-400 hover:text-gray-600 text-xs transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
            {deleteState === 'deleting' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
              </span>
            )}
            {deleteState === 'error' && (
              <button
                onClick={() => setDeleteState('idle')}
                className="px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-500 text-xs"
                title={deleteError}
              >
                Failed ✕
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className={`text-sm text-gray-700 dark:text-zinc-300 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
            {item.text}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-1.5 inline-flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
            >
              {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show more</>}
            </button>
          )}
        </div>

        {/* Reason */}
        <div className={`p-3 rounded-xl border ${sev.reason}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${sev.reasonLabel}`}>
            Why flagged
          </p>
          <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">{item.reason}</p>
        </div>

        {/* Date */}
        {item.created_at && item.created_at !== 'unknown' && (
          <p className="text-xs text-gray-400 dark:text-zinc-600 mt-3">{item.created_at}</p>
        )}
      </div>
    </article>
  )
}
