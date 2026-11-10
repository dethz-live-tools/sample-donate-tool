import type { OverlayStatus } from '../../modules/events'

export type ControlTab = 'overview' | 'alert' | 'leaderboard' | 'countdown' | 'subathon'

export function ControlLayout({
  activeTab,
  title,
  subtitle,
  overlayStatus,
  openOverlayHref = '/overlay',
  children,
  extraScript = ''
}: {
  activeTab: ControlTab
  title: string
  subtitle: string
  overlayStatus?: OverlayStatus
  openOverlayHref?: string
  children: any
  extraScript?: string
}) {
  const overlayOnline = Boolean(overlayStatus?.online)
  const clientCount = overlayStatus?.count ?? (overlayOnline ? 1 : 0)
  const ttsEnabled = overlayStatus?.ttsEnabled ?? true
  const filterEnabled = overlayStatus?.filterEnabled ?? true

  const tabs: Array<{ id: ControlTab; label: string; href: string }> = [
    { id: 'overview', label: 'OVERVIEW', href: '/overlay/control' },
    { id: 'alert', label: '1. DONATION ALERT & TTS', href: '/overlay/control/alert' },
    { id: 'leaderboard', label: '2. LEADERBOARD', href: '/overlay/control/leaderboard' },
    { id: 'countdown', label: '3. COUNTDOWN', href: '/overlay/control/countdown' },
    { id: 'subathon', label: '4. SUBATHON', href: '/overlay/control/subathon' }
  ]

  return (
    <div class="container wide">
      <div class="card elevated">
        <div class="nav-links">
          <div style="display:flex; gap:16px; align-items:center;">
            <a href="/dashboard">RETURN TO DASHBOARD</a>
            <a href="/">DONATE PAGE</a>
          </div>
          <div style="display:flex; gap:16px; align-items:center;">
            <div id="overlayNavBadge" class={`overlay-indicator ${overlayOnline ? 'is-online' : ''}`}>
              <span class="overlay-square"></span>
              <span id="overlayNavText">
                OVERLAY: {overlayOnline ? `ONLINE${clientCount > 1 ? ` (${clientCount})` : ''}` : 'OFFLINE'}
              </span>
            </div>
            <a href={openOverlayHref} target="_blank">OPEN OVERLAY</a>
            <form method="post" action="/logout" style="display:inline;">
              <button
                type="submit"
                style="width:auto; padding:4px 12px; font-size:12px; background:var(--ctp-red); border-color:var(--ctp-red);"
              >
                LOGOUT
              </button>
            </form>
          </div>
        </div>

        <div
          style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:24px; padding-bottom:16px; border-bottom:3px solid var(--ctp-surface1);"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <a
                href={tab.href}
                style={`text-decoration:none; padding:8px 14px; font-family:var(--font-head); font-size:13px; border:3px solid ${
                  isActive ? 'var(--ctp-accent)' : 'var(--ctp-surface2)'
                }; background:${isActive ? 'var(--ctp-accent)' : 'var(--ctp-crust)'}; color:${
                  isActive ? 'var(--ctp-crust)' : 'var(--ctp-text)'
                };`}
              >
                {tab.label}
              </a>
            )
          })}
        </div>

        <h1>{title}</h1>
        <p class="subtitle">{subtitle}</p>

        <div id="actionStatus" class="status" style="margin-bottom: 24px;"></div>

        <div class="card-grid" style="margin-bottom: 24px;">
          <div class="card" style="margin-bottom:0;">
            <label>CONNECTION STATE</label>
            <div
              style="font-family:var(--font-head); font-size:32px;"
              id="controlStatusText"
              class={overlayOnline ? 'status-online' : 'status-offline'}
            >
              {overlayOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <label>ACTIVE CLIENTS</label>
            <div style="font-family:var(--font-head); font-size:32px;" id="controlCountText">
              {clientCount}
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <label>HEARTBEAT AGE</label>
            <div style="font-family:var(--font-head); font-size:32px;" id="heartbeatAgeText">
              {overlayOnline ? '0s' : '-'}
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <label>TTS VOICE</label>
            <div
              style="font-family:var(--font-head); font-size:32px;"
              id="ttsStatusText"
              class={ttsEnabled ? 'status-online' : 'status-offline'}
            >
              {ttsEnabled ? 'ON' : 'OFF'}
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <label>WORD FILTER</label>
            <div
              style="font-family:var(--font-head); font-size:32px;"
              id="filterStatusText"
              class={filterEnabled ? 'status-online' : 'status-offline'}
            >
              {filterEnabled ? 'ON' : 'OFF'}
            </div>
          </div>
        </div>

        {children}

        <details class="card fold-block" style="margin-bottom:0;">
          <summary>REAL-TIME BUS LOG</summary>
          <div style="display:flex; justify-content:flex-end; align-items:center; margin-bottom:8px;">
            <button
              type="button"
              id="clearLogBtn"
              style="width:auto; padding:2px 10px; font-size:11px; background:var(--ctp-surface1); border-color:var(--ctp-surface2);"
            >
              CLEAR LOG
            </button>
          </div>
          <div id="busLog" class="console-log"></div>
        </details>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          let lastHeartbeatTime = ${overlayOnline ? Date.now() : 0};
          const statusText = document.getElementById('controlStatusText');
          const countText = document.getElementById('controlCountText');
          const ageText = document.getElementById('heartbeatAgeText');
          const ttsStatusText = document.getElementById('ttsStatusText');
          const cmdTtsBtn = document.getElementById('cmdTtsBtn');
          const navBadge = document.getElementById('overlayNavBadge');
          const navText = document.getElementById('overlayNavText');
          const actionStatus = document.getElementById('actionStatus');
          const busLog = document.getElementById('busLog');

          function bindCopy(inputEl, btnEl, path) {
            if (!inputEl) return;
            inputEl.value = window.location.origin + path;
            if (btnEl) {
              btnEl.addEventListener('click', async () => {
                try {
                  await navigator.clipboard.writeText(inputEl.value);
                  const orig = btnEl.textContent;
                  btnEl.textContent = 'COPIED!';
                  setTimeout(() => { btnEl.textContent = orig; }, 2000);
                } catch {
                  inputEl.select();
                  document.execCommand('copy');
                }
              });
            }
          }

          function log(msg, type = 'info') {
            if (!busLog) return;
            const time = new Date().toLocaleTimeString('th-TH');
            const el = document.createElement('div');
            el.className = 'console-entry ' + type;
            el.textContent = '[' + time + '] ' + msg;
            busLog.appendChild(el);
            busLog.scrollTop = busLog.scrollHeight;
          }

          function showStatus(text, isError = false) {
            if (!actionStatus) return;
            actionStatus.className = 'status ' + (isError ? 'err' : 'ok');
            actionStatus.textContent = text;
          }

          function updateState(data) {
            const online = typeof data === 'boolean' ? data : Boolean(data?.online);
            const count = typeof data === 'object' && typeof data?.count === 'number'
              ? data.count
              : (online ? 1 : 0);

            if (online) {
              lastHeartbeatTime = Date.now();
            } else if (count === 0) {
              lastHeartbeatTime = 0;
            }

            if (statusText) {
              statusText.textContent = online ? 'ONLINE' : 'OFFLINE';
              statusText.className = online ? 'status-online' : 'status-offline';
            }
            if (countText) {
              countText.textContent = String(count);
            }
            if (typeof data === 'object') {
              if (typeof data?.ttsEnabled === 'boolean') {
                const ttsOn = data.ttsEnabled;
                if (ttsStatusText) {
                  ttsStatusText.textContent = ttsOn ? 'ON' : 'OFF';
                  ttsStatusText.className = ttsOn ? 'status-online' : 'status-offline';
                }
                if (cmdTtsBtn) {
                  cmdTtsBtn.textContent = 'TTS VOICE: ' + (ttsOn ? 'ON (CLICK TO MUTE)' : 'OFF (CLICK TO ENABLE)');
                }
              }
              const vSel = document.getElementById('ttsVoiceSelect');
              const rSel = document.getElementById('ttsRateSelect');
              const pSel = document.getElementById('ttsPitchSelect');
              if (vSel && data.ttsVoice && document.activeElement !== vSel) vSel.value = data.ttsVoice;
              if (rSel && data.ttsRate && document.activeElement !== rSel) rSel.value = data.ttsRate;
              if (pSel && data.ttsPitch && document.activeElement !== pSel) pSel.value = data.ttsPitch;

              if (typeof data?.filterEnabled === 'boolean') {
                const fOn = data.filterEnabled;
                if (typeof window.onFilterStateSync === 'function') window.onFilterStateSync(fOn);
                const fStatus = document.getElementById('filterStatusText');
                if (fStatus) {
                  fStatus.textContent = fOn ? 'ON' : 'OFF';
                  fStatus.className = fOn ? 'status-online' : 'status-offline';
                }
                const fToggle = document.getElementById('toggleFilterBtn');
                if (fToggle) {
                  fToggle.textContent = 'FILTER: ' + (fOn ? 'ENABLED' : 'DISABLED');
                }
              }
              const actSel = document.getElementById('filterActionSelect');
              if (actSel && data.filterAction && document.activeElement !== actSel) {
                actSel.value = data.filterAction;
              }
            }
            if (navBadge && navText) {
              if (online) {
                navBadge.classList.add('is-online');
                navText.textContent = 'OVERLAY: ONLINE' + (count > 1 ? ' (' + count + ')' : '');
              } else {
                navBadge.classList.remove('is-online');
                navText.textContent = 'OVERLAY: OFFLINE';
              }
            }
          }

          setInterval(() => {
            if (!ageText) return;
            if (!lastHeartbeatTime) {
              ageText.textContent = '-';
            } else {
              const secs = Math.floor((Date.now() - lastHeartbeatTime) / 1000);
              ageText.textContent = secs + 's';
            }
          }, 1000);

          async function sendCommand(action, extra = {}) {
            showStatus('DISPATCHING: ' + action.toUpperCase() + '...');
            log('Sending command: ' + action + (extra.cmd ? ' (' + extra.cmd + ')' : ''), 'warn');
            try {
              const res = await fetch('/api/events/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...extra })
              });
              const data = await res.json();
              if (!res.ok || !data.ok) throw new Error(data.error || 'COMMAND_FAILED');
              showStatus('OK // ' + action.toUpperCase() + ' EXECUTED');
              log('Command executed successfully: ' + action, 'success');
              if (data.status) updateState(data.status);
            } catch (err) {
              showStatus('ERROR // ' + err.message, true);
              log('Command error (' + action + '): ' + err.message, 'err');
            }
          }

          document.getElementById('clearLogBtn')?.addEventListener('click', () => {
            if (busLog) busLog.innerHTML = '';
          });

          ${extraScript}

          log('Connecting to SSE bus /api/events?client=controller...', 'info');
          const es = new EventSource('/api/events?client=controller');
          es.onopen = () => {
            log('Connected to real-time event bus', 'success');
          };
          es.onerror = () => {
            log('EventSource disconnected, reconnecting...', 'warn');
          };
          es.addEventListener('heartbeat', (e) => {
            try {
              const d = JSON.parse(e.data);
              updateState(d);
              log('Heartbeat received (online=' + d.online + ', count=' + d.count + ')', 'info');
            } catch {}
          });
          es.addEventListener('overlay_status', (e) => {
            try {
              const d = JSON.parse(e.data);
              updateState(d);
              log('Overlay status changed (online=' + d.online + ', count=' + d.count + ')', 'warn');
            } catch {}
          });
          es.addEventListener('donate', (e) => {
            try {
              const d = JSON.parse(e.data);
              log('Donate event: ' + d.donor + ' donated ' + d.amount + ' THB', 'success');
            } catch {}
          });
          es.addEventListener('control', (e) => {
            try {
              const d = JSON.parse(e.data);
              if (typeof window.onControlBroadcast === 'function') window.onControlBroadcast(d);
              if (d.cmd === 'gift' && d.gift) {
                log(
                  'TikTok Gift: ' + d.gift.donor + ' sent ' + d.gift.giftName + ' (' + d.gift.coins + ' coins -> +' + d.gift.addedSecs + 's)',
                  'success'
                );
              } else if (d.cmd === 'gift_ignored' && d.gift) {
                log(
                  'TikTok Gift ignored (< min rate): ' + d.gift.donor + ' sent ' + d.gift.giftName + ' (' + d.gift.coins + ' coins)',
                  'warn'
                );
              } else if (d.cmd === 'tiktok_live') {
                log(
                  'TikTok LIVE status: ' + (d.tiktokIsLive ? 'LIVE (Submatron STARTED)' : 'OFFLINE (Submatron on HOLD)'),
                  d.tiktokIsLive ? 'success' : 'warn'
                );
              } else {
                log('Control event broadcast: ' + d.action + (d.cmd ? ' (' + d.cmd + ')' : ''), 'warn');
              }
            } catch {}
          });

          setInterval(async () => {
            try {
              const r = await fetch('/api/events/status');
              const d = await r.json();
              if (d) updateState(d);
            } catch {}
          }, 3000);
        `
        }}
      />
    </div>
  )
}
