import { useRef, useState } from 'react'
import { Check, Moon, Palette, Sun } from 'lucide-react'
import { THEME_PRESETS, useTheme } from '../hooks/useTheme.jsx'

export function ThemeToggle({ className = '' }) {
  const { theme, setTheme, toggleTheme } = useTheme()
  const darkTheme = theme === 'dark' || theme === 'midnight'
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerTriggerRef = useRef(null)

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
      <div className={`vv-theme-picker${pickerOpen ? ' is-open' : ''}`}>
        <button
          ref={pickerTriggerRef}
          type="button"
          className="vv-theme-picker-trigger"
          aria-label="Choose workspace color theme"
          aria-expanded={pickerOpen}
          aria-controls="vv-workspace-theme-menu"
          title="Choose workspace color theme"
          onClick={() => setPickerOpen((open) => !open)}
        >
          <Palette size={17} />
        </button>
        {pickerOpen && (
          <div
            id="vv-workspace-theme-menu"
            className="vv-theme-picker-menu"
            role="group"
            aria-label="Workspace color themes"
          >
            {THEME_PRESETS.map(({ id, label, swatch }) => (
              <button
                key={id}
                type="button"
                className="vv-theme-picker-option"
                aria-pressed={theme === id}
                onClick={() => {
                  setTheme(id)
                  setPickerOpen(false)
                  pickerTriggerRef.current?.focus()
                }}
              >
                <span className={`vv-theme-swatch vv-theme-swatch-${swatch}`} aria-hidden="true" />
                <span>{label}</span>
                {theme === id && <Check size={15} aria-hidden="true" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
