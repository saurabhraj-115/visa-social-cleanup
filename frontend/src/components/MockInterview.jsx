import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, Loader2, Badge, CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react'

const VERDICT_CONFIG = {
  satisfactory:    { color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-500/10',  border: 'border-green-200 dark:border-green-500/20',  icon: CheckCircle2,  label: 'Good answer' },
  needs_improvement: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20', icon: MinusCircle,   label: 'Needs improvement' },
  concerning:      { color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-500/10',    border: 'border-red-200 dark:border-red-500/20',    icon: AlertTriangle, label: 'Concerning' },
}

export default function MockInterview({ results, dossier, onBack }) {
  const [history, setHistory] = useState([])          // [{question, answer, evaluation}]
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [loadingQuestion, setLoadingQuestion] = useState(true)
  const [loadingEval, setLoadingEval] = useState(false)
  const [done, setDone] = useState(false)
  const bottomRef = useRef(null)

  // Fetch the first question on mount
  useEffect(() => {
    fetchNextQuestion([])
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, currentQuestion, loadingQuestion])

  const fetchNextQuestion = async (currentHistory) => {
    setLoadingQuestion(true)
    try {
      const res = await fetch('/api/interview/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossier, history: currentHistory, flagged: results.flagged }),
      })
      const data = await res.json()
      setCurrentQuestion(data.question)
    } catch {
      setCurrentQuestion('Can you tell me about your travel purpose and ties to your home country?')
    } finally {
      setLoadingQuestion(false)
    }
  }

  const submitAnswer = async () => {
    if (!answer.trim() || loadingEval) return
    const q = currentQuestion
    const a = answer.trim()
    setAnswer('')
    setLoadingEval(true)
    setCurrentQuestion(null)

    try {
      const evalRes = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, answer: a, flagged_item: results.flagged[history.length] ?? null }),
      })
      const evaluation = await evalRes.json()

      const newHistory = [...history, { question: q, answer: a, evaluation }]
      setHistory(newHistory)

      // After 5 exchanges or when flagged items are exhausted, end the interview
      if (newHistory.length >= Math.min(5, Math.max(3, results.flagged.length))) {
        setDone(true)
        setLoadingEval(false)
      } else {
        setLoadingEval(false)
        fetchNextQuestion(newHistory)
      }
    } catch {
      setHistory((h) => [...h, { question: q, answer: a, evaluation: { verdict: 'needs_improvement', coaching: 'Unable to evaluate.' } }])
      setLoadingEval(false)
      setDone(true)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitAnswer()
  }

  const totalConcerning = history.filter((t) => t.evaluation?.verdict === 'concerning').length
  const totalSatisfactory = history.filter((t) => t.evaluation?.verdict === 'satisfactory').length

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 animate-fade-in-up">
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to dossier
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Mock Interview</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">
          An AI officer will ask you about your flagged content. Practice your answers. Get coached in real-time.
        </p>
      </div>

      {/* Officer card */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-700 dark:bg-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🛂</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Consular Officer</div>
          <div className="text-xs text-gray-500 dark:text-zinc-500">US Embassy — Visa Interview Section</div>
        </div>
        {history.length > 0 && (
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-green-600 dark:text-green-400 font-medium">{totalSatisfactory} good</span>
            <span className="text-gray-300 dark:text-zinc-700">·</span>
            <span className="text-red-600 dark:text-red-400 font-medium">{totalConcerning} concerning</span>
          </div>
        )}
      </div>

      {/* Conversation */}
      <div className="space-y-4 mb-6">
        {history.map((turn, i) => (
          <div key={i} className="space-y-3">
            {/* Officer question */}
            <OfficerBubble text={turn.question} />

            {/* Applicant answer */}
            <div className="flex justify-end">
              <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-md bg-violet-600 dark:bg-violet-700 text-white text-sm leading-relaxed">
                {turn.answer}
              </div>
            </div>

            {/* Evaluation */}
            {turn.evaluation && <EvaluationBadge evaluation={turn.evaluation} />}
          </div>
        ))}

        {/* Current question */}
        {loadingQuestion && !done && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-md bg-gray-100 dark:bg-zinc-800 w-fit text-gray-500 dark:text-zinc-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-sm">Officer is reviewing the file…</span>
          </div>
        )}
        {currentQuestion && !done && <OfficerBubble text={currentQuestion} />}

        {/* Evaluating */}
        {loadingEval && (
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-zinc-600 px-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Evaluating your answer…
          </div>
        )}

        {/* Done */}
        {done && (
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-center">
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-1">Interview complete</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              {totalConcerning === 0
                ? 'Strong performance — your answers were reassuring.'
                : `${totalConcerning} answer${totalConcerning !== 1 ? 's' : ''} raised concern. Review the coaching and practice more.`}
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!done && currentQuestion && (
        <div className="flex gap-2 items-end">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer… (⌘Enter to submit)"
            rows={3}
            className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400 placeholder-gray-400 dark:placeholder-zinc-600 transition-colors"
          />
          <button
            onClick={submitAnswer}
            disabled={!answer.trim() || loadingEval}
            className="p-3 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </main>
  )
}

function OfficerBubble({ text }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-blue-700 dark:bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-sm">
        🛂
      </div>
      <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tl-md bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 text-sm leading-relaxed">
        {text}
      </div>
    </div>
  )
}

function EvaluationBadge({ evaluation }) {
  const cfg = VERDICT_CONFIG[evaluation.verdict] ?? VERDICT_CONFIG.needs_improvement
  const Icon = cfg.icon
  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-xs ${cfg.bg} ${cfg.border}`}>
      <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
      <div>
        <span className={`font-semibold ${cfg.color}`}>{cfg.label} — </span>
        <span className="text-gray-600 dark:text-zinc-400">{evaluation.coaching}</span>
      </div>
    </div>
  )
}
