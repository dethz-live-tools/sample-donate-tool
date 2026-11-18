import type { OverlayStatus } from '../../modules/events'
import { ControlLayout } from './layout'
import { t, type I18nKey, type Locale } from '../../i18n'

export function OverlayControlOverviewPage({ overlayStatus, lang = 'th' }: { overlayStatus?: OverlayStatus; lang?: Locale }) {
  const T = (key: I18nKey, vars?: Record<string, string | number>) => t(lang, key, vars)
  const ttsEnabled = overlayStatus?.ttsEnabled ?? true

  return (
    <ControlLayout
      lang={lang}
      activeTab="overview"
      title={T('ctrl_overview_title')}
      subtitle={T('ctrl_overview_subtitle')}
      overlayStatus={overlayStatus}
      openOverlayHref="/overlay"
      extraScript={`
        function bindOverlayRow(inputId, btnId, linkId, toggleId, basePath, cmdAction, cmdExtra = {}) {
          const inputEl = document.getElementById(inputId);
          const btnEl = document.getElementById(btnId);
          const linkEl = document.getElementById(linkId);
          const toggleEl = document.getElementById(toggleId);
          bindCopy(inputEl, btnEl, basePath);

          function syncUrl() {
            const isTransparent = Boolean(toggleEl?.checked);
            const sep = basePath.includes('?') ? '&' : '?';
            const path = isTransparent ? (basePath + sep + 'transparent=1') : basePath;
            if (inputEl) inputEl.value = window.location.origin + path;
            if (linkEl) linkEl.href = path;
          }
          syncUrl();
          toggleEl?.addEventListener('change', () => {
            syncUrl();
            sendCommand(cmdAction, { ...cmdExtra, transparent: Boolean(toggleEl.checked) });
          });
        }

        bindOverlayRow('obsUrlInput', 'copyUrlBtn', 'testAlertLink', 'ovAlertTransparent', '/overlay', 'alert');
        bindOverlayRow('obsLbUrlInput', 'copyLbUrlBtn', 'testLbLink', 'ovLbTransparent', '/overlay/leaderboard?limit=5', 'leaderboard');
        bindOverlayRow('obsCdUrlInput', 'copyCdUrlBtn', 'testCdLink', 'ovCdTransparent', '/overlay/countdown?minutes=10&title=STARTING+SOON', 'countdown', { cmd: 'bg', mode: 'countdown' });
        bindOverlayRow('obsSubUrlInput', 'copySubUrlBtn', 'testSubLink', 'ovSubTransparent', '/overlay/subathon?minutes=10&rate=6', 'subathon', { cmd: 'bg', mode: 'subathon' });

        document.getElementById('cmdReloadBtn')?.addEventListener('click', () => sendCommand('reload'));
        document.getElementById('cmdClearBtn')?.addEventListener('click', () => sendCommand('clear'));
        document.getElementById('cmdDisconnectBtn')?.addEventListener('click', () => sendCommand('disconnect'));
        document.getElementById('cmdTtsBtn')?.addEventListener('click', () => sendCommand('tts'));
        document.getElementById('cmdPingBtn')?.addEventListener('click', async () => {
          showStatus(__t('dash_sending'));
          try {
            const res = await fetch('/api/events/heartbeat', { method: 'POST' });
            const data = await res.json();
            showStatus(__t('dash_saved') + ' (heartbeat)');
            log('Manual heartbeat ping sent', 'success');
            if (data) updateState(data);
          } catch (err) {
            showStatus('Error: ' + err.message, true);
            log('Heartbeat ping failed: ' + err.message, 'err');
          }
        });
      `}
    >
      <div>
        <details class="inverted-block fold-block" open>
          <summary>{T('ctrl_select_overlay')}</summary>

          <details class="card fold-block" style="background:var(--ctp-mantle); margin-bottom:16px; padding:16px;" open>
            <summary>{T('ctrl_ov_alert_title')}</summary>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
              <div style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0);">
                {T('ctrl_ov_alert_desc')}
              </div>
              <a
                href="/overlay/control/alert"
                style="text-decoration:none; padding:8px 14px; font-family:var(--font-head); font-size:12px; background:var(--ctp-accent); color:var(--ctp-crust);"
              >
                {T('ctrl_ov_alert_btn')} &rarr;
              </a>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
              <input
                type="text"
                id="obsUrlInput"
                readOnly
                value=""
                style="margin-bottom:0; background:var(--ctp-crust);"
              />
              <button
                type="button"
                id="copyUrlBtn"
                style="width:auto; padding:10px 16px; font-size:13px; white-space:nowrap;"
              >
                {T('ctrl_copy')}
              </button>
              <a id="testAlertLink" href="/overlay" target="_blank" style="white-space:nowrap; font-size:12px;">
                {T('ctrl_test')}
              </a>
            </div>
            <label style="display:inline-flex; align-items:center; gap:8px; margin-top:8px; margin-bottom:0; cursor:pointer; color:var(--ctp-text);">
              <input type="checkbox" id="ovAlertTransparent" style="width:auto; margin:0;" />
              <span>{T('ctrl_transparent_bg')}</span>
            </label>
          </details>

          <details class="card fold-block" style="background:var(--ctp-mantle); margin-bottom:16px; padding:16px;" open>
            <summary>{T('ctrl_ov_lb_title')}</summary>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
              <div style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0);">
                {T('ctrl_ov_lb_desc')}
              </div>
              <a
                href="/overlay/control/leaderboard"
                style="text-decoration:none; padding:8px 14px; font-family:var(--font-head); font-size:12px; background:var(--ctp-accent); color:var(--ctp-crust);"
              >
                {T('ctrl_ov_lb_btn')} &rarr;
              </a>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
              <input
                type="text"
                id="obsLbUrlInput"
                readOnly
                value=""
                style="margin-bottom:0; background:var(--ctp-crust);"
              />
              <button
                type="button"
                id="copyLbUrlBtn"
                style="width:auto; padding:10px 16px; font-size:13px; white-space:nowrap;"
              >
                {T('ctrl_copy')}
              </button>
              <a id="testLbLink" href="/overlay/leaderboard" target="_blank" style="white-space:nowrap; font-size:12px;">
                {T('ctrl_test')}
              </a>
            </div>
            <label style="display:inline-flex; align-items:center; gap:8px; margin-top:8px; margin-bottom:0; cursor:pointer; color:var(--ctp-text);">
              <input type="checkbox" id="ovLbTransparent" style="width:auto; margin:0;" />
              <span>{T('ctrl_transparent_bg')}</span>
            </label>
          </details>

          <details class="card fold-block" style="background:var(--ctp-mantle); margin-bottom:16px; padding:16px;" open>
            <summary>{T('ctrl_ov_cd_title')}</summary>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
              <div style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0);">
                {T('ctrl_ov_cd_desc')}
              </div>
              <a
                href="/overlay/control/countdown"
                style="text-decoration:none; padding:8px 14px; font-family:var(--font-head); font-size:12px; background:var(--ctp-accent); color:var(--ctp-crust);"
              >
                {T('ctrl_ov_cd_btn')} &rarr;
              </a>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
              <input
                type="text"
                id="obsCdUrlInput"
                readOnly
                value=""
                style="margin-bottom:0; background:var(--ctp-crust);"
              />
              <button
                type="button"
                id="copyCdUrlBtn"
                style="width:auto; padding:10px 16px; font-size:13px; white-space:nowrap;"
              >
                {T('ctrl_copy')}
              </button>
              <a
                id="testCdLink"
                href="/overlay/countdown?minutes=10&title=STARTING+SOON"
                target="_blank"
                style="white-space:nowrap; font-size:12px;"
              >
                {T('ctrl_test')}
              </a>
            </div>
            <label style="display:inline-flex; align-items:center; gap:8px; margin-top:8px; margin-bottom:0; cursor:pointer; color:var(--ctp-text);">
              <input type="checkbox" id="ovCdTransparent" style="width:auto; margin:0;" />
              <span>{T('ctrl_transparent_bg')}</span>
            </label>
          </details>

          <details class="card fold-block" style="background:var(--ctp-mantle); margin-bottom:12px; padding:16px;" open>
            <summary>{T('ctrl_ov_sub_title')}</summary>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
              <div style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0);">
                {T('ctrl_ov_sub_desc')}
              </div>
              <a
                href="/overlay/control/subathon"
                style="text-decoration:none; padding:8px 14px; font-family:var(--font-head); font-size:12px; background:var(--ctp-accent); color:var(--ctp-crust);"
              >
                {T('ctrl_ov_sub_btn')} &rarr;
              </a>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
              <input
                type="text"
                id="obsSubUrlInput"
                readOnly
                value=""
                style="margin-bottom:0; background:var(--ctp-crust);"
              />
              <button
                type="button"
                id="copySubUrlBtn"
                style="width:auto; padding:10px 16px; font-size:13px; white-space:nowrap;"
              >
                {T('ctrl_copy')}
              </button>
              <a
                id="testSubLink"
                href="/overlay/subathon?minutes=10&rate=6"
                target="_blank"
                style="white-space:nowrap; font-size:12px;"
              >
                {T('ctrl_test')}
              </a>
            </div>
            <label style="display:inline-flex; align-items:center; gap:8px; margin-top:8px; margin-bottom:0; cursor:pointer; color:var(--ctp-text);">
              <input type="checkbox" id="ovSubTransparent" style="width:auto; margin:0;" />
              <span>{T('ctrl_transparent_bg')}</span>
            </label>
          </details>

          <div style="font-size:13px; color:var(--ctp-subtext0); line-height:1.6;">
            {T('ctrl_obs_audio_hint')}
          </div>
        </details>

        <details class="card fold-block" style="margin-bottom:24px;" open>
          <summary>{T('ctrl_global_actions')}</summary>
          <div class="grid-actions" style="margin-bottom:0;">
            <button type="button" id="cmdReloadBtn" style="font-size:14px; padding:14px 20px;">
              {T('ctrl_force_reload')}
            </button>
            <button type="button" id="cmdClearBtn" style="font-size:14px; padding:14px 20px;">
              {T('ctrl_clear_queue')}
            </button>
            <button
              type="button"
              id="cmdDisconnectBtn"
              style="font-size:14px; padding:14px 20px; background:var(--ctp-red); border-color:var(--ctp-red);"
            >
              {T('ctrl_disconnect_reset')}
            </button>
            <button
              type="button"
              id="cmdPingBtn"
              style="font-size:14px; padding:14px 20px; background:var(--ctp-sapphire); border-color:var(--ctp-sapphire);"
            >
              {T('ctrl_ping_heartbeat')}
            </button>
            <button type="button" id="cmdTtsBtn" style="font-size:14px; padding:14px 20px;">
              {ttsEnabled ? T('ctrl_tts_on_btn') : T('ctrl_tts_off_btn')}
            </button>
          </div>
        </details>
      </div>
    </ControlLayout>
  )
}
