import type { DonateEvent } from '../modules/events'

export function DashboardPage({ items }: { items: DonateEvent[] }) {
  const totalAmount = items.reduce((sum, h) => sum + h.amount, 0)

  return (
    <div class="container wide">
      <div class="card elevated">
        <div class="nav-links">
          <a href="/">RETURN TO DONATE</a>
          <div style="display:flex; gap:16px; align-items:center;">
            <a href="/overlay" target="_blank">OPEN OVERLAY</a>
            <button
              type="button"
              id="testDonateBtn"
              style="width:auto; padding:4px 12px; font-size:12px;"
            >
              TEST DONATE ALERT
            </button>
            <form method="post" action="/logout" style="display:inline;">
              <button
                type="submit"
                style="width:auto; padding:4px 12px; font-size:12px; background:var(--ctp-red); border-color:var(--ctp-red);"
              >
                LOGOUT
              </button>
            </form>
          </div>
        </div>
        <h1>TRANSACTIONS</h1>
        <p class="subtitle">CLOUDFLARE D1 LEDGER + REAL-TIME STREAM</p>

        <div id="testStatus" class="status" style="margin-bottom: 16px;"></div>

        <div class="row" style="margin-bottom: 24px;">
          <div class="card" style="margin-bottom:0;">
            <label>TOTAL VOLUME</label>
            <div style="font-family:var(--font-head); font-size:32px;" id="totalAmount">
              {totalAmount.toLocaleString()} THB
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <label>COUNT</label>
            <div style="font-family:var(--font-head); font-size:32px;" id="totalCount">
              {items.length}
            </div>
          </div>
        </div>

        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>TIME</th>
                <th>DONOR</th>
                <th>AMOUNT</th>
                <th>CHANNEL</th>
                <th>SLIP REF</th>
                <th>MESSAGE</th>
              </tr>
            </thead>
            <tbody id="txBody">
              {items.length === 0 ? (
                <tr id="emptyRow">
                  <td colSpan={6} style="text-align:center; font-family:var(--font-mono);">
                    NO TRANSACTIONS RECORDED
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
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          let totalAmt = ${totalAmount};
          let totalCnt = ${items.length};
          let lastSeen = ${items[0]?.createdAt || 'Date.now()'};
          const seenIds = new Set(${JSON.stringify(items.map((i) => i.id))});
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
              [new Date(h.createdAt).toLocaleTimeString('th-TH'), 'font-family:var(--font-mono);font-size:14px;white-space:nowrap;'],
              [h.donor, 'font-weight:700;'],
              [Number(h.amount).toLocaleString() + ' THB', 'font-family:var(--font-mono);font-weight:700;'],
              [label, 'font-family:var(--font-mono);font-size:12px;'],
              [h.transRef || '-', 'font-family:var(--font-mono);font-size:13px;'],
              [h.message || '-', '']
            ];
            for (const [text, style] of cells) {
              const td = document.createElement('td');
              td.style.cssText = style;
              td.textContent = text;
              tr.appendChild(td);
            }
            tbody.prepend(tr);
          }

          testBtn.addEventListener('click', async () => {
            testBtn.disabled = true;
            testBtn.textContent = 'SENDING...';
            testStatus.className = 'status';
            try {
              const res = await fetch('/api/donate/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ donor: 'TEST DONOR', amount: 99, message: 'ทดสอบระบบแจ้งเตือนโดเนท!' })
              });
              const data = await res.json();
              if (!res.ok || !data.ok) throw new Error(data.error || 'TEST FAILED');
              testStatus.className = 'status ok';
              testStatus.textContent = 'OK // TEST ALERT SENT TO OVERLAY';
            } catch (err) {
              testStatus.className = 'status err';
              testStatus.textContent = 'ERROR // ' + err.message;
            } finally {
              testBtn.disabled = false;
              testBtn.textContent = 'TEST DONATE ALERT';
            }
          });

          const es = new EventSource('/api/events');
          es.addEventListener('donate', (e) => addRow(JSON.parse(e.data)));

          setInterval(async () => {
            try {
              const r = await fetch('/api/events/poll?since=' + lastSeen);
              const d = await r.json();
              if (d.items) d.items.forEach(addRow);
            } catch {}
          }, 2500);
        `
        }}
      />
    </div>
  )
}
