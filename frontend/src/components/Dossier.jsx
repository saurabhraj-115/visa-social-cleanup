import { useState, useEffect } from 'react'
import { ArrowLeft, FileText, ChevronRight, Loader2, AlertTriangle } from 'lucide-react'

export default function Dossier({ results, onBack, onProceedToInterview, onProceedToPrep }) {
  const [dossier, setDossier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/dossier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagged: results.flagged }),
    })
      .then((r) => r.json())
      .then((data) => {
        setDossier(data.dossier)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to generate dossier. Is the server running?')
        setLoading(false)
      })
  }, [])

  const highCount = results.flagged.filter((r) => r.severity === 'high').length
  const medCount  = results.flagged.filter((r) => r.severity === 'medium').length

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 animate-fade-in-up">
      {/* Back nav */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to results
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Officer's Intelligence Brief</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">
          This is how a consular officer would perceive your social media profile before your interview.
        </p>
      </div>

      {/* Dossier document */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400 dark:text-zinc-600">
          <Loader2 className="w-7 h-7 animate-spin" />
          <p className="text-sm">Generating officer brief…</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* Classified document card */}
          <div className="relative rounded-2xl border-2 border-red-300 dark:border-red-500/40 overflow-hidden mb-6"
            style={{ background: 'var(--dossier-bg, #fefce8)' }}
          >
            {/* Dark mode override via inline vars */}
            <style>{`
              .dark .dossier-doc { background: #1c1410 !important; }
            `}</style>

            {/* Top bar */}
            <div className="bg-red-600 dark:bg-red-700 px-5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-white" />
                <span className="text-white text-xs font-bold tracking-widest uppercase">Confidential — Pre-Interview Brief</span>
              </div>
              <span className="text-red-200 text-xs font-mono">US-VISA/CBP-2026</span>
            </div>

            {/* Severity badges */}
            <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-500/30 flex items-center gap-4 flex-wrap">
              <span className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">Risk indicators:</span>
              {highCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 text-xs font-bold">
                  <AlertTriangle className="w-3 h-3" /> {highCount} High
                </span>
              )}
              {medCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold">
                  {medCount} Medium
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-zinc-500 ml-auto font-mono">
                {results.flagged.length} item{results.flagged.length !== 1 ? 's' : ''} flagged
              </span>
            </div>

            {/* Brief content */}
            <div
              className="dossier-doc px-6 py-5 font-mono text-sm leading-relaxed text-gray-800 dark:text-amber-100/80 whitespace-pre-wrap"
              style={{
                background: '#fefce8',
                fontSize: '0.8125rem',
                lineHeight: '1.75',
              }}
            >
              <div className="dark:hidden">{dossier}</div>
              <div className="hidden dark:block" style={{ color: '#d4b483' }}>{dossier}</div>
            </div>

            {/* Bottom stamp */}
            <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-500/30 flex items-center justify-between">
              <span className="text-[10px] text-red-400 dark:text-red-600 font-mono uppercase tracking-widest">
                Do not distribute — For officer use only
              </span>
              <span className="text-[10px] text-red-400 dark:text-red-600 font-mono">
                Generated by AI — Not an official document
              </span>
            </div>
          </div>

          {/* Next steps */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-zinc-600 uppercase tracking-wide mb-3">
              What to do next
            </p>

            <ActionCard
              icon="🎤"
              title="Mock Interview"
              description="Sit across from an AI officer who will ask you pointed questions about this brief."
              onClick={() => onProceedToInterview(dossier)}
              primary
            />
            <ActionCard
              icon="📋"
              title="Preparation Package"
              description="Get predicted questions, talking points, and a Visa-Ready Score."
              onClick={() => onProceedToPrep(dossier)}
            />
          </div>
        </>
      )}
    </main>
  )
}

function ActionCard({ icon, title, description, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all group ${
        primary
          ? 'border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/15'
          : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800'
      }`}
    >
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div className="flex-1">
        <div className={`font-semibold text-sm ${primary ? 'text-violet-700 dark:text-violet-300' : 'text-gray-900 dark:text-zinc-100'}`}>
          {title}
        </div>
        <div className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">{description}</div>
      </div>
      <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${
        primary ? 'text-violet-500' : 'text-gray-400 dark:text-zinc-600'
      }`} />
    </button>
  )
}
