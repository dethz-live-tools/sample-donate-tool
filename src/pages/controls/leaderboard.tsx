import type { OverlayStatus } from '../../modules/events'
import { ControlLayout } from './layout'
import { t, type I18nKey, type Locale } from '../../i18n'

export function LeaderboardControlPage({ overlayStatus, lang = 'th' }: { overlayStatus?: OverlayStatus; lang?: Locale }) {
  const T = (key: I18nKey, vars?: Record<string, string | number>) => t(lang, key, vars)
  return (
    <ControlLayout
      lang={lang}
      activeTab="leaderboard"
      title={T('ctrl_leaderboard_title')}
      subtitle={T('ctrl_leaderboard_subtitle')}
      overlayStatus={overlayStatus}
      openOverlayHref="/overlay/leaderboard?limit=5&title=TOP+DONORS"
      extraScript={`
        const lbUrlInput = document.getElementById('obsLbUrlInput');
        const copyLbBtn = document.getElementById('copyLbUrlBtn');
        const previewLbLink = document.getElementById('previewLbLink');
        const titleInput = document.getElementById('lbTitleInput');
        const limitInput = document.getElementById('lbLimitInput');
        const lbTransparentToggle = document.getElementById('lbTransparentToggle');

        function buildLbPath() {
          const title = (titleInput?.value || 'TOP DONORS').trim() || 'TOP DONORS';
          const limit = Math.max(1, Math.min(50, Number(limitInput?.value) || 5));
          const transparent = Boolean(lbTransparentToggle?.checked);
          let path = '/overlay/leaderboard?limit=' + encodeURIComponent(String(limit)) + '&title=' + encodeURIComponent(title);
          if (transparent) path += '&transparent=1';
          return path;
        }

        function updateLbUrl() {
          const path = buildLbPath();
          if (lbUrlInput) lbUrlInput.value = window.location.origin + path;
          if (previewLbLink) previewLbLink.href = path;
        }

        bindCopy(lbUrlInput, copyLbBtn, '/overlay/leaderboard?limit=5&title=TOP+DONORS');
        updateLbUrl();

        titleInput?.addEventListener('input', updateLbUrl);
        limitInput?.addEventListener('input', updateLbUrl);
        lbTransparentToggle?.addEventListener('change', () => {
          updateLbUrl();
          const title = (titleInput?.value || 'TOP DONORS').trim() || 'TOP DONORS';
          const limit = Math.max(1, Math.min(50, Number(limitInput?.value) || 5));
          sendCommand('leaderboard', { title, limit, transparent: Boolean(lbTransparentToggle.checked) });
        });

        function applyLbPreset(limit) {
          if (limitInput) limitInput.value = String(limit);
          updateLbUrl();
          const title = (titleInput?.value || 'TOP DONORS').trim() || 'TOP DONORS';
          sendCommand('leaderboard', { limit, title, transparent: Boolean(lbTransparentToggle?.checked) });
        }

        document.getElementById('lbPreset3Btn')?.addEventListener('click', () => applyLbPreset(3));
        document.getElementById('lbPreset5Btn')?.addEventListener('click', () => applyLbPreset(5));
        document.getElementById('lbPreset10Btn')?.addEventListener('click', () => applyLbPreset(10));
        document.getElementById('lbPreset20Btn')?.addEventListener('click', () => applyLbPreset(20));

        document.getElementById('lbConfigForm')?.addEventListener('submit', (e) => {
          e.preventDefault();
          updateLbUrl();
          const title = (titleInput?.value || 'TOP DONORS').trim() || 'TOP DONORS';
          const limit = Math.max(1, Math.min(50, Number(limitInput?.value) || 5));
          sendCommand('leaderboard', { title, limit, transparent: Boolean(lbTransparentToggle?.checked) });
        });

        document.getElementById('cmdReloadBtn')?.addEventListener('click', () => sendCommand('reload'));
      `}
    >
      <div>
        <details class="inverted-block fold-block" open>
          <summary>{T('ctrl_ov_lb_title')}</summary>
          <div style="display:flex; gap:12px; align-items:center; margin-bottom:8px;">
            <input
              type="text"
              id="obsLbUrlInput"
              readOnly
              value=""
              style="margin-bottom:0; background:var(--ctp-mantle);"
            />
            <button
              type="button"
              id="copyLbUrlBtn"
              style="width:auto; padding:10px 16px; font-size:13px; white-space:nowrap;"
            >
              {T('ctrl_copy_url')}
            </button>
            <a
              id="previewLbLink"
              href="/overlay/leaderboard?limit=5&title=TOP+DONORS"
              target="_blank"
              style="white-space:nowrap; font-size:12px;"
            >
              {T('ctrl_open_preview')}
            </a>
          </div>
          <label style="display:inline-flex; align-items:center; gap:8px; margin-bottom:8px; cursor:pointer; color:var(--ctp-text);">
            <input type="checkbox" id="lbTransparentToggle" style="width:auto; margin:0;" />
            <span>{T('ctrl_transparent_bg')}</span>
          </label>
          <div style="font-size:13px; color:var(--ctp-subtext0);">
            {T('ctrl_ov_lb_desc')}
          </div>
        </details>

        <details class="card fold-block" style="margin-bottom:24px;" open>
          <summary>{T('ctrl_lb_options')}</summary>
          <p class="subtitle" style="margin-top:0; margin-bottom:16px;">
            {T('ctrl_lb_options_sub')}
          </p>

          <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
            <button type="button" id="lbPreset3Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              Top 3
            </button>
            <button type="button" id="lbPreset5Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              Top 5
            </button>
            <button type="button" id="lbPreset10Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              Top 10
            </button>
            <button type="button" id="lbPreset20Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              Top 20
            </button>
            <button
              type="button"
              id="cmdReloadBtn"
              style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-sapphire); border-color:var(--ctp-sapphire);"
            >
              {T('ctrl_force_reload')}
            </button>
          </div>

          <form id="lbConfigForm">
            <div class="row">
              <div>
                <label>{T('ctrl_lb_header_label')}</label>
                <input type="text" id="lbTitleInput" value="TOP DONORS" placeholder="TOP DONORS" required />
              </div>
              <div>
                <label>{T('ctrl_lb_limit_label')}</label>
                <input type="number" id="lbLimitInput" value="5" min="1" max="50" required />
              </div>
            </div>
            <button type="submit" style="width:auto; padding:12px 24px; font-size:14px;">
              {T('ctrl_lb_apply_btn')}
            </button>
          </form>
        </details>
      </div>
    </ControlLayout>
  )
}
