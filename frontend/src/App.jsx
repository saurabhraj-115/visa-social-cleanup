import { useState, useEffect, useRef } from 'react'
import Dashboard from './components/Dashboard'
import ScanTabsView from './components/ScanTabsView'
import ConnectAccounts from './components/ConnectAccounts'
import Navbar from './components/Navbar'
import Dossier from './components/Dossier'
import MockInterview from './components/MockInterview'
import PrepPackage from './components/PrepPackage'
import QuickSetupModal from './components/QuickSetupModal'
import TwitterFollowingAudit from './components/TwitterFollowingAudit'
import InstagramFollowingAudit from './components/InstagramFollowingAudit'
import AttorneyDashboard from './components/AttorneyDashboard'

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

  const [scanConfig, setScanConfig] = useState({ platforms: [], severity: 'medium', limit: null })

  // Per-platform scan state (fed by WS messages)
  const [platformScan, setPlatformScan] = useState({})
  // 'idle' | 'connecting' | 'scanning' | 'done'
  const [scanPhase, setScanPhase] = useState('idle')

  const [results, setResults] = useState({ flagged: [], totalAnalyzed: 0 })
  const [dossier, setDossier] = useState(null)
  const [quickSetupPlatforms, setQuickSetupPlatforms] = useState(null)
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
    const unconfigured = scanConfig.platforms.filter((p) => !platformStatus?.[p])
    if (unconfigured.length > 0) { setQuickSetupPlatforms(unconfigured); return }
    doStartScan()
  }

  const doStartScan = () => {
    setQuickSetupPlatforms(null)
    setServerError(null)
    setPlatformScan({})
    setScanPhase('connecting')
    setResults({ flagged: [], totalAnalyzed: 0 })
    setView('scan-tabs')

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
          setScanPhase('scanning')
          setPlatformScan(ps => ({
            ...ps,
            [msg.platform]: { fetchPhase: 'loading', fetchCount: 0, fetchError: null, analyzed: 0, flaggedCount: 0 },
          }))
          break
        case 'fetch_done':
          setPlatformScan(ps => ({
            ...ps,
            [msg.platform]: { ...(ps[msg.platform] || {}), fetchPhase: 'done', fetchCount: msg.count },
          }))
          break
        case 'fetch_error':
          setPlatformScan(ps => ({
            ...ps,
            [msg.platform]: { ...(ps[msg.platform] || {}), fetchPhase: 'error', fetchError: msg.error },
          }))
          break
        case 'analyze_start':
          break
        case 'analyze_progress': {
          // item.platform from Python is capitalized (e.g. "Reddit") — normalize to lowercase
          const key = msg.platform?.toLowerCase()
          if (key) {
            setPlatformScan(ps => {
              const cur = ps[key] || {}
              return {
                ...ps,
                [key]: { ...cur, analyzed: (cur.analyzed || 0) + 1, flaggedCount: (cur.flaggedCount || 0) + (msg.flagged ? 1 : 0) },
              }
            })
          }
          break
        }
        case 'done':
          clearTimeout(scanTimeoutRef.current)
          setResults({ flagged: msg.flagged ?? [], totalAnalyzed: msg.total_analyzed ?? 0 })
          setScanPhase('done')
          break
        case 'error':
          clearTimeout(scanTimeoutRef.current)
          setServerError(msg.error)
          setView('dashboard')
          break
        default:
          break
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
    setScanPhase('idle')
    setPlatformScan({})
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
    fetch('/api/status')
      .then((r) => r.json())
      .then((data) => {
        setStatusData(data)
        setPlatformStatus(data.platforms ?? {})
        setQuickSetupPlatforms(null)
        doStartScan()
      })
      .catch(() => { setQuickSetupPlatforms(null); doStartScan() })
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
        onOpenAttorney={() => setView('attorney')}
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
      {view === 'scan-tabs' && (
        <ScanTabsView
          platforms={scanConfig.platforms}
          platformScan={platformScan}
          scanPhase={scanPhase}
          results={results}
          statusData={statusData}
          onNewScan={reset}
          onOpenDossier={results.flagged.length > 0 ? () => setView('dossier') : null}
        />
      )}
      {view === 'dossier' && (
        <Dossier
          results={results}
          onBack={() => setView('scan-tabs')}
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
      {view === 'attorney' && (
        <AttorneyDashboard
          onBack={() => setView('dashboard')}
          results={results}
          dossier={dossier}
        />
      )}
      {/* Standalone audit pages (still accessible from setup/direct links if needed) */}
      {view === 'twitter-following' && (
        <TwitterFollowingAudit statusData={statusData} onBack={() => setView('dashboard')} />
      )}
      {view === 'instagram-following' && (
        <InstagramFollowingAudit onBack={() => setView('dashboard')} />
      )}
    </div>
  )
}
