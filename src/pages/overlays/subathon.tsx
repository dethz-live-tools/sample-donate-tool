import type { SubathonState } from '../../modules/db'

export function SubathonOverlayPage({
  title = 'SUBATHON',
  minutes = 10,
  seconds = 0,
  target = '',
  endMsg = 'TIME UP',
  secPerThb = 6,
  maxHours = 24,
  initialState,
  transparent = false
}: {
  title?: string
  minutes?: number
  seconds?: number
  target?: string
  endMsg?: string
  secPerThb?: number
  maxHours?: number
  initialState?: SubathonState
  transparent?: boolean
}) {
  const resolvedTitle = initialState?.title || title || 'SUBATHON'
  const resolvedEndMsg = initialState?.endMsg || endMsg || 'TIME UP'
  const resolvedRateCoins = initialState?.rateCoins ?? 10
  const resolvedRateSeconds = initialState?.rateSeconds ?? ((Number(secPerThb) || 6) * resolvedRateCoins)
  const resolvedMaxHours = initialState?.maxHours ?? (Number(maxHours) || 24)
  const fallbackDuration = Math.max(0, (Number(minutes) || 0) * 60 + (Number(seconds) || 0)) || 600
  const resolvedInitialSecs = initialState?.initialSeconds ?? fallbackDuration
  const resolvedRemainingSecs = initialState?.remainingSeconds ?? fallbackDuration
  const resolvedTargetEpoch = initialState?.targetEpoch ?? 0
  const resolvedIsRunning = initialState ? initialState.isRunning : true
  const resolvedTotalAddedSecs = initialState?.totalAddedSecs ?? 0
  const resolvedTotalDonations = initialState?.totalDonations ?? 0

  return (
    <div class="subathon-wrapper">
      <div class={`countdown-card subathon${transparent ? ' transparent-bg' : ''}`} id="subathonBox">
        <div class="countdown-header" style="margin-bottom:10px;">
          <div class="subathon-rate-banner" id="subRateBanner">
            {resolvedRateCoins} COINS ➔ +{resolvedRateSeconds}S
          </div>
        </div>
        <div class="countdown-display" id="subDisplay">--:--:--</div>
        <div class="countdown-status" id="subStatus">STANDBY</div>
        <div class="countdown-stats" id="subStats"></div>
      </div>
      <div class="countdown-added" id="subAdded"></div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          document.body.classList.add('overlay-body', 'subathon-overlay-body');
          function setTransparentBg(enabled) {
            const box = document.getElementById('subathonBox');
            if (box) box.classList.toggle('transparent-bg', Boolean(enabled));
            document.body.classList.toggle('overlay-transparent', Boolean(enabled));
          }
          if (${Boolean(transparent)}) setTransparentBg(true);

          const GRACE_SECS = 180;
          let initialSecs = ${resolvedInitialSecs};
          const targetStr = ${JSON.stringify(target || '')};
          let endText = ${JSON.stringify(resolvedEndMsg)};
          let rateCoins = ${resolvedRateCoins};
          let rateSeconds = ${resolvedRateSeconds};
          let maxCapSecs = ${Math.max(1, resolvedMaxHours)} * 3600;

          let remaining = ${resolvedRemainingSecs};
          let targetEpoch = ${resolvedTargetEpoch || 'null'};
          let isRunning = ${resolvedIsRunning ? 'true' : 'false'};
          let isGrace = ${Boolean(initialState?.isGracePeriod)};
          let graceRemaining = ${initialState?.graceRemainingSeconds ?? 180};
          let isEnded = ${Boolean(initialState?.isEnded)};
          let timerInterval = null;
          let totalAddedSecs = ${resolvedTotalAddedSecs};
          let totalDonations = ${resolvedTotalDonations};
          let addedTimeout = null;

          if (targetStr && !targetEpoch) {
            const parsed = Number(targetStr) || Date.parse(targetStr);
            if (!isNaN(parsed) && parsed > Date.now()) {
              targetEpoch = parsed;
              remaining = Math.max(0, Math.round((targetEpoch - Date.now()) / 1000));
            }
          }

          function recomputeFromEpoch() {
            if (!targetEpoch || targetEpoch <= 0) return;
            const diff = Math.round((targetEpoch - Date.now()) / 1000);
            if (diff > 0) {
              remaining = diff;
              isRunning = true;
              isGrace = false;
              graceRemaining = GRACE_SECS;
              isEnded = false;
            } else {
              remaining = 0;
              isRunning = false;
              graceRemaining = Math.max(0, GRACE_SECS + diff);
              isGrace = graceRemaining > 0;
              isEnded = graceRemaining <= 0;
            }
          }

          if (targetEpoch && targetEpoch > 0) {
            recomputeFromEpoch();
          }

          const box = document.getElementById('subathonBox');
          const displayEl = document.getElementById('subDisplay');
          const rateBannerEl = document.getElementById('subRateBanner');
          const statusEl = document.getElementById('subStatus');
          const statsEl = document.getElementById('subStats');
          const addedEl = document.getElementById('subAdded');

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
            if (h > 0) return h + 'h ' + (m > 0 ? m + 'm' : '');
            if (m > 0) return m + 'm' + (s > 0 ? ' ' + s + 's' : '');
            return s + 's';
          }

          function formatRateLabel() {
            return rateCoins + ' COINS ➔ +' + rateSeconds + ' SEC';
          }

          function render() {
            if (rateBannerEl) {
              rateBannerEl.textContent = formatRateLabel();
            }
            if (statsEl) {
              statsEl.textContent = 'ADDED: +' + formatHuman(totalAddedSecs) + ' // TOTAL: ' + totalDonations.toLocaleString() + ' COINS';
            }
            if (remaining <= 0) {
              if (isGrace && graceRemaining > 0) {
                box.classList.remove('ended');
                box.classList.add('grace');
                displayEl.textContent = formatTime(graceRemaining);
                statusEl.textContent = 'TIME OUT // +3M GRACE TO DONATE';
                return;
              }
              box.classList.remove('grace');
              box.classList.add('ended');
              displayEl.textContent = '00:00:00';
              statusEl.textContent = endText;
              return;
            }
            box.classList.remove('ended', 'grace');
            displayEl.textContent = formatTime(remaining);
            statusEl.textContent = isRunning ? 'SUBATHON LIVE' : 'PAUSED';
          }

          function applyPersistedState(st) {
            if (!st || typeof st !== 'object') return;
            if (st.endMsg) endText = st.endMsg;
            if (typeof st.initialSeconds === 'number') initialSecs = st.initialSeconds;
            if (typeof st.rateCoins === 'number' && st.rateCoins > 0) rateCoins = st.rateCoins;
            if (typeof st.rateSeconds === 'number' && st.rateSeconds > 0) rateSeconds = st.rateSeconds;
            else if (typeof st.secPerThb === 'number' && st.secPerThb > 0 && !st.rateSeconds) {
              rateCoins = 1;
              rateSeconds = Math.round(st.secPerThb);
            }
            if (typeof st.maxHours === 'number' && st.maxHours > 0) maxCapSecs = st.maxHours * 3600;
            if (typeof st.totalAddedSecs === 'number') totalAddedSecs = st.totalAddedSecs;
            if (typeof st.totalDonations === 'number') totalDonations = st.totalDonations;
            isRunning = Boolean(st.isRunning);
            if (typeof st.targetEpoch === 'number' && st.targetEpoch > 0) {
              targetEpoch = st.targetEpoch;
              recomputeFromEpoch();
            } else {
              targetEpoch = null;
              if (typeof st.remainingSeconds === 'number') remaining = Math.max(0, st.remainingSeconds);
              isGrace = Boolean(st.isGracePeriod);
              graceRemaining = typeof st.graceRemainingSeconds === 'number' ? st.graceRemainingSeconds : (remaining > 0 ? GRACE_SECS : 0);
              isEnded = typeof st.isEnded === 'boolean' ? st.isEnded : (remaining <= 0 && !isGrace);
            }
            render();
          }

          async function syncFromDb() {
            try {
              const r = await fetch('/api/events/subathon');
              const d = await r.json();
              if (d && d.ok && d.state) {
                applyPersistedState(d.state);
              }
            } catch (_) {}
          }

          function tick() {
            if (targetEpoch && targetEpoch > 0) {
              recomputeFromEpoch();
              render();
              return;
            }
            if (isRunning) {
              remaining = Math.max(0, remaining - 1);
              if (remaining <= 0) {
                isRunning = false;
                isGrace = true;
                graceRemaining = GRACE_SECS;
                targetEpoch = Date.now();
              }
              render();
            } else if (isGrace) {
              graceRemaining = Math.max(0, graceRemaining - 1);
              if (graceRemaining <= 0) {
                isGrace = false;
                isEnded = true;
              }
              render();
            }
          }

          render();
          timerInterval = setInterval(tick, 1000);
          setInterval(syncFromDb, 5000);

          const seenIds = new Set();
          let lastSeen = Date.now();

          function handleDonateEvent(d) {
            if (!d || (d.id && seenIds.has(d.id))) return;
            if (d.id) seenIds.add(d.id);
            if (d.createdAt) lastSeen = Math.max(lastSeen, Number(d.createdAt) || Date.now());
            if (isEnded && !isGrace && remaining <= 0) return;

            const amt = Number(d.amount) || 0;
            const donor = String(d.donor || 'ANONYMOUS').trim() || 'ANONYMOUS';
            const minCoins = Math.max(0.01, rateCoins);
            const steps = Math.floor(amt / minCoins);

            if (steps > 0) {
              const addedSecs = Math.round(steps * rateSeconds);
              if (addedSecs > 0) {
                const baseRem = isGrace ? 0 : remaining;
                remaining = Math.min(maxCapSecs, baseRem + addedSecs);
                totalAddedSecs += addedSecs;
                totalDonations += amt;
                isRunning = remaining > 0;
                isGrace = false;
                isEnded = false;
                graceRemaining = GRACE_SECS;
                if (isRunning) {
                  targetEpoch = Date.now() + remaining * 1000;
                }

                box.classList.remove('pulse');
                void box.offsetWidth;
                box.classList.add('pulse');
                setTimeout(() => box.classList.remove('pulse'), 850);

                if (addedEl) {
                  addedEl.textContent = '+' + formatHuman(addedSecs) + ' // ' + donor + ' (+' + amt.toLocaleString() + ' COINS)';
                  addedEl.classList.add('show');
                  clearTimeout(addedTimeout);
                  addedTimeout = setTimeout(() => {
                    if (addedEl) addedEl.classList.remove('show');
                  }, 4500);
                }

                render();
                syncFromDb();
              }
            }
          }

          const es = new EventSource('/api/events/overlay');

          es.addEventListener('donate', (e) => {
            try {
              handleDonateEvent(JSON.parse(e.data));
            } catch (_) {}
          });

          setInterval(async () => {
            try {
              const r = await fetch('/api/events/poll?client=overlay&since=' + lastSeen);
              const d = await r.json();
              if (d && Array.isArray(d.items)) {
                d.items.forEach(handleDonateEvent);
              }
            } catch (_) {}
          }, 2000);

          es.addEventListener('control', (e) => {
            try {
              const cmd = JSON.parse(e.data);
              if (cmd.action === 'reload') {
                window.location.reload();
              } else if (cmd.action === 'countdown' || cmd.action === 'subathon') {
                if (cmd.mode && cmd.mode !== 'subathon') return;
                if (typeof cmd.transparent === 'boolean') setTransparentBg(cmd.transparent);
                if (cmd.cmd === 'bg' || cmd.cmd === 'gift_ignored') return;
                if (cmd.cmd === 'gift' && cmd.gift && Number(cmd.gift.addedSecs) > 0) {
                  box.classList.remove('pulse');
                  void box.offsetWidth;
                  box.classList.add('pulse');
                  setTimeout(() => box.classList.remove('pulse'), 850);
                  if (addedEl) {
                    const g = cmd.gift;
                    const giftTag = g.giftName ? (' [' + g.giftName + ']') : '';
                    addedEl.textContent =
                      '+' + formatHuman(Number(g.addedSecs)) + ' // ' + (g.donor || 'TIKTOK') + giftTag + ' (+' + Number(g.coins || 0).toLocaleString() + ' COINS)';
                    addedEl.classList.add('show');
                    clearTimeout(addedTimeout);
                    addedTimeout = setTimeout(() => {
                      if (addedEl) addedEl.classList.remove('show');
                    }, 4500);
                  }
                }
                if (cmd.subathonState) {
                  applyPersistedState(cmd.subathonState);
                  return;
                }
                syncFromDb();
              } else if (cmd.action === 'bg' && typeof cmd.transparent === 'boolean') {
                setTransparentBg(cmd.transparent);
              }
            } catch (_) {}
          });
        `
        }}
      />
    </div>
  )
}
