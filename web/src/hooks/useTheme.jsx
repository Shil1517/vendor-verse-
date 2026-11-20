import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export const THEME_PRESETS = [
  { id: 'light', label: 'Light', swatch: 'light' },
  { id: 'dark', label: 'Dark', swatch: 'dark' },
  { id: 'midnight', label: 'Midnight', swatch: 'midnight' },
  { id: 'ocean', label: 'Ocean', swatch: 'ocean' },
  { id: 'emerald', label: 'Emerald', swatch: 'emerald' },
  { id: 'sunset', label: 'Sunset', swatch: 'sunset' },
]

const THEME_IDS = new Set(THEME_PRESETS.map(({ id }) => id))

function getStoredTheme() {
  try {
    const stored = window.localStorage.getItem('vv-theme')
    return THEME_IDS.has(stored) ? stored : null
  } catch (error) {
    console.warn('Theme preference could not be read from local storage.', error)
    return null
  }
}

export function ThemeProvider({ children }) {
  // Dark mode is temporarily disabled while the workspace surfaces are being
  // brought onto one coherent design system. Always reset older saved dark
  // preferences so they cannot partially recolour the app.
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      window.localStorage.setItem('vv-theme', 'light')
    } catch (error) {
      console.warn('Theme preference could not be saved to local storage.', error)
    }
  }, [theme])

  const toggleTheme = () => setTheme('light')

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
