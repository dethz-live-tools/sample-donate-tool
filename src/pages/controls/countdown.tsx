import type { OverlayStatus } from '../../modules/events'
import { ControlLayout } from './layout'
import { t, type I18nKey, type Locale } from '../../i18n'

export function CountdownControlPage({ overlayStatus, lang = 'th' }: { overlayStatus?: OverlayStatus; lang?: Locale }) {
  const T = (key: I18nKey, vars?: Record<string, string | number>) => t(lang, key, vars)
  return (
    <ControlLayout
      lang={lang}
      activeTab="countdown"
      title={T('ctrl_countdown_title')}
      subtitle={T('ctrl_countdown_subtitle')}
      overlayStatus={overlayStatus}
      openOverlayHref="/overlay/countdown?minutes=10&title=STARTING+SOON"
      extraScript={`
        const cdUrlInput = document.getElementById('obsCdUrlInput');
        const copyCdBtn = document.getElementById('copyCdUrlBtn');
        const previewCdLink = document.getElementById('previewCdLink');
        const titleInput = document.getElementById('cdCustomTitle');
        const minsInput = document.getElementById('cdCustomMinutes');
        const secsInput = document.getElementById('cdCustomSeconds');
        const endInput = document.getElementById('cdCustomEnd');
        const cdTransparentToggle = document.getElementById('cdTransparentToggle');

        function buildCdPath() {
          const title = (titleInput?.value || 'STARTING SOON').trim() || 'STARTING SOON';
          const mins = Math.max(0, Number(minsInput?.value) || 0);
          const secs = Math.max(0, Number(secsInput?.value) || 0);
          const endMsg = (endInput?.value || 'TIME UP').trim() || 'TIME UP';
          const transparent = Boolean(cdTransparentToggle?.checked);
          let path = '/overlay/countdown?minutes=' + encodeURIComponent(String(mins)) + '&title=' + encodeURIComponent(title);
          if (secs > 0) path += '&seconds=' + encodeURIComponent(String(secs));
          if (endMsg !== 'TIME UP') path += '&end=' + encodeURIComponent(endMsg);
          if (transparent) path += '&transparent=1';
          return path;
        }

        function updateCdUrl() {
          const path = buildCdPath();
          if (cdUrlInput) cdUrlInput.value = window.location.origin + path;
          if (previewCdLink) previewCdLink.href = path;
        }

        bindCopy(cdUrlInput, copyCdBtn, '/overlay/countdown?minutes=10&title=STARTING+SOON');
        updateCdUrl();

        titleInput?.addEventListener('input', updateCdUrl);
        minsInput?.addEventListener('input', updateCdUrl);
        secsInput?.addEventListener('input', updateCdUrl);
        endInput?.addEventListener('input', updateCdUrl);
        cdTransparentToggle?.addEventListener('change', () => {
          updateCdUrl();
          sendCommand('countdown', { cmd: 'bg', mode: 'countdown', transparent: Boolean(cdTransparentToggle.checked) });
        });

        function startPreset(minutes) {
          if (minsInput) minsInput.value = String(minutes);
          if (secsInput) secsInput.value = '0';
          updateCdUrl();
          const title = (titleInput?.value || 'STARTING SOON').trim() || 'STARTING SOON';
          const endMsg = (endInput?.value || 'TIME UP').trim() || 'TIME UP';
          sendCommand('countdown', { cmd: 'set', mode: 'countdown', minutes, seconds: 0, title, endMsg, transparent: Boolean(cdTransparentToggle?.checked) });
        }

        document.getElementById('cdQuick5Btn')?.addEventListener('click', () => startPreset(5));
        document.getElementById('cdQuick10Btn')?.addEventListener('click', () => startPreset(10));
        document.getElementById('cdQuick30Btn')?.addEventListener('click', () => startPreset(30));
        document.getElementById('cdQuick1hBtn')?.addEventListener('click', () => startPreset(60));
        document.getElementById('cdPauseBtn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'pause', mode: 'countdown' }));
        document.getElementById('cdResumeBtn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'start', mode: 'countdown' }));
        document.getElementById('cdResetBtn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'reset', mode: 'countdown' }));
        document.getElementById('cdPlus1Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'adjust', mode: 'countdown', delta: 60 }));
        document.getElementById('cdPlus5Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'adjust', mode: 'countdown', delta: 300 }));
        document.getElementById('cdPlus10Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'adjust', mode: 'countdown', delta: 600 }));
        document.getElementById('cdMinus1Btn')?.addEventListener('click', () => sendCommand('countdown', { cmd: 'adjust', mode: 'countdown', delta: -60 }));
        document.getElementById('cmdReloadBtn')?.addEventListener('click', () => sendCommand('reload'));

        document.getElementById('cdCustomForm')?.addEventListener('submit', (e) => {
          e.preventDefault();
          updateCdUrl();
          const minutes = Math.max(0, Number(minsInput?.value) || 0);
          const seconds = Math.max(0, Number(secsInput?.value) || 0);
          const title = (titleInput?.value || 'STARTING SOON').trim() || 'STARTING SOON';
          const endMsg = (endInput?.value || 'TIME UP').trim() || 'TIME UP';
          sendCommand('countdown', { cmd: 'set', mode: 'countdown', minutes, seconds, title, endMsg, transparent: Boolean(cdTransparentToggle?.checked) });
        });
      `}
    >
      <div>
        <details class="inverted-block fold-block" open>
          <summary>{T('ctrl_ov_cd_title')}</summary>
          <div style="display:flex; gap:12px; align-items:center; margin-bottom:8px;">
            <input
              type="text"
              id="obsCdUrlInput"
              readOnly
              value=""
              style="margin-bottom:0; background:var(--ctp-mantle);"
            />
            <button
              type="button"
              id="copyCdUrlBtn"
              style="width:auto; padding:10px 16px; font-size:13px; white-space:nowrap;"
            >
              {T('ctrl_copy_url')}
            </button>
            <a
              id="previewCdLink"
              href="/overlay/countdown?minutes=10&title=STARTING+SOON"
              target="_blank"
              style="white-space:nowrap; font-size:12px;"
            >
              {T('ctrl_open_preview')}
            </a>
          </div>
          <label style="display:inline-flex; align-items:center; gap:8px; margin-bottom:8px; cursor:pointer; color:var(--ctp-text);">
            <input type="checkbox" id="cdTransparentToggle" style="width:auto; margin:0;" />
            <span>{T('ctrl_transparent_bg')}</span>
          </label>
          <div style="font-size:13px; color:var(--ctp-subtext0);">
            {T('ctrl_ov_cd_desc')}
          </div>
        </details>

        <details class="card fold-block" style="margin-bottom:24px;" open>
          <summary>{T('ctrl_cd_controls')}</summary>
          <p class="subtitle" style="margin-top:0; margin-bottom:16px;">
            {T('ctrl_cd_controls_sub')}
          </p>
          <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:20px;">
            <button type="button" id="cdQuick5Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              5m
            </button>
            <button type="button" id="cdQuick10Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              10m
            </button>
            <button type="button" id="cdQuick30Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              30m
            </button>
            <button type="button" id="cdQuick1hBtn" style="width:auto; padding:10px 16px; font-size:13px;">
              1h
            </button>
            <button
              type="button"
              id="cdPauseBtn"
              style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-yellow); border-color:var(--ctp-yellow); color:var(--ctp-crust);"
            >
              {T('ctrl_pause')}
            </button>
            <button
              type="button"
              id="cdResumeBtn"
              style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-green); border-color:var(--ctp-green); color:var(--ctp-crust);"
            >
              {T('ctrl_resume')}
            </button>
            <button
              type="button"
              id="cdResetBtn"
              style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-peach); border-color:var(--ctp-peach); color:var(--ctp-crust);"
            >
              {T('ctrl_reset')}
            </button>
            <button type="button" id="cdPlus1Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              +1m
            </button>
            <button type="button" id="cdPlus5Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              +5m
            </button>
            <button type="button" id="cdPlus10Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              +10m
            </button>
            <button type="button" id="cdMinus1Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              -1m
            </button>
            <button
              type="button"
              id="cmdReloadBtn"
              style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-sapphire); border-color:var(--ctp-sapphire);"
            >
              {T('ctrl_force_reload')}
            </button>
          </div>

          <form id="cdCustomForm">
            <div class="row">
              <div>
                <label>{T('ctrl_cd_header_label')}</label>
                <input type="text" id="cdCustomTitle" value="STARTING SOON" required />
              </div>
              <div>
                <label>{T('ctrl_cd_end_label')}</label>
                <input type="text" id="cdCustomEnd" value="TIME UP" required />
              </div>
            </div>
            <div class="row">
              <div>
                <label>{T('ctrl_cd_mins_label')}</label>
                <input type="number" id="cdCustomMinutes" value="10" min="0" max="1440" required />
              </div>
              <div>
                <label>{T('ctrl_cd_secs_label')}</label>
                <input type="number" id="cdCustomSeconds" value="0" min="0" max="59" required />
              </div>
            </div>
            <button type="submit" style="width:auto; padding:12px 24px; font-size:14px;">
              {T('ctrl_cd_apply_btn')}
            </button>
          </form>
        </details>
      </div>
    </ControlLayout>
  )
}
