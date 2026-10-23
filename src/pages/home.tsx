import type { AppConfig } from "../modules/config";

export function HomePage({ config }: { config: AppConfig }) {
  const hasBankOrPP = Boolean(config.bankAccount || config.promptpayId);
  const hasTrueMoney = Boolean(config.truewalletId);
  const hasPaymentInfo = hasBankOrPP || hasTrueMoney;

  return (
    <div class="container">
      <div class="card elevated">
        <div class="nav-links">
          <span>RAWBLOCK // DONATE SYSTEM</span>
        </div>
        <h1>DONATE</h1>
        <p class="subtitle">
          SLIP2SURE VERIFICATION + GEMINI 2.5 FLASH TTS (AOEDE)
        </p>

        {hasPaymentInfo && (
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
          <label>DONOR NAME (OPTIONAL — DEFAULTS TO SLIP NAME)</label>
          <input type="text" name="donor" placeholder="SOMCHAI" />

          <label>PAYMENT CHANNEL</label>
          <select name="type" id="slipType">
            {hasBankOrPP && (
              <option value="bank-image">BANK / PROMPTPAY SLIP (IMAGE)</option>
            )}
            {hasTrueMoney && (
              <option value="truemoney">TRUEMONEY SLIP (IMAGE)</option>
            )}
          </select>

          <div id="fileField">
            <label>SLIP IMAGE (PNG / JPG)</label>
            <div class="dropzone" id="dropzone">
              <input
                type="file"
                name="image"
                id="slipFile"
                accept="image/png,image/jpeg"
                required
              />
              <div id="dropzoneText">DRAG & DROP SLIP IMAGE HERE OR CLICK TO BROWSE</div>
            </div>
          </div>

          <label>MESSAGE (TTS VOICE)</label>
          <textarea
            name="message"
            rows={2}
            placeholder="KEEP GOING!"
          ></textarea>

          <button type="submit" id="submitBtn" disabled={!hasPaymentInfo}>
            {hasPaymentInfo
              ? "SUBMIT DONATION"
              : "NO RECEIVING ACCOUNT CONFIGURED"}
          </button>
          <div id="statusBox" class="status"></div>
        </form>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
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
            }
          });
          fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files.length) {
              dzText.textContent = 'SELECTED: ' + fileInput.files[0].name;
            }
          });

          document.getElementById('donateForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            const status = document.getElementById('statusBox');
            btn.disabled = true;
            btn.textContent = 'VERIFYING SLIP & GENERATING TTS...';
            status.className = 'status';

            try {
              const fd = new FormData(e.target);
              const res = await fetch('/api/donate', { method: 'POST', body: fd });
              const data = await res.json();
              if (!res.ok || !data.ok) {
                throw new Error((data.code ? '[' + data.code + '] ' : '') + (data.error || 'ERROR'));
              }
              status.className = 'status ok';
              status.textContent = 'OK // DONATED ' + data.event.amount + ' THB FROM ' + data.event.donor;
            } catch (err) {
              status.className = 'status err';
              status.textContent = err.message;
            } finally {
              btn.disabled = false;
              btn.textContent = 'SUBMIT DONATION';
            }
          });
        `,
        }}
      />
    </div>
  );
}
