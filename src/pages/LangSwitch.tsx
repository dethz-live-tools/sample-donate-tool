import { useRequestContext } from 'hono/jsx-renderer'
import { DISCORD_PERMISSIONS, type DiscordPermission } from '../modules/db'
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
      data-target-lang={target}
      onclick={`window.__setLang&&window.__setLang('${target}')`}
    >
      {label}
    </button>
  )
}

export type AdminSection = 'dashboard' | 'controls' | 'config' | 'access'

// ponytail: single shared admin navbar across Dashboard, Overlay Controls, Config, and Discord Access
export function AdminNav({
  active,
  lang = 'th',
  overlayStatus,
  openOverlayHref = '/overlay',
  permissions
}: {
  active: AdminSection
  lang?: Locale
  overlayStatus?: OverlayStatus
  openOverlayHref?: string
  permissions?: DiscordPermission[]
}) {
  const overlayOnline = Boolean(overlayStatus?.online)
  const clientCount = overlayStatus?.count ?? (overlayOnline ? 1 : 0)
  let effectivePerms: readonly DiscordPermission[] = permissions || DISCORD_PERMISSIONS
  let sessionTimeoutMs = 3_600_000
  try {
    const c = useRequestContext()
    if (!permissions) {
      const ctxPerms = c?.get('userPermissions' as any) as DiscordPermission[] | undefined
      if (Array.isArray(ctxPerms) && ctxPerms.length > 0) effectivePerms = ctxPerms
    }
    const ctxTimeout = Number(c?.get('sessionTimeoutMs' as any))
    if (Number.isFinite(ctxTimeout) && ctxTimeout >= 60_000) sessionTimeoutMs = ctxTimeout
  } catch {}
  const can = (section: DiscordPermission) => effectivePerms.includes(section)

  return (
    <nav class="nav-links">
      <div class="nav-group">
        {can('dashboard') && (
          <a href="/dashboard" class={`nav-pill ${active === 'dashboard' ? 'is-active' : ''}`}>
            {t(lang, 'nav_dashboard')}
          </a>
        )}
        {can('controls') && (
          <a href="/overlay/control" class={`nav-pill ${active === 'controls' ? 'is-active' : ''}`}>
            {t(lang, 'dash_overlay_controls')}
          </a>
        )}
        {can('config') && (
          <a href="/dashboard/config" class={`nav-pill ${active === 'config' ? 'is-active' : ''}`}>
            {t(lang, 'nav_config')}
          </a>
        )}
        {can('access') && (
          <a href="/dashboard/access" class={`nav-pill ${active === 'access' ? 'is-active' : ''}`}>
            {t(lang, 'dash_access_link')}
          </a>
        )}
        <a href="/" class="nav-pill nav-subtle">
          {t(lang, 'ctrl_donate_page')} &rarr;
        </a>
      </div>
      <div class="nav-group" style="margin-left:auto;">
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
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var u=new URL(location.href),err=u.searchParams.get('error');if(err==='unauthorized'||err==='forbidden'){u.searchParams.delete('error');history.replaceState(null,'',u.pathname+u.search+u.hash);window.addEventListener('DOMContentLoaded',function(){if(typeof Swal!=='undefined'){Swal.fire({icon:'error',title:__t('swal_unauthorized_title'),text:__t(err==='forbidden'?'swal_forbidden_text':'swal_unauthorized_text'),background:'var(--ctp-mantle)',color:'var(--ctp-text)',confirmButtonColor:'var(--ctp-red)'})}})}}catch(e){}if(window.__sessGuard)return;window.__sessGuard=1;var timeoutMs=${sessionTimeoutMs},refreshIntervalMs=Math.max(30000,Math.floor(timeoutMs*0.5)),lastActive=Date.now(),lastRefresh=Date.now(),dirty=false;function touch(){lastActive=Date.now();dirty=true}['pointerdown','keydown','scroll','touchstart'].forEach(function(ev){window.addEventListener(ev,touch,{passive:true})});setInterval(function(){var now=Date.now();if(now-lastActive>=timeoutMs){try{if(window.__es)window.__es.close()}catch(e){}fetch('/api/manage/logout',{method:'POST'}).finally(function(){location.replace('/login?error=session_expired')});return}if(dirty&&now-lastRefresh>=refreshIntervalMs){dirty=false;lastRefresh=now;fetch('/api/manage/auth/refresh',{method:'POST'}).then(function(r){if(r.status===401)location.replace('/login?error=session_expired')}).catch(function(){})}},15000)})();`
        }}
      />
    </nav>
  )
}
