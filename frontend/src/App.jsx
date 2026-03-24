import { useState, useEffect, useRef } from 'react'
import Dashboard from './components/Dashboard'
import ScanProgress from './components/ScanProgress'
import Results from './components/Results'
import Setup from './components/Setup'

function wsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws/scan`
}

export default function App() {
  const [view, setView] = useState('dashboard')
  const [platformStatus, setPlatformStatus] = useState(null) // null = loading
  const [statusData, setStatusData] = useState(null)
  const [serverError, setServerError] = useState(null)

  const [scanConfig, setScanConfig] = useState({
    platforms: [],
    severity: 'medium',
    limit: null,
  })

  const [progress, setProgress] = useState({
    phase: 'idle',
    fetchStatus: {}, // platform → 'loading' | number | 'error'
    analyzed: 0,
    total: 0,
    flaggedCount: 0,
    lastPlatform: null,
  })

  const [results, setResults] = useState({ flagged: [], totalAnalyzed: 0 })
  const wsRef = useRef(null)

  // Load platform status on mount
  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then((data) => {
        setStatusData(data)
        setPlatformStatus(data.platforms ?? {})
        // Pre-select all configured platforms
        const configured = Object.entries(data.platforms ?? {})
          .filter(([, ok]) => ok)
          .map(([k]) => k)
        setScanConfig((c) => ({ ...c, platforms: configured }))
      })
      .catch(() => setServerError('Cannot reach the server. Is server.py running?'))
  }, [])

  const startScan = () => {
    setServerError(null)
    setProgress({ phase: 'connecting', fetchStatus: {}, analyzed: 0, total: 0, flaggedCount: 0, lastPlatform: null })
    setResults({ flagged: [], totalAnalyzed: 0 })
    setView('scanning')

    const ws = new WebSocket(wsUrl())
    wsRef.current = ws

    ws.onopen = () => ws.send(JSON.stringify(scanConfig))

    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data)
      switch (msg.type) {
        case 'fetch_start':
          setProgress((p) => ({
            ...p,
            phase: 'fetching',
            fetchStatus: { ...p.fetchStatus, [msg.platform]: 'loading' },
          }))
          break
        case 'fetch_done':
          setProgress((p) => ({
            ...p,
            fetchStatus: { ...p.fetchStatus, [msg.platform]: msg.count },
          }))
          break
        case 'fetch_error':
          setProgress((p) => ({
            ...p,
            fetchStatus: { ...p.fetchStatus, [msg.platform]: 'error' },
          }))
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
          setResults({ flagged: msg.flagged ?? [], totalAnalyzed: msg.total_analyzed ?? 0 })
          setView('results')
          break
        case 'error':
          setServerError(msg.error)
          setView('dashboard')
          break
      }
    }

    ws.onerror = () => {
      setServerError('WebSocket error. Is server.py running?')
      setView('dashboard')
    }
  }

  const reset = () => {
    wsRef.current?.close()
    setView('dashboard')
    setServerError(null)
  }

  const handleCredentialsSaved = (updated) => {
    setStatusData(updated)
    setPlatformStatus(updated.platforms ?? {})
    const configured = Object.entries(updated.platforms ?? {})
      .filter(([, ok]) => ok)
      .map(([k]) => k)
    setScanConfig((c) => ({ ...c, platforms: configured }))
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {view === 'dashboard' && (
        <Dashboard
          platformStatus={platformStatus}
          statusData={statusData}
          scanConfig={scanConfig}
          setScanConfig={setScanConfig}
          onStartScan={startScan}
          onOpenSetup={() => setView('setup')}
          error={serverError}
        />
      )}
      {view === 'setup' && (
        <Setup
          statusData={statusData}
          onBack={() => setView('dashboard')}
          onSaved={handleCredentialsSaved}
        />
      )}
      {view === 'scanning' && (
        <ScanProgress progress={progress} platforms={scanConfig.platforms} />
      )}
      {view === 'results' && (
        <Results results={results} onNewScan={reset} />
      )}
    </div>
  )
}
