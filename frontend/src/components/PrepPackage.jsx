import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, ChevronDown, ChevronUp, RefreshCw, CheckCircle2, Wand2 } from 'lucide-react'

const SCORE_COLOR = (score) => {
  if (score >= 85) return { stroke: '#22c55e', text: 'text-green-600 dark:text-green-400', label: 'Low Risk' }
  if (score >= 65) return { stroke: '#f59e0b', text: 'text-amber-600 dark:text-amber-400', label: 'Moderate Risk' }
  return { stroke: '#ef4444', text: 'text-red-600 dark:text-red-400', label: 'High Risk' }
}

function CircleScore({ score }) {
  const { stroke, text, label } = SCORE_COLOR(score)
  const r = 42
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-100 dark:text-zinc-800" />
        <circle
          cx="55" cy="55" r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="55" y="52" textAnchor="middle" dominantBaseline="middle" fontSize="22" fontWeight="700" fill={stroke}>
          {score}
        </text>
        <text x="55" y="70" textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#9ca3af">
          / 100
        </text>
      </svg>
      <span className={`text-xs font-semibold ${text}`}>{label}</span>
    </div>
  )
}

export default function PrepPackage({ results, dossier, onBack }) {
  const [pkg, setPkg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openIndex, setOpenIndex] = useState(0)
  const [rewrites, setRewrites] = useState({})   // item_id → {loading, text}
  const [dismissed, setDismissed] = useState({}) // item_id → true

  const load = () => {
    setLoading(true)
    setError(null)
    fetch('/api/prep-package', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagged: results.flagged, dossier }),
    })
      .then((r) => r.json())
      .then((data) => { setPkg(data); setLoading(false) })
      .catch(() => { setError('Failed to generate prep package.'); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const requestRewrite = async (item) => {
    const key = item.item_id ?? item.text.slice(0, 40)
    setRewrites((r) => ({ ...r, [key]: { loading: true, text: null } }))
    try {
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      const data = await res.json()
      setRewrites((r) => ({ ...r, [key]: { loading: false, text: data.rewritten } }))
    } catch {
      setRewrites((r) => ({ ...r, [key]: { loading: false, text: null, error: true } }))
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 animate-fade-in-up">
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to dossier
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Preparation Package</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">
          Predicted questions, talking points, and content clean-up tools.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400 dark:text-zinc-600">
          <Loader2 className="w-7 h-7 animate-spin" />
          <p className="text-sm">Building your prep package…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={load} className="inline-flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : (
        <>
          {/* Score + advice */}
          <div className="flex items-center gap-6 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 mb-6">
            <CircleScore score={pkg.visa_ready_score ?? 50} />
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-400 dark:text-zinc-600 uppercase tracking-wide mb-2">Visa-Ready Score</p>
              <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed">{pkg.top_advice}</p>
              {pkg.key_themes?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {pkg.key_themes.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-medium border border-amber-200 dark:border-amber-500/20">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Predicted questions */}
          {pkg.predicted_questions?.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-400 dark:text-zinc-600 uppercase tracking-wide mb-3">
                Predicted interview questions
              </p>
              <div className="space-y-2">
                {pkg.predicted_questions.map((q, i) => (
                  <div key={i} className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                    <button
                      onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-zinc-100">{q.question}</span>
                      {openIndex === i
                        ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-zinc-600 flex-shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-zinc-600 flex-shrink-0" />}
                    </button>
                    {openIndex === i && (
                      <div className="px-4 pb-4 space-y-3">
                        {q.flagged_content_ref && (
                          <div className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-700 dark:text-red-400">
                            <span className="font-semibold">Prompted by: </span>"{q.flagged_content_ref}"
                          </div>
                        )}
                        <div className="px-3 py-2 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                          <p className="text-[11px] font-semibold text-green-700 dark:text-green-500 uppercase tracking-wide mb-1">Suggested talking point</p>
                          <p className="text-xs text-green-800 dark:text-green-300 leading-relaxed">{q.suggested_answer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content cleanup */}
          {results.flagged.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-zinc-600 uppercase tracking-wide mb-3">
                Content clean-up
              </p>
              <div className="space-y-3">
                {results.flagged.filter((item) => !dismissed[item.item_id ?? item.text.slice(0,40)]).map((item, i) => {
                  const key = item.item_id ?? item.text.slice(0, 40)
                  const rw = rewrites[key]
                  return (
                    <div key={i} className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                            item.severity === 'high'
                              ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                              : item.severity === 'medium'
                              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                              : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                          }`}>{item.severity}</span>
                          <span className="ml-2 text-[11px] text-gray-400 dark:text-zinc-600">{item.platform} · {item.content_type}</span>
                        </div>
                        <button
                          onClick={() => setDismissed((d) => ({ ...d, [key]: true }))}
                          className="text-[11px] text-gray-400 dark:text-zinc-600 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors flex-shrink-0"
                        >
                          Dismiss
                        </button>
                      </div>

                      <p className="text-xs text-gray-700 dark:text-zinc-400 leading-relaxed line-clamp-3">
                        {item.text}
                      </p>

                      {/* Rewrite */}
                      {!rw && (
                        <button
                          onClick={() => requestRewrite(item)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                        >
                          <Wand2 className="w-3.5 h-3.5" /> Rewrite to reduce risk
                        </button>
                      )}
                      {rw?.loading && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-600">
                          <Loader2 className="w-3 h-3 animate-spin" /> Rewriting…
                        </div>
                      )}
                      {rw?.text && (
                        <div className="space-y-2">
                          <div className="px-3 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">
                            <p className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 mb-1">Suggested rewrite</p>
                            <p className="text-xs text-violet-900 dark:text-violet-200 leading-relaxed">{rw.text}</p>
                          </div>
                          <p className="text-[11px] text-gray-400 dark:text-zinc-600">
                            Copy this text and edit your post manually — <a href={item.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700 dark:hover:text-zinc-300">Open post</a>
                          </p>
                        </div>
                      )}
                      {rw?.error && (
                        <p className="text-[11px] text-red-500">Failed to rewrite. Try again.</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
