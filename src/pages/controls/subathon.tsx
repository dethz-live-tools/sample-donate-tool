import type { SubathonState } from '../../modules/db'
import type { OverlayStatus } from '../../modules/events'
import { ControlLayout } from './layout'

export function SubathonControlPage({
  overlayStatus,
  subathonState
}: {
  overlayStatus?: OverlayStatus
  subathonState?: SubathonState
}) {
  const initTitle = subathonState?.title || 'SUBATHON'
  const initEndMsg = subathonState?.endMsg || 'TIME UP'
  const initMins = Math.max(1, Math.round((subathonState?.initialSeconds ?? 600) / 60))
  const initRate = subathonState?.secPerThb ?? 6
  const initCapHours = subathonState?.maxHours ?? 24
  const initRemaining = subathonState?.remainingSeconds ?? 600
  const initTargetEpoch = subathonState?.targetEpoch ?? 0
  const initIsRunning = subathonState ? subathonState.isRunning : true
  const initAddedSecs = subathonState?.totalAddedSecs ?? 0
  const initTotalThb = subathonState?.totalDonations ?? 0

  return (
    <ControlLayout
      activeTab="subathon"
      title="SUBATHON SETTINGS"
      subtitle="AUTO-EXTENDING MARATHON TIMER // PERSISTED IN CLOUDFLARE D1 DATABASE"
      overlayStatus={overlayStatus}
      openOverlayHref="/overlay/subathon"
      extraScript={`
        const subUrlInput = document.getElementById('obsSubUrlInput');
        const copySubBtn = document.getElementById('copySubUrlBtn');
        const previewSubLink = document.getElementById('previewSubLink');
        const titleInput = document.getElementById('subCustomTitle');
        const minsInput = document.getElementById('subCustomMinutes');
        const rateInput = document.getElementById('subSecPerThb');
        const capInput = document.getElementById('subMaxHours');
        const endInput = document.getElementById('subCustomEnd');

        const dbClockEl = document.getElementById('subDbClock');
        const dbStateEl = document.getElementById('subDbState');
        const dbAddedEl = document.getElementById('subDbAdded');
        const dbThbEl = document.getElementById('subDbThb');

        let subRemaining = ${initRemaining};
        let subTargetEpoch = ${initTargetEpoch || 'null'};
        let subRunning = ${initIsRunning ? 'true' : 'false'};
        let subAddedSecs = ${initAddedSecs};
        let subTotalThb = ${initTotalThb};

        function pad(n) {
          return String(n).padStart(2, '0');
        }

        function formatTime(totalSecs) {
          if (totalSecs <= 0) return '00:00:00';
          const h = Math.floor(totalSecs / 3600);
          const m = Math.floor((totalSecs % 3600) / 60);
          const s = totalSecs % 60;
          return pad(h) + ':' + pad(m) + ':' + pad(s);
        }

        function formatHuman(totalSecs) {
          const h = Math.floor(totalSecs / 3600);
          const m = Math.floor((totalSecs % 3600) / 60);
          const s = totalSecs % 60;
          if (h > 0) return h + 'h ' + m + 'm';
          if (m > 0) return m + 'm ' + s + 's';
          return s + 's';
        }

        function renderSubDbCard() {
          if (dbClockEl) dbClockEl.textContent = formatTime(subRemaining);
          if (dbStateEl) {
            dbStateEl.textContent = subRemaining <= 0 ? 'ENDED' : (subRunning ? 'RUNNING' : 'PAUSED');
            dbStateEl.className = subRunning && subRemaining > 0 ? 'status-online' : 'status-offline';
          }
          if (dbAddedEl) dbAddedEl.textContent = '+' + formatHuman(subAddedSecs);
          if (dbThbEl) dbThbEl.textContent = Number(subTotalThb || 0).toLocaleString() + ' THB';
        }

        function applySubDbState(st) {
          if (!st || typeof st !== 'object') return;
          subRunning = Boolean(st.isRunning);
          if (subRunning && typeof st.targetEpoch === 'number' && st.targetEpoch > 0) {
            subTargetEpoch = st.targetEpoch;
            subRemaining = Math.max(0, Math.round((subTargetEpoch - Date.now()) / 1000));
          } else {
            subTargetEpoch = null;
            if (typeof st.remainingSeconds === 'number') subRemaining = Math.max(0, st.remainingSeconds);
          }
          if (typeof st.totalAddedSecs === 'number') subAddedSecs = st.totalAddedSecs;
          if (typeof st.totalDonations === 'number') subTotalThb = st.totalDonations;

          if (titleInput && st.title && document.activeElement !== titleInput) titleInput.value = st.title;
          if (endInput && st.endMsg && document.activeElement !== endInput) endInput.value = st.endMsg;
          if (minsInput && typeof st.initialSeconds === 'number' && document.activeElement !== minsInput) {
            minsInput.value = String(Math.max(1, Math.round(st.initialSeconds / 60)));
          }
          if (rateInput && typeof st.secPerThb === 'number' && document.activeElement !== rateInput) {
            rateInput.value = String(st.secPerThb);
          }
          if (capInput && typeof st.maxHours === 'number' && document.activeElement !== capInput) {
            capInput.value = String(st.maxHours);
          }
          renderSubDbCard();
        }

        setInterval(() => {
          if (subRunning) {
            if (subTargetEpoch) {
              subRemaining = Math.max(0, Math.round((subTargetEpoch - Date.now()) / 1000));
            } else {
              subRemaining = Math.max(0, subRemaining - 1);
            }
            if (subRemaining <= 0) subRunning = false;
            renderSubDbCard();
          }
        }, 1000);

        async function refreshSubState() {
          try {
            const r = await fetch('/api/events/subathon');
            const d = await r.json();
            if (d && d.ok && d.state) applySubDbState(d.state);
          } catch {}
        }

        renderSubDbCard();
        setInterval(refreshSubState, 5000);

        bindCopy(subUrlInput, copySubBtn, '/overlay/subathon');
        if (previewSubLink) previewSubLink.href = '/overlay/subathon';

        async function sendSubCommand(extra = {}) {
          showStatus('SAVING SUBATHON TO DB...');
          log('Subathon command: ' + (extra.cmd || 'set'), 'warn');
          try {
            const res = await fetch('/api/events/control', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'subathon', mode: 'subathon', ...extra })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'COMMAND_FAILED');
            if (data.subathonState) applySubDbState(data.subathonState);
            showStatus('OK // SUBATHON SAVED TO D1 DATABASE');
            log('Subathon DB state updated (' + (extra.cmd || 'set') + ')', 'success');
            if (data.status) updateState(data.status);
          } catch (err) {
            showStatus('ERROR // ' + err.message, true);
            log('Subathon command error: ' + err.message, 'err');
          }
        }

        function startSubPreset(minutes) {
          if (minsInput) minsInput.value = String(minutes);
          const title = (titleInput?.value || 'SUBATHON').trim() || 'SUBATHON';
          const secPerThb = Math.max(1, Number(rateInput?.value) || 6);
          const maxHours = Math.max(1, Number(capInput?.value) || 24);
          const endMsg = (endInput?.value || 'TIME UP').trim() || 'TIME UP';
          sendSubCommand({ cmd: 'set', minutes, title, secPerThb, maxHours, endMsg });
        }

        document.getElementById('subQuick10Btn')?.addEventListener('click', () => startSubPreset(10));
        document.getElementById('subQuick30Btn')?.addEventListener('click', () => startSubPreset(30));
        document.getElementById('subQuick1hBtn')?.addEventListener('click', () => startSubPreset(60));
        document.getElementById('subQuick2hBtn')?.addEventListener('click', () => startSubPreset(120));
        document.getElementById('subPauseBtn')?.addEventListener('click', () => sendSubCommand({ cmd: 'pause' }));
        document.getElementById('subResumeBtn')?.addEventListener('click', () => sendSubCommand({ cmd: 'start' }));
        document.getElementById('subResetBtn')?.addEventListener('click', () => sendSubCommand({ cmd: 'reset' }));
        document.getElementById('subPlus1Btn')?.addEventListener('click', () => sendSubCommand({ cmd: 'adjust', delta: 60 }));
        document.getElementById('subPlus5Btn')?.addEventListener('click', () => sendSubCommand({ cmd: 'adjust', delta: 300 }));
        document.getElementById('subPlus10Btn')?.addEventListener('click', () => sendSubCommand({ cmd: 'adjust', delta: 600 }));
        document.getElementById('subMinus1Btn')?.addEventListener('click', () => sendSubCommand({ cmd: 'adjust', delta: -60 }));
        document.getElementById('cmdReloadBtn')?.addEventListener('click', () => sendCommand('reload'));

        document.getElementById('subCustomForm')?.addEventListener('submit', (e) => {
          e.preventDefault();
          const minutes = Math.max(1, Number(minsInput?.value) || 10);
          const title = (titleInput?.value || 'SUBATHON').trim() || 'SUBATHON';
          const secPerThb = Math.max(1, Number(rateInput?.value) || 6);
          const maxHours = Math.max(1, Number(capInput?.value) || 24);
          const endMsg = (endInput?.value || 'TIME UP').trim() || 'TIME UP';
          sendSubCommand({ cmd: 'set', minutes, title, secPerThb, maxHours, endMsg });
        });

        document.getElementById('subTestDonateForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('subTestBtn');
          const donor = document.getElementById('subTestDonor')?.value || 'SUBATHON SUPPORTER';
          const amount = Number(document.getElementById('subTestAmount')?.value || 100);
          btn.disabled = true;
          btn.textContent = 'DISPATCHING...';
          try {
            const res = await fetch('/api/donate/test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ donor, amount, message: 'เพิ่มเวลา Subathon!' })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'FAILED');
            showStatus('OK // SIMULATED ' + amount + ' THB DONATION SAVED & ADDED TO SUBATHON');
            log('Subathon test donation dispatched: +' + amount + ' THB by ' + donor, 'success');
            await refreshSubState();
          } catch (err) {
            showStatus('ERROR // ' + err.message, true);
            log('Subathon test failed: ' + err.message, 'err');
          } finally {
            btn.disabled = false;
            btn.textContent = 'SIMULATE DONATION (+TIME)';
          }
        });
      `}
    >
      <div>
        <div class="inverted-block">
          <label style="color:var(--ctp-lavender); margin-bottom:8px;">
            SUBATHON MARATHON OBS BROWSER SOURCE (450 x 250) — PERSISTED IN D1 DB
          </label>
          <div style="display:flex; gap:12px; align-items:center; margin-bottom:8px;">
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
              COPY URL
            </button>
            <a
              id="previewSubLink"
              href="/overlay/subathon"
              target="_blank"
              style="white-space:nowrap; font-size:12px;"
            >
              OPEN PREVIEW
            </a>
          </div>
          <div style="font-size:13px; color:var(--ctp-subtext0);">
            Recommended OBS settings: Width <strong>450</strong>, Height <strong>250</strong>. Timer state, added seconds, and donation totals are automatically saved in Cloudflare D1 across refreshes.
          </div>
        </div>

        <div class="row" style="margin-bottom: 24px;">
          <div class="card" style="margin-bottom:0;">
            <label>PERSISTED DB CLOCK</label>
            <div style="font-family:var(--font-head); font-size:28px; color:var(--ctp-mauve);" id="subDbClock">
              --:--:--
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <label>TIMER STATE</label>
            <div
              style="font-family:var(--font-head); font-size:28px;"
              id="subDbState"
              class={initIsRunning ? 'status-online' : 'status-offline'}
            >
              {initIsRunning ? 'RUNNING' : 'PAUSED'}
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <label>TOTAL ADDED TIME</label>
            <div style="font-family:var(--font-head); font-size:28px; color:var(--ctp-green);" id="subDbAdded">
              +0s
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <label>SUBATHON VOLUME</label>
            <div style="font-family:var(--font-head); font-size:28px;" id="subDbThb">
              {initTotalThb.toLocaleString()} THB
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:24px;">
          <h3 style="font-family:var(--font-head); font-size:20px; margin-bottom:8px; text-transform:uppercase;">
            SUBATHON REMOTE CONTROLS
          </h3>
          <p class="subtitle" style="margin-top:-4px; margin-bottom:16px;">
            ALL CHANGES ARE IMMEDIATELY SAVED TO D1 DATABASE &amp; BROADCAST TO OBS
          </p>
          <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:20px;">
            <button type="button" id="subQuick10Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              START 10M
            </button>
            <button type="button" id="subQuick30Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              START 30M
            </button>
            <button type="button" id="subQuick1hBtn" style="width:auto; padding:10px 16px; font-size:13px;">
              START 1H
            </button>
            <button type="button" id="subQuick2hBtn" style="width:auto; padding:10px 16px; font-size:13px;">
              START 2H
            </button>
            <button
              type="button"
              id="subPauseBtn"
              style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-yellow); border-color:var(--ctp-yellow); color:var(--ctp-crust);"
            >
              PAUSE
            </button>
            <button
              type="button"
              id="subResumeBtn"
              style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-green); border-color:var(--ctp-green); color:var(--ctp-crust);"
            >
              RESUME
            </button>
            <button
              type="button"
              id="subResetBtn"
              style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-peach); border-color:var(--ctp-peach); color:var(--ctp-crust);"
            >
              RESET
            </button>
            <button type="button" id="subPlus1Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              +1 MIN
            </button>
            <button type="button" id="subPlus5Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              +5 MIN
            </button>
            <button type="button" id="subPlus10Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              +10 MIN
            </button>
            <button type="button" id="subMinus1Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              -1 MIN
            </button>
            <button
              type="button"
              id="cmdReloadBtn"
              style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-sapphire); border-color:var(--ctp-sapphire);"
            >
              FORCE RELOAD
            </button>
          </div>

          <form id="subCustomForm">
            <div class="row">
              <div>
                <label>HEADER TITLE</label>
                <input type="text" id="subCustomTitle" value={initTitle} required />
              </div>
              <div>
                <label>INITIAL MINUTES (RESET / NEW START)</label>
                <input type="number" id="subCustomMinutes" value={String(initMins)} min="1" max="14400" required />
              </div>
              <div>
                <label>END MESSAGE</label>
                <input type="text" id="subCustomEnd" value={initEndMsg} required />
              </div>
            </div>
            <div class="row">
              <div>
                <label>SECONDS ADDED PER 1 THB DONATED</label>
                <input
                  type="number"
                  id="subSecPerThb"
                  value={String(initRate)}
                  min="1"
                  max="3600"
                  title="Seconds added to timer per 1 THB donated (e.g. 6s = +10m per 100 THB)"
                  required
                />
              </div>
              <div>
                <label>MAX TIMER CAP (HOURS)</label>
                <input type="number" id="subMaxHours" value={String(initCapHours)} min="1" max="720" required />
              </div>
            </div>
            <button type="submit" style="width:auto; padding:12px 24px; font-size:14px;">
              SAVE &amp; APPLY SUBATHON SETTINGS TO D1
            </button>
          </form>
        </div>

        <div class="card" style="margin-bottom:24px;">
          <h3 style="font-family:var(--font-head); font-size:20px; margin-bottom:8px; text-transform:uppercase;">
            TEST SUBATHON TIME ADDITION
          </h3>
          <p class="subtitle" style="margin-top:-4px; margin-bottom:16px;">
            SIMULATE A DONATION TO ADD TIME TO D1 SUBATHON TIMER &amp; PREVIEW POPUP
          </p>
          <form id="subTestDonateForm" style="display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end;">
            <div style="flex:2; min-width:180px;">
              <label>DONOR NAME</label>
              <input type="text" id="subTestDonor" value="SUBATHON SUPPORTER" style="margin-bottom:0;" required />
            </div>
            <div style="flex:1; min-width:120px;">
              <label>AMOUNT (THB)</label>
              <input type="number" id="subTestAmount" value="100" min="10" max="1000000" style="margin-bottom:0;" required />
            </div>
            <button type="submit" id="subTestBtn" style="width:auto; padding:12px 20px; font-size:14px; white-space:nowrap;">
              SIMULATE DONATION (+TIME)
            </button>
          </form>
        </div>
      </div>
    </ControlLayout>
  )
}
