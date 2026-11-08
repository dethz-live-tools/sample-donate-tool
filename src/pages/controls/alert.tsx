import type { OverlayStatus } from '../../modules/events'
import { ControlLayout } from './layout'

export function AlertControlPage({ overlayStatus }: { overlayStatus?: OverlayStatus }) {
  const ttsEnabled = overlayStatus?.ttsEnabled ?? true
  const ttsVoice = overlayStatus?.ttsVoice || 'th-TH-NiwatNeural'
  const ttsRate = overlayStatus?.ttsRate || '+0%'
  const ttsPitch = overlayStatus?.ttsPitch || '+0Hz'
  const filterEnabled = overlayStatus?.filterEnabled ?? true
  const filterAction = overlayStatus?.filterAction || 'censor'

  return (
    <ControlLayout
      activeTab="alert"
      title="ALERT & TTS SETTINGS"
      subtitle="DONATION ALERT OVERLAY, EDGE NEURAL TTS, AND WORD FILTERING"
      overlayStatus={overlayStatus}
      openOverlayHref="/overlay"
      extraScript={`
        bindCopy(document.getElementById('obsUrlInput'), document.getElementById('copyUrlBtn'), '/overlay');

        document.getElementById('cmdReloadBtn')?.addEventListener('click', () => sendCommand('reload'));
        document.getElementById('cmdClearBtn')?.addEventListener('click', () => sendCommand('clear'));
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
        window.onFilterStateSync = (next) => { filterEnabled = next; };

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
      `}
    >
      <div>
        <div class="inverted-block">
          <label style="color:var(--ctp-lavender); margin-bottom:8px;">
            DONATION ALERT OBS BROWSER SOURCE (800 x 400)
          </label>
          <div style="display:flex; gap:12px; align-items:center; margin-bottom:8px;">
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
              COPY URL
            </button>
            <a href="/overlay" target="_blank" style="white-space:nowrap; font-size:12px;">
              OPEN PREVIEW
            </a>
          </div>
          <div style="font-size:13px; color:var(--ctp-subtext0);">
            Recommended OBS settings: Width <strong>800</strong>, Height <strong>400</strong>, check <strong>Control audio via OBS</strong>.
          </div>
        </div>

        <div class="grid-actions" style="margin-bottom:24px;">
          <button type="button" id="cmdClearBtn" style="font-size:14px; padding:14px 20px;">
            CLEAR ALERT QUEUE
          </button>
          <button type="button" id="cmdReloadBtn" style="font-size:14px; padding:14px 20px;">
            FORCE RELOAD OVERLAY
          </button>
          <button type="button" id="cmdTtsBtn" style="font-size:14px; padding:14px 20px;">
            TTS VOICE: {ttsEnabled ? 'ON (CLICK TO MUTE)' : 'OFF (CLICK TO ENABLE)'}
          </button>
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
                  <option value="th-TH-NiwatNeural" selected={ttsVoice === 'th-TH-NiwatNeural' || !ttsVoice}>
                    Thai - Niwat (Male)
                  </option>
                  <option value="th-TH-PremwadeeNeural" selected={ttsVoice === 'th-TH-PremwadeeNeural'}>
                    Thai - Premwadee (Female)
                  </option>
                  <option value="en-US-AriaNeural" selected={ttsVoice === 'en-US-AriaNeural'}>
                    English (US) - Aria (Female)
                  </option>
                  <option value="en-US-GuyNeural" selected={ttsVoice === 'en-US-GuyNeural'}>
                    English (US) - Guy (Male)
                  </option>
                  <option value="en-US-JennyNeural" selected={ttsVoice === 'en-US-JennyNeural'}>
                    English (US) - Jenny (Female)
                  </option>
                  <option value="ja-JP-NanamiNeural" selected={ttsVoice === 'ja-JP-NanamiNeural'}>
                    Japanese - Nanami (Female)
                  </option>
                  <option value="ja-JP-KeitaNeural" selected={ttsVoice === 'ja-JP-KeitaNeural'}>
                    Japanese - Keita (Male)
                  </option>
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
                    Censor Words (Replace with ***, TTS skips stars)
                  </option>
                  <option value="mute" selected={filterAction === 'mute'}>
                    Mute TTS (Censor text &amp; completely silence TTS audio)
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
            TRIGGER TEST DONATION ALERT
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
      </div>
    </ControlLayout>
  )
}
