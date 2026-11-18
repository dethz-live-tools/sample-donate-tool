import type { DonateEvent, OverlayStatus } from '../modules/events'
import { t, type I18nKey, type Locale } from '../i18n'
import { AdminNav } from './LangSwitch'

export function DashboardPage({
  items,
  overlayStatus,
  lang = 'th'
}: {
  items: DonateEvent[]
  overlayStatus?: OverlayStatus
  lang?: Locale
}) {
  const T = (key: I18nKey, vars?: Record<string, string | number>) => t(lang, key, vars)
  const totalAmount = items.reduce((sum, h) => sum + h.amount, 0)
  const overlayOnline = Boolean(overlayStatus?.online)
  const clientCount = overlayStatus?.count ?? (overlayOnline ? 1 : 0)
  const donateEnabled = overlayStatus?.donateEnabled ?? false

  return (
    <div class="container wide">
      <AdminNav active="dashboard" lang={lang} overlayStatus={overlayStatus} openOverlayHref="/overlay" />
        <div class="page-header-row">
          <h1>{T('dash_title')}</h1>
          <div class="nav-group">
            <button
              type="button"
              id="dashToggleDonateBtn"
              style={`width:auto; padding:8px 16px; font-size:13px; background:${donateEnabled ? 'var(--ctp-red)' : 'var(--ctp-green)'}; border-color:${donateEnabled ? 'var(--ctp-red)' : 'var(--ctp-green)'};`}
            >
              {donateEnabled ? T('dash_toggle_donate_close') : T('dash_toggle_donate_open')}
            </button>
            <button
              type="button"
              id="testDonateBtn"
              style="width:auto; padding:8px 16px; font-size:13px;"
            >
              {T('dash_test_donate_btn')}
            </button>
          </div>
        </div>
        <p class="subtitle">{T('dash_subtitle')}</p>

        <div id="testStatus" class="status" style="margin-bottom: 16px;"></div>

        <div class="card-grid" style="margin-bottom: 24px;">
          <div class="card" style="margin-bottom:0;">
            <label>{T('dash_total_volume')}</label>
            <div style="font-family:var(--font-head); font-size:32px;" id="totalAmount">
              {totalAmount.toLocaleString()} THB
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <label>{T('dash_count')}</label>
            <div style="font-family:var(--font-head); font-size:32px;" id="totalCount">
              {items.length}
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <label>{T('dash_donate_receiving')}</label>
            <div
              style="font-family:var(--font-head); font-size:32px;"
              id="dashDonateStatus"
              class={donateEnabled ? 'status-online' : 'status-offline'}
            >
              {donateEnabled ? T('status_open') : T('status_closed')}
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <label>{T('dash_overlay_status')}</label>
            <div
              style="font-family:var(--font-head); font-size:32px;"
              id="overlayStatusText"
              class={overlayOnline ? 'status-online' : 'status-offline'}
            >
              {overlayOnline ? T('status_online') : T('status_offline')}
            </div>
            <div
              id="overlayDetailText"
              style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0); margin-top:4px;"
            >
              {overlayOnline
                ? T('dash_clients_connected', { count: clientCount })
                : T('dash_no_overlay')}
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <label>{T('dash_tts_label')}</label>
            <div
              style="font-family:var(--font-head); font-size:32px;"
              id="dashTtsStatus"
              class={overlayStatus?.ttsEnabled !== false ? 'status-online' : 'status-offline'}
            >
              {overlayStatus?.ttsEnabled !== false ? T('status_online') : T('status_muted')}
            </div>
            <div
              id="dashTtsVoice"
              style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0); margin-top:4px;"
            >
              {overlayStatus?.ttsVoice || 'th-TH-NiwatNeural'}
            </div>
          </div>
        </div>

        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>{T('dash_th_time')}</th>
                <th>{T('dash_th_donor')}</th>
                <th>{T('dash_th_amount')}</th>
                <th>{T('dash_th_channel')}</th>
                <th>{T('dash_th_ref')}</th>
                <th>{T('dash_th_message')}</th>
              </tr>
            </thead>
            <tbody id="txBody">
              {items.length === 0 ? (
                <tr id="emptyRow">
                  <td colSpan={6} style="text-align:center; font-family:var(--font-mono);">
                    {T('dash_empty_tx')}
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
            testBtn.textContent = __t('dash_sending');
            testStatus.className = 'status';
            try {
              const res = await fetch('/api/donate/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ donor: 'TEST DONOR', amount: 99, message: __t('test_message') })
              });
              const data = await res.json();
              if (!res.ok || !data.ok) throw new Error(data.error || 'TEST FAILED');
              testStatus.className = 'status ok';
              testStatus.textContent = __t('dash_test_sent');
            } catch (err) {
              testStatus.className = 'status err';
              testStatus.textContent = 'Error: ' + err.message;
            } finally {
              testBtn.disabled = false;
              testBtn.textContent = __t('dash_test_donate_btn');
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
              statText.textContent = online ? __t('status_online') : __t('status_offline');
              statText.className = online ? 'status-online' : 'status-offline';
            }
            if (detailText) {
              detailText.textContent = online
                ? __t('dash_clients_connected', { count })
                : __t('dash_no_overlay');
            }
            if (navBadge && navText) {
              if (online) {
                navBadge.classList.add('is-online');
                navText.textContent = __t('overlay_online') + (count > 1 ? ' (' + count + ')' : '');
              } else {
                navBadge.classList.remove('is-online');
                navText.textContent = __t('overlay_offline');
              }
            }

            const donateStatusEl = document.getElementById('dashDonateStatus');
            const toggleDonateBtn = document.getElementById('dashToggleDonateBtn');
            const ttsStatusEl = document.getElementById('dashTtsStatus');
            const ttsVoiceEl = document.getElementById('dashTtsVoice');

            if (typeof data === 'object') {
              if (window.__applyTheme && (data.themeFlavor || data.themeAccent)) {
                window.__applyTheme(data.themeFlavor, data.themeAccent);
              }
              if (typeof data.donateEnabled === 'boolean') {
                const dOn = data.donateEnabled;
                if (donateStatusEl) {
                  donateStatusEl.textContent = dOn ? __t('status_open') : __t('status_closed');
                  donateStatusEl.className = dOn ? 'status-online' : 'status-offline';
                }
                if (toggleDonateBtn) {
                  toggleDonateBtn.textContent = dOn ? __t('dash_toggle_donate_close') : __t('dash_toggle_donate_open');
                  toggleDonateBtn.style.background = dOn ? 'var(--ctp-red)' : 'var(--ctp-green)';
                  toggleDonateBtn.style.borderColor = dOn ? 'var(--ctp-red)' : 'var(--ctp-green)';
                }
              }
              if (typeof data.ttsEnabled === 'boolean') {
                const on = data.ttsEnabled;
                if (ttsStatusEl) {
                  ttsStatusEl.textContent = on ? __t('status_online') : __t('status_muted');
                  ttsStatusEl.className = on ? 'status-online' : 'status-offline';
                }
              }
              if (data.ttsVoice && ttsVoiceEl) ttsVoiceEl.textContent = data.ttsVoice;
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

          const es = new EventSource('/api/events?client=dashboard');
          window.__es = es;
          window.addEventListener('pagehide', () => es.close());
          window.addEventListener('beforeunload', () => es.close());
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
