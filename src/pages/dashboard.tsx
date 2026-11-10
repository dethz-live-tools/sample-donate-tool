import type { DonateEvent, OverlayStatus } from '../modules/events'

export function DashboardPage({
  items,
  overlayStatus
}: {
  items: DonateEvent[]
  overlayStatus?: OverlayStatus
}) {
  const totalAmount = items.reduce((sum, h) => sum + h.amount, 0)
  const overlayOnline = Boolean(overlayStatus?.online)
  const clientCount = overlayStatus?.count ?? (overlayOnline ? 1 : 0)

  return (
    <div class="container wide">
      <div class="card elevated">
        <div class="nav-links">
          <a href="/">RETURN TO DONATE</a>
          <div style="display:flex; gap:16px; align-items:center;">
            <div id="overlayNavBadge" class={`overlay-indicator ${overlayOnline ? 'is-online' : ''}`}>
              <span class="overlay-square"></span>
              <span id="overlayNavText">
                OVERLAY: {overlayOnline ? `ONLINE${clientCount > 1 ? ` (${clientCount})` : ''}` : 'OFFLINE'}
              </span>
            </div>
            <a href="/overlay/control">OVERLAY CONTROLS</a>
            <a href="/overlay" target="_blank">OPEN OVERLAY</a>
            <button
              type="button"
              id="testDonateBtn"
              style="width:auto; padding:4px 12px; font-size:12px;"
            >
              TEST DONATE ALERT
            </button>
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
        <h1>TRANSACTIONS</h1>
        <p class="subtitle">CLOUDFLARE D1 LEDGER + REAL-TIME STREAM</p>

        <div id="testStatus" class="status" style="margin-bottom: 16px;"></div>

        <div class="card-grid" style="margin-bottom: 24px;">
          <div class="card" style="margin-bottom:0;">
            <label>TOTAL VOLUME</label>
            <div style="font-family:var(--font-head); font-size:32px;" id="totalAmount">
              {totalAmount.toLocaleString()} THB
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <label>COUNT</label>
            <div style="font-family:var(--font-head); font-size:32px;" id="totalCount">
              {items.length}
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <label>OVERLAY STATUS</label>
            <div
              style="font-family:var(--font-head); font-size:32px;"
              id="overlayStatusText"
              class={overlayOnline ? 'status-online' : 'status-offline'}
            >
              {overlayOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
            <div
              id="overlayDetailText"
              style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0); margin-top:4px;"
            >
              {overlayOnline
                ? `${clientCount} CLIENT${clientCount > 1 ? 'S' : ''} CONNECTED`
                : 'NO OVERLAY CONNECTED'}
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <label>TTS (EDGE NEURAL)</label>
            <div
              style="font-family:var(--font-head); font-size:32px;"
              id="dashTtsStatus"
              class={overlayStatus?.ttsEnabled !== false ? 'status-online' : 'status-offline'}
            >
              {overlayStatus?.ttsEnabled !== false ? 'ONLINE' : 'MUTED'}
            </div>
            <div
              id="dashTtsVoice"
              style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0); margin-top:4px;"
            >
              {overlayStatus?.ttsVoice || 'th-TH-NiwatNeural'}
            </div>
          </div>
        </div>

        <details class="inverted-block fold-block" style="margin-bottom: 24px;">
          <summary>OVERLAY SETTINGS &amp; CONTROLLERS</summary>
          <div style="display:flex; flex-wrap:wrap; gap:8px;">
            <a
              href="/overlay/control"
              style="text-decoration:none; padding:8px 14px; font-family:var(--font-head); font-size:12px; border:2px solid var(--ctp-surface2); background:var(--ctp-mantle); color:var(--ctp-text);"
            >
              OVERVIEW HUB
            </a>
            <a
              href="/overlay/control/alert"
              style="text-decoration:none; padding:8px 14px; font-family:var(--font-head); font-size:12px; border:2px solid var(--ctp-mauve); background:var(--ctp-mantle); color:var(--ctp-mauve);"
            >
              1. DONATION ALERT &amp; TTS
            </a>
            <a
              href="/overlay/control/leaderboard"
              style="text-decoration:none; padding:8px 14px; font-family:var(--font-head); font-size:12px; border:2px solid var(--ctp-mauve); background:var(--ctp-mantle); color:var(--ctp-mauve);"
            >
              2. LEADERBOARD
            </a>
            <a
              href="/overlay/control/countdown"
              style="text-decoration:none; padding:8px 14px; font-family:var(--font-head); font-size:12px; border:2px solid var(--ctp-mauve); background:var(--ctp-mantle); color:var(--ctp-mauve);"
            >
              3. COUNTDOWN TIMER
            </a>
            <a
              href="/overlay/control/subathon"
              style="text-decoration:none; padding:8px 14px; font-family:var(--font-head); font-size:12px; border:2px solid var(--ctp-mauve); background:var(--ctp-mantle); color:var(--ctp-mauve);"
            >
              4. SUBATHON MARATHON
            </a>
          </div>
        </details>

        <details class="card fold-block" style="margin-bottom: 24px;">
          <summary>EDGE TTS VOICE OPTIONS</summary>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
            <p class="subtitle" style="margin:0; font-size:11px; border:none; padding:0;">
              MICROSOFT EDGE NEURAL SYNTHESIS // FREE &amp; FAST // LOADED LOCALLY
            </p>
            <div style="display:flex; gap:10px; align-items:center;">
              <button
                type="button"
                id="dashToggleTtsBtn"
                style="width:auto; padding:6px 14px; font-size:12px;"
              >
                TOGGLE TTS: {overlayStatus?.ttsEnabled !== false ? 'MUTE' : 'UNMUTE'}
              </button>
            </div>
          </div>

          <form id="dashTtsForm" style="margin-bottom:0;">
            <div class="row" style="margin-bottom:12px;">
              <div>
                <label>VOICE</label>
                <select id="dashVoiceSelect" style="margin-bottom:0;">
                  <option value="th-TH-NiwatNeural" selected={overlayStatus?.ttsVoice === 'th-TH-NiwatNeural' || !overlayStatus?.ttsVoice}>
                    Thai - Niwat (Male)
                  </option>
                  <option value="th-TH-PremwadeeNeural" selected={overlayStatus?.ttsVoice === 'th-TH-PremwadeeNeural'}>
                    Thai - Premwadee (Female)
                  </option>
                  <option value="en-US-AriaNeural" selected={overlayStatus?.ttsVoice === 'en-US-AriaNeural'}>
                    English (US) - Aria (Female)
                  </option>
                  <option value="en-US-GuyNeural" selected={overlayStatus?.ttsVoice === 'en-US-GuyNeural'}>
                    English (US) - Guy (Male)
                  </option>
                  <option value="en-US-JennyNeural" selected={overlayStatus?.ttsVoice === 'en-US-JennyNeural'}>
                    English (US) - Jenny (Female)
                  </option>
                  <option value="ja-JP-NanamiNeural" selected={overlayStatus?.ttsVoice === 'ja-JP-NanamiNeural'}>
                    Japanese - Nanami (Female)
                  </option>
                  <option value="ja-JP-KeitaNeural" selected={overlayStatus?.ttsVoice === 'ja-JP-KeitaNeural'}>
                    Japanese - Keita (Male)
                  </option>
                </select>
              </div>
              <div>
                <label>SPEED / RATE</label>
                <select id="dashRateSelect" style="margin-bottom:0;">
                  <option value="-20%" selected={overlayStatus?.ttsRate === '-20%'}>Slow (-20%)</option>
                  <option value="-10%" selected={overlayStatus?.ttsRate === '-10%'}>Slightly Slow (-10%)</option>
                  <option value="+0%" selected={overlayStatus?.ttsRate === '+0%' || !overlayStatus?.ttsRate}>Normal (0%)</option>
                  <option value="+10%" selected={overlayStatus?.ttsRate === '+10%'}>Slightly Fast (+10%)</option>
                  <option value="+20%" selected={overlayStatus?.ttsRate === '+20%'}>Fast (+20%)</option>
                  <option value="+30%" selected={overlayStatus?.ttsRate === '+30%'}>Very Fast (+30%)</option>
                </select>
              </div>
              <div>
                <label>PITCH</label>
                <select id="dashPitchSelect" style="margin-bottom:0;">
                  <option value="-10Hz" selected={overlayStatus?.ttsPitch === '-10Hz'}>Low (-10Hz)</option>
                  <option value="-5Hz" selected={overlayStatus?.ttsPitch === '-5Hz'}>Slightly Low (-5Hz)</option>
                  <option value="+0Hz" selected={overlayStatus?.ttsPitch === '+0Hz' || !overlayStatus?.ttsPitch}>Normal (0Hz)</option>
                  <option value="+5Hz" selected={overlayStatus?.ttsPitch === '+5Hz'}>Slightly High (+5Hz)</option>
                  <option value="+10Hz" selected={overlayStatus?.ttsPitch === '+10Hz'}>High (+10Hz)</option>
                </select>
              </div>
            </div>
            <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
              <button type="submit" id="dashSaveTtsBtn" style="width:auto; padding:8px 16px; font-size:13px;">
                SAVE SETTINGS
              </button>
              <button
                type="button"
                id="dashPreviewTtsBtn"
                style="width:auto; padding:8px 16px; font-size:13px; background:var(--ctp-sapphire); border-color:var(--ctp-sapphire);"
              >
                TEST AUDIO LOCALLY
              </button>
              <span id="dashTtsMsg" style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-green);"></span>
            </div>
          </form>
        </details>

        <details class="card fold-block" style="margin-bottom: 24px;">
          <summary>WORD FILTER &amp; PROFANITY CENSOR</summary>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
            <p class="subtitle" style="margin:0; font-size:11px; border:none; padding:0;">
              CENSOR OFFENSIVE WORDS WITH *** OR SILENCE TTS // THAI &amp; ENGLISH
            </p>
            <div style="display:flex; gap:10px; align-items:center;">
              <button
                type="button"
                id="dashToggleFilterBtn"
                style="width:auto; padding:6px 14px; font-size:12px;"
              >
                FILTER: {overlayStatus?.filterEnabled !== false ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>

          <form id="dashFilterForm" style="margin-bottom:0;">
            <div class="row" style="margin-bottom:12px;">
              <div>
                <label>ACTION ON PROFANITY</label>
                <select id="dashFilterAction" style="margin-bottom:0;">
                  <option value="censor" selected={overlayStatus?.filterAction !== 'mute'}>
                    Censor with *** (TTS speaks censored text)
                  </option>
                  <option value="mute" selected={overlayStatus?.filterAction === 'mute'}>
                    Mute TTS (Censor text &amp; silence audio completely)
                  </option>
                </select>
              </div>
              <div>
                <label>CUSTOM WORDS (COMMA OR NEWLINE SEPARATED)</label>
                <input
                  type="text"
                  id="dashFilterWords"
                  placeholder="คำหยาบ, คำต้องห้าม, badword1, badword2"
                  style="margin-bottom:0;"
                />
              </div>
            </div>
            <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
              <button type="submit" id="dashSaveFilterBtn" style="width:auto; padding:8px 16px; font-size:13px;">
                SAVE FILTER SETTINGS
              </button>
              <span id="dashFilterMsg" style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-green);"></span>
            </div>
          </form>
        </details>

        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>TIME</th>
                <th>DONOR</th>
                <th>AMOUNT</th>
                <th>CHANNEL</th>
                <th>SLIP REF</th>
                <th>MESSAGE</th>
              </tr>
            </thead>
            <tbody id="txBody">
              {items.length === 0 ? (
                <tr id="emptyRow">
                  <td colSpan={6} style="text-align:center; font-family:var(--font-mono);">
                    NO TRANSACTIONS RECORDED
                  </td>
                </tr>
              ) : (
                items.map((h) => (
                  <tr data-id={h.id}>
                    <td style="font-family:var(--font-mono); font-size:14px; white-space:nowrap;">
                      {new Date(h.createdAt).toLocaleTimeString('th-TH')}
                    </td>
                    <td style="font-weight:700;">{h.donor}</td>
                    <td style="font-family:var(--font-mono); font-weight:700;">
                      {h.amount.toLocaleString()} THB
                    </td>
                    <td>
                      <span class="chip">{h.type === 'truemoney' ? 'TRUEMONEY' : 'BANK/PP'}</span>
                    </td>
                    <td style="font-family:var(--font-mono); font-size:13px;">
                      {h.transRef || '-'}
                    </td>
                    <td>{h.message || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          let totalAmt = ${Number(totalAmount) || 0};
          let totalCnt = ${Number(items.length) || 0};
          let lastSeen = ${Number(items[0]?.createdAt) || 'Date.now()'};
          const seenIds = new Set(${JSON.stringify(items.map((i) => i.id)).replace(/</g, '\\u003c')});
          const tbody = document.getElementById('txBody');
          const amtEl = document.getElementById('totalAmount');
          const cntEl = document.getElementById('totalCount');
          const testBtn = document.getElementById('testDonateBtn');
          const testStatus = document.getElementById('testStatus');

          function addRow(h) {
            if (!h || h.type === 'test' || seenIds.has(h.id)) return;
            seenIds.add(h.id);
            if (h.createdAt > lastSeen) lastSeen = h.createdAt;

            const empty = document.getElementById('emptyRow');
            if (empty) empty.remove();

            totalAmt += Number(h.amount || 0);
            totalCnt += 1;
            amtEl.textContent = totalAmt.toLocaleString() + ' THB';
            cntEl.textContent = String(totalCnt);

            const tr = document.createElement('tr');
            const label = h.type === 'truemoney' ? 'TRUEMONEY' : 'BANK/PP';
            const cells = [
              [new Date(h.createdAt).toLocaleTimeString('th-TH'), 'font-family:var(--font-mono);font-size:14px;white-space:nowrap;', false],
              [h.donor, 'font-weight:700;', false],
              [Number(h.amount).toLocaleString() + ' THB', 'font-family:var(--font-mono);font-weight:700;', false],
              [label, '', true],
              [h.transRef || '-', 'font-family:var(--font-mono);font-size:13px;', false],
              [h.message || '-', '', false]
            ];
            for (const [text, style, isChip] of cells) {
              const td = document.createElement('td');
              td.style.cssText = style;
              if (isChip) {
                const span = document.createElement('span');
                span.className = 'chip';
                span.textContent = text;
                td.appendChild(span);
              } else {
                td.textContent = text;
              }
              tr.appendChild(td);
            }
            tbody.prepend(tr);
          }

          testBtn.addEventListener('click', async () => {
            testBtn.disabled = true;
            testBtn.textContent = 'SENDING...';
            testStatus.className = 'status';
            try {
              const res = await fetch('/api/donate/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ donor: 'TEST DONOR', amount: 99, message: 'ทดสอบระบบแจ้งเตือนโดเนท!' })
              });
              const data = await res.json();
              if (!res.ok || !data.ok) throw new Error(data.error || 'TEST FAILED');
              testStatus.className = 'status ok';
              testStatus.textContent = 'OK // TEST ALERT SENT TO OVERLAY';
            } catch (err) {
              testStatus.className = 'status err';
              testStatus.textContent = 'ERROR // ' + err.message;
            } finally {
              testBtn.disabled = false;
              testBtn.textContent = 'TEST DONATE ALERT';
            }
          });

          function updateOverlayStatus(data) {
            const online = typeof data === 'boolean' ? data : Boolean(data?.online);
            const count = typeof data === 'object' && typeof data?.count === 'number'
              ? data.count
              : (online ? 1 : 0);

            const statText = document.getElementById('overlayStatusText');
            const navBadge = document.getElementById('overlayNavBadge');
            const navText = document.getElementById('overlayNavText');
            const detailText = document.getElementById('overlayDetailText');

            if (statText) {
              statText.textContent = online ? 'ONLINE' : 'OFFLINE';
              statText.className = online ? 'status-online' : 'status-offline';
            }
            if (detailText) {
              detailText.textContent = online
                ? (count + ' CLIENT' + (count > 1 ? 'S' : '') + ' CONNECTED')
                : 'NO OVERLAY CONNECTED';
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

            const ttsStatusEl = document.getElementById('dashTtsStatus');
            const ttsVoiceEl = document.getElementById('dashTtsVoice');
            const toggleBtn = document.getElementById('dashToggleTtsBtn');
            const vSel = document.getElementById('dashVoiceSelect');
            const rSel = document.getElementById('dashRateSelect');
            const pSel = document.getElementById('dashPitchSelect');

            if (typeof data === 'object') {
              if (typeof data.ttsEnabled === 'boolean') {
                const on = data.ttsEnabled;
                if (ttsStatusEl) {
                  ttsStatusEl.textContent = on ? 'ONLINE' : 'MUTED';
                  ttsStatusEl.className = on ? 'status-online' : 'status-offline';
                }
                if (toggleBtn) {
                  toggleBtn.textContent = 'TOGGLE TTS: ' + (on ? 'MUTE' : 'UNMUTE');
                }
              }
              if (data.ttsVoice && ttsVoiceEl) ttsVoiceEl.textContent = data.ttsVoice;
              if (vSel && data.ttsVoice && document.activeElement !== vSel) vSel.value = data.ttsVoice;
              if (rSel && data.ttsRate && document.activeElement !== rSel) rSel.value = data.ttsRate;
              if (pSel && data.ttsPitch && document.activeElement !== pSel) pSel.value = data.ttsPitch;
            }
          }

          // Toggle TTS button
          document.getElementById('dashToggleTtsBtn')?.addEventListener('click', async () => {
            const btn = document.getElementById('dashToggleTtsBtn');
            if (btn) btn.disabled = true;
            try {
              const res = await fetch('/api/manage/tts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
              });
              const d = await res.json().catch(() => ({}));
              if (d.overlayStatus) updateOverlayStatus(d.overlayStatus);
            } catch (err) {
              console.error(err);
            } finally {
              if (btn) btn.disabled = false;
            }
          });

          // Save TTS Settings
          document.getElementById('dashTtsForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const voice = document.getElementById('dashVoiceSelect')?.value;
            const rate = document.getElementById('dashRateSelect')?.value;
            const pitch = document.getElementById('dashPitchSelect')?.value;
            const msgEl = document.getElementById('dashTtsMsg');
            const saveBtn = document.getElementById('dashSaveTtsBtn');
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
                msgEl.textContent = 'SAVED';
                setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3000);
              }
              if (d.overlayStatus) updateOverlayStatus(d.overlayStatus);
            } catch (err) {
              if (msgEl) msgEl.textContent = 'ERR: ' + err.message;
            } finally {
              if (saveBtn) saveBtn.disabled = false;
            }
          });

          // Test Audio locally
          let dashAudio = null;
          document.getElementById('dashPreviewTtsBtn')?.addEventListener('click', async () => {
            const voice = document.getElementById('dashVoiceSelect')?.value;
            const rate = document.getElementById('dashRateSelect')?.value;
            const pitch = document.getElementById('dashPitchSelect')?.value;
            const previewBtn = document.getElementById('dashPreviewTtsBtn');
            const msgEl = document.getElementById('dashTtsMsg');

            if (dashAudio) {
              dashAudio.pause();
              dashAudio = null;
            }

            if (previewBtn) {
              previewBtn.disabled = true;
              previewBtn.textContent = 'LOADING...';
            }
            try {
              const sampleText = 'ทดสอบระบบเสียง Edge TTS โดเนทสำเร็จครับ';
              const url = '/api/tts?text=' + encodeURIComponent(sampleText) +
                '&voice=' + encodeURIComponent(voice || '') +
                '&rate=' + encodeURIComponent(rate || '') +
                '&pitch=' + encodeURIComponent(pitch || '');
              
              dashAudio = new Audio(url);
              dashAudio.onended = () => {
                if (previewBtn) {
                  previewBtn.disabled = false;
                  previewBtn.textContent = 'TEST AUDIO LOCALLY';
                }
              };
              dashAudio.onerror = () => {
                if (msgEl) msgEl.textContent = 'PREVIEW FAILED';
                if (previewBtn) {
                  previewBtn.disabled = false;
                  previewBtn.textContent = 'TEST AUDIO LOCALLY';
                }
              };
              await dashAudio.play();
              if (previewBtn) previewBtn.textContent = 'PLAYING...';
            } catch (err) {
              if (msgEl) msgEl.textContent = 'ERR: ' + err.message;
              if (previewBtn) {
                previewBtn.disabled = false;
                previewBtn.textContent = 'TEST AUDIO LOCALLY';
              }
            }
          });

          // Filter Settings
          let filterEnabled = ${overlayStatus?.filterEnabled !== false ? 'true' : 'false'};

          async function loadFilterSettings() {
            try {
              const res = await fetch('/api/manage/filter');
              const d = await res.json().catch(() => ({}));
              if (d.ok) {
                filterEnabled = Boolean(d.enabled);
                const toggleBtn = document.getElementById('dashToggleFilterBtn');
                if (toggleBtn) {
                  toggleBtn.textContent = 'FILTER: ' + (filterEnabled ? 'ENABLED' : 'DISABLED');
                }
                const actEl = document.getElementById('dashFilterAction');
                if (actEl && d.action) actEl.value = d.action;
                const wordsEl = document.getElementById('dashFilterWords');
                if (wordsEl && typeof d.words === 'string') wordsEl.value = d.words;
              }
            } catch {}
          }
          loadFilterSettings();

          document.getElementById('dashToggleFilterBtn')?.addEventListener('click', async () => {
            const btn = document.getElementById('dashToggleFilterBtn');
            const msgEl = document.getElementById('dashFilterMsg');
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
              if (msgEl) {
                msgEl.textContent = 'FILTER ' + (filterEnabled ? 'ENABLED' : 'DISABLED');
                setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3000);
              }
            } catch (err) {
              if (msgEl) msgEl.textContent = 'ERR: ' + err.message;
            } finally {
              if (btn) btn.disabled = false;
            }
          });

          document.getElementById('dashFilterForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const action = document.getElementById('dashFilterAction')?.value || 'censor';
            const words = document.getElementById('dashFilterWords')?.value || '';
            const msgEl = document.getElementById('dashFilterMsg');
            const saveBtn = document.getElementById('dashSaveFilterBtn');
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
                msgEl.textContent = 'SAVED';
                setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3000);
              }
            } catch (err) {
              if (msgEl) msgEl.textContent = 'ERR: ' + err.message;
            } finally {
              if (saveBtn) saveBtn.disabled = false;
            }
          });

          const es = new EventSource('/api/events?client=dashboard');
          es.addEventListener('donate', (e) => addRow(JSON.parse(e.data)));
          es.addEventListener('overlay_status', (e) => {
            try {
              updateOverlayStatus(JSON.parse(e.data));
            } catch {}
          });
          es.addEventListener('heartbeat', (e) => {
            try {
              updateOverlayStatus(JSON.parse(e.data));
            } catch {}
          });

          setInterval(async () => {
            try {
              const r = await fetch('/api/events/poll?since=' + lastSeen);
              const d = await r.json();
              if (d.items) d.items.forEach(addRow);
              if (d.overlayStatus) {
                updateOverlayStatus(d.overlayStatus);
              } else if (typeof d.overlayOnline === 'boolean') {
                updateOverlayStatus(d.overlayOnline);
              }
            } catch {}
          }, 2500);
        `
        }}
      />
    </div>
  )
}
