import type { DiscordWhitelistEntry } from '../modules/db'
import type { OverlayStatus } from '../modules/events'
import { t, type I18nKey, type Locale } from '../i18n'
import { AdminNav } from './LangSwitch'

export function AccessPage({
  envIds,
  items,
  overlayStatus,
  lang = 'th'
}: {
  envIds: string[]
  items: DiscordWhitelistEntry[]
  overlayStatus?: OverlayStatus
  lang?: Locale
}) {
  const T = (key: I18nKey, vars?: Record<string, string | number>) => t(lang, key, vars)

  return (
    <div class="container wide">
      <AdminNav active="access" lang={lang} overlayStatus={overlayStatus} openOverlayHref="/overlay" />

        <h1>{T('access_title')}</h1>
        <p class="subtitle">{T('access_subtitle')}</p>

        <div id="accessStatus" class="status" style="margin-bottom: 16px;"></div>

        <div class="inverted-block" style="margin-bottom: 24px;">
          <label style="color:var(--ctp-lavender); margin-bottom:8px;">{T('access_env_label')}</label>
          {envIds.length === 0 ? (
            <div style="font-size:13px; color:var(--ctp-subtext0);">{T('access_env_empty')}</div>
          ) : (
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              {envIds.map((id) => (
                <span class="chip" style="font-size:13px; padding:4px 12px;">
                  {id} [ENV]
                </span>
              ))}
            </div>
          )}
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <label style="font-size:16px; color:var(--ctp-accent); margin-bottom:12px;">
            {T('access_add_title')}
          </label>
          <form id="addAccessForm" style="margin-bottom:0;">
            <div class="row" style="margin-bottom:12px;">
              <div>
                <label>{T('access_id_label')}</label>
                <input
                  type="text"
                  id="discordIdInput"
                  placeholder={T('access_id_placeholder')}
                  pattern="[0-9]{15,22}"
                  required
                  style="margin-bottom:0;"
                />
              </div>
              <div>
                <label>{T('access_note_label')}</label>
                <input
                  type="text"
                  id="discordNoteInput"
                  placeholder={T('access_note_placeholder')}
                  maxLength={100}
                  style="margin-bottom:0;"
                />
              </div>
            </div>
            <button type="submit" id="addAccessBtn" style="width:auto; padding:10px 20px; font-size:14px;">
              {T('access_add_btn')}
            </button>
          </form>
        </div>

        <div style="overflow-x:auto;">
          <label style="margin-bottom:8px;">{T('access_db_title')}</label>
          <table>
            <thead>
              <tr>
                <th>{T('access_th_id')}</th>
                <th>{T('access_th_note')}</th>
                <th>{T('access_th_source')}</th>
                <th>{T('access_th_created')}</th>
                <th>{T('access_th_action')}</th>
              </tr>
            </thead>
            <tbody id="accessBody">
              {items.length === 0 ? (
                <tr id="emptyAccessRow">
                  <td colSpan={5} style="text-align:center; font-family:var(--font-mono);">
                    {T('access_empty_db')}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr data-discord-id={item.discordId}>
                    <td style="font-family:var(--font-mono); font-weight:700;">{item.discordId}</td>
                    <td>{item.note || '-'}</td>
                    <td>
                      <span class="chip">{envIds.includes(item.discordId) ? 'DB + ENV' : 'DB'}</span>
                    </td>
                    <td style="font-family:var(--font-mono); font-size:13px;">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : '-'}
                    </td>
                    <td>
                      <button
                        type="button"
                        class="remove-access-btn"
                        data-id={item.discordId}
                        style="width:auto; padding:4px 12px; font-size:12px; background:var(--ctp-red); border-color:var(--ctp-red);"
                      >
                        {T('access_remove_btn')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          const form = document.getElementById('addAccessForm');
          const idInput = document.getElementById('discordIdInput');
          const noteInput = document.getElementById('discordNoteInput');
          const addBtn = document.getElementById('addAccessBtn');
          const statusEl = document.getElementById('accessStatus');
          const tbody = document.getElementById('accessBody');

          function showMsg(msg, isErr = false) {
            if (!statusEl) return;
            statusEl.className = 'status ' + (isErr ? 'err' : 'ok');
            statusEl.textContent = msg;
          }

          function renderRows(items, envIds) {
            if (!tbody) return;
            tbody.innerHTML = '';
            if (!items || items.length === 0) {
              const tr = document.createElement('tr');
              const td = document.createElement('td');
              td.colSpan = 5;
              td.style.cssText = 'text-align:center;font-family:var(--font-mono);';
              td.textContent = __t('access_empty_db');
              tr.appendChild(td);
              tbody.appendChild(tr);
              return;
            }
            const envSet = new Set(envIds || []);
            for (const item of items) {
              const tr = document.createElement('tr');
              tr.dataset.discordId = item.discordId;

              const tdId = document.createElement('td');
              tdId.style.cssText = 'font-family:var(--font-mono);font-weight:700;';
              tdId.textContent = item.discordId;

              const tdNote = document.createElement('td');
              tdNote.textContent = item.note || '-';

              const tdSrc = document.createElement('td');
              const chip = document.createElement('span');
              chip.className = 'chip';
              chip.textContent = envSet.has(item.discordId) ? 'DB + ENV' : 'DB';
              tdSrc.appendChild(chip);

              const tdTime = document.createElement('td');
              tdTime.style.cssText = 'font-family:var(--font-mono);font-size:13px;';
              tdTime.textContent = item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : '-';

              const tdAct = document.createElement('td');
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'remove-access-btn';
              btn.dataset.id = item.discordId;
              btn.style.cssText = 'width:auto;padding:4px 12px;font-size:12px;background:var(--ctp-red);border-color:var(--ctp-red);';
              btn.textContent = __t('access_remove_btn');
              tdAct.appendChild(btn);

              tr.append(tdId, tdNote, tdSrc, tdTime, tdAct);
              tbody.appendChild(tr);
            }
          }

          form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const discordId = (idInput?.value || '').trim();
            const note = (noteInput?.value || '').trim();
            if (!/^\\d{15,22}$/.test(discordId)) {
              showMsg(__t('access_invalid_id'), true);
              return;
            }
            if (addBtn) {
              addBtn.disabled = true;
              addBtn.textContent = __t('access_adding_btn');
            }
            try {
              const res = await fetch('/api/manage/access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ discordId, note })
              });
              const d = await res.json().catch(() => ({}));
              if (!res.ok || !d.ok) throw new Error(d.error || ('HTTP ' + res.status));
              renderRows(d.items, d.envIds);
              if (idInput) idInput.value = '';
              if (noteInput) noteInput.value = '';
              showMsg(__t('access_added_ok', { id: discordId }));
            } catch (err) {
              showMsg('Error: ' + err.message, true);
            } finally {
              if (addBtn) {
                addBtn.disabled = false;
                addBtn.textContent = __t('access_add_btn');
              }
            }
          });

          tbody?.addEventListener('click', async (e) => {
            const btn = e.target.closest('.remove-access-btn');
            if (!btn) return;
            const id = btn.dataset.id;
            if (!id) return;
            btn.disabled = true;
            try {
              const res = await fetch('/api/manage/access/' + encodeURIComponent(id), {
                method: 'DELETE'
              });
              const d = await res.json().catch(() => ({}));
              if (!res.ok || !d.ok) throw new Error(d.error || ('HTTP ' + res.status));
              renderRows(d.items, d.envIds);
              showMsg(__t('access_removed_ok', { id }));
            } catch (err) {
              showMsg('Error: ' + err.message, true);
              btn.disabled = false;
            }
          });
        `
        }}
      />
    </div>
  )
}
