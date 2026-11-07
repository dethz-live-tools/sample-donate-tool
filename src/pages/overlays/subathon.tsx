export function SubathonOverlayPage({
  title = 'SUBATHON',
  minutes = 10,
  seconds = 0,
  target = '',
  endMsg = 'TIME UP',
  secPerThb = 6,
  maxHours = 24
}: {
  title?: string
  minutes?: number
  seconds?: number
  target?: string
  endMsg?: string
  secPerThb?: number
  maxHours?: number
}) {
  const initialDuration = Math.max(0, (Number(minutes) || 0) * 60 + (Number(seconds) || 0))

  return (
    <div>
      <div class="countdown-card subathon" id="subathonBox">
        <div class="countdown-header">
          <span class="countdown-badge" id="subBadge">SUBATHON</span>
          <span class="countdown-title" id="subTitle">{title}</span>
        </div>
        <div class="countdown-added" id="subAdded"></div>
        <div class="countdown-display" id="subDisplay">--:--:--</div>
        <div class="countdown-status" id="subStatus">STANDBY</div>
        <div class="countdown-stats" id="subStats"></div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          document.body.classList.add('overlay-body');

          let initialSecs = ${initialDuration};
          const targetStr = ${JSON.stringify(target || '')};
          const endText = ${JSON.stringify(endMsg || 'TIME UP')};
          let secPerThb = ${Number(secPerThb) || 6};
          let maxCapSecs = ${Math.max(1, Number(maxHours) || 24)} * 3600;

          let remaining = initialSecs;
          let targetEpoch = null;
          let isRunning = true;
          let timerInterval = null;
          let totalAddedSecs = 0;
          let totalDonations = 0;
          let addedTimeout = null;

          if (targetStr) {
            const parsed = Number(targetStr) || Date.parse(targetStr);
            if (!isNaN(parsed) && parsed > Date.now()) {
              targetEpoch = parsed;
              remaining = Math.max(0, Math.round((targetEpoch - Date.now()) / 1000));
            }
          }

          if (remaining === 0 && !targetEpoch) {
            remaining = 600;
            initialSecs = 600;
          }

          const box = document.getElementById('subathonBox');
          const displayEl = document.getElementById('subDisplay');
          const titleEl = document.getElementById('subTitle');
          const statusEl = document.getElementById('subStatus');
          const badgeEl = document.getElementById('subBadge');
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
            if (h > 0) return h + 'h ' + m + 'm';
            if (m > 0) return m + 'm ' + s + 's';
            return s + 's';
          }

          function render() {
            if (remaining <= 0) {
              displayEl.textContent = '00:00:00';
              statusEl.textContent = endText;
              box.classList.add('ended');
              badgeEl.textContent = 'ENDED';
              return;
            }
            box.classList.remove('ended');
            displayEl.textContent = formatTime(remaining);
            statusEl.textContent = isRunning ? 'SUBATHON LIVE' : 'PAUSED';
            badgeEl.textContent = isRunning ? 'SUBATHON' : 'HOLD';

            if (statsEl) {
              statsEl.textContent = 'RATE: +' + secPerThb + 'S/THB // ADDED: +' + formatHuman(totalAddedSecs) + ' (' + totalDonations.toLocaleString() + ' THB)';
            }
          }

          function tick() {
            if (!isRunning) return;
            if (targetEpoch) {
              const diff = Math.max(0, Math.round((targetEpoch - Date.now()) / 1000));
              remaining = diff;
            } else {
              remaining = Math.max(0, remaining - 1);
            }
            render();
            if (remaining <= 0) {
              isRunning = false;
            }
          }

          render();
          timerInterval = setInterval(tick, 1000);

          const es = new EventSource('/api/events/overlay');

          es.addEventListener('donate', (e) => {
            try {
              const d = JSON.parse(e.data);
              const amt = Number(d.amount) || 0;
              const donor = String(d.donor || 'ANONYMOUS').trim() || 'ANONYMOUS';

              if (amt > 0) {
                const addedSecs = Math.round(amt * secPerThb);
                if (addedSecs > 0) {
                  remaining = Math.min(maxCapSecs, remaining + addedSecs);
                  totalAddedSecs += addedSecs;
                  totalDonations += amt;

                  box.classList.remove('pulse');
                  void box.offsetWidth;
                  box.classList.add('pulse');
                  setTimeout(() => box.classList.remove('pulse'), 850);

                  if (addedEl) {
                    addedEl.textContent = '+' + formatHuman(addedSecs) + ' // ' + donor + ' (+' + amt.toLocaleString() + ' THB)';
                    addedEl.classList.add('show');
                    clearTimeout(addedTimeout);
                    addedTimeout = setTimeout(() => {
                      if (addedEl) addedEl.classList.remove('show');
                    }, 4500);
                  }

                  if (!isRunning && remaining > 0) {
                    isRunning = true;
                  }
                  render();
                }
              }
            } catch (_) {}
          });

          es.addEventListener('control', (e) => {
            try {
              const cmd = JSON.parse(e.data);
              if (cmd.action === 'reload') {
                window.location.reload();
              } else if (cmd.action === 'countdown') {
                const sub = cmd.cmd || 'set';
                if (sub === 'set') {
                  if (typeof cmd.minutes === 'number') {
                    remaining = Math.max(0, cmd.minutes * 60 + (cmd.seconds || 0));
                    initialSecs = remaining;
                    targetEpoch = null;
                  }
                  if (cmd.title && titleEl) titleEl.textContent = cmd.title;
                  if (typeof cmd.secPerThb === 'number' && cmd.secPerThb > 0) secPerThb = cmd.secPerThb;
                  isRunning = true;
                  render();
                } else if (sub === 'pause') {
                  isRunning = false;
                  render();
                } else if (sub === 'start' || sub === 'resume') {
                  if (remaining > 0) isRunning = true;
                  render();
                } else if (sub === 'reset') {
                  remaining = initialSecs;
                  targetEpoch = null;
                  totalAddedSecs = 0;
                  totalDonations = 0;
                  isRunning = true;
                  render();
                } else if (sub === 'adjust') {
                  const delta = Number(cmd.delta) || 0;
                  remaining = Math.max(0, remaining + delta);
                  render();
                }
              }
            } catch (_) {}
          });
        `
        }}
      />
    </div>
  )
}
