import { Check } from 'lucide-react'
import { PLATFORMS } from '../lib/platforms'

export default function PlatformCard({ platform, configured, selected, onToggle }) {
  const meta = PLATFORMS[platform]
  if (!meta) return null

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-full text-left p-4 rounded-2xl border transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
        selected
          ? 'border-transparent shadow-md scale-[1.02]'
          : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700 hover:shadow-card-hover'
      }`}
      style={selected ? {
        borderColor: meta.color + '55',
        backgroundColor: meta.color + '12',
        boxShadow: `0 4px 14px ${meta.color}20`,
      } : {}}
    >
      {/* Platform icon */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold mb-3 transition-colors"
        style={{
          backgroundColor: meta.color + (selected ? '25' : '18'),
          color: meta.color,
        }}
      >
        {meta.letter}
      </div>

      <div className="text-sm font-semibold text-gray-900 dark:text-zinc-200 truncate mb-1">
        {meta.name}
      </div>

      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          selected && configured ? 'bg-green-500' :
          selected ? 'bg-amber-500' :
          configured ? 'bg-green-400' : 'bg-gray-300 dark:bg-zinc-600'
        }`} />
        <span className="text-xs text-gray-400 dark:text-zinc-500 truncate">
          {selected && !configured ? 'No credentials' :
           selected ? 'Included' :
           configured ? 'Ready' : 'Not set up'}
        </span>
      </div>

      {/* Checkmark */}
      {selected && (
        <div
          className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: meta.color, color: 'white' }}
        >
          <Check className="w-3 h-3" strokeWidth={2.5} />
        </div>
      )}
    </button>
  )
}
