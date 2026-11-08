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
  const initRateCoins = subathonState?.rateCoins ?? 10
  const initRateSeconds = subathonState?.rateSeconds ?? 60
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
        const rateCoinsInput = document.getElementById('subRateCoins');
        const rateSecondsInput = document.getElementById('subRateSeconds');
        const ratePreviewEl = document.getElementById('subRatePreview');
        const capInput = document.getElementById('subMaxHours');
        const endInput = document.getElementById('subCustomEnd');

        const dbClockEl = document.getElementById('subDbClock');
        const dbStateEl = document.getElementById('subDbState');
        const dbRateEl = document.getElementById('subDbRate');
        const dbAddedEl = document.getElementById('subDbAdded');
        const dbThbEl = document.getElementById('subDbThb');

        let subRemaining = ${initRemaining};
        let subTargetEpoch = ${initTargetEpoch || 'null'};
        let subRunning = ${initIsRunning ? 'true' : 'false'};
        let subRateCoins = ${initRateCoins};
        let subRateSeconds = ${initRateSeconds};
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
          if (m > 0) return m + 'm ' + (s > 0 ? s + 's' : '');
          return s + 's';
        }

        function updateRatePreview() {
          const c = Math.max(0.01, Number(rateCoinsInput?.value) || 10);
          const s = Math.max(1, Math.round(Number(rateSecondsInput?.value) || 60));
          if (ratePreviewEl) {
            ratePreviewEl.textContent =
              'MIN TO COUNT: ' + c + ' COINS (BELOW ' + c + ' COINS = IGNORED)   |   ' +
              c + ' COINS = +' + formatHuman(s) +
              '   •   ' + (c * 5) + ' COINS = +' + formatHuman(s * 5) +
              '   •   ' + (c * 10) + ' COINS = +' + formatHuman(s * 10);
          }
        }

        rateCoinsInput?.addEventListener('input', updateRatePreview);
        rateSecondsInput?.addEventListener('input', updateRatePreview);

        function renderSubDbCard() {
          if (dbClockEl) dbClockEl.textContent = formatTime(subRemaining);
          if (dbStateEl) {
            dbStateEl.textContent = subRemaining <= 0 ? 'ENDED' : (subRunning ? 'RUNNING' : 'PAUSED');
            dbStateEl.className = subRunning && subRemaining > 0 ? 'status-online' : 'status-offline';
          }
          if (dbRateEl) dbRateEl.textContent = subRateCoins + ' COINS ➔ +' + subRateSeconds + 'S';
          if (dbAddedEl) dbAddedEl.textContent = '+' + formatHuman(subAddedSecs);
          if (dbThbEl) dbThbEl.textContent = Number(subTotalThb || 0).toLocaleString() + ' COINS';
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
          if (typeof st.rateCoins === 'number' && st.rateCoins > 0) subRateCoins = st.rateCoins;
          if (typeof st.rateSeconds === 'number' && st.rateSeconds > 0) subRateSeconds = st.rateSeconds;
          if (typeof st.totalAddedSecs === 'number') subAddedSecs = st.totalAddedSecs;
          if (typeof st.totalDonations === 'number') subTotalThb = st.totalDonations;

          if (titleInput && st.title && document.activeElement !== titleInput) titleInput.value = st.title;
          if (endInput && st.endMsg && document.activeElement !== endInput) endInput.value = st.endMsg;
          if (minsInput && typeof st.initialSeconds === 'number' && document.activeElement !== minsInput) {
            minsInput.value = String(Math.max(1, Math.round(st.initialSeconds / 60)));
          }
          if (rateCoinsInput && typeof st.rateCoins === 'number' && document.activeElement !== rateCoinsInput) {
            rateCoinsInput.value = String(st.rateCoins);
          }
          if (rateSecondsInput && typeof st.rateSeconds === 'number' && document.activeElement !== rateSecondsInput) {
            rateSecondsInput.value = String(st.rateSeconds);
          }
          if (capInput && typeof st.maxHours === 'number' && document.activeElement !== capInput) {
            capInput.value = String(st.maxHours);
          }
          updateRatePreview();
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
        updateRatePreview();
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

        function getRateValues() {
          const rateCoins = Math.max(0.01, Number(rateCoinsInput?.value) || 10);
          const rateSeconds = Math.max(1, Math.round(Number(rateSecondsInput?.value) || 60));
          const maxHours = Math.max(1, Number(capInput?.value) || 24);
          return { rateCoins, rateSeconds, maxHours };
        }

        function startSubPreset(minutes) {
          if (minsInput) minsInput.value = String(minutes);
          const title = (titleInput?.value || 'SUBATHON').trim() || 'SUBATHON';
          const endMsg = (endInput?.value || 'TIME UP').trim() || 'TIME UP';
          const { rateCoins, rateSeconds, maxHours } = getRateValues();
          sendSubCommand({ cmd: 'set', minutes, title, rateCoins, rateSeconds, maxHours, endMsg });
        }

        document.getElementById('subSaveRateBtn')?.addEventListener('click', () => {
          const { rateCoins, rateSeconds, maxHours } = getRateValues();
          sendSubCommand({ cmd: 'rate', rateCoins, rateSeconds, maxHours });
        });

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
          const endMsg = (endInput?.value || 'TIME UP').trim() || 'TIME UP';
          const { rateCoins, rateSeconds, maxHours } = getRateValues();
          sendSubCommand({ cmd: 'set', minutes, title, rateCoins, rateSeconds, maxHours, endMsg });
        });

        async function dispatchSubTestDonate(customAmount) {
          const btn = document.getElementById('subTestBtn');
          const donor = document.getElementById('subTestDonor')?.value || 'SUBATHON SUPPORTER';
          const amount = Number(customAmount ?? document.getElementById('subTestAmount')?.value ?? 100);
          const message = document.getElementById('subTestMessage')?.value || 'เพิ่มเวลา Subathon!';
          const ttsEnabled = Boolean(document.getElementById('subTestTtsToggle')?.checked);
          if (btn) {
            btn.disabled = true;
            btn.textContent = 'DISPATCHING...';
          }
          try {
            const res = await fetch('/api/donate/test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ donor, amount, message, ttsEnabled })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'FAILED');
            if (data.subathonState) applySubDbState(data.subathonState);
            else await refreshSubState();
            if (amount < subRateCoins) {
              showStatus('IGNORED BY SUBMATRON // ' + amount + ' COINS IS BELOW MIN RATE (' + subRateCoins + ' COINS)', true);
              log('Submatron ignored test donate (' + amount + ' < ' + subRateCoins + ' coins)', 'warn');
            } else {
              const addedSecs = Math.round((amount / Math.max(0.01, subRateCoins)) * subRateSeconds);
              showStatus('OK // TEST DONATE +' + amount + ' COINS (+' + addedSecs + 'S) ADDED TO SUBMATRON');
              log('Submatron test donate: +' + amount + ' COINS (+' + addedSecs + 's) by ' + donor, 'success');
            }
          } catch (err) {
            showStatus('ERROR // ' + err.message, true);
            log('Submatron test failed: ' + err.message, 'err');
          } finally {
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'SEND TEST DONATE (+TIME)';
            }
          }
        }

        document.getElementById('subTestDonateForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          await dispatchSubTestDonate();
        });

        document.querySelectorAll('[data-test-coins]').forEach((b) => {
          b.addEventListener('click', () => {
            const amt = Number(b.getAttribute('data-test-coins')) || 10;
            const amtInput = document.getElementById('subTestAmount');
            if (amtInput) amtInput.value = String(amt);
            dispatchSubTestDonate(amt);
          });
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
            Recommended OBS settings: Width <strong>450</strong>, Height <strong>250</strong>. Timer state, coin rate, added seconds, and donation totals are automatically saved in Cloudflare D1 across refreshes.
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
            <label>ACTIVE COIN RATE</label>
            <div style="font-family:var(--font-head); font-size:24px; color:var(--ctp-yellow);" id="subDbRate">
              {initRateCoins} COINS ➔ +{initRateSeconds}S
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
              {initTotalThb.toLocaleString()} COINS
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:24px;">
          <h3 style="font-family:var(--font-head); font-size:20px; margin-bottom:8px; text-transform:uppercase;">
            COIN TO TIME CONVERSION (X COINS ➔ +Y SECONDS)
          </h3>
          <p class="subtitle" style="margin-top:-4px; margin-bottom:16px;">
            SET HOW MANY COINS (THB) ADD HOW MANY SECONDS
          </p>

          <div style="display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end; margin-bottom:14px;">
            <div style="flex:1; min-width:140px;">
              <label>EVERY X COINS (THB)</label>
              <input
                type="number"
                id="subRateCoins"
                value={String(initRateCoins)}
                min="1"
                max="100000"
                step="any"
                style="margin-bottom:0;"
                required
              />
            </div>
            <div style="font-family:var(--font-head); font-size:20px; color:var(--ctp-yellow); padding-bottom:10px;">
              ➔ ADDS
            </div>
            <div style="flex:1; min-width:140px;">
              <label>+ Y SECONDS</label>
              <input
                type="number"
                id="subRateSeconds"
                value={String(initRateSeconds)}
                min="1"
                max="86400"
                style="margin-bottom:0;"
                required
              />
            </div>
            <div style="flex:1; min-width:140px;">
              <label>MAX TIMER CAP (HOURS)</label>
              <input
                type="number"
                id="subMaxHours"
                value={String(initCapHours)}
                min="1"
                max="720"
                style="margin-bottom:0;"
                required
              />
            </div>
            <button
              type="button"
              id="subSaveRateBtn"
              style="width:auto; padding:12px 20px; font-size:13px; background:var(--ctp-green); border-color:var(--ctp-green); color:var(--ctp-crust); white-space:nowrap;"
            >
              UPDATE COIN RATE (KEEP CLOCK)
            </button>
          </div>

          <div
            id="subRatePreview"
            style="padding:10px 14px; background:var(--ctp-mantle); border:1px solid var(--ctp-surface1); font-family:var(--font-mono); font-size:12px; color:var(--ctp-teal);"
          >
            {initRateCoins} COINS ➔ +{initRateSeconds}s
          </div>
        </div>

        <div class="card" style="margin-bottom:24px;">
          <h3 style="font-family:var(--font-head); font-size:20px; margin-bottom:8px; text-transform:uppercase;">
            SUBATHON TIMER &amp; REMOTE CONTROLS
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
                <label>INITIAL MINUTES (RESET / NEW START)</label>
                <input type="number" id="subCustomMinutes" value={String(initMins)} min="1" max="14400" required />
              </div>
              <div>
                <label>END MESSAGE</label>
                <input type="text" id="subCustomEnd" value={initEndMsg} required />
              </div>
            </div>
            <button type="submit" style="width:auto; padding:12px 24px; font-size:14px;">
              SAVE &amp; RESTART SUBATHON TIMER IN D1
            </button>
          </form>
        </div>

        <div class="card" style="margin-bottom:24px;">
          <h3 style="font-family:var(--font-head); font-size:20px; margin-bottom:8px; text-transform:uppercase;">
            DONATE TEST (SUBMATRON TIME ADDITION)
          </h3>
          <p class="subtitle" style="margin-top:-4px; margin-bottom:16px;">
            DISPATCH A TEST DONATION TO ADD TIME TO SUBMATRON D1 TIMER &amp; TRIGGER OVERLAY POPUP
          </p>

          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
            <button
              type="button"
              data-test-coins="10"
              style="width:auto; padding:8px 14px; font-size:12px; background:var(--ctp-surface0); border-color:var(--ctp-green); color:var(--ctp-green);"
            >
              TEST +10 COINS
            </button>
            <button
              type="button"
              data-test-coins="50"
              style="width:auto; padding:8px 14px; font-size:12px; background:var(--ctp-surface0); border-color:var(--ctp-green); color:var(--ctp-green);"
            >
              TEST +50 COINS
            </button>
            <button
              type="button"
              data-test-coins="100"
              style="width:auto; padding:8px 14px; font-size:12px; background:var(--ctp-surface0); border-color:var(--ctp-green); color:var(--ctp-green);"
            >
              TEST +100 COINS
            </button>
            <button
              type="button"
              data-test-coins="500"
              style="width:auto; padding:8px 14px; font-size:12px; background:var(--ctp-surface0); border-color:var(--ctp-green); color:var(--ctp-green);"
            >
              TEST +500 COINS
            </button>
          </div>

          <form id="subTestDonateForm">
            <div class="row">
              <div>
                <label>DONOR NAME</label>
                <input type="text" id="subTestDonor" value="SUBMATRON TESTER" required />
              </div>
              <div>
                <label>COINS / AMOUNT (THB)</label>
                <input type="number" id="subTestAmount" value="10" min="1" max="1000000" required />
              </div>
              <div>
                <label>TEST MESSAGE</label>
                <input type="text" id="subTestMessage" value="เพิ่มเวลา Submatron!" />
              </div>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:16px; align-items:center; justify-content:space-between;">
              <label style="display:flex; align-items:center; gap:8px; margin-bottom:0; cursor:pointer;">
                <input type="checkbox" id="subTestTtsToggle" checked style="width:auto; margin:0;" />
                <span>ALSO PLAY ALERT TTS ON DONATION ALERT OVERLAY</span>
              </label>
              <button
                type="submit"
                id="subTestBtn"
                style="width:auto; padding:12px 24px; font-size:14px; background:var(--ctp-green); border-color:var(--ctp-green); color:var(--ctp-crust); white-space:nowrap;"
              >
                SEND TEST DONATE (+TIME)
              </button>
            </div>
          </form>
        </div>
      </div>
    </ControlLayout>
  )
}
