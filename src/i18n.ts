// ponytail: tiny zero-dependency i18n — typed JSON catalogs + locale resolution, no framework.
// Server pages and inline scripts translate via `t(locale, key, vars)`; client scripts use `window.__t`.

import en from './locales/en.json'
import th from './locales/th.json'

export const LOCALES = ['th', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export type I18nKey = keyof typeof th

const messages: Record<Locale, Record<I18nKey, string>> = { th, en }

// safe lookup: unknown keys fall back to the key itself; missing locales fall back to th
export function t(locale: Locale, key: I18nKey, vars?: Record<string, string | number>): string {
  const table = messages[locale] ?? messages.th
  let str = table[key] ?? messages.th[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v))
    }
  }
  return str
}

export function isLocale(v: unknown): v is Locale {
  return v === 'th' || v === 'en'
}

// precedence: lang cookie (synced from localStorage) > Accept-Language > DEFAULT_LANG env > th
export function resolveLocale(
  _query: Record<string, string> | undefined,
  cookie: string | undefined,
  acceptLanguage: string | undefined,
  defaultLang: string | undefined
): Locale {
  if (cookie) {
    const matches = cookie
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.startsWith('lang='))
    for (let i = matches.length - 1; i >= 0; i--) {
      const v = matches[i]?.split('=')[1]
      if (isLocale(v)) return v
    }
  }
  if (acceptLanguage) {
    const first = acceptLanguage.split(',')[0]?.trim().toLowerCase().split('-')[0]
    if (isLocale(first)) return first
  }
  if (isLocale(defaultLang)) return defaultLang
  return 'th'
}

// server-side: one-shot template for inline scripts + localStorage <-> cookie sync (no ?lang= in URL bar)
export function clientI18n(locale: Locale): string {
  const table = messages[locale] ?? messages.th
  const json = JSON.stringify(table).replace(/</g, '\\u003c')
  return `window.__LANG='${locale}';window.__T=${json};window.__t=function(k,v){var s=window.__T[k]||k;if(v)for(var x in v)s=s.replaceAll('{'+x+'}',String(v[x]));return s};window.__setLang=function(l){try{if(window.__es)window.__es.close()}catch(e){}try{localStorage.setItem('lang',l)}catch(e){}var p=location.pathname;document.cookie='lang=;max-age=0';document.cookie='lang=;path='+p+';max-age=0';document.cookie='lang=;path=/dashboard;max-age=0';document.cookie='lang=;path=/overlay/control;max-age=0';document.cookie='lang='+l+';path=/;max-age=31536000;SameSite=Lax';var u=new URL(location.href);u.searchParams.delete('lang');location.replace(u.pathname+u.search+u.hash)};try{var u=new URL(location.href);if(u.searchParams.has('lang')){u.searchParams.delete('lang');history.replaceState(null,'',u.pathname+u.search+u.hash)}var s=localStorage.getItem('lang'),l=(s==='th'||s==='en')?s:'${locale}';localStorage.setItem('lang',l);document.cookie='lang='+l+';path=/;max-age=31536000;SameSite=Lax';if(l!=='${locale}')window.__setLang(l)}catch(e){}`
}
