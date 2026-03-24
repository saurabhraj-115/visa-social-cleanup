import { PLATFORMS } from '../lib/platforms'

export default function PlatformCard({ platform, configured, selected, onToggle }) {
  const meta = PLATFORMS[platform]
  if (!meta) return null

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-full text-left p-4 rounded-2xl border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
        selected
          ? 'cursor-pointer border-transparent scale-[1.02]'
          : 'cursor-pointer border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/50'
      }`}
      style={
        selected
          ? {
              borderColor: meta.color + '55',
              backgroundColor: meta.color + '10',
              boxShadow: `0 0 0 1px ${meta.color}30, 0 8px 24px ${meta.color}18`,
            }
          : {}
      }
    >
      {/* Platform letter mark */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold mb-3 transition-colors"
        style={{
          backgroundColor: selected ? meta.color + '25' : meta.color + '15',
          color: meta.color,
        }}
      >
        {meta.letter}
      </div>

      <div className="text-sm font-semibold text-zinc-200 truncate">{meta.name}</div>

      <div className="flex items-center gap-1.5 mt-1.5">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            selected && configured ? 'bg-green-400' : selected ? 'bg-yellow-500' : 'bg-zinc-600'
          }`}
        />
        <span className="text-xs text-zinc-500">
          {selected && !configured ? 'No credentials' : selected ? 'Included' : configured ? 'Click to include' : 'Not configured'}
        </span>
      </div>

      {/* Selected checkmark */}
      {selected && (
        <div
          className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: meta.color + '25', color: meta.color }}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  )
}
