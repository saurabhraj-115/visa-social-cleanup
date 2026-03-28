import { useState, useEffect, useRef } from 'react'
import Dashboard from './components/Dashboard'
import ScanProgress from './components/ScanProgress'
import Results from './components/Results'
import ConnectAccounts from './components/ConnectAccounts'
import Navbar from './components/Navbar'
import Dossier from './components/Dossier'
import MockInterview from './components/MockInterview'
import PrepPackage from './components/PrepPackage'
import QuickSetupModal from './components/QuickSetupModal'
import TwitterFollowingAudit from './components/TwitterFollowingAudit'

function wsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws/scan`
}

export default function App() {
  const [view, setView] = useState('dashboard')
  const [platformStatus, setPlatformStatus] = useState(null)
  const [statusData, setStatusData] = useState(null)
  const [serverError, setServerError] = useState(null)

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const [scanConfig, setScanConfig] = useState({
    platforms: [],
    severity: 'medium',
    limit: null,
  })

  const [progress, setProgress] = useState({
    phase: 'idle',
    fetchStatus: {},
    analyzed: 0,
    total: 0,
    flaggedCount: 0,
    lastPlatform: null,
  })

  const [results, setResults] = useState({ flagged: [], totalAnalyzed: 0 })
  const [dossier, setDossier] = useState(null)
  const [quickSetupPlatforms, setQuickSetupPlatforms] = useState(null) // null = hidden
  const wsRef = useRef(null)
  const scanTimeoutRef = useRef(null)

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then((data) => {
        setStatusData(data)
        setPlatformStatus(data.platforms ?? {})
        const configured = Object.entries(data.platforms ?? {})
          .filter(([, ok]) => ok)
          .map(([k]) => k)
        setScanConfig((c) => ({ ...c, platforms: configured }))
      })
      .catch(() => setServerError('Cannot reach the server. Is server.py running?'))
  }, [])

  const startScan = () => {
    // Check which selected platforms are not yet configured
    const unconfigured = scanConfig.platforms.filter((p) => !platformStatus?.[p])
    if (unconfigured.length > 0) {
      setQuickSetupPlatforms(unconfigured)
      return
    }
    doStartScan()
  }

  const doStartScan = () => {
    setQuickSetupPlatforms(null)
    setServerError(null)
    setProgress({ phase: 'connecting', fetchStatus: {}, analyzed: 0, total: 0, flaggedCount: 0, lastPlatform: null })
    setResults({ flagged: [], totalAnalyzed: 0 })
    setView('scanning')

    const ws = new WebSocket(wsUrl())
    wsRef.current = ws

    scanTimeoutRef.current = setTimeout(() => {
      ws.close()
      setServerError('Scan timed out after 10 minutes.')
      setView('dashboard')
    }, 10 * 60 * 1000)

    ws.onopen = () => ws.send(JSON.stringify(scanConfig))

    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data)
      switch (msg.type) {
        case 'fetch_start':
          setProgress((p) => ({ ...p, phase: 'fetching', fetchStatus: { ...p.fetchStatus, [msg.platform]: 'loading' } }))
          break
        case 'fetch_done':
          setProgress((p) => ({ ...p, fetchStatus: { ...p.fetchStatus, [msg.platform]: msg.count } }))
          break
        case 'fetch_error':
          setProgress((p) => ({ ...p, fetchStatus: { ...p.fetchStatus, [msg.platform]: { code: 'error', message: msg.error } } }))
          break
        case 'analyze_start':
          setProgress((p) => ({ ...p, phase: 'analyzing', total: msg.total }))
          break
        case 'analyze_progress':
          setProgress((p) => ({
            ...p,
            analyzed: msg.current,
            lastPlatform: msg.platform,
            flaggedCount: p.flaggedCount + (msg.flagged ? 1 : 0),
          }))
          break
        case 'done':
          clearTimeout(scanTimeoutRef.current)
          setResults({ flagged: msg.flagged ?? [], totalAnalyzed: msg.total_analyzed ?? 0 })
          setView('results')
          break
        case 'error':
          clearTimeout(scanTimeoutRef.current)
          setServerError(msg.error)
          setView('dashboard')
          break
        default:
          console.warn('[ws] unknown message type:', msg.type)
      }
    }

    ws.onerror = () => {
      clearTimeout(scanTimeoutRef.current)
      setServerError('WebSocket error. Is server.py running?')
      setView('dashboard')
    }
  }

  const reset = () => {
    clearTimeout(scanTimeoutRef.current)
    wsRef.current?.close()
    setView('dashboard')
    setServerError(null)
    setDossier(null)
  }

  const handleCredentialsSaved = (updated) => {
    setStatusData(updated)
    setPlatformStatus(updated.platforms ?? {})
    const configured = Object.entries(updated.platforms ?? {})
      .filter(([, ok]) => ok)
      .map(([k]) => k)
    setScanConfig((c) => ({ ...c, platforms: configured }))
  }

  const handleQuickSetupDone = () => {
    // Re-fetch status so platformStatus is up-to-date, then scan
    fetch('/api/status')
      .then((r) => r.json())
      .then((data) => {
        setStatusData(data)
        setPlatformStatus(data.platforms ?? {})
        setQuickSetupPlatforms(null)
        doStartScan()
      })
      .catch(() => {
        setQuickSetupPlatforms(null)
        doStartScan()
      })
  }

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 transition-colors duration-200">
      {quickSetupPlatforms && (
        <QuickSetupModal
          platforms={quickSetupPlatforms}
          onDone={handleQuickSetupDone}
          onClose={() => setQuickSetupPlatforms(null)}
        />
      )}
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSetup={() => setView('setup')}
        showSetup={view === 'dashboard' || view === 'setup'}
      />

      {view === 'dashboard' && (
        <Dashboard
          platformStatus={platformStatus}
          statusData={statusData}
          scanConfig={scanConfig}
          setScanConfig={setScanConfig}
          onStartScan={startScan}
          onOpenSetup={() => setView('setup')}
          onOpenFollowingAudit={() => setView('twitter-following')}
          error={serverError}
        />
      )}
      {view === 'setup' && (
        <ConnectAccounts
          statusData={statusData}
          onBack={() => setView('dashboard')}
          onSaved={handleCredentialsSaved}
        />
      )}
      {view === 'scanning' && (
        <ScanProgress progress={progress} platforms={scanConfig.platforms} onCancel={reset} />
      )}
      {view === 'results' && (
        <Results
          results={results}
          onNewScan={reset}
          onOpenDossier={() => setView('dossier')}
        />
      )}
      {view === 'dossier' && (
        <Dossier
          results={results}
          onBack={() => setView('results')}
          onProceedToInterview={(d) => { setDossier(d); setView('interview') }}
          onProceedToPrep={(d) => { setDossier(d); setView('prep') }}
        />
      )}
      {view === 'interview' && (
        <MockInterview
          results={results}
          dossier={dossier}
          onBack={() => setView('dossier')}
        />
      )}
      {view === 'prep' && (
        <PrepPackage
          results={results}
          dossier={dossier}
          onBack={() => setView('dossier')}
        />
      )}
      {view === 'twitter-following' && (
        <TwitterFollowingAudit
          statusData={statusData}
          onBack={() => setView('dashboard')}
        />
      )}
    </div>
  )
}
