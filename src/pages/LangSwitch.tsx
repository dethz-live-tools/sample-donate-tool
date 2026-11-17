import type { OverlayStatus } from '../modules/events'
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

export type AdminSection = 'dashboard' | 'controls' | 'access'

// ponytail: single shared admin navbar across Dashboard, Overlay Controls, and Discord Access
export function AdminNav({
  active,
  lang = 'th',
  overlayStatus,
  openOverlayHref = '/overlay'
}: {
  active: AdminSection
  lang?: Locale
  overlayStatus?: OverlayStatus
  openOverlayHref?: string
}) {
  const overlayOnline = Boolean(overlayStatus?.online)
  const clientCount = overlayStatus?.count ?? (overlayOnline ? 1 : 0)

  return (
    <nav class="nav-links">
      <div class="nav-group" style={{ width: '100%', justifyContent: 'end !important' }}>
        {overlayStatus !== undefined && (
          <div id="overlayNavBadge" class={`overlay-indicator ${overlayOnline ? 'is-online' : ''}`}>
            <span class="overlay-square"></span>
            <span id="overlayNavText">
              {overlayOnline
                ? `${t(lang, 'overlay_online')}${clientCount > 1 ? ` (${clientCount})` : ''}`
                : t(lang, 'overlay_offline')}
            </span>
          </div>
        )}
        <a href={openOverlayHref} target="_blank" class="nav-pill nav-external">
          {t(lang, 'dash_open_overlay')} &#8599;
        </a>
        <LangSwitch lang={lang} />
        <form method="post" action="/logout" style="display:inline; margin:0;">
          <button type="submit" class="nav-btn-danger">
            {t(lang, 'dash_logout')}
          </button>
        </form>
      </div>

      <div class="nav-group">
        <a href="/dashboard" class={`nav-pill ${active === 'dashboard' ? 'is-active' : ''}`}>
          {t(lang, 'nav_dashboard')}
        </a>
        <a href="/overlay/control" class={`nav-pill ${active === 'controls' ? 'is-active' : ''}`}>
          {t(lang, 'dash_overlay_controls')}
        </a>
        <a href="/dashboard/access" class={`nav-pill ${active === 'access' ? 'is-active' : ''}`}>
          {t(lang, 'dash_access_link')}
        </a>
        <a href="/" class="nav-pill nav-subtle">
          {t(lang, 'ctrl_donate_page')} &rarr;
        </a>
      </div>
    </nav>
  )
}
