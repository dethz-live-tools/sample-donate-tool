export function AlertOverlayPage({ ttsEnabled = true }: { ttsEnabled?: boolean }) {
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
          let ttsEnabled = ${Boolean(ttsEnabled)};
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

          document.getElementById('unlockBtn')?.addEventListener('click', (e) => {
            getAudioCtx();
            e.target.style.display = 'none';
          });

          // ponytail: decode audio via Web Audio API decodeAudioData with raw PCM fallback
          async function playAudio(base64, sampleRate) {
            const ctx = getAudioCtx();
            const bin = atob(base64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            try {
              const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
              return new Promise((resolve) => {
                const src = ctx.createBufferSource();
                activeSource = src;
                src.buffer = audioBuffer;
                src.connect(ctx.destination);
                src.onended = () => {
                  if (activeSource === src) activeSource = null;
                  resolve();
                };
                src.start();
              });
            } catch (err) {
              const samples = bin.length >> 1;
              const buf = ctx.createBuffer(1, samples, sampleRate || 24000);
              const ch = buf.getChannelData(0);
              const view = new DataView(bytes.buffer);
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
          }

          async function playAudioUrl(url) {
            return new Promise((resolve, reject) => {
              const audio = new Audio(url);
              audio.onended = () => resolve();
              audio.onerror = (err) => reject(err);
              audio.play().catch(reject);
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
            lastSeen = Math.max(lastSeen, Number(ev.createdAt) || Date.now());

            const box = document.getElementById('alertBox');
            const donorEl = document.getElementById('alertDonor');
            const amtEl = document.getElementById('alertAmount');
            const msgEl = document.getElementById('alertMsg');

            if (!box || !donorEl || !amtEl || !msgEl) {
              playing = false;
              return;
            }

            donorEl.textContent = ev.donor;
            amtEl.textContent = Number(ev.amount).toLocaleString() + ' THB';
            msgEl.textContent = ev.message || '';
            box.classList.add('show');

            const isTtsActive = typeof ev.ttsEnabled === 'boolean' ? ev.ttsEnabled && ttsEnabled : ttsEnabled;
            const cleanDonor = String(ev.donor || '').replace(/[*＊]+/g, ' ').replace(/\s+/g, ' ').trim() || 'ผู้บริจาค';
            const cleanMsg = String(ev.message || '').replace(/[*＊]+/g, ' ').replace(/\s+/g, ' ').trim();
            const fullText = cleanDonor + ' โดเนท ' + ev.amount + ' บาท' + (cleanMsg ? ' ' + cleanMsg : '');

            if (isTtsActive) {
              try {
                if (ev.audioBase64) {
                  await playAudio(ev.audioBase64, ev.sampleRate);
                } else {
                  await playFallbackTTS(fullText);
                }
              } catch (err) {
                console.error('[overlay] audio error', err);
                try {
                  await playFallbackTTS(fullText);
                } catch (_) {}
              }
            } else {
              await new Promise((r) => setTimeout(r, 4500));
            }

            if (myRun !== runId) return;

            box.classList.remove('show');
            await new Promise((r) => setTimeout(r, 800));
            playing = false;
            processQueue();
          }

          function enqueue(ev) {
            if (!ev || !ev.id || seenIds.has(ev.id)) return;
            seenIds.add(ev.id);
            queue.push(ev);
            processQueue();
          }

          const es = new EventSource('/api/events/overlay');
          es.addEventListener('heartbeat', (e) => {
            console.log('[overlay] heartbeat received', e.data);
          });
          es.addEventListener('overlay_status', (e) => {
            try {
              const st = JSON.parse(e.data);
              if (typeof st.ttsEnabled === 'boolean') ttsEnabled = st.ttsEnabled;
            } catch {}
          });
          es.addEventListener('control', (e) => {
            try {
              const cmd = JSON.parse(e.data);
              console.log('[overlay] control command received', cmd);
              if (cmd.action === 'reload') {
                window.location.reload();
              } else if (cmd.action === 'tts') {
                ttsEnabled = Boolean(cmd.enabled);
                if (!ttsEnabled) {
                  if (activeSource) {
                    try { activeSource.stop(); } catch (_) {}
                    activeSource = null;
                  }
                  if ('speechSynthesis' in window) {
                    try { speechSynthesis.cancel(); } catch (_) {}
                  }
                }
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
          es.addEventListener('donate', (e) => {
            try {
              enqueue(JSON.parse(e.data));
            } catch (_) {}
          });

          setInterval(async () => {
            try {
              const r = await fetch('/api/events/poll?client=overlay&since=' + lastSeen);
              const d = await r.json();
              if (typeof d.overlayStatus?.ttsEnabled === 'boolean') ttsEnabled = d.overlayStatus.ttsEnabled;
              if (d.items) d.items.forEach(enqueue);
            } catch {}
          }, 2000);
        `
        }}
      />
    </div>
  )
}

export { AlertOverlayPage as OverlayPage }
