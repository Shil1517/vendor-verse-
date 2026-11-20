import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../hooks/useTheme.jsx'

/* Light / dark switch. The six-preset colour picker (F-VND-13) was taken out of the UI on
   2026-11-20; the presets stay defined in useTheme.jsx so it can be restored (see O-20). */
export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const darkTheme = theme === 'dark'

  return (
    <div className="vv-theme-control" aria-label="Workspace theme controls">
      <button
        type="button"
        onClick={toggleTheme}
        className={`vv-theme-toggle ${className}`}
        aria-label={`Switch to ${darkTheme ? 'light' : 'dark'} mode`}
        title={`Switch to ${darkTheme ? 'light' : 'dark'} mode`}
      >
        {darkTheme ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  )
}
