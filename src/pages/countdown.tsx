export function CountdownOverlayPage({
  title = 'STARTING SOON',
  minutes = 0,
  seconds = 0,
  target = '',
  endMsg = 'LIVE NOW'
}: {
  title?: string
  minutes?: number
  seconds?: number
  target?: string
  endMsg?: string
}) {
  const initialDuration = Math.max(0, (Number(minutes) || 0) * 60 + (Number(seconds) || 0))

  return (
    <div>
      <div class="countdown-card" id="countdownBox">
        <div class="countdown-header">
          <span class="countdown-badge" id="cdBadge">TIMER</span>
          <span class="countdown-title" id="cdTitle">{title}</span>
        </div>
        <div class="countdown-display" id="cdDisplay">--:--</div>
        <div class="countdown-status" id="cdStatus">STANDBY</div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          document.body.classList.add('overlay-body');

          let initialSecs = ${initialDuration};
          const targetStr = ${JSON.stringify(target || '')};
          const endText = ${JSON.stringify(endMsg || 'LIVE NOW')};

          let remaining = initialSecs;
          let targetEpoch = null;
          let isRunning = true;
          let timerInterval = null;

          if (targetStr) {
            const parsed = Number(targetStr) || Date.parse(targetStr);
            if (!isNaN(parsed) && parsed > Date.now()) {
              targetEpoch = parsed;
              remaining = Math.max(0, Math.round((targetEpoch - Date.now()) / 1000));
            }
          }

          if (remaining === 0 && !targetEpoch) {
            remaining = 300; // default 5 minutes if nothing supplied
            initialSecs = 300;
          }

          const box = document.getElementById('countdownBox');
          const displayEl = document.getElementById('cdDisplay');
          const titleEl = document.getElementById('cdTitle');
          const statusEl = document.getElementById('cdStatus');
          const badgeEl = document.getElementById('cdBadge');

          function formatTime(totalSecs) {
            if (totalSecs <= 0) return '00:00';
            const h = Math.floor(totalSecs / 3600);
            const m = Math.floor((totalSecs % 3600) / 60);
            const s = totalSecs % 60;
            const pad = (n) => String(n).padStart(2, '0');
            if (h > 0) {
              return pad(h) + ':' + pad(m) + ':' + pad(s);
            }
            return pad(m) + ':' + pad(s);
          }

          function render() {
            if (remaining <= 0) {
              displayEl.textContent = '00:00';
              statusEl.textContent = endText;
              box.classList.add('ended');
              badgeEl.textContent = 'ZERO';
              return;
            }
            box.classList.remove('ended');
            displayEl.textContent = formatTime(remaining);
            statusEl.textContent = isRunning ? 'COUNTING DOWN' : 'PAUSED';
            badgeEl.textContent = isRunning ? 'LIVE' : 'HOLD';
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
          es.addEventListener('control', (e) => {
            try {
              const cmd = JSON.parse(e.data);
              if (cmd.action === 'reload') {
                window.location.reload();
              } else if (cmd.action === 'countdown') {
                const sub = cmd.cmd || 'set';
                if (sub === 'pause') {
                  isRunning = false;
                  render();
                } else if (sub === 'start' || sub === 'resume') {
                  if (remaining <= 0 && initialSecs > 0) {
                    remaining = initialSecs;
                  }
                  isRunning = true;
                  render();
                } else if (sub === 'reset') {
                  remaining = initialSecs;
                  if (targetStr && targetEpoch) {
                    targetEpoch = Date.now() + initialSecs * 1000;
                  }
                  isRunning = true;
                  render();
                } else if (sub === 'set') {
                  if (typeof cmd.seconds === 'number' && cmd.seconds >= 0) {
                    remaining = Math.round(cmd.seconds);
                    initialSecs = remaining;
                    targetEpoch = null;
                  } else if (typeof cmd.minutes === 'number' && cmd.minutes >= 0) {
                    remaining = Math.round(cmd.minutes * 60);
                    initialSecs = remaining;
                    targetEpoch = null;
                  }
                  if (cmd.title) {
                    titleEl.textContent = String(cmd.title);
                  }
                  isRunning = true;
                  render();
                } else if (sub === 'adjust') {
                  const delta = Number(cmd.delta || 0);
                  remaining = Math.max(0, remaining + delta);
                  if (targetEpoch) targetEpoch += delta * 1000;
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
