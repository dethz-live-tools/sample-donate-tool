import type { OverlayStatus } from '../../modules/events'
import { ControlLayout } from './layout'
import { t, type I18nKey, type Locale } from '../../i18n'

export function AlertControlPage({ overlayStatus, lang = 'th' }: { overlayStatus?: OverlayStatus; lang?: Locale }) {
  const T = (key: I18nKey, vars?: Record<string, string | number>) => t(lang, key, vars)
  const ttsEnabled = overlayStatus?.ttsEnabled ?? true

  return (
    <ControlLayout
      lang={lang}
      activeTab="alert"
      title={T('ctrl_alert_title')}
      subtitle={T('ctrl_alert_subtitle')}
      overlayStatus={overlayStatus}
      openOverlayHref="/overlay"
      extraScript={`
        const alertUrlInput = document.getElementById('obsUrlInput');
        const copyAlertBtn = document.getElementById('copyUrlBtn');
        const previewAlertLink = document.getElementById('previewAlertLink');
        const alertTransparentToggle = document.getElementById('alertTransparentToggle');

        function updateAlertUrl() {
          const isTransparent = Boolean(alertTransparentToggle?.checked);
          const path = isTransparent ? '/overlay?transparent=1' : '/overlay';
          if (alertUrlInput) alertUrlInput.value = window.location.origin + path;
          if (previewAlertLink) previewAlertLink.href = path;
        }

        bindCopy(alertUrlInput, copyAlertBtn, '/overlay');
        updateAlertUrl();

        alertTransparentToggle?.addEventListener('change', () => {
          updateAlertUrl();
          sendCommand('alert', { transparent: Boolean(alertTransparentToggle.checked) });
        });

        document.getElementById('cmdReloadBtn')?.addEventListener('click', () => sendCommand('reload'));
        document.getElementById('cmdClearBtn')?.addEventListener('click', () => sendCommand('clear'));
        document.getElementById('cmdTtsBtn')?.addEventListener('click', () => sendCommand('tts'));

        document.getElementById('testAlertForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('submitTestBtn');
          const donor = document.getElementById('testDonor')?.value;
          const amount = Number(document.getElementById('testAmount')?.value || 99);
          const message = document.getElementById('testMsg')?.value;

          btn.disabled = true;
          btn.textContent = __t('dash_sending');
          showStatus(__t('dash_sending'));

          try {
            const res = await fetch('/api/donate/test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ donor, amount, message })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'TEST_ALERT_FAILED');
            showStatus(__t('dash_test_sent'));
            log('Test donation dispatched: ' + donor + ' (' + amount + ' THB)', 'success');
          } catch (err) {
            showStatus('Error: ' + err.message, true);
            log('Test donation failed: ' + err.message, 'err');
          } finally {
            btn.disabled = false;
            btn.textContent = __t('ctrl_dispatch_test_btn');
          }
        });
      `}
    >
      <div>
        <details class="inverted-block fold-block" open>
          <summary>{T('ctrl_ov_alert_title')}</summary>
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
              {T('ctrl_copy_url')}
            </button>
            <a id="previewAlertLink" href="/overlay" target="_blank" style="white-space:nowrap; font-size:12px;">
              {T('ctrl_open_preview')}
            </a>
          </div>
          <label style="display:inline-flex; align-items:center; gap:8px; margin-bottom:8px; cursor:pointer; color:var(--ctp-text);">
            <input type="checkbox" id="alertTransparentToggle" style="width:auto; margin:0;" />
            <span>{T('ctrl_transparent_bg')}</span>
          </label>
          <div style="font-size:13px; color:var(--ctp-subtext0);">
            {T('ctrl_obs_audio_hint')}
          </div>
        </details>

        <details class="card fold-block" style="margin-bottom:24px;" open>
          <summary>{T('ctrl_alert_quick_actions')}</summary>
          <div class="grid-actions" style="margin-bottom:12px;">
            <button type="button" id="cmdClearBtn" style="font-size:14px; padding:14px 20px;">
              {T('ctrl_clear_queue')}
            </button>
            <button type="button" id="cmdReloadBtn" style="font-size:14px; padding:14px 20px;">
              {T('ctrl_force_reload')}
            </button>
            <button type="button" id="cmdTtsBtn" style="font-size:14px; padding:14px 20px;">
              {ttsEnabled ? T('ctrl_tts_on_btn') : T('ctrl_tts_off_btn')}
            </button>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding-top:12px; border-top:2px solid var(--ctp-surface1);">
            <span style="font-size:13px; color:var(--ctp-subtext0);">{T('ctrl_alert_config_hint')}</span>
            <a href="/dashboard/config" class="nav-pill nav-external">
              {T('ctrl_open_system_config')} &rarr;
            </a>
          </div>
        </details>

        <details class="card fold-block" style="margin-bottom:24px;" open>
          <summary>{T('ctrl_test_alert_section')}</summary>
          <form id="testAlertForm">
            <div class="row">
              <div>
                <label>{T('ctrl_test_donor_label')}</label>
                <input type="text" id="testDonor" value="TEST DONOR" required />
              </div>
              <div>
                <label>{T('ctrl_test_amount_label')}</label>
                <input type="number" id="testAmount" value="99" min="10" max="1000000" required />
              </div>
            </div>
            <label>{T('ctrl_test_msg_label')}</label>
            <input type="text" id="testMsg" value={T('test_message')} required />
            <button type="submit" id="submitTestBtn" style="font-size:15px; padding:12px 24px;">
              {T('ctrl_dispatch_test_btn')}
            </button>
          </form>
        </details>
      </div>
    </ControlLayout>
  )
}
