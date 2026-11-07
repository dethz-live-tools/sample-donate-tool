import type { LeaderboardEntry } from '../../modules/db'

export function LeaderboardOverlayPage({
  initialItems = [],
  limit = 5,
  title = 'TOP DONORS'
}: {
  initialItems?: LeaderboardEntry[]
  limit?: number
  title?: string
}) {
  return (
    <div>
      <div class="leaderboard-card" id="leaderboardBox">
        <div class="leaderboard-header">
          <span class="leaderboard-badge">TOP</span>
          <span class="leaderboard-title" id="lbTitle">{title}</span>
        </div>
        <div class="leaderboard-list" id="lbList">
          {initialItems.length === 0 ? (
            <div class="leaderboard-empty">NO DONATIONS YET</div>
          ) : (
            initialItems.map((item, idx) => {
              const rank = idx + 1
              const rankClass = rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : rank === 3 ? 'rank-bronze' : 'rank-normal'
              return (
                <div class="leaderboard-row" data-rank={rank}>
                  <div class={`leaderboard-rank ${rankClass}`}>#{rank}</div>
                  <div class="leaderboard-name">{item.donor}</div>
                  <div class="leaderboard-total">{item.total.toLocaleString()} THB</div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          document.body.classList.add('overlay-body');
          const limit = ${Math.max(1, Math.min(50, limit))};
          const listEl = document.getElementById('lbList');

          function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
          }

          function renderRows(items) {
            if (!items || items.length === 0) {
              listEl.innerHTML = '<div class="leaderboard-empty">NO DONATIONS YET</div>';
              return;
            }
            listEl.innerHTML = items.map((item, idx) => {
              const rank = idx + 1;
              const rankClass = rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : rank === 3 ? 'rank-bronze' : 'rank-normal';
              return '<div class="leaderboard-row" data-rank="' + rank + '">' +
                '<div class="leaderboard-rank ' + rankClass + '">#' + rank + '</div>' +
                '<div class="leaderboard-name">' + escapeHtml(item.donor || 'Anonymous') + '</div>' +
                '<div class="leaderboard-total">' + Number(item.total || 0).toLocaleString() + ' THB</div>' +
                '</div>';
            }).join('');
          }

          async function refreshLeaderboard() {
            try {
              const r = await fetch('/api/events/leaderboard?limit=' + limit);
              const data = await r.json();
              if (data.ok && Array.isArray(data.items)) {
                renderRows(data.items);
              }
            } catch (err) {
              console.error('[leaderboard] fetch error', err);
            }
          }

          const es = new EventSource('/api/events/overlay');
          es.addEventListener('donate', () => {
            refreshLeaderboard();
          });
          es.addEventListener('control', (e) => {
            try {
              const cmd = JSON.parse(e.data);
              if (cmd.action === 'reload') {
                window.location.reload();
              }
            } catch (_) {}
          });

          // Polling fallback
          setInterval(refreshLeaderboard, 5000);
        `
        }}
      />
    </div>
  )
}
