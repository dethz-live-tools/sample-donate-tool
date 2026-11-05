import type { OverlayStatus } from '../modules/events'

export function OverlayControlPage({ overlayStatus }: { overlayStatus?: OverlayStatus }) {
  const overlayOnline = Boolean(overlayStatus?.online)
  const clientCount = overlayStatus?.count ?? (overlayOnline ? 1 : 0)
  const ttsEnabled = overlayStatus?.ttsEnabled ?? true

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
            <a href="/overlay" target="_blank">OPEN OVERLAY</a>
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

        <h1>OVERLAY CONTROLLER</h1>
        <p class="subtitle">OBS BROWSER SOURCE CONNECTION & COMMAND BUS</p>

        <div id="actionStatus" class="status" style="margin-bottom: 24px;"></div>

        <div class="row" style="margin-bottom: 24px;">
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
        </div>

        <div class="inverted-block">
          <label style="color:var(--ctp-lavender); margin-bottom:8px;">OBS BROWSER SOURCE CONFIGURATION</label>

          <div style="margin-bottom:14px;">
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0); margin-bottom:4px;">
              1. DONATION ALERT OVERLAY (800 x 400)
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
              <input
                type="text"
                id="obsUrlInput"
                readOnly
                value=""
                style="margin-bottom:0; background:var(--ctp-mantle);"
              />
              <button
                type="button"
                id="copyUrlBtn"
                style="width:auto; padding:10px 16px; font-size:13px; white-space:nowrap;"
              >
                COPY
              </button>
              <a href="/overlay" target="_blank" style="white-space:nowrap; font-size:12px;">TEST</a>
            </div>
          </div>

          <div style="margin-bottom:14px;">
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0); margin-bottom:4px;">
              2. TOP DONORS LEADERBOARD OVERLAY (450 x 500)
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
              <input
                type="text"
                id="obsLbUrlInput"
                readOnly
                value=""
                style="margin-bottom:0; background:var(--ctp-mantle);"
              />
              <button
                type="button"
                id="copyLbUrlBtn"
                style="width:auto; padding:10px 16px; font-size:13px; white-space:nowrap;"
              >
                COPY
              </button>
              <a href="/overlay/leaderboard" target="_blank" style="white-space:nowrap; font-size:12px;">TEST</a>
            </div>
          </div>

          <div style="margin-bottom:14px;">
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0); margin-bottom:4px;">
              3. COUNTDOWN TIMER OVERLAY (450 x 250)
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
              <input
                type="text"
                id="obsCdUrlInput"
                readOnly
                value=""
                style="margin-bottom:0; background:var(--ctp-mantle);"
              />
              <button
                type="button"
                id="copyCdUrlBtn"
                style="width:auto; padding:10px 16px; font-size:13px; white-space:nowrap;"
              >
                COPY
              </button>
              <a href="/overlay/countdown?minutes=10" target="_blank" style="white-space:nowrap; font-size:12px;">TEST</a>
            </div>
          </div>

          <div style="font-size:13px; color:var(--ctp-subtext0); line-height:1.6;">
            Recommended OBS settings: Check <strong>Control audio via OBS</strong>. Background is transparent.
          </div>
        </div>

        <h3 style="font-family:var(--font-head); font-size:20px; margin-bottom:12px; text-transform:uppercase;">
          COMMAND BUS ACTIONS
        </h3>
        <div class="grid-actions" style="margin-bottom:24px;">
          <button type="button" id="cmdReloadBtn" style="font-size:14px; padding:14px 20px;">
            FORCE RELOAD OVERLAY
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
          <button
            type="button"
            id="cmdTtsBtn"
            style="font-size:14px; padding:14px 20px;"
          >
            TTS VOICE: {ttsEnabled ? 'ON (CLICK TO MUTE)' : 'OFF (CLICK TO ENABLE)'}
          </button>
        </div>

        <div class="card" style="margin-bottom:24px;">
          <h3 style="font-family:var(--font-head); font-size:20px; margin-bottom:16px; text-transform:uppercase;">
            COUNTDOWN TIMER REMOTE
          </h3>
          <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
            <button type="button" id="cdQuick3Btn" style="width:auto; padding:10px 16px; font-size:13px;">START 3M</button>
            <button type="button" id="cdQuick5Btn" style="width:auto; padding:10px 16px; font-size:13px;">START 5M</button>
            <button type="button" id="cdQuick10Btn" style="width:auto; padding:10px 16px; font-size:13px;">START 10M</button>
            <button type="button" id="cdQuick15Btn" style="width:auto; padding:10px 16px; font-size:13px;">START 15M</button>
            <button type="button" id="cdPauseBtn" style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-yellow); border-color:var(--ctp-yellow); color:var(--ctp-crust);">PAUSE</button>
            <button type="button" id="cdResumeBtn" style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-green); border-color:var(--ctp-green); color:var(--ctp-crust);">RESUME</button>
            <button type="button" id="cdResetBtn" style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-peach); border-color:var(--ctp-peach); color:var(--ctp-crust);">RESET</button>
            <button type="button" id="cdPlus1Btn" style="width:auto; padding:10px 16px; font-size:13px;">+1 MIN</button>
            <button type="button" id="cdMinus1Btn" style="width:auto; padding:10px 16px; font-size:13px;">-1 MIN</button>
          </div>
          <form id="cdCustomForm" style="display:flex; gap:12px; align-items:flex-end;">
            <div style="flex:1;">
              <label>CUSTOM TITLE</label>
              <input type="text" id="cdCustomTitle" value="STARTING SOON" style="margin-bottom:0;" />
            </div>
            <div style="width:120px;">
              <label>MINUTES</label>
              <input type="number" id="cdCustomMinutes" value="10" min="1" max="180" style="margin-bottom:0;" />
            </div>
            <button type="submit" style="width:auto; padding:12px 20px; font-size:14px; white-space:nowrap;">
              SET TIMER
            </button>
          </form>
        </div>

        <div class="card" style="margin-bottom:24px;">
          <h3 style="font-family:var(--font-head); font-size:20px; margin-bottom:16px; text-transform:uppercase;">
            TRIGGER TEST DONATION
          </h3>
          <form id="testAlertForm">
            <div class="row">
              <div>
                <label>DONOR NAME</label>
                <input type="text" id="testDonor" value="TEST DONOR" required />
              </div>
              <div>
                <label>AMOUNT (THB)</label>
                <input type="number" id="testAmount" value="99" min="10" max="1000000" required />
              </div>
            </div>
            <label>MESSAGE (GEMINI TTS AUDIO)</label>
            <input type="text" id="testMsg" value="ทดสอบระบบแจ้งเตือนโดเนท!" required />
            <button type="submit" id="submitTestBtn" style="font-size:15px; padding:12px 24px;">
              DISPATCH TEST DONATE TO OVERLAY
            </button>
          </form>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <label style="margin-bottom:0;">REAL-TIME BUS LOG</label>
          <button
            type="button"
            id="clearLogBtn"
            style="width:auto; padding:2px 10px; font-size:11px; background:var(--ctp-surface1); border-color:var(--ctp-surface2);"
          >
            CLEAR LOG
          </button>
        </div>
        <div id="busLog" class="console-log"></div>
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
          const obsInput = document.getElementById('obsUrlInput');
          const copyBtn = document.getElementById('copyUrlBtn');
          const obsLbInput = document.getElementById('obsLbUrlInput');
          const copyLbBtn = document.getElementById('copyLbUrlBtn');
          const obsCdInput = document.getElementById('obsCdUrlInput');
          const copyCdBtn = document.getElementById('copyCdUrlBtn');

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

          bindCopy(obsInput, copyBtn, '/overlay');
          bindCopy(obsLbInput, copyLbBtn, '/overlay/leaderboard?limit=5');
          bindCopy(obsCdInput, copyCdBtn, '/overlay/countdown?minutes=10');

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
            if (typeof data === 'object' && typeof data?.ttsEnabled === 'boolean') {
              const ttsOn = data.ttsEnabled;
              if (ttsStatusText) {
                ttsStatusText.textContent = ttsOn ? 'ON' : 'OFF';
                ttsStatusText.className = ttsOn ? 'status-online' : 'status-offline';
              }
              if (cmdTtsBtn) {
                cmdTtsBtn.textContent = 'TTS VOICE: ' + (ttsOn ? 'ON (CLICK TO MUTE)' : 'OFF (CLICK TO ENABLE)');
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

          // Countdown remote triggers
          document.getElementById('cdQuick3Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'set', minutes: 3 }));
          document.getElementById('cdQuick5Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'set', minutes: 5 }));
          document.getElementById('cdQuick10Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'set', minutes: 10 }));
          document.getElementById('cdQuick15Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'set', minutes: 15 }));
          document.getElementById('cdPauseBtn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'pause' }));
          document.getElementById('cdResumeBtn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'start' }));
          document.getElementById('cdResetBtn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'reset' }));
          document.getElementById('cdPlus1Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'adjust', delta: 60 }));
          document.getElementById('cdMinus1Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'adjust', delta: -60 }));
          document.getElementById('cdCustomForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const mins = Number(document.getElementById('cdCustomMinutes')?.value || 10);
            const title = document.getElementById('cdCustomTitle')?.value || 'STARTING SOON';
            sendCommand('countdown', { cmd: 'set', minutes: mins, title });
          });

          document.getElementById('clearLogBtn')?.addEventListener('click', () => {
            if (busLog) busLog.innerHTML = '';
          });

          document.getElementById('testAlertForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitTestBtn');
            const donor = document.getElementById('testDonor')?.value;
            const amount = Number(document.getElementById('testAmount')?.value || 99);
            const message = document.getElementById('testMsg')?.value;

            btn.disabled = true;
            btn.textContent = 'GENERATING TTS & SENDING ALERT...';
            showStatus('DISPATCHING TEST ALERT...');

            try {
              const res = await fetch('/api/donate/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ donor, amount, message })
              });
              const data = await res.json();
              if (!res.ok || !data.ok) throw new Error(data.error || 'TEST_ALERT_FAILED');
              showStatus('OK // TEST DONATION SENT TO OVERLAY');
              log('Test donation dispatched: ' + donor + ' (' + amount + ' THB)', 'success');
            } catch (err) {
              showStatus('ERROR // ' + err.message, true);
              log('Test donation failed: ' + err.message, 'err');
            } finally {
              btn.disabled = false;
              btn.textContent = 'DISPATCH TEST DONATE TO OVERLAY';
            }
          });

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
              log('Control event broadcast: ' + d.action, 'warn');
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
