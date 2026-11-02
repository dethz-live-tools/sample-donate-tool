export function OverlayPage() {
  return (
    <div>
      <button class="unlock-btn" id="unlockBtn">ENABLE AUDIO</button>
      <div class="alert-box" id="alertBox">
        <div class="alert-title">
          <span id="alertDonor"></span> // <span class="alert-amount" id="alertAmount"></span>
        </div>
        <div class="alert-msg" id="alertMsg"></div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          document.body.classList.add('overlay-body');
          let audioCtx;
          let activeSource = null;
          const queue = [];
          const seenIds = new Set();
          let lastSeen = Date.now();
          let playing = false;
          let runId = 0;

          function getAudioCtx() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            return audioCtx;
          }

          document.getElementById('unlockBtn').addEventListener('click', (e) => {
            getAudioCtx();
            e.target.style.display = 'none';
          });

          // ponytail: decode raw L16 PCM via Web Audio API Float32Array directly without WAV header library
          async function playPCM(base64, sampleRate) {
            const ctx = getAudioCtx();
            const bin = atob(base64);
            const samples = bin.length >> 1;
            const buf = ctx.createBuffer(1, samples, sampleRate || 24000);
            const ch = buf.getChannelData(0);
            const view = new DataView(Uint8Array.from(bin, c => c.charCodeAt(0)).buffer);
            for (let i = 0; i < samples; i++) {
              ch[i] = view.getInt16(i * 2, true) / 32768;
            }
            return new Promise((resolve) => {
              const src = ctx.createBufferSource();
              activeSource = src;
              src.buffer = buf;
              src.connect(ctx.destination);
              src.onended = () => {
                if (activeSource === src) activeSource = null;
                resolve();
              };
              src.start();
            });
          }

          function playFallbackTTS(text) {
            return new Promise((resolve) => {
              if (!('speechSynthesis' in window)) return setTimeout(resolve, 3000);
              const u = new SpeechSynthesisUtterance(text);
              u.lang = 'th-TH';
              u.onend = resolve;
              u.onerror = resolve;
              speechSynthesis.speak(u);
            });
          }

          async function processQueue() {
            if (playing || queue.length === 0) return;
            playing = true;
            const myRun = ++runId;
            const ev = queue.shift();
            const box = document.getElementById('alertBox');
            document.getElementById('alertDonor').textContent = ev.donor;
            document.getElementById('alertAmount').textContent = ev.amount.toLocaleString() + ' THB';
            document.getElementById('alertMsg').textContent = ev.message || '';
            box.classList.add('show');

            try {
              if (ev.audioBase64) {
                await playPCM(ev.audioBase64, ev.sampleRate);
              } else {
                await playFallbackTTS(ev.donor + ' โดเนท ' + ev.amount + ' บาท ' + (ev.message || ''));
              }
            } catch (e) {
              console.error(e);
            }
            if (myRun !== runId) return;

            await new Promise(r => setTimeout(r, 2500));
            if (myRun !== runId) return;
            box.classList.remove('show');
            await new Promise(r => setTimeout(r, 400));
            if (myRun !== runId) return;
            playing = false;
            processQueue();
          }

          function enqueue(ev) {
            if (!ev || seenIds.has(ev.id)) return;
            seenIds.add(ev.id);
            if (ev.createdAt > lastSeen) lastSeen = ev.createdAt;
            queue.push(ev);
            processQueue();
          }

          const es = new EventSource('/api/events/overlay');
          es.addEventListener('heartbeat', (e) => {
            console.log('[overlay] heartbeat received', e.data);
          });
          es.addEventListener('control', (e) => {
            try {
              const cmd = JSON.parse(e.data);
              console.log('[overlay] control command received', cmd);
              if (cmd.action === 'reload') {
                window.location.reload();
              } else if (cmd.action === 'clear') {
                runId++;
                queue.length = 0;
                if (activeSource) {
                  try { activeSource.stop(); } catch (_) {}
                  activeSource = null;
                }
                if ('speechSynthesis' in window) {
                  try { speechSynthesis.cancel(); } catch (_) {}
                }
                const box = document.getElementById('alertBox');
                if (box) box.classList.remove('show');
                playing = false;
              } else if (cmd.action === 'disconnect') {
                es.close();
                setTimeout(() => window.location.reload(), 1500);
              }
            } catch (err) {
              console.error('[overlay] control error', err);
            }
          });
          es.addEventListener('donate', (e) => enqueue(JSON.parse(e.data)));

          setInterval(async () => {
            try {
              const r = await fetch('/api/events/poll?client=overlay&since=' + lastSeen);
              const d = await r.json();
              if (d.items) d.items.forEach(enqueue);
            } catch {}
          }, 2000);
        `
        }}
      />
    </div>
  )
}
