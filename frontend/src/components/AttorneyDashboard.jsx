import { useState, useEffect } from 'react'
import { Briefcase, Plus, Trash2, ChevronRight, ArrowLeft, Printer, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score == null) return 'text-gray-400 dark:text-zinc-500'
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function scoreBg(score) {
  if (score == null) return 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400'
  if (score >= 80) return 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400'
  if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'
  return 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400'
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Add Client Form ────────────────────────────────────────────────────────

function AddClientForm({ onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const resp = await fetch('/api/attorney/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.detail || 'Failed to create client')
      onAdd(data)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">New client</p>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Full name *"
        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email (optional)"
        type="email"
        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {saving ? 'Adding…' : 'Add client'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Client List View ───────────────────────────────────────────────────────

function ClientListView({ clients, loading, onSelect, onClientAdded, onDelete }) {
  const [showAddForm, setShowAddForm] = useState(false)

  const latestScan = (client) => client.scans?.[0] ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Clients</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'}
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add client
          </button>
        )}
      </div>

      {showAddForm && (
        <AddClientForm
          onAdd={(client) => { onClientAdded(client); setShowAddForm(false) }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      )}

      {!loading && clients.length === 0 && !showAddForm && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-500/15 mb-4">
            <Briefcase className="w-7 h-7 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-1">No clients yet</p>
          <p className="text-xs text-gray-500 dark:text-zinc-500">Add a client to save scan results for them.</p>
        </div>
      )}

      <div className="space-y-2">
        {clients.map(client => {
          const scan = latestScan(client)
          const score = scan?.visa_ready_score
          return (
            <div key={client.id} className="card group">
              <button
                onClick={() => onSelect(client)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors rounded-2xl"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">{client.name}</p>
                    {client.cleared && (
                      <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Cleared
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                    {client.email || 'No email'} · {scan ? `Last scan ${formatDate(scan.scan_date)}` : 'No scans yet'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {score != null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(score)}`}>
                      {score}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-zinc-600 group-hover:text-gray-500 dark:group-hover:text-zinc-400 transition-colors" />
                </div>
              </button>
              <button
                onClick={() => onDelete(client)}
                className="absolute top-3 right-10 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                style={{ position: 'absolute' }}
                title="Delete client"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Client Detail View ─────────────────────────────────────────────────────

function ClientDetailView({ client, onBack, results, dossier, onScanSaved }) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [viewingDossier, setViewingDossier] = useState(null)
  const [localClient, setLocalClient] = useState(client)

  const hasScan = results && results.flagged != null && results.totalAnalyzed > 0

  const saveScan = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      // Try to extract visa_ready_score from dossier metadata if available
      const resp = await fetch(`/api/attorney/clients/${localClient.id}/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flagged_items: results.flagged,
          total_analyzed: results.totalAnalyzed,
          visa_ready_score: null, // will be null until user generates prep package
          dossier: dossier || '',
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.detail || 'Failed to save scan')
      setLocalClient(data)
      onScanSaved(data)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const printReport = () => window.print()

  return (
    <div className="space-y-4 print:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All clients
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{localClient.name}</h2>
          {localClient.email && (
            <p className="text-xs text-gray-500 dark:text-zinc-500">{localClient.email}</p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {localClient.scans.length > 0 && (
            <button
              onClick={printReport}
              className="print:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print report
            </button>
          )}
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block border-b pb-4 mb-4">
        <h1 className="text-xl font-bold">{localClient.name}</h1>
        {localClient.email && <p className="text-sm text-gray-600">{localClient.email}</p>}
        <p className="text-xs text-gray-500 mt-1">Generated {new Date().toLocaleDateString()}</p>
      </div>

      {/* Save current scan CTA */}
      {hasScan && (
        <div className="print:hidden p-4 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
            Save current scan to this client
          </p>
          <p className="text-xs text-gray-500 dark:text-zinc-500">
            {results.totalAnalyzed} items analyzed · {results.flagged.length} flagged
          </p>
          {saveError && (
            <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>
          )}
          <button
            onClick={saveScan}
            disabled={saving}
            className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : 'Save scan'}
          </button>
        </div>
      )}

      {/* Scan history */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-600 mb-3">
          Scan history
        </p>

        {localClient.scans.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-zinc-500">No scans saved yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {localClient.scans.map((scan, i) => {
              const score = scan.visa_ready_score
              return (
                <div key={i} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                        {formatDate(scan.scan_date)}
                        {i === 0 && (
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400">
                            Latest
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                        {scan.total_analyzed} analyzed · {scan.flagged_items?.length ?? 0} flagged
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {score != null && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(score)}`}>
                          Score: {score}
                        </span>
                      )}
                      {score == null && (
                        <span className="text-xs text-gray-400 dark:text-zinc-600">No score</span>
                      )}
                    </div>
                  </div>

                  {/* Dossier preview */}
                  {scan.dossier && (
                    <button
                      onClick={() => setViewingDossier(viewingDossier === i ? null : i)}
                      className="print:hidden mt-3 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      {viewingDossier === i ? 'Hide dossier ↑' : 'View dossier ↓'}
                    </button>
                  )}
                  {viewingDossier === i && (
                    <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-xs font-mono text-gray-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {scan.dossier}
                    </div>
                  )}

                  {/* Print-only dossier */}
                  {scan.dossier && (
                    <div className="hidden print:block mt-3 text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {scan.dossier}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function AttorneyDashboard({ onBack, results, dossier }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/attorney/clients')
      .then(r => r.json())
      .then(data => { setClients(data.clients ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`/api/attorney/clients/${deleteTarget.id}`, { method: 'DELETE' })
      setClients(cs => cs.filter(c => c.id !== deleteTarget.id))
      if (selectedClient?.id === deleteTarget.id) setSelectedClient(null)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 animate-fade-in-up">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!selectedClient && (
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
          )}
          {!selectedClient && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Attorney Mode</h1>
              <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">
                Manage clients and save scan results
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onBack}
          className="text-xs text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="card p-6 max-w-sm w-full space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Delete client?</p>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                  This will permanently delete <strong>{deleteTarget.name}</strong> and all their scan history.
                </p>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedClient ? (
        <ClientDetailView
          client={selectedClient}
          onBack={() => setSelectedClient(null)}
          results={results}
          dossier={dossier}
          onScanSaved={(updated) => {
            setClients(cs => cs.map(c => c.id === updated.id ? updated : c))
            setSelectedClient(updated)
          }}
        />
      ) : (
        <ClientListView
          clients={clients}
          loading={loading}
          onSelect={setSelectedClient}
          onClientAdded={(client) => setClients(cs => [client, ...cs])}
          onDelete={(client) => setDeleteTarget(client)}
        />
      )}
    </main>
  )
}
