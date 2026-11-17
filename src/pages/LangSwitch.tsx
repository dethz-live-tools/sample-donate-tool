import { t, type Locale } from '../i18n'

// ponytail: navbar language toggle — renders as a text button; styling in src/style.css (#langSwitch)
export function LangSwitch({ lang = 'th' }: { lang?: Locale }) {
  const target: Locale = lang === 'th' ? 'en' : 'th'
  const label = t(lang, target === 'th' ? 'lang_th' : 'lang_en')
  return (
    <button
      id="langSwitch"
      type="button"
      onclick={`window.__setLang?window.__setLang('${target}'):(location.search='?lang=${target}')`}
    >
      {label}
    </button>
  )
}
