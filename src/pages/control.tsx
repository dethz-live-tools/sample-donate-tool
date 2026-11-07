import type { OverlayStatus } from '../modules/events'

export function OverlayControlPage({ overlayStatus }: { overlayStatus?: OverlayStatus }) {
  const overlayOnline = Boolean(overlayStatus?.online)
  const clientCount = overlayStatus?.count ?? (overlayOnline ? 1 : 0)
  const ttsEnabled = overlayStatus?.ttsEnabled ?? true
  const ttsVoice = overlayStatus?.ttsVoice || 'th-TH-NiwatNeural'
  const ttsRate = overlayStatus?.ttsRate || '+0%'
  const ttsPitch = overlayStatus?.ttsPitch || '+0Hz'
  const filterEnabled = overlayStatus?.filterEnabled ?? true
  const filterAction = overlayStatus?.filterAction || 'censor'

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
              <a href="/overlay/countdown?minutes=10&title=STARTING+SOON" target="_blank" style="white-space:nowrap; font-size:12px;">TEST</a>
            </div>
          </div>

          <div style="margin-bottom:14px;">
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0); margin-bottom:4px;">
              4. SUBATHON MARATHON OVERLAY (450 x 250)
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
              <input
                type="text"
                id="obsSubUrlInput"
                readOnly
                value=""
                style="margin-bottom:0; background:var(--ctp-mantle);"
              />
              <button
                type="button"
                id="copySubUrlBtn"
                style="width:auto; padding:10px 16px; font-size:13px; white-space:nowrap;"
              >
                COPY
              </button>
              <a href="/overlay/subathon?minutes=10&rate=6" target="_blank" style="white-space:nowrap; font-size:12px;">TEST</a>
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
          <h3 style="font-family:var(--font-head); font-size:20px; margin-bottom:8px; text-transform:uppercase;">
            SUBATHON / COUNTDOWN TIMER REMOTE
          </h3>
          <p class="subtitle" style="margin-top:-4px; margin-bottom:16px;">
            REAL-TIME CLOCK // ADDS TIME AUTOMATICALLY WHEN DONATIONS ARRIVE
          </p>
          <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
            <button type="button" id="cdQuick5Btn" style="width:auto; padding:10px 16px; font-size:13px;">START 5M</button>
            <button type="button" id="cdQuick10Btn" style="width:auto; padding:10px 16px; font-size:13px;">START 10M</button>
            <button type="button" id="cdQuick30Btn" style="width:auto; padding:10px 16px; font-size:13px;">START 30M</button>
            <button type="button" id="cdQuick1hBtn" style="width:auto; padding:10px 16px; font-size:13px;">START 1H</button>
            <button type="button" id="cdPauseBtn" style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-yellow); border-color:var(--ctp-yellow); color:var(--ctp-crust);">PAUSE</button>
            <button type="button" id="cdResumeBtn" style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-green); border-color:var(--ctp-green); color:var(--ctp-crust);">RESUME</button>
            <button type="button" id="cdResetBtn" style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-peach); border-color:var(--ctp-peach); color:var(--ctp-crust);">RESET</button>
            <button type="button" id="cdPlus1Btn" style="width:auto; padding:10px 16px; font-size:13px;">+1 MIN</button>
            <button type="button" id="cdPlus5Btn" style="width:auto; padding:10px 16px; font-size:13px;">+5 MIN</button>
            <button type="button" id="cdPlus10Btn" style="width:auto; padding:10px 16px; font-size:13px;">+10 MIN</button>
            <button type="button" id="cdMinus1Btn" style="width:auto; padding:10px 16px; font-size:13px;">-1 MIN</button>
          </div>
          <form id="cdCustomForm" style="display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end;">
            <div style="flex:2; min-width:180px;">
              <label>TITLE</label>
              <input type="text" id="cdCustomTitle" value="SUBATHON" style="margin-bottom:0;" />
            </div>
            <div style="flex:1; min-width:90px;">
              <label>MINUTES</label>
              <input type="number" id="cdCustomMinutes" value="10" min="1" max="1440" style="margin-bottom:0;" />
            </div>
            <div style="flex:1; min-width:130px;">
              <label>SECS / 1 THB</label>
              <input type="number" id="cdSecPerThb" value="6" min="1" max="3600" title="Seconds added to timer per 1 THB donated" style="margin-bottom:0;" />
            </div>
            <div style="flex:1; min-width:120px;">
              <label>MODE</label>
              <select id="cdModeSelect" style="margin-bottom:0;">
                <option value="subathon" selected>SUBATHON (AUTO ADD)</option>
                <option value="countdown">STANDARD TIMER</option>
              </select>
            </div>
            <button type="submit" style="width:auto; padding:12px 20px; font-size:14px; white-space:nowrap;">
              APPLY SUBATHON
            </button>
          </form>
        </div>

        <div class="card" style="margin-bottom:24px;">
          <h3 style="font-family:var(--font-head); font-size:20px; margin-bottom:16px; text-transform:uppercase;">
            EDGE TTS VOICE CONFIGURATION
          </h3>
          <p class="subtitle" style="margin-top:-8px; margin-bottom:16px;">
            MICROSOFT EDGE NEURAL TTS // NO API KEY REQUIRED // PROCESSED AND LOADED LOCALLY
          </p>
          <form id="ttsConfigForm">
            <div class="row">
              <div>
                <label>TTS VOICE</label>
                <select id="ttsVoiceSelect">
                  <option value="th-TH-NiwatNeural" selected={ttsVoice === 'th-TH-NiwatNeural' || !ttsVoice}>Thai - Niwat (Male)</option>
                  <option value="th-TH-PremwadeeNeural" selected={ttsVoice === 'th-TH-PremwadeeNeural'}>Thai - Premwadee (Female)</option>
                  <option value="en-US-AriaNeural" selected={ttsVoice === 'en-US-AriaNeural'}>English (US) - Aria (Female)</option>
                  <option value="en-US-GuyNeural" selected={ttsVoice === 'en-US-GuyNeural'}>English (US) - Guy (Male)</option>
                  <option value="en-US-JennyNeural" selected={ttsVoice === 'en-US-JennyNeural'}>English (US) - Jenny (Female)</option>
                  <option value="ja-JP-NanamiNeural" selected={ttsVoice === 'ja-JP-NanamiNeural'}>Japanese - Nanami (Female)</option>
                  <option value="ja-JP-KeitaNeural" selected={ttsVoice === 'ja-JP-KeitaNeural'}>Japanese - Keita (Male)</option>
                </select>
              </div>
              <div>
                <label>SPEED / RATE</label>
                <select id="ttsRateSelect">
                  <option value="-20%" selected={ttsRate === '-20%'}>Slow (-20%)</option>
                  <option value="-10%" selected={ttsRate === '-10%'}>Slightly Slow (-10%)</option>
                  <option value="+0%" selected={ttsRate === '+0%' || !ttsRate}>Normal (0%)</option>
                  <option value="+10%" selected={ttsRate === '+10%'}>Slightly Fast (+10%)</option>
                  <option value="+20%" selected={ttsRate === '+20%'}>Fast (+20%)</option>
                  <option value="+30%" selected={ttsRate === '+30%'}>Very Fast (+30%)</option>
                </select>
              </div>
              <div>
                <label>PITCH</label>
                <select id="ttsPitchSelect">
                  <option value="-10Hz" selected={ttsPitch === '-10Hz'}>Low (-10Hz)</option>
                  <option value="-5Hz" selected={ttsPitch === '-5Hz'}>Slightly Low (-5Hz)</option>
                  <option value="+0Hz" selected={ttsPitch === '+0Hz' || !ttsPitch}>Normal (0Hz)</option>
                  <option value="+5Hz" selected={ttsPitch === '+5Hz'}>Slightly High (+5Hz)</option>
                  <option value="+10Hz" selected={ttsPitch === '+10Hz'}>High (+10Hz)</option>
                </select>
              </div>
            </div>
            <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-top:8px;">
              <button type="submit" id="saveTtsBtn" style="width:auto; padding:10px 18px; font-size:13px;">
                SAVE TTS SETTINGS
              </button>
              <button
                type="button"
                id="previewTtsBtn"
                style="width:auto; padding:10px 18px; font-size:13px; background:var(--ctp-sapphire); border-color:var(--ctp-sapphire);"
              >
                TEST / PREVIEW AUDIO LOCALLY
              </button>
              <span id="ttsConfigMsg" style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-green);"></span>
            </div>
          </form>
        </div>

        <div class="card" style="margin-bottom:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
            <div>
              <h3 style="font-family:var(--font-head); font-size:20px; margin:0; text-transform:uppercase;">
                WORD FILTERING & PROFANITY CENSOR
              </h3>
              <p class="subtitle" style="margin:2px 0 0 0;">
                FILTER PROFANITY IN DONOR NAMES AND MESSAGES // THAI & ENGLISH
              </p>
            </div>
            <button
              type="button"
              id="toggleFilterBtn"
              style="width:auto; padding:8px 16px; font-size:13px;"
            >
              FILTER: {filterEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>
          <form id="filterConfigForm">
            <div class="row">
              <div>
                <label>ACTION ON DETECTION</label>
                <select id="filterActionSelect">
                  <option value="censor" selected={filterAction !== 'mute'}>
                    Censor Words (Replace with ***, TTS speaks censored text)
                  </option>
                  <option value="mute" selected={filterAction === 'mute'}>
                    Mute TTS (Censor text & completely silence TTS audio)
                  </option>
                </select>
              </div>
              <div>
                <label>CUSTOM BLOCKED WORDS (COMMA OR NEWLINE SEPARATED)</label>
                <input
                  type="text"
                  id="filterWordsInput"
                  placeholder="คำต้องห้าม, คำหยาบ, badword"
                  style="margin-bottom:0;"
                />
              </div>
            </div>
            <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-top:12px;">
              <button type="submit" id="saveFilterBtn" style="width:auto; padding:10px 18px; font-size:13px;">
                SAVE FILTER SETTINGS
              </button>
              <span id="filterConfigMsg" style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-green);"></span>
            </div>
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
            <label>MESSAGE (EDGE TTS AUDIO)</label>
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
          const obsSubInput = document.getElementById('obsSubUrlInput');
          const copySubBtn = document.getElementById('copySubUrlBtn');

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
          bindCopy(obsCdInput, copyCdBtn, '/overlay/countdown?minutes=10&title=STARTING+SOON');
          bindCopy(obsSubInput, copySubBtn, '/overlay/subathon?minutes=10&rate=6');

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
                filterEnabled = fOn;
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

          document.getElementById('cmdReloadBtn')?.addEventListener('click', () => sendCommand('reload'));
          document.getElementById('cmdClearBtn')?.addEventListener('click', () => sendCommand('clear'));
          document.getElementById('cmdDisconnectBtn')?.addEventListener('click', () => sendCommand('disconnect'));
          document.getElementById('cmdTtsBtn')?.addEventListener('click', () => sendCommand('tts'));

          // TTS Settings Form Save
          document.getElementById('ttsConfigForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const voice = document.getElementById('ttsVoiceSelect')?.value;
            const rate = document.getElementById('ttsRateSelect')?.value;
            const pitch = document.getElementById('ttsPitchSelect')?.value;
            const msgEl = document.getElementById('ttsConfigMsg');
            const saveBtn = document.getElementById('saveTtsBtn');
            if (saveBtn) saveBtn.disabled = true;
            if (msgEl) msgEl.textContent = 'SAVING...';

            try {
              const res = await fetch('/api/manage/tts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voice, rate, pitch })
              });
              const d = await res.json().catch(() => ({}));
              if (!res.ok || !d.ok) throw new Error(d.error || ('HTTP ' + res.status));
              if (msgEl) {
                msgEl.textContent = 'SAVED SUCCESSFULLY';
                setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3000);
              }
              log('TTS settings updated: ' + voice + ', rate=' + rate + ', pitch=' + pitch, 'success');
              if (d.overlayStatus) updateState(d.overlayStatus);
            } catch (err) {
              if (msgEl) msgEl.textContent = 'ERROR: ' + err.message;
              log('Save TTS error: ' + err.message, 'err');
            } finally {
              if (saveBtn) saveBtn.disabled = false;
            }
          });

          // Test / Preview Audio locally
          let previewAudio = null;
          document.getElementById('previewTtsBtn')?.addEventListener('click', async () => {
            const voice = document.getElementById('ttsVoiceSelect')?.value;
            const rate = document.getElementById('ttsRateSelect')?.value;
            const pitch = document.getElementById('ttsPitchSelect')?.value;
            const previewBtn = document.getElementById('previewTtsBtn');
            const msgEl = document.getElementById('ttsConfigMsg');

            if (previewAudio) {
              previewAudio.pause();
              previewAudio = null;
            }

            if (previewBtn) {
              previewBtn.disabled = true;
              previewBtn.textContent = 'LOADING AUDIO...';
            }
            try {
              const sampleText = 'ทดสอบเสียงข้อความโดเนท ขอบคุณสำหรับการสนับสนุนครับ';
              const url = '/api/tts?text=' + encodeURIComponent(sampleText) +
                '&voice=' + encodeURIComponent(voice || '') +
                '&rate=' + encodeURIComponent(rate || '') +
                '&pitch=' + encodeURIComponent(pitch || '');
              
              previewAudio = new Audio(url);
              previewAudio.onended = () => {
                if (previewBtn) {
                  previewBtn.disabled = false;
                  previewBtn.textContent = 'TEST / PREVIEW AUDIO LOCALLY';
                }
              };
              previewAudio.onerror = () => {
                if (msgEl) msgEl.textContent = 'PREVIEW FAILED';
                if (previewBtn) {
                  previewBtn.disabled = false;
                  previewBtn.textContent = 'TEST / PREVIEW AUDIO LOCALLY';
                }
              };
              await previewAudio.play();
              log('Playing audio preview locally: ' + voice, 'info');
              if (previewBtn) previewBtn.textContent = 'PLAYING PREVIEW...';
            } catch (err) {
              if (msgEl) msgEl.textContent = 'PREVIEW FAILED: ' + err.message;
              log('Audio preview error: ' + err.message, 'err');
              if (previewBtn) {
                previewBtn.disabled = false;
                previewBtn.textContent = 'TEST / PREVIEW AUDIO LOCALLY';
              }
            }
          });

          // Filter Settings
          let filterEnabled = ${filterEnabled ? 'true' : 'false'};

          async function loadFilterSettings() {
            try {
              const res = await fetch('/api/manage/filter');
              const d = await res.json().catch(() => ({}));
              if (d.ok) {
                filterEnabled = Boolean(d.enabled);
                const fStatus = document.getElementById('filterStatusText');
                if (fStatus) {
                  fStatus.textContent = filterEnabled ? 'ON' : 'OFF';
                  fStatus.className = filterEnabled ? 'status-online' : 'status-offline';
                }
                const fToggle = document.getElementById('toggleFilterBtn');
                if (fToggle) {
                  fToggle.textContent = 'FILTER: ' + (filterEnabled ? 'ENABLED' : 'DISABLED');
                }
                const actSel = document.getElementById('filterActionSelect');
                if (actSel && d.action) actSel.value = d.action;
                const wordsInput = document.getElementById('filterWordsInput');
                if (wordsInput && typeof d.words === 'string') wordsInput.value = d.words;
              }
            } catch {}
          }
          loadFilterSettings();

          document.getElementById('toggleFilterBtn')?.addEventListener('click', async () => {
            const btn = document.getElementById('toggleFilterBtn');
            const msgEl = document.getElementById('filterConfigMsg');
            const next = !filterEnabled;
            if (btn) btn.disabled = true;
            try {
              const res = await fetch('/api/manage/filter', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: next })
              });
              const d = await res.json().catch(() => ({}));
              if (!res.ok || !d.ok) throw new Error(d.error || ('HTTP ' + res.status));
              filterEnabled = Boolean(d.enabled);
              if (btn) btn.textContent = 'FILTER: ' + (filterEnabled ? 'ENABLED' : 'DISABLED');
              const fStatus = document.getElementById('filterStatusText');
              if (fStatus) {
                fStatus.textContent = filterEnabled ? 'ON' : 'OFF';
                fStatus.className = filterEnabled ? 'status-online' : 'status-offline';
              }
              if (msgEl) {
                msgEl.textContent = 'FILTER ' + (filterEnabled ? 'ENABLED' : 'DISABLED');
                setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3000);
              }
              log('Filter toggled: ' + (filterEnabled ? 'ENABLED' : 'DISABLED'), 'success');
              if (d.overlayStatus) updateState(d.overlayStatus);
            } catch (err) {
              if (msgEl) msgEl.textContent = 'ERR: ' + err.message;
              log('Filter toggle failed: ' + err.message, 'err');
            } finally {
              if (btn) btn.disabled = false;
            }
          });

          document.getElementById('filterConfigForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const action = document.getElementById('filterActionSelect')?.value || 'censor';
            const words = document.getElementById('filterWordsInput')?.value || '';
            const msgEl = document.getElementById('filterConfigMsg');
            const saveBtn = document.getElementById('saveFilterBtn');
            if (saveBtn) saveBtn.disabled = true;
            if (msgEl) msgEl.textContent = 'SAVING...';
            try {
              const res = await fetch('/api/manage/filter', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, words, enabled: filterEnabled })
              });
              const d = await res.json().catch(() => ({}));
              if (!res.ok || !d.ok) throw new Error(d.error || ('HTTP ' + res.status));
              if (msgEl) {
                msgEl.textContent = 'SAVED SUCCESSFULLY';
                setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3000);
              }
              log('Filter settings saved: action=' + action, 'success');
              if (d.overlayStatus) updateState(d.overlayStatus);
            } catch (err) {
              if (msgEl) msgEl.textContent = 'ERR: ' + err.message;
              log('Filter save error: ' + err.message, 'err');
            } finally {
              if (saveBtn) saveBtn.disabled = false;
            }
          });

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

          // Subathon / Countdown remote triggers
          document.getElementById('cdQuick5Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'set', minutes: 5 }));
          document.getElementById('cdQuick10Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'set', minutes: 10 }));
          document.getElementById('cdQuick30Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'set', minutes: 30 }));
          document.getElementById('cdQuick1hBtn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'set', minutes: 60 }));
          document.getElementById('cdPauseBtn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'pause' }));
          document.getElementById('cdResumeBtn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'start' }));
          document.getElementById('cdResetBtn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'reset' }));
          document.getElementById('cdPlus1Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'adjust', delta: 60 }));
          document.getElementById('cdPlus5Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'adjust', delta: 300 }));
          document.getElementById('cdPlus10Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'adjust', delta: 600 }));
          document.getElementById('cdMinus1Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'adjust', delta: -60 }));
          document.getElementById('cdCustomForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const mins = Number(document.getElementById('cdCustomMinutes')?.value || 10);
            const title = document.getElementById('cdCustomTitle')?.value || 'SUBATHON';
            const secPerThb = Number(document.getElementById('cdSecPerThb')?.value || 6);
            const mode = document.getElementById('cdModeSelect')?.value || 'subathon';
            sendCommand('countdown', { cmd: 'set', minutes: mins, title, secPerThb, mode });
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
            const voice = document.getElementById('ttsVoiceSelect')?.value;
            const rate = document.getElementById('ttsRateSelect')?.value;
            const pitch = document.getElementById('ttsPitchSelect')?.value;

            btn.disabled = true;
            btn.textContent = 'GENERATING TTS & SENDING ALERT...';
            showStatus('DISPATCHING TEST ALERT...');

            try {
              const res = await fetch('/api/donate/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ donor, amount, message, voice, rate, pitch })
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
