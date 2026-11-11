import { useApp } from '../store'

export function LanguageToggle({ className = '' }) {
  const { lang, setLang } = useApp()

  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
      className={`vx-lang-toggle ${className}`}
      aria-label={`Switch to ${lang === 'en' ? 'Hindi' : 'English'}`}
      title={`Switch to ${lang === 'en' ? 'Hindi' : 'English'}`}
    >
      <span className="vx-lang-text">{lang === 'en' ? 'हि' : 'EN'}</span>
    </button>
  )
}
