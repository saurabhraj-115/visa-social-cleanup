import { Shield, Sun, Moon, Settings } from 'lucide-react'

export default function Navbar({ theme, onToggleTheme, onOpenSetup, showSetup = true }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span className="font-semibold text-gray-900 dark:text-zinc-100 tracking-tight">
            Visa <span className="text-violet-600 dark:text-violet-400">Cleanup</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {showSetup && (
            <button
              onClick={onOpenSetup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Credentials</span>
            </button>
          )}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}
