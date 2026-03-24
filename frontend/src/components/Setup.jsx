import { useState } from 'react'
import { ArrowLeft, ExternalLink, CheckCircle, Eye, EyeOff } from 'lucide-react'

const SECTIONS = [
  {
    id: 'anthropic',
    name: 'Anthropic AI',
    color: '#6366f1',
    letter: 'AI',
    required: true,
    hint: 'Required for all AI analysis — without this, scanning won\'t work.',
    linkLabel: 'Get key at console.anthropic.com',
    link: 'https://console.anthropic.com',
    configuredKey: 'has_anthropic_key',
    fields: [
      { key: 'ANTHROPIC_API_KEY', label: 'API Key', type: 'password' },
    ],
  },
  {
    id: 'reddit',
    name: 'Reddit',
    color: '#ff4500',
    letter: 'R',
    hint: 'Create a "web" app. Set redirect URI to http://localhost:8080',
    linkLabel: 'reddit.com/prefs/apps',
    link: 'https://www.reddit.com/prefs/apps',
    fields: [
      { key: 'REDDIT_CLIENT_ID',     label: 'Client ID',     type: 'text'     },
      { key: 'REDDIT_CLIENT_SECRET', label: 'Client Secret', type: 'password' },
    ],
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    color: '#1d9bf0',
    letter: 'X',
    hint: 'App → Keys and Tokens → Bearer Token. No OAuth secrets needed.',
    linkLabel: 'developer.twitter.com',
    link: 'https://developer.twitter.com',
    fields: [
      { key: 'TWITTER_BEARER_TOKEN', label: 'Bearer Token', type: 'password' },
      { key: 'TWITTER_USERNAME',     label: 'Username (without @)', type: 'text' },
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877f2',
    letter: 'F',
    hint: 'Generate a long-lived user token via Graph API Explorer.',
    linkLabel: 'developers.facebook.com/tools/explorer',
    link: 'https://developers.facebook.com/tools/explorer',
    fields: [
      { key: 'FACEBOOK_ACCESS_TOKEN', label: 'User Access Token', type: 'password' },
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#e1306c',
    letter: 'IG',
    hint: 'Uses your login credentials directly (no app required).',
    fields: [
      { key: 'INSTAGRAM_USERNAME', label: 'Username', type: 'text'     },
      { key: 'INSTAGRAM_PASSWORD', label: 'Password', type: 'password' },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: '#0a66c2',
    letter: 'in',
    hint: 'Add products: "Sign In with LinkedIn using OpenID Connect" + "Share on LinkedIn". Set redirect URI to http://localhost:8080',
    linkLabel: 'linkedin.com/developers',
    link: 'https://www.linkedin.com/developers',
    fields: [
      { key: 'LINKEDIN_CLIENT_ID',     label: 'Client ID',     type: 'text'     },
      { key: 'LINKEDIN_CLIENT_SECRET', label: 'Client Secret', type: 'password' },
    ],
  },
]

function FieldInput({ field, value, onChange, isSet }) {
  const [show, setShow] = useState(false)
  const isPassword = field.type === 'password'

  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1.5">{field.label}</label>
      <div className="relative">
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={isSet ? '••••••••  (already set — leave blank to keep)' : 'Paste value here'}
          className="w-full px-3 py-2 pr-9 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Setup({ statusData, onBack, onSaved }) {
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [error, setError] = useState(null)

  const keysSet = statusData?.keys_set ?? {}
  const platformsConfigured = statusData?.platforms ?? {}

  const isSectionConfigured = (section) => {
    if (section.id === 'anthropic') return !!statusData?.has_anthropic_key
    return !!platformsConfigured[section.id]
  }

  const setField = (key, val) => setValues((v) => ({ ...v, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('Server error')
      const updated = await res.json()
      setSavedOk(true)
      setValues({})
      onSaved(updated)
    } catch (e) {
      setError('Failed to save. Is the server running?')
    } finally {
      setSaving(false)
    }
  }

  const anyFilled = Object.values(values).some((v) => v?.trim())

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[96px]" />
      </div>

      <div className="relative max-w-xl mx-auto animate-fade-in-up">
        {/* Header */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </button>

        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Connect your accounts</h1>
        <p className="text-sm text-zinc-500 mb-8">
          Credentials are saved to a local <code className="text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded">.env</code> file on your machine — never sent anywhere else.
        </p>

        {/* Success banner */}
        {savedOk && (
          <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Credentials saved successfully.
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Sections */}
        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const configured = isSectionConfigured(section)
            return (
              <div
                key={section.id}
                className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden"
              >
                {/* Section header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: section.color + '20', color: section.color }}
                  >
                    {section.letter}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-200">{section.name}</span>
                      {section.required && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 font-medium">
                          Required
                        </span>
                      )}
                      {configured && (
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-medium">
                          <CheckCircle className="w-2.5 h-2.5" />
                          Configured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{section.hint}</p>
                  </div>
                  {section.link && (
                    <a
                      href={section.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 flex items-center gap-1 text-xs text-zinc-500 hover:text-violet-400 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="hidden sm:inline">{section.linkLabel}</span>
                    </a>
                  )}
                </div>

                {/* Fields */}
                <div className="px-5 py-4 grid gap-3">
                  {section.fields.map((field) => (
                    <FieldInput
                      key={field.key}
                      field={field}
                      value={values[field.key] ?? ''}
                      onChange={setField}
                      isSet={!!keysSet[field.key]}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Save button */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!anyFilled || saving}
            className={`flex-1 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 ${
              anyFilled && !saving
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving…' : 'Save credentials'}
          </button>
          {savedOk && (
            <button
              onClick={onBack}
              className="px-5 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
            >
              Go scan →
            </button>
          )}
        </div>

        <p className="text-center text-xs text-zinc-700 mt-4">
          Values are written to <code className="text-zinc-600">.env</code> in the project root and never leave your machine.
        </p>
      </div>
    </div>
  )
}
