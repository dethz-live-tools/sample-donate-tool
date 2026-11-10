import type { AppConfig } from "../modules/config";

export function HomePage({
  config,
  overlayOnline = false,
  mobileSid = "",
}: {
  config: AppConfig;
  overlayOnline?: boolean;
  mobileSid?: string;
}) {
  const hasBankOrPP = Boolean(config.bankAccount || config.promptpayId);
  const hasTrueMoney = Boolean(config.truewalletId);
  const hasPaymentInfo = hasBankOrPP || hasTrueMoney;
  const isMobileSession = Boolean(mobileSid);

  return (
    <div class="container">
      <div class="card elevated">
        <div class="nav-links">
          <span>RAWBLOCK // DONATE SYSTEM</span>
          <div
            id="overlayNavBadge"
            class={`overlay-indicator ${overlayOnline ? "is-online" : ""}`}
          >
            <span class="overlay-square"></span>
            <span id="overlayNavText">
              OVERLAY: {overlayOnline ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>
        <h1>{isMobileSession ? "MOBILE SLIP UPLOAD" : "DONATE"}</h1>
        <p class="subtitle">
          {isMobileSession
            ? "LINKED TO DESKTOP SESSION // UPLOAD SLIP IMAGE BELOW"
            : "deth'z vibing ai generate donate website (i got no time ;w;)"}
        </p>

        {!isMobileSession && hasPaymentInfo && (
          <div class="inverted-block">
            {config.accountName && (
              <div>
                ACCOUNT NAME: <strong>{config.accountName}</strong>
              </div>
            )}
            {config.bankAccount && (
              <div>
                BANK{config.bankName ? ` [${config.bankName}]` : ""}:{" "}
                <strong>{config.bankAccount}</strong>
              </div>
            )}
            {config.promptpayId && (
              <div>
                PROMPTPAY: <strong>{config.promptpayId}</strong>
                <div style="margin-top:16px;">
                  <label>QR AMOUNT (MIN 10 THB)</label>
                  <input
                    type="number"
                    id="ppAmount"
                    min={10}
                    step="any"
                    value="10"
                    style="margin-bottom:12px;"
                  />
                  <div
                    id="ppQrBox"
                    data-id={config.promptpayId}
                    style="background:#FFFFFF; padding:12px; border:3px solid var(--ctp-lavender); display:inline-block;"
                  ></div>
                </div>
              </div>
            )}
            {config.truewalletId && (
              <div>
                TRUEMONEY: <strong>{config.truewalletId}</strong>
              </div>
            )}
          </div>
        )}

        <form id="donateForm">
          <input type="hidden" name="sid" id="sessionSidInput" value={mobileSid} />

          {isMobileSession ? (
            <div class="inverted-block" id="mobileSummaryBox" style="margin-bottom:16px;">
              <label style="color:var(--ctp-lavender); margin-bottom:8px;">
                SESSION SUMMARY
              </label>
              <div>
                DONOR: <strong id="sumDonor">- (SLIP NAME)</strong>
              </div>
              <div>
                CHANNEL: <strong id="sumChannel">BANK / PROMPTPAY</strong>
              </div>
              <div>
                MESSAGE: <strong id="sumMessage">-</strong>
              </div>
              <div
                id="mobileLinkedBanner"
                style="margin-top:10px; padding-top:8px; border-top:2px solid var(--ctp-surface1); color:var(--ctp-green); font-size:13px;"
              >
                CONNECTED TO DESKTOP // SELECT SLIP TO SYNC
              </div>
            </div>
          ) : (
            <div>
              <label>DONOR NAME (OPTIONAL — DEFAULTS TO SLIP NAME)</label>
              <input type="text" name="donor" id="donorInput" placeholder="SOMCHAI" style="margin-bottom:8px;" />
              <label
                style="display:inline-flex; align-items:center; gap:8px; margin-bottom:16px; cursor:pointer; font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0);"
              >
                <input type="checkbox" id="rememberDonor" checked style="width:auto; margin:0;" />
                <span>REMEMBER USERNAME</span>
              </label>

              <label>PAYMENT CHANNEL</label>
              <select name="type" id="slipType">
                {hasBankOrPP && (
                  <option value="bank-image">BANK / PROMPTPAY SLIP (IMAGE)</option>
                )}
                {hasTrueMoney && (
                  <option value="truemoney">TRUEMONEY SLIP (IMAGE)</option>
                )}
              </select>
            </div>
          )}

          <div id="fileField">
            <label>SLIP IMAGE (PNG / JPG)</label>
            <div class="dropzone" id="dropzone">
              <input
                type="file"
                name="image"
                id="slipFile"
                accept="image/png,image/jpeg,image/webp"
                required
              />
              <div id="dropzoneText">
                {isMobileSession
                  ? "TAP HERE TO SELECT SLIP IMAGE FROM PHONE"
                  : "DRAG & DROP SLIP IMAGE HERE OR CLICK TO BROWSE"}
              </div>
            </div>

            {!isMobileSession && (
              <details class="inverted-block fold-block desktop-only" id="mobileUploadBlock" style="margin-bottom:16px;">
                <summary>UPLOAD SLIP ON MOBILE (KEEP SAME SESSION)</summary>
                <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
                  <div
                    id="mobileSessionQr"
                    style="background:#FFFFFF; padding:10px; border:3px solid var(--ctp-lavender); display:inline-block; flex-shrink:0;"
                  ></div>
                  <div style="flex:1; min-width:200px;">
                    <div style="font-size:13px; color:var(--ctp-text); margin-bottom:8px;">
                      SCAN QR TO UPLOAD SLIP FROM PHONE IN THIS SAME SESSION
                    </div>
                    <div
                      id="mobileSessionStatus"
                      style="font-size:12px; color:var(--ctp-yellow); margin-bottom:10px;"
                    >
                      SESSION ACTIVE // WAITING FOR MOBILE SLIP...
                    </div>
                    <button
                      type="button"
                      id="copyMobileLinkBtn"
                      style="width:auto; padding:8px 14px; font-size:12px;"
                    >
                      COPY MOBILE UPLOAD LINK
                    </button>
                  </div>
                </div>
              </details>
            )}
          </div>

          {!isMobileSession && (
            <div>
              <label>MESSAGE (TTS VOICE)</label>
              <textarea
                name="message"
                id="messageInput"
                rows={2}
                placeholder="KEEP GOING!"
              ></textarea>

              {config.turnstileSiteKey && (
                <div
                  class="cf-turnstile"
                  data-sitekey={config.turnstileSiteKey}
                  data-theme="dark"
                  style="margin-bottom:16px;"
                ></div>
              )}

              <button type="submit" id="submitBtn" disabled={!hasPaymentInfo}>
                {hasPaymentInfo
                  ? "SUBMIT DONATION"
                  : "NO RECEIVING ACCOUNT CONFIGURED"}
              </button>
            </div>
          )}
          <div id="statusBox" class="status"></div>
        </form>
      </div>

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
          if (!sid || sid.length < 8) {
            sid = (typeof crypto !== 'undefined' && crypto.randomUUID)
              ? crypto.randomUUID()
              : ('sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36));
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
              copyMobileBtn.textContent = 'COPIED!';
              setTimeout(() => { copyMobileBtn.textContent = orig; }, 2000);
            } catch {}
          });

          let lastSyncedSlipAt = 0;
          let lastCompletedId = '';
          let metaTimer = null;
          const sumDonor = document.getElementById('sumDonor');
          const sumChannel = document.getElementById('sumChannel');
          const sumMessage = document.getElementById('sumMessage');

          function pushSessionMeta() {
            if (isMobileLinked) return;
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

          async function uploadSlipToSession(file) {
            if (!file) return;
            const fd = new FormData();
            fd.append('sid', sid);
            if (donorInput) fd.append('donor', donorInput.value || '');
            if (slipType) fd.append('type', slipType.value || 'bank-image');
            if (msgInput) fd.append('message', msgInput.value || '');
            fd.append('image', file);
            if (isMobileLinked && mobileLinkedBanner) {
              mobileLinkedBanner.style.color = 'var(--ctp-yellow)';
              mobileLinkedBanner.textContent = 'SYNCING SLIP TO DESKTOP SESSION...';
            }
            try {
              const r = await fetch('/api/donate/session', { method: 'POST', body: fd });
              const d = await r.json();
              if (d && d.ok) {
                lastSyncedSlipAt = d.slipUpdatedAt || Date.now();
                if (isMobileLinked && mobileLinkedBanner) {
                  mobileLinkedBanner.style.color = 'var(--ctp-green)';
                  mobileLinkedBanner.textContent = 'SLIP SYNCED TO DESKTOP (' + (d.slipName || file.name) + ')';
                }
                if (mobileStatusEl) {
                  mobileStatusEl.style.color = 'var(--ctp-green)';
                  mobileStatusEl.textContent = 'SLIP READY: ' + (d.slipName || file.name);
                }
              }
            } catch {}
          }

          async function pollSessionState() {
            try {
              const r = await fetch('/api/donate/session?sid=' + encodeURIComponent(sid));
              const d = await r.json();
              if (!d || !d.ok || !d.exists) return;

              if (sumDonor) sumDonor.textContent = d.donor || '- (SLIP NAME)';
              if (sumChannel) sumChannel.textContent = d.type === 'truemoney' ? 'TRUEMONEY' : 'BANK / PROMPTPAY';
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
                dzText.textContent = 'SELECTED VIA MOBILE: ' + (d.slipName || 'slip.jpg');
                if (mobileStatusEl) {
                  mobileStatusEl.style.color = 'var(--ctp-green)';
                  mobileStatusEl.textContent = 'SLIP RECEIVED FROM MOBILE: ' + (d.slipName || 'slip.jpg');
                }
                if (!isMobileLinked) {
                  try {
                    const imgRes = await fetch('/api/donate/session/slip?sid=' + encodeURIComponent(sid));
                    if (imgRes.ok) {
                      const blob = await imgRes.blob();
                      const dt = new DataTransfer();
                      dt.items.add(new File([blob], d.slipName || 'slip.jpg', { type: d.slipMime || blob.type || 'image/jpeg' }));
                      fileInput.files = dt.files;
                    }
                  } catch {}
                }
              }

              if (d.completedEvent && d.completedEvent.id !== lastCompletedId) {
                lastCompletedId = d.completedEvent.id;
                const status = document.getElementById('statusBox');
                if (status) {
                  status.className = 'status ok';
                  status.textContent = 'OK // DONATED ' + d.completedEvent.amount + ' THB FROM ' + d.completedEvent.donor;
                }
                if (isMobileLinked && mobileLinkedBanner) {
                  mobileLinkedBanner.style.color = 'var(--ctp-green)';
                  mobileLinkedBanner.textContent = 'DONATION COMPLETED ON DESKTOP (' + d.completedEvent.amount + ' THB)';
                }
                fileInput.value = '';
                fileInput.required = true;
                dzText.textContent = isMobileLinked
                  ? 'TAP HERE TO SELECT SLIP IMAGE FROM PHONE'
                  : 'DRAG & DROP SLIP IMAGE HERE OR CLICK TO BROWSE';
                if (mobileStatusEl) {
                  mobileStatusEl.style.color = 'var(--ctp-green)';
                  mobileStatusEl.textContent = 'DONATION COMPLETED (' + d.completedEvent.amount + ' THB)';
                }
              }
            } catch {}
          }

          pushSessionMeta();
          pollSessionState();
          setInterval(pollSessionState, 2000);

          ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, (e) => {
            e.preventDefault();
            dz.classList.add('dragover');
          }));
          ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, (e) => {
            e.preventDefault();
            dz.classList.remove('dragover');
          }));
          dz.addEventListener('drop', (e) => {
            if (e.dataTransfer.files && e.dataTransfer.files.length) {
              fileInput.files = e.dataTransfer.files;
              dzText.textContent = 'SELECTED: ' + e.dataTransfer.files[0].name;
              uploadSlipToSession(e.dataTransfer.files[0]);
            }
          });
          fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files.length) {
              dzText.textContent = 'SELECTED: ' + fileInput.files[0].name;
              uploadSlipToSession(fileInput.files[0]);
            }
          });

          document.getElementById('donateForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('submitBtn');
            const status = document.getElementById('statusBox');
            syncRememberedDonor();
            btn.disabled = true;
            btn.textContent = 'VERIFYING SLIP & GENERATING TTS...';
            status.className = 'status';

            try {
              const fd = new FormData(form);
              // ponytail: verify turnstile token before submit
              if (document.querySelector('.cf-turnstile') && !fd.get('cf-turnstile-response')) {
                throw new Error('กรุณายืนยันความปลอดภัย (Turnstile) ก่อนส่ง');
              }
              const res = await fetch('/api/donate', { method: 'POST', body: fd });
              const data = await res.json();
              if (!res.ok || !data.ok) {
                throw new Error((data.code ? '[' + data.code + '] ' : '') + (data.error || 'ERROR'));
              }
              lastCompletedId = data.event?.id || '';
              status.className = 'status ok';
              status.textContent = 'OK // DONATED ' + data.event.amount + ' THB FROM ' + data.event.donor;
              const keepChecked = Boolean(rememberDonor?.checked);
              const keepName = keepChecked ? (donorInput?.value || '') : '';
              form.reset();
              if (sidInput) sidInput.value = sid;
              if (rememberDonor) rememberDonor.checked = keepChecked;
              if (donorInput && keepChecked) donorInput.value = keepName;
              fileInput.value = '';
              fileInput.required = true;
              dzText.textContent = 'DRAG & DROP SLIP IMAGE HERE OR CLICK TO BROWSE';
              if (ppAmt) {
                ppAmt.value = '10';
                renderPP();
              }
            } catch (err) {
              status.className = 'status err';
              status.textContent = err.message;
            } finally {
              btn.disabled = false;
              btn.textContent = 'SUBMIT DONATION';
              if (typeof turnstile !== 'undefined') {
                try { turnstile.reset(); } catch (_) {}
              }
            }
          });

          function updateOverlayStatus(data) {
            const online = typeof data === 'boolean' ? data : Boolean(data?.online);
            const navBadge = document.getElementById('overlayNavBadge');
            const navText = document.getElementById('overlayNavText');
            if (navBadge && navText) {
              if (online) {
                navBadge.classList.add('is-online');
                navText.textContent = 'OVERLAY: ONLINE';
              } else {
                navBadge.classList.remove('is-online');
                navText.textContent = 'OVERLAY: OFFLINE';
              }
            }
          }

          const es = new EventSource('/api/events');
          es.addEventListener('overlay_status', (e) => {
            try { updateOverlayStatus(JSON.parse(e.data)); } catch {}
          });
          es.addEventListener('heartbeat', (e) => {
            try { updateOverlayStatus(JSON.parse(e.data)); } catch {}
          });
          es.onerror = () => {
            fetch('/api/events/status').then(r => r.json()).then(d => {
              if (typeof d.online === 'boolean') updateOverlayStatus(d.online);
            }).catch(() => {});
          };

          setInterval(async () => {
            try {
              const r = await fetch('/api/events/status');
              const d = await r.json();
              if (typeof d.online === 'boolean') updateOverlayStatus(d.online);
            } catch {}
          }, 5000);
        `,
        }}
      />
    </div>
  );
}
