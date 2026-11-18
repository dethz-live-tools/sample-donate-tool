import { DISCORD_PERMISSIONS, type DiscordPermission, type DiscordWhitelistEntry } from '../modules/db'
import type { OverlayStatus } from '../modules/events'
import { t, type I18nKey, type Locale } from '../i18n'
import { AdminNav } from './LangSwitch'

const PERM_KEY_MAP: Record<DiscordPermission, I18nKey> = {
  dashboard: 'access_perm_dashboard',
  controls: 'access_perm_controls',
  config: 'access_perm_config',
  access: 'access_perm_access'
}

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
                <span class="chip" style="font-size:13px; padding:4px 12px; border-color:var(--ctp-yellow); color:var(--ctp-yellow);">
                  {id} [{T('access_full_env')}]
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
                <label>{T('access_username_label')}</label>
                <input
                  type="text"
                  id="discordUsernameInput"
                  placeholder={T('access_username_placeholder')}
                  maxLength={80}
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
            <div style="margin-bottom:14px;">
              <label style="margin-bottom:6px;">{T('access_perms_label')}</label>
              <div style="display:flex; flex-wrap:wrap; gap:14px;">
                {DISCORD_PERMISSIONS.map((perm) => (
                  <label
                    style="display:inline-flex; align-items:center; gap:6px; margin-bottom:0; cursor:pointer; font-family:var(--font-mono); font-size:13px; color:var(--ctp-text);"
                  >
                    <input
                      type="checkbox"
                      name="perm"
                      value={perm}
                      checked={perm !== 'access'}
                      style="width:auto; margin:0;"
                    />
                    <span>{T(PERM_KEY_MAP[perm])}</span>
                  </label>
                ))}
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
                <th>{T('access_th_username')}</th>
                <th>{T('access_th_note')}</th>
                <th>{T('access_th_perms')}</th>
                <th>{T('access_th_source')}</th>
                <th>{T('access_th_created')}</th>
                <th>{T('access_th_action')}</th>
              </tr>
            </thead>
            <tbody id="accessBody">
              {items.length === 0 ? (
                <tr id="emptyAccessRow">
                  <td colSpan={7} style="text-align:center; font-family:var(--font-mono);">
                    {T('access_empty_db')}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isEnv = envIds.includes(item.discordId)
                  const perms = Array.isArray(item.permissions) ? item.permissions : ['dashboard', 'controls', 'config']
                  return (
                    <tr data-discord-id={item.discordId}>
                      <td style="font-family:var(--font-mono); font-weight:700;">{item.discordId}</td>
                      <td style="font-family:var(--font-mono);">
                        {item.username ? (
                          <strong style="color:var(--ctp-accent);">{item.username}</strong>
                        ) : (
                          <span style="color:var(--ctp-subtext0); font-size:12px;">{T('access_pending_login')}</span>
                        )}
                      </td>
                      <td>{item.note || '-'}</td>
                      <td>
                        {isEnv ? (
                          <span class="chip" style="border-color:var(--ctp-yellow); color:var(--ctp-yellow);">
                            {T('access_full_env')}
                          </span>
                        ) : (
                          <div style="display:flex; flex-wrap:wrap; gap:10px;">
                            {DISCORD_PERMISSIONS.map((perm) => (
                              <label
                                style="display:inline-flex; align-items:center; gap:5px; margin-bottom:0; cursor:pointer; font-family:var(--font-mono); font-size:12px; color:var(--ctp-text); white-space:nowrap;"
                              >
                                <input
                                  type="checkbox"
                                  class="row-perm-cb"
                                  data-id={item.discordId}
                                  value={perm}
                                  checked={perms.includes(perm)}
                                  style="width:auto; margin:0;"
                                />
                                <span>{T(PERM_KEY_MAP[perm])}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          class="chip"
                          style={isEnv ? 'border-color:var(--ctp-yellow); color:var(--ctp-yellow);' : ''}
                        >
                          {isEnv ? 'OWNER [ENV]' : 'DB'}
                        </span>
                      </td>
                      <td style="font-family:var(--font-mono); font-size:13px; white-space:nowrap;">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : '-'}
                      </td>
                      <td>
                        {isEnv ? (
                          <span style="font-family:var(--font-mono); font-size:12px; color:var(--ctp-subtext0);">-</span>
                        ) : (
                          <button
                            type="button"
                            class="remove-access-btn"
                            data-id={item.discordId}
                            style="width:auto; padding:4px 12px; font-size:12px; background:var(--ctp-red); border-color:var(--ctp-red);"
                          >
                            {T('access_remove_btn')}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          const form = document.getElementById('addAccessForm');
          const idInput = document.getElementById('discordIdInput');
          const usernameInput = document.getElementById('discordUsernameInput');
          const noteInput = document.getElementById('discordNoteInput');
          const addBtn = document.getElementById('addAccessBtn');
          const statusEl = document.getElementById('accessStatus');
          const tbody = document.getElementById('accessBody');
          const ALL_PERMS = ['dashboard', 'controls', 'config', 'access'];
          const PERM_LABELS = {
            dashboard: __t('access_perm_dashboard'),
            controls: __t('access_perm_controls'),
            config: __t('access_perm_config'),
            access: __t('access_perm_access')
          };

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
              td.colSpan = 7;
              td.style.cssText = 'text-align:center;font-family:var(--font-mono);';
              td.textContent = __t('access_empty_db');
              tr.appendChild(td);
              tbody.appendChild(tr);
              return;
            }
            const envSet = new Set(envIds || []);
            for (const item of items) {
              const isEnv = envSet.has(item.discordId);
              const perms = Array.isArray(item.permissions) ? item.permissions : ['dashboard', 'controls', 'config'];
              const tr = document.createElement('tr');
              tr.dataset.discordId = item.discordId;

              const tdId = document.createElement('td');
              tdId.style.cssText = 'font-family:var(--font-mono);font-weight:700;';
              tdId.textContent = item.discordId;

              const tdUser = document.createElement('td');
              tdUser.style.cssText = 'font-family:var(--font-mono);';
              if (item.username) {
                const strong = document.createElement('strong');
                strong.style.color = 'var(--ctp-accent)';
                strong.textContent = item.username;
                tdUser.appendChild(strong);
              } else {
                const span = document.createElement('span');
                span.style.cssText = 'color:var(--ctp-subtext0);font-size:12px;';
                span.textContent = __t('access_pending_login');
                tdUser.appendChild(span);
              }

              const tdNote = document.createElement('td');
              tdNote.textContent = item.note || '-';

              const tdPerms = document.createElement('td');
              if (isEnv) {
                const envChip = document.createElement('span');
                envChip.className = 'chip';
                envChip.style.cssText = 'border-color:var(--ctp-yellow);color:var(--ctp-yellow);';
                envChip.textContent = __t('access_full_env');
                tdPerms.appendChild(envChip);
              } else {
                const wrap = document.createElement('div');
                wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;';
                for (const p of ALL_PERMS) {
                  const lbl = document.createElement('label');
                  lbl.style.cssText = 'display:inline-flex;align-items:center;gap:5px;margin-bottom:0;cursor:pointer;font-family:var(--font-mono);font-size:12px;color:var(--ctp-text);white-space:nowrap;';
                  const cb = document.createElement('input');
                  cb.type = 'checkbox';
                  cb.className = 'row-perm-cb';
                  cb.dataset.id = item.discordId;
                  cb.value = p;
                  cb.checked = perms.includes(p);
                  cb.style.cssText = 'width:auto;margin:0;';
                  const txt = document.createElement('span');
                  txt.textContent = PERM_LABELS[p] || p;
                  lbl.append(cb, txt);
                  wrap.appendChild(lbl);
                }
                tdPerms.appendChild(wrap);
              }

              const tdSrc = document.createElement('td');
              const chip = document.createElement('span');
              chip.className = 'chip';
              if (isEnv) chip.style.cssText = 'border-color:var(--ctp-yellow);color:var(--ctp-yellow);';
              chip.textContent = isEnv ? 'OWNER [ENV]' : 'DB';
              tdSrc.appendChild(chip);

              const tdTime = document.createElement('td');
              tdTime.style.cssText = 'font-family:var(--font-mono);font-size:13px;white-space:nowrap;';
              tdTime.textContent = item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : '-';

              const tdAct = document.createElement('td');
              if (isEnv) {
                const dash = document.createElement('span');
                dash.style.cssText = 'font-family:var(--font-mono);font-size:12px;color:var(--ctp-subtext0);';
                dash.textContent = '-';
                tdAct.appendChild(dash);
              } else {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'remove-access-btn';
                btn.dataset.id = item.discordId;
                btn.style.cssText = 'width:auto;padding:4px 12px;font-size:12px;background:var(--ctp-red);border-color:var(--ctp-red);';
                btn.textContent = __t('access_remove_btn');
                tdAct.appendChild(btn);
              }

              tr.append(tdId, tdUser, tdNote, tdPerms, tdSrc, tdTime, tdAct);
              tbody.appendChild(tr);
            }
          }

          form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const discordId = (idInput?.value || '').trim();
            const username = (usernameInput?.value || '').trim();
            const note = (noteInput?.value || '').trim();
            const permissions = Array.from(form.querySelectorAll('input[name="perm"]:checked')).map((el) => el.value);
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
                body: JSON.stringify({ discordId, username: username || undefined, note, permissions })
              });
              const d = await res.json().catch(() => ({}));
              if (!res.ok || !d.ok) throw new Error(d.error || ('HTTP ' + res.status));
              renderRows(d.items, d.envIds);
              if (idInput) idInput.value = '';
              if (usernameInput) usernameInput.value = '';
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

          tbody?.addEventListener('change', async (e) => {
            const cb = e.target.closest('.row-perm-cb');
            if (!cb) return;
            const id = cb.dataset.id;
            const tr = cb.closest('tr');
            if (!id || !tr) return;
            const cbs = Array.from(tr.querySelectorAll('.row-perm-cb'));
            const permissions = cbs.filter((el) => el.checked).map((el) => el.value);
            cbs.forEach((el) => { el.disabled = true; });
            try {
              const res = await fetch('/api/manage/access/' + encodeURIComponent(id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permissions })
              });
              const d = await res.json().catch(() => ({}));
              if (!res.ok || !d.ok) throw new Error(d.error || ('HTTP ' + res.status));
              renderRows(d.items, d.envIds);
              showMsg(__t('access_updated_ok', { id }));
            } catch (err) {
              showMsg('Error: ' + err.message, true);
              cbs.forEach((el) => { el.disabled = false; });
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
