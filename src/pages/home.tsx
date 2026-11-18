import type { AppConfig } from "../modules/config";
import type { HeaderSettings } from "../modules/db";
import { LangSwitch } from "./LangSwitch";
import { t, type I18nKey, type Locale } from "../i18n";

export function HomePage({
  config,
  overlayOnline = false,
  donateEnabled = false,
  header,
  mobileSid = "",
  lang = 'th',
}: {
  config: AppConfig;
  overlayOnline?: boolean;
  donateEnabled?: boolean;
  header?: HeaderSettings;
  mobileSid?: string;
  lang?: Locale;
}) {
  const T = (key: I18nKey, vars?: Record<string, string | number>) => t(lang, key, vars);
  const hasBankOrPP = Boolean(config.bankAccount || config.promptpayId);
  const hasTrueMoney = Boolean(config.truewalletId);
  const hasPaymentInfo = hasBankOrPP || hasTrueMoney;
  const isMobileSession = Boolean(mobileSid);
  const navBrandText = header?.siteTitle?.trim() || T("home_nav_brand");
  const mainTitleText = isMobileSession ? T("home_title_mobile") : (header?.headerTitle?.trim() || T("home_title"));
  const subTitleText = isMobileSession ? T("home_subtitle_mobile") : (header?.headerSubtitle?.trim() || T("home_subtitle"));

  return (
    <div class="container">
      <nav class="nav-links">
          <span id="homeNavBrand" style="font-weight:700; color:var(--ctp-text);">{navBrandText}</span>
          <div class="nav-group">
            <div
              id="overlayNavBadge"
              class={`overlay-indicator ${overlayOnline ? "is-online" : ""}`}
            >
              <span class="overlay-square"></span>
              <span id="overlayNavText">
                {overlayOnline ? T("overlay_online") : T("overlay_offline")}
              </span>
            </div>
            <LangSwitch lang={lang} />
          </div>
        </nav>
        <h1 id="homeHeaderTitle">{mainTitleText}</h1>
        <p class="subtitle" id="homeHeaderSubtitle">
          {subTitleText}
        </p>

        <div
          id="donateClosedBanner"
          class="status err"
          style={`margin-bottom:20px; display:${donateEnabled ? "none" : "block"};`}
        >
          {T("home_donate_closed_banner")}
        </div>

        {!isMobileSession && hasPaymentInfo && (
          <div
            class="inverted-block"
            id="paymentInfoBlock"
            style={donateEnabled ? "" : "display:none;"}
          >
            {config.accountName && (
              <div>
                {T("home_account_name")} <strong>{config.accountName}</strong>
              </div>
            )}
            {config.bankAccount && (
              <div>
                {T("home_bank")}{config.bankName ? ` [${config.bankName}]` : ""}:{" "}
                <strong>{config.bankAccount}</strong>
                <button type="button" class="copy-inline-btn" data-copy={config.bankAccount}>
                  {T("ctrl_copy")}
                </button>
              </div>
            )}
            {config.promptpayId && (
              <div>
                {T("home_promptpay")} <strong>{config.promptpayId}</strong>
                <button type="button" class="copy-inline-btn" data-copy={config.promptpayId}>
                  {T("ctrl_copy")}
                </button>
                <div style="margin-top:16px;">
                  <label>{T("home_qr_amount")}</label>
                  <input
                    type="number"
                    id="ppAmount"
                    min={10}
                    step="any"
                    value="10"
                    disabled={!donateEnabled}
                    style="margin-bottom:12px;"
                  />
                  <div
                    id="ppQrBox"
                    data-id={config.promptpayId}
                    style="background:#FFFFFF; padding:12px; display:inline-block;"
                  ></div>
                </div>
              </div>
            )}
            {config.truewalletId && (
              <div>
                {T("home_truemoney")} <strong>{config.truewalletId}</strong>
                <button type="button" class="copy-inline-btn" data-copy={config.truewalletId}>
                  {T("ctrl_copy")}
                </button>
              </div>
            )}
          </div>
        )}

        <form id="donateForm">
          <fieldset
            id="donateFieldset"
            disabled={!donateEnabled}
            style="border:none; padding:0; margin:0; min-inline-size:0;"
          >
            <input type="hidden" name="sid" id="sessionSidInput" value={mobileSid} />

            {isMobileSession ? (
              <div class="inverted-block" id="mobileSummaryBox" style="margin-bottom:16px;">
                <div style="font-family:var(--font-head); font-size:14px; color:var(--ctp-lavender); margin-bottom:8px;">
                  {T("home_session_summary")}
                </div>
                <div>
                  {T("home_sum_donor_label")} <strong id="sumDonor">{T("home_sum_donor_default")}</strong>
                </div>
                <div>
                  {T("home_sum_channel_label")} <strong id="sumChannel">{T("home_sum_channel_bank")}</strong>
                </div>
                <div>
                  {T("home_sum_message_label")} <strong id="sumMessage">-</strong>
                </div>
                <div
                  id="mobileLinkedBanner"
                  style="margin-top:10px; padding-top:8px; border-top:2px solid var(--ctp-surface1); color:var(--ctp-green); font-size:13px;"
                >
                  {T("home_mobile_connected")}
                </div>
              </div>
            ) : (
              <div>
                <label>{T("home_donor_label")}</label>
                <input type="text" name="donor" id="donorInput" placeholder={T("home_donor_placeholder")} style="margin-bottom:8px;" />
                <label
                  style="display:inline-flex; align-items:center; gap:8px; margin-bottom:16px; cursor:pointer; font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0);"
                >
                  <input type="checkbox" id="rememberDonor" checked style="width:auto; margin:0;" />
                  <span>{T("home_remember_donor")}</span>
                </label>

                <label>{T("home_channel_label")}</label>
                <select name="type" id="slipType">
                  {hasBankOrPP && (
                    <option value="bank-image">{T("home_channel_bank_option")}</option>
                  )}
                  {hasTrueMoney && (
                    <option value="truemoney">{T("home_channel_truemoney_option")}</option>
                  )}
                </select>
              </div>
            )}

            <div id="fileField">
              <label>{T("home_slip_label")}</label>
              <div class={`dropzone ${donateEnabled ? "" : "is-disabled"}`} id="dropzone">
                <input
                  type="file"
                  name="image"
                  id="slipFile"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={!donateEnabled}
                  required
                />
                <div id="dropzoneText">
                  {!donateEnabled
                    ? T("home_donate_closed_banner")
                    : isMobileSession
                      ? T("home_dropzone_mobile")
                      : T("home_dropzone_desktop")}
                </div>
              </div>

              <div
                id="slipPreviewBox"
                style="display:none; margin-bottom:16px; padding:12px; background:var(--ctp-crust); border:2px solid var(--ctp-surface2); align-items:center; justify-content:space-between; gap:12px;"
              >
                <img
                  id="slipPreviewImg"
                  alt="Slip preview"
                  style="max-height:96px; max-width:160px; object-fit:contain; border:1px solid var(--ctp-surface1);"
                />
                <button
                  type="button"
                  id="clearSlipBtn"
                  style="width:auto; padding:6px 12px; font-size:12px; background:var(--ctp-surface1); color:var(--ctp-text); border-color:var(--ctp-surface2);"
                >
                  {T("home_clear_slip")}
                </button>
              </div>

              {!isMobileSession && (
                <details
                  class="inverted-block fold-block desktop-only"
                  id="mobileUploadBlock"
                  style={`margin-bottom:16px; display:${donateEnabled ? "block" : "none"};`}
                >
                  <summary>{T("home_mobile_fold_summary")}</summary>
                  <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
                    <div
                      id="mobileSessionQr"
                      style="background:#FFFFFF; padding:10px; display:inline-block; flex-shrink:0;"
                    ></div>
                    <div style="flex:1; min-width:200px;">
                      <div style="font-size:13px; color:var(--ctp-text); margin-bottom:8px;">
                        {T("home_mobile_scan_hint")}
                      </div>
                      <div
                        id="mobileSessionStatus"
                        style="font-size:12px; color:var(--ctp-yellow); margin-bottom:10px;"
                      >
                        {T("home_mobile_waiting")}
                      </div>
                      <button
                        type="button"
                        id="copyMobileLinkBtn"
                        style="width:auto; padding:8px 14px; font-size:12px;"
                      >
                        {T("home_copy_mobile_link")}
                      </button>
                    </div>
                  </div>
                </details>
              )}
            </div>

            {!isMobileSession && (
              <div>
                <label>{T("home_message_label")}</label>
                <textarea
                  name="message"
                  id="messageInput"
                  rows={2}
                  placeholder={T("home_message_placeholder")}
                ></textarea>

                {config.turnstileSiteKey && (
                  <div
                    class="cf-turnstile"
                    data-sitekey={config.turnstileSiteKey}
                    data-theme="dark"
                    style="margin-bottom:16px;"
                  ></div>
                )}

                <button type="submit" id="submitBtn" data-has-payment={hasPaymentInfo ? "1" : "0"} disabled={!hasPaymentInfo || !donateEnabled}>
                  {!donateEnabled
                    ? T("home_donate_closed_btn")
                    : hasPaymentInfo
                      ? T("home_submit_btn")
                      : T("home_no_account_btn")}
                </button>
              </div>
            )}
          </fieldset>
          <div id="statusBox" class="status"></div>
        </form>

      {config.turnstileSiteKey && (
        <script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
        ></script>
      )}
      <script
        src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"
        integrity="sha384-lQXOAyZwHXE55JFyrOMB7nY2Wv+m5ZWNtJcHrd1rceRQXAYNLak8ukN5TjBTcIwz"
        crossOrigin="anonymous"
      ></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `
          // ponytail: inline EMVCo PromptPay TLV + CRC16-CCITT instead of promptpay-qr npm package
          function crc16(s) {
            let crc = 0xFFFF;
            for (let i = 0; i < s.length; i++) {
              crc ^= s.charCodeAt(i) << 8;
              for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
            }
            return crc.toString(16).toUpperCase().padStart(4, '0');
          }
          function tlv(id, val) {
            return id + String(val.length).padStart(2, '0') + val;
          }
          function buildPromptPayPayload(rawId, amount) {
            const d = String(rawId || '').replace(/\\D/g, '');
            const target = d.length >= 15 ? tlv('03', d) : d.length === 13 ? tlv('02', d) : tlv('01', '0066' + d.replace(/^0/, ''));
            const merchant = tlv('29', tlv('00', 'A000000677010111') + target);
            const amt = Number(amount) > 0 ? tlv('54', Number(amount).toFixed(2)) : '';
            const body = tlv('00', '01') + tlv('01', amt ? '12' : '11') + merchant + tlv('58', 'TH') + tlv('53', '764') + amt + '6304';
            return body + crc16(body);
          }
          const qrBox = document.getElementById('ppQrBox');
          const ppAmt = document.getElementById('ppAmount');
          function renderPP() {
            if (!qrBox || typeof qrcode === 'undefined') return;
            const val = Math.max(10, Number(ppAmt ? ppAmt.value : 10) || 10);
            const payload = buildPromptPayPayload(qrBox.dataset.id, val);
            const qr = qrcode(0, 'M');
            qr.addData(payload);
            qr.make();
            qrBox.innerHTML = qr.createSvgTag(4, 0);
          }
          if (qrBox) {
            renderPP();
            ppAmt.addEventListener('input', renderPP);
            ppAmt.addEventListener('change', () => {
              if ((Number(ppAmt.value) || 0) < 10) ppAmt.value = '10';
              renderPP();
            });
          }

          const dz = document.getElementById('dropzone');
          const fileInput = document.getElementById('slipFile');
          const dzText = document.getElementById('dropzoneText');
          const donorInput = document.getElementById('donorInput');
          const rememberDonor = document.getElementById('rememberDonor');
          const slipType = document.getElementById('slipType');
          const msgInput = document.getElementById('messageInput');
          const sidInput = document.getElementById('sessionSidInput');
          const mobileQrBox = document.getElementById('mobileSessionQr');
          const mobileStatusEl = document.getElementById('mobileSessionStatus');
          const copyMobileBtn = document.getElementById('copyMobileLinkBtn');
          const mobileLinkedBanner = document.getElementById('mobileLinkedBanner');
          const mobileUploadBlock = document.getElementById('mobileUploadBlock');

          // Username remember in localStorage
          const REMEMBER_KEY = 'donate_remember_donor';
          const DONOR_NAME_KEY = 'donate_donor_name';
          try {
            const remPref = localStorage.getItem(REMEMBER_KEY);
            if (remPref === '0' && rememberDonor) rememberDonor.checked = false;
            const savedDonor = localStorage.getItem(DONOR_NAME_KEY);
            if (savedDonor && donorInput && (!rememberDonor || rememberDonor.checked)) {
              donorInput.value = savedDonor;
            }
          } catch {}

          function syncRememberedDonor() {
            if (!donorInput || !rememberDonor) return;
            try {
              if (rememberDonor.checked) {
                localStorage.setItem(REMEMBER_KEY, '1');
                localStorage.setItem(DONOR_NAME_KEY, donorInput.value.trim());
              } else {
                localStorage.setItem(REMEMBER_KEY, '0');
                localStorage.removeItem(DONOR_NAME_KEY);
              }
            } catch {}
          }
          donorInput?.addEventListener('input', () => {
            syncRememberedDonor();
            pushSessionMeta();
          });
          rememberDonor?.addEventListener('change', syncRememberedDonor);

          // Same-session desktop <-> mobile slip upload
          const urlParams = new URLSearchParams(window.location.search);
          const urlSid = urlParams.get('sid') || '';
          const isMobileLinked = Boolean(urlSid);
          let sid = urlSid;
          if (!sid) {
            try { sid = sessionStorage.getItem('donate_sid') || ''; } catch {}
          }
          if (!sid || sid.length < 16) {
            sid = (typeof crypto !== 'undefined' && crypto.randomUUID)
              ? crypto.randomUUID()
              : (typeof crypto !== 'undefined' && crypto.getRandomValues)
                ? ('sess_' + Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''))
                : ('sess_' + Math.random().toString(36).slice(2).padEnd(12, '0') + Date.now().toString(36));
          }
          try { sessionStorage.setItem('donate_sid', sid); } catch {}
          if (sidInput) sidInput.value = sid;

          const mobileUploadUrl = window.location.origin + '/?sid=' + encodeURIComponent(sid);
          if (isMobileLinked) {
            if (mobileLinkedBanner) mobileLinkedBanner.style.display = 'block';
            if (mobileUploadBlock) mobileUploadBlock.style.display = 'none';
          } else if (mobileQrBox && typeof qrcode !== 'undefined') {
            const mQr = qrcode(0, 'M');
            mQr.addData(mobileUploadUrl);
            mQr.make();
            mobileQrBox.innerHTML = mQr.createSvgTag(3, 0);
          }

          copyMobileBtn?.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(mobileUploadUrl);
              const orig = copyMobileBtn.textContent;
              copyMobileBtn.textContent = __t('home_copied');
              setTimeout(() => { copyMobileBtn.textContent = orig; }, 2000);
            } catch {}
          });

          document.querySelectorAll('.copy-inline-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
              const val = btn.getAttribute('data-copy') || '';
              if (!val) return;
              try {
                await navigator.clipboard.writeText(val);
                const orig = btn.textContent;
                btn.textContent = __t('home_copied');
                setTimeout(() => { btn.textContent = orig; }, 1500);
              } catch {}
            });
          });

          const slipPreviewBox = document.getElementById('slipPreviewBox');
          const slipPreviewImg = document.getElementById('slipPreviewImg');
          const clearSlipBtn = document.getElementById('clearSlipBtn');
          let currentPreviewUrl = '';

          function setSlipPreview(fileOrBlob) {
            if (currentPreviewUrl) {
              try { URL.revokeObjectURL(currentPreviewUrl); } catch {}
              currentPreviewUrl = '';
            }
            if (!fileOrBlob || !slipPreviewBox || !slipPreviewImg) {
              if (slipPreviewBox) slipPreviewBox.style.display = 'none';
              if (slipPreviewImg) slipPreviewImg.removeAttribute('src');
              return;
            }
            currentPreviewUrl = URL.createObjectURL(fileOrBlob);
            slipPreviewImg.src = currentPreviewUrl;
            slipPreviewBox.style.display = 'flex';
          }

          clearSlipBtn?.addEventListener('click', () => {
            if (fileInput) {
              fileInput.value = '';
              fileInput.required = true;
            }
            setSlipPreview(null);
            if (dzText) {
              dzText.textContent = isMobileLinked ? __t('home_dropzone_mobile') : __t('home_dropzone_desktop');
            }
          });

          let donateOpen = ${donateEnabled ? 'true' : 'false'};
          let lastSyncedSlipAt = 0;
          let lastCompletedId = '';
          let metaTimer = null;
          const sumDonor = document.getElementById('sumDonor');
          const sumChannel = document.getElementById('sumChannel');
          const sumMessage = document.getElementById('sumMessage');

          function pushSessionMeta() {
            if (isMobileLinked || !donateOpen) return;
            if (metaTimer) clearTimeout(metaTimer);
            metaTimer = setTimeout(() => {
              fetch('/api/donate/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sid,
                  donor: donorInput?.value || '',
                  type: slipType?.value || 'bank-image',
                  message: msgInput?.value || ''
                })
              }).catch(() => {});
            }, 250);
          }

          slipType?.addEventListener('change', pushSessionMeta);
          msgInput?.addEventListener('input', pushSessionMeta);

          function showStatusError(msg) {
            const status = document.getElementById('statusBox');
            if (status) {
              status.className = 'status err';
              status.textContent = msg;
              try { status.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch {}
            }
          }

          function showClosedAlert() {
            showStatusError(__t('err_donate_closed'));
          }

          function validateAndHandleSlip(file) {
            if (!file) return;
            if (!donateOpen) {
              showClosedAlert();
              return;
            }
            const okTypes = ['image/png', 'image/jpeg', 'image/webp'];
            if (!okTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
              if (fileInput) fileInput.value = '';
              setSlipPreview(null);
              showStatusError(__t('err_file_type'));
              return;
            }
            setSlipPreview(file);
            if (dzText) dzText.textContent = __t('home_selected_file', { name: file.name });
            uploadSlipToSession(file);
          }

          async function uploadSlipToSession(file) {
            if (!file) return;
            if (!donateOpen) {
              showClosedAlert();
              return;
            }
            const fd = new FormData();
            fd.append('sid', sid);
            if (donorInput) fd.append('donor', donorInput.value || '');
            if (slipType) fd.append('type', slipType.value || 'bank-image');
            if (msgInput) fd.append('message', msgInput.value || '');
            fd.append('image', file);
            if (isMobileLinked && mobileLinkedBanner) {
              mobileLinkedBanner.style.color = 'var(--ctp-yellow)';
              mobileLinkedBanner.textContent = __t('home_syncing_slip');
            }
            try {
              const r = await fetch('/api/donate/session', { method: 'POST', body: fd });
              const d = await r.json();
              if (!r.ok || !d?.ok) {
                const errMsg = d?.error || __t('err_donate_closed');
                showStatusError(errMsg);
                if (isMobileLinked && mobileLinkedBanner) {
                  mobileLinkedBanner.style.color = 'var(--ctp-red)';
                  mobileLinkedBanner.textContent = errMsg;
                }
                return;
              }
              if (d && d.ok) {
                lastSyncedSlipAt = d.slipUpdatedAt || Date.now();
                const name = d.slipName || file.name;
                if (isMobileLinked && mobileLinkedBanner) {
                  mobileLinkedBanner.style.color = 'var(--ctp-green)';
                  mobileLinkedBanner.textContent = __t('home_slip_synced', { name });
                }
                if (mobileStatusEl) {
                  mobileStatusEl.style.color = 'var(--ctp-green)';
                  mobileStatusEl.textContent = __t('home_slip_ready', { name });
                }
              }
            } catch {}
          }

          async function pollSessionState() {
            try {
              const r = await fetch('/api/donate/session?sid=' + encodeURIComponent(sid));
              const d = await r.json();
              if (!d || !d.ok || !d.exists) return;

              if (sumDonor) sumDonor.textContent = d.donor || __t('home_sum_donor_default');
              if (sumChannel) sumChannel.textContent = d.type === 'truemoney' ? __t('home_sum_channel_truemoney') : __t('home_sum_channel_bank');
              if (sumMessage) sumMessage.textContent = d.message || '-';

              if (donorInput && document.activeElement !== donorInput && d.donor && !donorInput.value) {
                donorInput.value = d.donor;
                syncRememberedDonor();
              }
              if (slipType && document.activeElement !== slipType && d.type) {
                slipType.value = d.type;
              }
              if (msgInput && document.activeElement !== msgInput && d.message && !msgInput.value) {
                msgInput.value = d.message;
              }

              if (d.hasSlip && d.slipUpdatedAt > lastSyncedSlipAt) {
                lastSyncedSlipAt = d.slipUpdatedAt;
                fileInput.required = false;
                const name = d.slipName || 'slip.jpg';
                dzText.textContent = __t('home_selected_mobile', { name });
                if (mobileStatusEl) {
                  mobileStatusEl.style.color = 'var(--ctp-green)';
                  mobileStatusEl.textContent = __t('home_received_mobile', { name });
                }
                if (!isMobileLinked) {
                  try {
                    const imgRes = await fetch('/api/donate/session/slip?sid=' + encodeURIComponent(sid));
                    if (imgRes.ok) {
                      const blob = await imgRes.blob();
                      const dt = new DataTransfer();
                      dt.items.add(new File([blob], name, { type: d.slipMime || blob.type || 'image/jpeg' }));
                      fileInput.files = dt.files;
                      setSlipPreview(blob);
                    }
                  } catch {}
                }
              }

              if (d.completedEvent && d.completedEvent.id !== lastCompletedId) {
                lastCompletedId = d.completedEvent.id;
                const status = document.getElementById('statusBox');
                if (status) {
                  status.className = 'status ok';
                  status.textContent = __t('home_donate_ok', { amount: d.completedEvent.amount, donor: d.completedEvent.donor });
                }
                if (isMobileLinked && mobileLinkedBanner) {
                  mobileLinkedBanner.style.color = 'var(--ctp-green)';
                  mobileLinkedBanner.textContent = __t('home_completed_desktop', { amount: d.completedEvent.amount });
                }
                fileInput.value = '';
                fileInput.required = true;
                setSlipPreview(null);
                dzText.textContent = isMobileLinked
                  ? __t('home_dropzone_mobile')
                  : __t('home_dropzone_desktop');
                if (mobileStatusEl) {
                  mobileStatusEl.style.color = 'var(--ctp-green)';
                  mobileStatusEl.textContent = __t('home_completed_short', { amount: d.completedEvent.amount });
                }
              }
            } catch {}
          }

          pushSessionMeta();
          pollSessionState();
          setInterval(pollSessionState, 2000);

          ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, (e) => {
            e.preventDefault();
            if (!donateOpen) return;
            dz.classList.add('dragover');
          }));
          ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, (e) => {
            e.preventDefault();
            dz.classList.remove('dragover');
          }));
          dz.addEventListener('click', (e) => {
            if (!donateOpen) {
              e.preventDefault();
              showClosedAlert();
            }
          });
          dz.addEventListener('drop', (e) => {
            if (!donateOpen) {
              showClosedAlert();
              return;
            }
            if (e.dataTransfer.files && e.dataTransfer.files.length) {
              fileInput.files = e.dataTransfer.files;
              validateAndHandleSlip(e.dataTransfer.files[0]);
            }
          });
          fileInput.addEventListener('change', () => {
            if (!donateOpen) {
              fileInput.value = '';
              showClosedAlert();
              return;
            }
            if (fileInput.files && fileInput.files.length) {
              validateAndHandleSlip(fileInput.files[0]);
            }
          });

          document.getElementById('donateForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!donateOpen) {
              showClosedAlert();
              return;
            }
            const form = e.target;
            const btn = document.getElementById('submitBtn');
            const status = document.getElementById('statusBox');
            syncRememberedDonor();
            btn.disabled = true;
            btn.textContent = __t('home_verifying_btn');
            status.className = 'status';

            try {
              const fd = new FormData(form);
              // ponytail: verify turnstile token before submit
              if (document.querySelector('.cf-turnstile') && !fd.get('cf-turnstile-response')) {
                throw new Error(__t('err_turnstile_required'));
              }
              const res = await fetch('/api/donate', { method: 'POST', body: fd });
              const data = await res.json();
              if (!res.ok || !data.ok) {
                throw new Error((data.code ? '[' + data.code + '] ' : '') + (data.error || 'ERROR'));
              }
              lastCompletedId = data.event?.id || '';
              status.className = 'status ok';
              status.textContent = __t('home_donate_ok', { amount: data.event.amount, donor: data.event.donor });
              const keepChecked = Boolean(rememberDonor?.checked);
              const keepName = keepChecked ? (donorInput?.value || '') : '';
              form.reset();
              if (sidInput) sidInput.value = sid;
              if (rememberDonor) rememberDonor.checked = keepChecked;
              if (donorInput && keepChecked) donorInput.value = keepName;
              fileInput.value = '';
              fileInput.required = true;
              setSlipPreview(null);
              dzText.textContent = __t('home_dropzone_desktop');
              if (ppAmt) {
                ppAmt.value = '10';
                renderPP();
              }
            } catch (err) {
              status.className = 'status err';
              status.textContent = err.message;
            } finally {
              const hasPay = btn?.dataset.hasPayment === '1';
              btn.disabled = !hasPay || !donateOpen;
              btn.textContent = !donateOpen ? __t('home_donate_closed_btn') : hasPay ? __t('home_submit_btn') : __t('home_no_account_btn');
              if (typeof turnstile !== 'undefined') {
                try { turnstile.reset(); } catch (_) {}
              }
            }
          });

          function applyDonateState(open) {
            donateOpen = open;
            const banner = document.getElementById('donateClosedBanner');
            if (banner) banner.style.display = open ? 'none' : 'block';
            const payBlock = document.getElementById('paymentInfoBlock');
            if (payBlock) payBlock.style.display = open ? '' : 'none';
            if (mobileUploadBlock && !isMobileLinked) {
              mobileUploadBlock.style.display = open ? 'block' : 'none';
            }
            const fieldset = document.getElementById('donateFieldset');
            if (fieldset) fieldset.disabled = !open;
            if (ppAmt) ppAmt.disabled = !open;
            if (fileInput) fileInput.disabled = !open;
            if (dz) {
              dz.classList.toggle('is-disabled', !open);
            }
            if (dzText) {
              if (!open) {
                dzText.textContent = __t('home_donate_closed_banner');
              } else if (!fileInput?.files?.length) {
                dzText.textContent = isMobileLinked ? __t('home_dropzone_mobile') : __t('home_dropzone_desktop');
              }
            }
            const btn = document.getElementById('submitBtn');
            if (btn) {
              const hasPay = btn.dataset.hasPayment === '1';
              btn.disabled = !hasPay || !open;
              btn.textContent = !open ? __t('home_donate_closed_btn') : hasPay ? __t('home_submit_btn') : __t('home_no_account_btn');
            }
          }

          function updateOverlayStatus(data) {
            const online = typeof data === 'boolean' ? data : Boolean(data?.online);
            const navBadge = document.getElementById('overlayNavBadge');
            const navText = document.getElementById('overlayNavText');
            if (navBadge && navText) {
              if (online) {
                navBadge.classList.add('is-online');
                navText.textContent = __t('overlay_online');
              } else {
                navBadge.classList.remove('is-online');
                navText.textContent = __t('overlay_offline');
              }
            }
            if (typeof data === 'object' && typeof data?.donateEnabled === 'boolean') {
              applyDonateState(data.donateEnabled);
            }
            if (typeof data === 'object' && window.__applyTheme && (data?.themeFlavor || data?.themeAccent)) {
              window.__applyTheme(data.themeFlavor, data.themeAccent);
            }
            if (typeof data === 'object' && !isMobileLinked) {
              if (typeof data?.siteTitle === 'string') {
                const st = data.siteTitle.trim();
                document.title = st || 'Donate Tools';
                const brandEl = document.getElementById('homeNavBrand');
                if (brandEl) brandEl.textContent = st || __t('home_nav_brand');
              }
              if (typeof data?.headerTitle === 'string') {
                const h1El = document.getElementById('homeHeaderTitle');
                if (h1El) h1El.textContent = data.headerTitle.trim() || __t('home_title');
              }
              if (typeof data?.headerSubtitle === 'string') {
                const subEl = document.getElementById('homeHeaderSubtitle');
                if (subEl) subEl.textContent = data.headerSubtitle.trim() || __t('home_subtitle');
              }
            }
          }

          const es = new EventSource('/api/events');
          window.__es = es;
          window.addEventListener('pagehide', () => es.close());
          window.addEventListener('beforeunload', () => es.close());
          es.addEventListener('overlay_status', (e) => {
            try { updateOverlayStatus(JSON.parse(e.data)); } catch {}
          });
          es.addEventListener('heartbeat', (e) => {
            try { updateOverlayStatus(JSON.parse(e.data)); } catch {}
          });
          es.onerror = () => {
            fetch('/api/events/status').then(r => r.json()).then(d => {
              if (d) updateOverlayStatus(d);
            }).catch(() => {});
          };

          setInterval(async () => {
            try {
              const r = await fetch('/api/events/status');
              const d = await r.json();
              if (d) updateOverlayStatus(d);
            } catch {}
          }, 5000);
        `,
        }}
      />
    </div>
  );
}
