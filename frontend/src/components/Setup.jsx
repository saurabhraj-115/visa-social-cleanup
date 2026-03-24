import { useState } from 'react'
import { ExternalLink, CheckCircle, Eye, EyeOff, Check } from 'lucide-react'

const SECTIONS = [
  {
    id: 'anthropic',
    name: 'Anthropic AI',
    color: '#6366f1',
    letter: 'AI',
    required: true,
    hint: 'Required for AI analysis — without this, scanning won\'t work.',
    linkLabel: 'console.anthropic.com',
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
    hint: 'Create a "web" app. Redirect URI: http://localhost:8080',
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
    hint: 'App → Keys and Tokens → Bearer Token.',
    linkLabel: 'developer.twitter.com',
    link: 'https://developer.twitter.com',
    fields: [
      { key: 'TWITTER_BEARER_TOKEN', label: 'Bearer Token',         type: 'password' },
      { key: 'TWITTER_USERNAME',     label: 'Username (no @)',      type: 'text'     },
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
    hint: 'Uses your login credentials directly — no developer app needed.',
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
    hint: 'Add products: "Sign In with LinkedIn using OpenID Connect" + "Share on LinkedIn". Redirect URI: http://localhost:8080',
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
      <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1.5">
        {field.label}
      </label>
      <div className="relative">
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={isSet ? '••••••••  (already set — leave blank to keep)' : 'Paste value here'}
          className="w-full px-3 py-2.5 pr-10 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-200 text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

  const setField = (key, val) => {
    setSavedOk(false)
    setValues((v) => ({ ...v, [key]: val }))
  }

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
    } catch {
      setError('Failed to save. Is the server running?')
    } finally {
      setSaving(false)
    }
  }

  const anyFilled = Object.values(values).some((v) => v?.trim())

  return (
    <main className="max-w-xl mx-auto px-4 py-10 animate-fade-in-up">

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors mb-4"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-1">Connect your accounts</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-500">
          Saved to a local <code className="text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">.env</code> file — never transmitted anywhere.
        </p>
      </div>

      {/* Banners */}
      {savedOk && (
        <div className="flex items-center gap-2.5 mb-6 p-3.5 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 text-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Credentials saved successfully.
        </div>
      )}
      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const configured = isSectionConfigured(section)
          return (
            <div key={section.id} className="card overflow-hidden">
              {/* Section header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: section.color + '20', color: section.color }}
                >
                  {section.letter}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 dark:text-zinc-200">{section.name}</span>
                    {section.required && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 font-semibold">
                        Required
                      </span>
                    )}
                    {configured && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400 font-semibold">
                        <Check className="w-2.5 h-2.5" /> Configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 leading-relaxed">{section.hint}</p>
                </div>
                {section.link && (
                  <a
                    href={section.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 dark:text-zinc-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                    title={section.linkLabel}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
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

      {/* Save */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={handleSave}
          disabled={!anyFilled || saving}
          className={`flex-1 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 ${
            anyFilled && !saving
              ? 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white shadow-lg shadow-violet-600/25'
              : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving…' : 'Save credentials'}
        </button>
        {savedOk && (
          <button
            onClick={onBack}
            className="px-5 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-sm font-medium transition-colors"
          >
            Go scan →
          </button>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-zinc-700 mt-4">
        Values are written to <code className="text-gray-500 dark:text-zinc-600">.env</code> in the project root only.
      </p>
    </main>
  )
}
