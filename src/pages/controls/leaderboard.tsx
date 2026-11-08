import type { OverlayStatus } from '../../modules/events'
import { ControlLayout } from './layout'

export function LeaderboardControlPage({ overlayStatus }: { overlayStatus?: OverlayStatus }) {
  return (
    <ControlLayout
      activeTab="leaderboard"
      title="LEADERBOARD SETTINGS"
      subtitle="TOP DONORS RANKING OVERLAY CONFIGURATION & LIVE CUSTOMIZER"
      overlayStatus={overlayStatus}
      openOverlayHref="/overlay/leaderboard?limit=5&title=TOP+DONORS"
      extraScript={`
        const lbUrlInput = document.getElementById('obsLbUrlInput');
        const copyLbBtn = document.getElementById('copyLbUrlBtn');
        const previewLbLink = document.getElementById('previewLbLink');
        const titleInput = document.getElementById('lbTitleInput');
        const limitInput = document.getElementById('lbLimitInput');

        function buildLbPath() {
          const title = (titleInput?.value || 'TOP DONORS').trim() || 'TOP DONORS';
          const limit = Math.max(1, Math.min(50, Number(limitInput?.value) || 5));
          return '/overlay/leaderboard?limit=' + encodeURIComponent(String(limit)) + '&title=' + encodeURIComponent(title);
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

        function applyLbPreset(limit) {
          if (limitInput) limitInput.value = String(limit);
          updateLbUrl();
          const title = (titleInput?.value || 'TOP DONORS').trim() || 'TOP DONORS';
          sendCommand('leaderboard', { limit, title });
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
          sendCommand('leaderboard', { title, limit });
        });

        document.getElementById('cmdReloadBtn')?.addEventListener('click', () => sendCommand('reload'));
      `}
    >
      <div>
        <div class="inverted-block">
          <label style="color:var(--ctp-lavender); margin-bottom:8px;">
            TOP DONORS LEADERBOARD OBS BROWSER SOURCE (450 x 500)
          </label>
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
              COPY URL
            </button>
            <a
              id="previewLbLink"
              href="/overlay/leaderboard?limit=5&title=TOP+DONORS"
              target="_blank"
              style="white-space:nowrap; font-size:12px;"
            >
              OPEN PREVIEW
            </a>
          </div>
          <div style="font-size:13px; color:var(--ctp-subtext0);">
            Recommended OBS settings: Width <strong>450</strong>, Height <strong>500</strong>. Automatically refreshes when new donations arrive.
          </div>
        </div>

        <div class="card" style="margin-bottom:24px;">
          <h3 style="font-family:var(--font-head); font-size:20px; margin-bottom:8px; text-transform:uppercase;">
            LEADERBOARD DISPLAY OPTIONS
          </h3>
          <p class="subtitle" style="margin-top:-4px; margin-bottom:16px;">
            CUSTOMIZE HEADER TITLE AND NUMBER OF TOP DONORS SHOWN
          </p>

          <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
            <button type="button" id="lbPreset3Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              TOP 3 DONORS
            </button>
            <button type="button" id="lbPreset5Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              TOP 5 DONORS
            </button>
            <button type="button" id="lbPreset10Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              TOP 10 DONORS
            </button>
            <button type="button" id="lbPreset20Btn" style="width:auto; padding:10px 16px; font-size:13px;">
              TOP 20 DONORS
            </button>
            <button
              type="button"
              id="cmdReloadBtn"
              style="width:auto; padding:10px 16px; font-size:13px; background:var(--ctp-sapphire); border-color:var(--ctp-sapphire);"
            >
              FORCE RELOAD OVERLAY
            </button>
          </div>

          <form id="lbConfigForm">
            <div class="row">
              <div>
                <label>LEADERBOARD HEADER TITLE</label>
                <input type="text" id="lbTitleInput" value="TOP DONORS" placeholder="TOP DONORS" required />
              </div>
              <div>
                <label>MAX RANKS TO DISPLAY (1 - 50)</label>
                <input type="number" id="lbLimitInput" value="5" min="1" max="50" required />
              </div>
            </div>
            <button type="submit" style="width:auto; padding:12px 24px; font-size:14px;">
              APPLY TO LIVE OVERLAY &amp; UPDATE URL
            </button>
          </form>
        </div>
      </div>
    </ControlLayout>
  )
}
