import type { OverlayStatus } from '../../modules/events'
import { ControlLayout } from './layout'

export function OverlayControlOverviewPage({ overlayStatus }: { overlayStatus?: OverlayStatus }) {
  const ttsEnabled = overlayStatus?.ttsEnabled ?? true

  return (
    <ControlLayout
      activeTab="overview"
      title="OVERLAY CONTROLLER"
      subtitle="OBS BROWSER SOURCE DIRECTORY & GLOBAL COMMAND BUS"
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
          showStatus('SENDING MANUAL HEARTBEAT...');
          try {
            const res = await fetch('/api/events/heartbeat', { method: 'POST' });
            const data = await res.json();
            showStatus('OK // HEARTBEAT PING SENT');
            log('Manual heartbeat ping sent', 'success');
            if (data) updateState(data);
          } catch (err) {
            showStatus('ERROR // ' + err.message, true);
            log('Heartbeat ping failed: ' + err.message, 'err');
          }
        });
      `}
    >
      <div>
        <details class="inverted-block fold-block">
          <summary>SELECT OVERLAY TO CONFIGURE OR COPY OBS BROWSER SOURCE URL</summary>

          <details class="card fold-block" style="background:var(--ctp-mantle); margin-bottom:16px; padding:16px;">
            <summary>1. DONATION ALERT &amp; TTS OVERLAY (800 x 400)</summary>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
              <div style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0);">
                Alert queue, Edge Neural TTS voices, profanity censor filter, and test alerts
              </div>
              <a
                href="/overlay/control/alert"
                style="text-decoration:none; padding:8px 14px; font-family:var(--font-head); font-size:12px; background:var(--ctp-mauve); color:var(--ctp-crust);"
              >
                CONFIGURE ALERT &amp; TTS &rarr;
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
                COPY
              </button>
              <a id="testAlertLink" href="/overlay" target="_blank" style="white-space:nowrap; font-size:12px;">
                TEST
              </a>
            </div>
            <label style="display:inline-flex; align-items:center; gap:8px; margin-top:8px; margin-bottom:0; cursor:pointer; color:var(--ctp-text);">
              <input type="checkbox" id="ovAlertTransparent" style="width:auto; margin:0;" />
              <span>TRANSPARENT CARD BACKGROUND</span>
            </label>
          </details>

          <details class="card fold-block" style="background:var(--ctp-mantle); margin-bottom:16px; padding:16px;">
            <summary>2. TOP DONORS LEADERBOARD OVERLAY (450 x 500)</summary>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
              <div style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0);">
                Live ranked top donors list, custom title, and row count limit
              </div>
              <a
                href="/overlay/control/leaderboard"
                style="text-decoration:none; padding:8px 14px; font-family:var(--font-head); font-size:12px; background:var(--ctp-mauve); color:var(--ctp-crust);"
              >
                CONFIGURE LEADERBOARD &rarr;
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
                COPY
              </button>
              <a id="testLbLink" href="/overlay/leaderboard" target="_blank" style="white-space:nowrap; font-size:12px;">
                TEST
              </a>
            </div>
            <label style="display:inline-flex; align-items:center; gap:8px; margin-top:8px; margin-bottom:0; cursor:pointer; color:var(--ctp-text);">
              <input type="checkbox" id="ovLbTransparent" style="width:auto; margin:0;" />
              <span>TRANSPARENT CARD BACKGROUND</span>
            </label>
          </details>

          <details class="card fold-block" style="background:var(--ctp-mantle); margin-bottom:16px; padding:16px;">
            <summary>3. COUNTDOWN TIMER OVERLAY (450 x 250)</summary>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
              <div style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0);">
                Standard stream countdown timer, quick presets, pause/resume, and custom durations
              </div>
              <a
                href="/overlay/control/countdown"
                style="text-decoration:none; padding:8px 14px; font-family:var(--font-head); font-size:12px; background:var(--ctp-mauve); color:var(--ctp-crust);"
              >
                CONFIGURE COUNTDOWN &rarr;
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
                COPY
              </button>
              <a
                id="testCdLink"
                href="/overlay/countdown?minutes=10&title=STARTING+SOON"
                target="_blank"
                style="white-space:nowrap; font-size:12px;"
              >
                TEST
              </a>
            </div>
            <label style="display:inline-flex; align-items:center; gap:8px; margin-top:8px; margin-bottom:0; cursor:pointer; color:var(--ctp-text);">
              <input type="checkbox" id="ovCdTransparent" style="width:auto; margin:0;" />
              <span>TRANSPARENT CARD BACKGROUND</span>
            </label>
          </details>

          <details class="card fold-block" style="background:var(--ctp-mantle); margin-bottom:12px; padding:16px;">
            <summary>4. SUBATHON MARATHON OVERLAY (450 x 250)</summary>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
              <div style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0);">
                Auto-extending marathon clock (+seconds per 1 THB donated), rate &amp; cap controls
              </div>
              <a
                href="/overlay/control/subathon"
                style="text-decoration:none; padding:8px 14px; font-family:var(--font-head); font-size:12px; background:var(--ctp-mauve); color:var(--ctp-crust);"
              >
                CONFIGURE SUBATHON &rarr;
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
                COPY
              </button>
              <a
                id="testSubLink"
                href="/overlay/subathon?minutes=10&rate=6"
                target="_blank"
                style="white-space:nowrap; font-size:12px;"
              >
                TEST
              </a>
            </div>
            <label style="display:inline-flex; align-items:center; gap:8px; margin-top:8px; margin-bottom:0; cursor:pointer; color:var(--ctp-text);">
              <input type="checkbox" id="ovSubTransparent" style="width:auto; margin:0;" />
              <span>TRANSPARENT CARD BACKGROUND</span>
            </label>
          </details>

          <div style="font-size:13px; color:var(--ctp-subtext0); line-height:1.6;">
            Recommended OBS settings: Check <strong>Control audio via OBS</strong>. Background is transparent.
          </div>
        </details>

        <details class="card fold-block" style="margin-bottom:24px;">
          <summary>GLOBAL COMMAND BUS ACTIONS</summary>
          <div class="grid-actions" style="margin-bottom:0;">
            <button type="button" id="cmdReloadBtn" style="font-size:14px; padding:14px 20px;">
              FORCE RELOAD OVERLAYS
            </button>
            <button type="button" id="cmdClearBtn" style="font-size:14px; padding:14px 20px;">
              CLEAR ALERT QUEUE
            </button>
            <button
              type="button"
              id="cmdDisconnectBtn"
              style="font-size:14px; padding:14px 20px; background:var(--ctp-red); border-color:var(--ctp-red);"
            >
              DISCONNECT / RESET
            </button>
            <button
              type="button"
              id="cmdPingBtn"
              style="font-size:14px; padding:14px 20px; background:var(--ctp-sapphire); border-color:var(--ctp-sapphire);"
            >
              PING HEARTBEAT
            </button>
            <button type="button" id="cmdTtsBtn" style="font-size:14px; padding:14px 20px;">
              TTS VOICE: {ttsEnabled ? 'ON (CLICK TO MUTE)' : 'OFF (CLICK TO ENABLE)'}
            </button>
          </div>
        </details>
      </div>
    </ControlLayout>
  )
}
