import {
  CATPPUCCIN_ACCENTS,
  CATPPUCCIN_FLAVORS,
  type CatppuccinFlavor
} from '../modules/db'
import type { OverlayStatus } from '../modules/events'
import { t, type I18nKey, type Locale } from '../i18n'
import { AdminNav } from './LangSwitch'

const FLAVOR_LABELS: Record<CatppuccinFlavor, string> = {
  latte: 'LATTE (LIGHT)',
  frappe: 'FRAPPÉ (MEDIUM DARK)',
  macchiato: 'MACCHIATO (DARK)',
  mocha: 'MOCHA (DEEP DARK)'
}

export function ConfigPage({
  overlayStatus,
  lang = 'th'
}: {
  overlayStatus?: OverlayStatus
  lang?: Locale
}) {
  const T = (key: I18nKey, vars?: Record<string, string | number>) => t(lang, key, vars)
  const donateEnabled = overlayStatus?.donateEnabled ?? false
  const flavor = overlayStatus?.themeFlavor || 'macchiato'
  const accent = overlayStatus?.themeAccent || 'sapphire'

  return (
    <div class="container wide">
      <div class="card elevated">
        <AdminNav active="config" lang={lang} overlayStatus={overlayStatus} openOverlayHref="/overlay" />
        <div class="page-header-row">
          <h1>{T('cfg_title')}</h1>
          <button
            type="button"
            id="dashToggleDonateBtn"
            style={`width:auto; padding:8px 16px; font-size:13px; background:${donateEnabled ? 'var(--ctp-red)' : 'var(--ctp-green)'}; border-color:${donateEnabled ? 'var(--ctp-red)' : 'var(--ctp-green)'};`}
          >
            {donateEnabled ? T('dash_toggle_donate_close') : T('dash_toggle_donate_open')}
          </button>
        </div>
        <p class="subtitle">{T('cfg_subtitle')}</p>

        <div class="card" style="margin-bottom: 24px;">
          <label style="font-size:18px; color:var(--ctp-accent); margin-bottom:4px;">
            {T('cfg_theme_title')}
          </label>
          <p class="subtitle" style="margin:0 0 12px 0; font-size:11px; border:none; padding:0;">
            {T('cfg_theme_subtitle')}
          </p>
          <div class="row" style="margin-bottom:0;">
            <div>
              <label>{T('cfg_flavor_label')}</label>
              <select
                id="themeFlavorSelect"
                aria-label="Catppuccin Flavor"
                style="margin-bottom:0;"
              >
                {CATPPUCCIN_FLAVORS.map((f) => (
                  <option value={f} selected={f === flavor}>
                    {FLAVOR_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>{T('cfg_accent_label')}</label>
              <select
                id="themeAccentSelect"
                aria-label="Catppuccin Accent"
                style="margin-bottom:0;"
              >
                {CATPPUCCIN_ACCENTS.map((a) => (
                  <option value={a} selected={a === accent}>
                    {a.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
            <div>
              <label style="font-size:18px; color:var(--ctp-accent); margin-bottom:4px;">
                {T('dash_tts_options_summary')}
              </label>
              <p class="subtitle" style="margin:0; font-size:11px; border:none; padding:0;">
                {T('dash_tts_options_subtitle')}
              </p>
            </div>
            <button
              type="button"
              id="dashToggleTtsBtn"
              style="width:auto; padding:6px 14px; font-size:12px;"
            >
              {overlayStatus?.ttsEnabled !== false ? T('dash_toggle_tts_mute') : T('dash_toggle_tts_unmute')}
            </button>
          </div>

          <form id="dashTtsForm" style="margin-bottom:0;">
            <div class="row" style="margin-bottom:12px;">
              <div>
                <label>{T('dash_voice_label')}</label>
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
                <label>{T('dash_speed_label')}</label>
                <select id="dashRateSelect" style="margin-bottom:0;">
                  <option value="-20%" selected={overlayStatus?.ttsRate === '-20%'}>{T('dash_rate_m20')}</option>
                  <option value="-10%" selected={overlayStatus?.ttsRate === '-10%'}>{T('dash_rate_m10')}</option>
                  <option value="+0%" selected={overlayStatus?.ttsRate === '+0%' || !overlayStatus?.ttsRate}>{T('dash_rate_0')}</option>
                  <option value="+10%" selected={overlayStatus?.ttsRate === '+10%'}>{T('dash_rate_p10')}</option>
                  <option value="+20%" selected={overlayStatus?.ttsRate === '+20%'}>{T('dash_rate_p20')}</option>
                  <option value="+30%" selected={overlayStatus?.ttsRate === '+30%'}>{T('dash_rate_p30')}</option>
                </select>
              </div>
              <div>
                <label>{T('dash_pitch_label')}</label>
                <select id="dashPitchSelect" style="margin-bottom:0;">
                  <option value="-10Hz" selected={overlayStatus?.ttsPitch === '-10Hz'}>{T('dash_pitch_m10')}</option>
                  <option value="-5Hz" selected={overlayStatus?.ttsPitch === '-5Hz'}>{T('dash_pitch_m5')}</option>
                  <option value="+0Hz" selected={overlayStatus?.ttsPitch === '+0Hz' || !overlayStatus?.ttsPitch}>{T('dash_pitch_0')}</option>
                  <option value="+5Hz" selected={overlayStatus?.ttsPitch === '+5Hz'}>{T('dash_pitch_p5')}</option>
                  <option value="+10Hz" selected={overlayStatus?.ttsPitch === '+10Hz'}>{T('dash_pitch_p10')}</option>
                </select>
              </div>
            </div>
            <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
              <button type="submit" id="dashSaveTtsBtn" style="width:auto; padding:8px 16px; font-size:13px;">
                {T('dash_save_settings')}
              </button>
              <button
                type="button"
                id="dashPreviewTtsBtn"
                style="width:auto; padding:8px 16px; font-size:13px; background:var(--ctp-accent); border-color:var(--ctp-accent);"
              >
                {T('dash_test_audio')}
              </button>
              <span id="dashTtsMsg" style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-green);"></span>
            </div>
          </form>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
            <div>
              <label style="font-size:18px; color:var(--ctp-accent); margin-bottom:4px;">
                {T('dash_filter_summary')}
              </label>
              <p class="subtitle" style="margin:0; font-size:11px; border:none; padding:0;">
                {T('dash_filter_subtitle')}
              </p>
            </div>
            <button
              type="button"
              id="dashToggleFilterBtn"
              style="width:auto; padding:6px 14px; font-size:12px;"
            >
              {overlayStatus?.filterEnabled !== false ? T('dash_filter_enabled') : T('dash_filter_disabled')}
            </button>
          </div>

          <form id="dashFilterForm" style="margin-bottom:0;">
            <div class="row" style="margin-bottom:12px;">
              <div>
                <label>{T('dash_filter_action_label')}</label>
                <select id="dashFilterAction" style="margin-bottom:0;">
                  <option value="censor" selected={overlayStatus?.filterAction !== 'mute'}>
                    {T('dash_filter_action_censor')}
                  </option>
                  <option value="mute" selected={overlayStatus?.filterAction === 'mute'}>
                    {T('dash_filter_action_mute')}
                  </option>
                </select>
              </div>
              <div>
                <label>{T('dash_filter_words_label')}</label>
                <input
                  type="text"
                  id="dashFilterWords"
                  placeholder={T('placeholder_badwords')}
                  style="margin-bottom:0;"
                />
              </div>
            </div>
            <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
              <button type="submit" id="dashSaveFilterBtn" style="width:auto; padding:8px 16px; font-size:13px;">
                {T('dash_save_filter')}
              </button>
              <span id="dashFilterMsg" style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-green);"></span>
            </div>
          </form>
        </div>

        <div class="inverted-block" style="margin-bottom: 0;">
          <label style="margin-bottom: 10px;">{T('dash_overlay_settings_summary')}</label>
          <div style="display:flex; flex-wrap:wrap; gap:8px;">
            <a href="/overlay/control" class="nav-pill">{T('dash_tab_overview')}</a>
            <a href="/overlay/control/alert" class="nav-pill nav-external">{T('dash_tab_alert')}</a>
            <a href="/overlay/control/leaderboard" class="nav-pill nav-external">{T('dash_tab_leaderboard')}</a>
            <a href="/overlay/control/countdown" class="nav-pill nav-external">{T('dash_tab_countdown')}</a>
            <a href="/overlay/control/subathon" class="nav-pill nav-external">{T('dash_tab_subathon')}</a>
          </div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          function updateOverlayStatus(data) {
            const online = typeof data === 'boolean' ? data : Boolean(data?.online);
            const count = typeof data === 'object' && typeof data?.count === 'number'
              ? data.count
              : (online ? 1 : 0);

            const navBadge = document.getElementById('overlayNavBadge');
            const navText = document.getElementById('overlayNavText');
            if (navBadge && navText) {
              if (online) {
                navBadge.classList.add('is-online');
                navText.textContent = __t('overlay_online') + (count > 1 ? ' (' + count + ')' : '');
              } else {
                navBadge.classList.remove('is-online');
                navText.textContent = __t('overlay_offline');
              }
            }

            const toggleDonateBtn = document.getElementById('dashToggleDonateBtn');
            const toggleBtn = document.getElementById('dashToggleTtsBtn');
            const vSel = document.getElementById('dashVoiceSelect');
            const rSel = document.getElementById('dashRateSelect');
            const pSel = document.getElementById('dashPitchSelect');

            if (typeof data === 'object') {
              if (window.__applyTheme && (data.themeFlavor || data.themeAccent)) {
                window.__applyTheme(data.themeFlavor, data.themeAccent);
              }
              if (typeof data.donateEnabled === 'boolean') {
                const dOn = data.donateEnabled;
                if (toggleDonateBtn) {
                  toggleDonateBtn.textContent = dOn ? __t('dash_toggle_donate_close') : __t('dash_toggle_donate_open');
                  toggleDonateBtn.style.background = dOn ? 'var(--ctp-red)' : 'var(--ctp-green)';
                  toggleDonateBtn.style.borderColor = dOn ? 'var(--ctp-red)' : 'var(--ctp-green)';
                }
              }
              if (typeof data.ttsEnabled === 'boolean') {
                const on = data.ttsEnabled;
                if (toggleBtn) {
                  toggleBtn.textContent = on ? __t('dash_toggle_tts_mute') : __t('dash_toggle_tts_unmute');
                }
              }
              if (vSel && data.ttsVoice && document.activeElement !== vSel) vSel.value = data.ttsVoice;
              if (rSel && data.ttsRate && document.activeElement !== rSel) rSel.value = data.ttsRate;
              if (pSel && data.ttsPitch && document.activeElement !== pSel) pSel.value = data.ttsPitch;
            }
          }

          document.getElementById('dashToggleDonateBtn')?.addEventListener('click', async () => {
            const btn = document.getElementById('dashToggleDonateBtn');
            if (btn) btn.disabled = true;
            try {
              const res = await fetch('/api/manage/donate', {
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

          document.getElementById('dashTtsForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const voice = document.getElementById('dashVoiceSelect')?.value;
            const rate = document.getElementById('dashRateSelect')?.value;
            const pitch = document.getElementById('dashPitchSelect')?.value;
            const msgEl = document.getElementById('dashTtsMsg');
            const saveBtn = document.getElementById('dashSaveTtsBtn');
            if (saveBtn) saveBtn.disabled = true;
            if (msgEl) msgEl.textContent = __t('dash_saving');

            try {
              const res = await fetch('/api/manage/tts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voice, rate, pitch })
              });
              const d = await res.json().catch(() => ({}));
              if (!res.ok || !d.ok) throw new Error(d.error || ('HTTP ' + res.status));
              if (msgEl) {
                msgEl.textContent = __t('dash_saved');
                setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3000);
              }
              if (d.overlayStatus) updateOverlayStatus(d.overlayStatus);
            } catch (err) {
              if (msgEl) msgEl.textContent = 'ERR: ' + err.message;
            } finally {
              if (saveBtn) saveBtn.disabled = false;
            }
          });

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
              previewBtn.textContent = __t('dash_loading');
            }
            try {
              const sampleText = __t('tts_sample');
              const url = '/api/tts?text=' + encodeURIComponent(sampleText) +
                '&voice=' + encodeURIComponent(voice || '') +
                '&rate=' + encodeURIComponent(rate || '') +
                '&pitch=' + encodeURIComponent(pitch || '');

              dashAudio = new Audio(url);
              dashAudio.onended = () => {
                if (previewBtn) {
                  previewBtn.disabled = false;
                  previewBtn.textContent = __t('dash_test_audio');
                }
              };
              dashAudio.onerror = () => {
                if (msgEl) msgEl.textContent = __t('dash_preview_failed');
                if (previewBtn) {
                  previewBtn.disabled = false;
                  previewBtn.textContent = __t('dash_test_audio');
                }
              };
              await dashAudio.play();
              if (previewBtn) previewBtn.textContent = __t('dash_playing');
            } catch (err) {
              if (msgEl) msgEl.textContent = 'ERR: ' + err.message;
              if (previewBtn) {
                previewBtn.disabled = false;
                previewBtn.textContent = __t('dash_test_audio');
              }
            }
          });

          let filterEnabled = ${overlayStatus?.filterEnabled !== false ? 'true' : 'false'};

          async function loadFilterSettings() {
            try {
              const res = await fetch('/api/manage/filter');
              const d = await res.json().catch(() => ({}));
              if (d.ok) {
                filterEnabled = Boolean(d.enabled);
                const toggleBtn = document.getElementById('dashToggleFilterBtn');
                if (toggleBtn) {
                  toggleBtn.textContent = filterEnabled ? __t('dash_filter_enabled') : __t('dash_filter_disabled');
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
              if (btn) btn.textContent = filterEnabled ? __t('dash_filter_enabled') : __t('dash_filter_disabled');
              if (msgEl) {
                msgEl.textContent = filterEnabled ? __t('dash_filter_enabled') : __t('dash_filter_disabled');
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
            if (msgEl) msgEl.textContent = __t('dash_saving');
            try {
              const res = await fetch('/api/manage/filter', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, words, enabled: filterEnabled })
              });
              const d = await res.json().catch(() => ({}));
              if (!res.ok || !d.ok) throw new Error(d.error || ('HTTP ' + res.status));
              if (msgEl) {
                msgEl.textContent = __t('dash_saved');
                setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3000);
              }
            } catch (err) {
              if (msgEl) msgEl.textContent = 'ERR: ' + err.message;
            } finally {
              if (saveBtn) saveBtn.disabled = false;
            }
          });

          const es = new EventSource('/api/events?client=config');
          window.__es = es;
          window.addEventListener('pagehide', () => es.close());
          window.addEventListener('beforeunload', () => es.close());
          es.addEventListener('overlay_status', (e) => {
            try { updateOverlayStatus(JSON.parse(e.data)); } catch {}
          });
          es.addEventListener('heartbeat', (e) => {
            try { updateOverlayStatus(JSON.parse(e.data)); } catch {}
          });
        `
        }}
      />
    </div>
  )
}
