const tgApi = window.AFGTelegram;
const supabaseApi = window.AFGSupabase;
const home = document.getElementById('home');
const section = document.getElementById('section');

function esc(v = '') {
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function initials(p) {
  const s = (p.display_name || p.name || p.username || 'Участник').trim();
  return s.split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '₳';
}

function roleLabel(role) {
  return role === 'admin' ? 'Администратор' : role === 'guest' ? 'Гость' : 'Участник';
}

function bindBack(handler = showHome) {
  document.getElementById('back')?.addEventListener('click', handler);
}

function parseCustomFields(value) {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value || '[]'); } catch { return []; }
}

async function participants() {
  home.classList.add('hidden');
  section.classList.remove('hidden');
  section.innerHTML = '<button class="back" id="back">← Назад</button><div class="section-head"><div><p class="section-kicker">₳₣₲ · PEOPLE</p><h2>Участники</h2></div><button class="primary-btn" id="create-profile">＋ Профиль</button></div><p class="loading" id="participants-loading">Загружаем профили AFG…</p>';
  bindBack();
  document.getElementById('create-profile').onclick = profileForm;
  try {
    const { data, error } = await supabaseApi.client.from('profiles').select('*');
    if (error) throw error;
    if (!data?.length) {
      document.getElementById('participants-loading').outerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><h3>Пока никого нет</h3><p>Создай первый профиль AFG.</p><button class="primary-btn wide" id="empty-create">＋ Создать профиль</button></div>';
      document.getElementById('empty-create').onclick = profileForm;
      return;
    }
    document.getElementById('participants-loading').remove();
    const cards = data.map(p => `<button class="profile-card" data-profile-id="${esc(p.id)}"><div class="profile-avatar">${esc(initials(p))}</div><div><div class="profile-name">${esc(p.display_name || p.name || p.username || 'Участник')}</div><div class="profile-meta">${esc(roleLabel(p.role))}</div></div></button>`).join('');
    section.insertAdjacentHTML('beforeend', cards);
    section.querySelectorAll('[data-profile-id]').forEach(card => card.onclick = () => viewProfile(data.find(p => String(p.id) === card.dataset.profileId)));
  } catch (e) {
    console.error(e);
    document.getElementById('participants-loading').outerHTML = `<p class="error-text">Ошибка загрузки: ${esc(e.message)}</p>`;
  }
}

function profileForm() {
  section.innerHTML = '<button class="back" id="back">← Участники</button><p class="section-kicker">₳₣₲ · PROFILE</p><h2>Создать профиль</h2><p class="form-subtitle">Основные данные плюс любые свои поля.</p><form id="profile-form" class="profile-form"><label>Имя<input name="display_name" required maxlength="80" placeholder="Например, Дмитрий"></label><label>Username<input name="username" maxlength="80" placeholder="@username"></label><label>О себе<textarea name="bio" maxlength="500" rows="4" placeholder="Кто ты и чем занимаешься?"></textarea></label><label>Роль<select name="role"><option value="member">Участник</option><option value="guest">Гость</option><option value="admin">Администратор</option></select></label><label>Навыки<input name="skills" maxlength="300" placeholder="Например: монтаж, авто, кодинг"></label><label>Интересы<input name="interests" maxlength="300" placeholder="Например: машины, игры, спорт"></label><label>Транспорт<input name="transport" maxlength="150" placeholder="Например: Mercedes W221"></label><label>День рождения<input name="birthday" type="date"></label><div class="custom-fields-head"><h3>Свои поля</h3><button class="secondary-btn" type="button" id="add-custom-field">＋ Добавить поле</button></div><div id="custom-fields"></div><button class="primary-btn submit-btn" type="submit">Создать профиль</button><p class="form-error" id="form-error"></p></form>';
  bindBack(participants);
  document.getElementById('add-custom-field').onclick = () => addCustomField();
  document.getElementById('profile-form').onsubmit = saveProfile;
}

function addCustomField(field = {label:'', type:'text', value:''}) {
  const box = document.getElementById('custom-fields');
  const row = document.createElement('div');
  row.className = 'custom-field-row';
  row.innerHTML = `<input class="custom-label" maxlength="80" placeholder="Название поля" value="${esc(field.label)}"><select class="custom-type"><option value="text">Текст</option><option value="number">Число</option><option value="date">Дата</option><option value="url">Ссылка</option></select><input class="custom-value" placeholder="Значение" value="${esc(field.value)}"><button type="button" class="remove-custom">×</button>`;
  box.appendChild(row);
  row.querySelector('.custom-type').value = field.type || 'text';
  row.querySelector('.custom-type').onchange = e => {
    const input = row.querySelector('.custom-value');
    input.type = e.target.value === 'number' ? 'number' : e.target.value === 'date' ? 'date' : e.target.value === 'url' ? 'url' : 'text';
  };
  row.querySelector('.remove-custom').onclick = () => row.remove();
}

function collectCustomFields() {
  return [...document.querySelectorAll('.custom-field-row')].map(row => ({
    label: row.querySelector('.custom-label').value.trim(),
    type: row.querySelector('.custom-type').value,
    value: row.querySelector('.custom-value').value.trim()
  })).filter(f => f.label && f.value);
}

async function saveProfile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const errorBox = document.getElementById('form-error');
  button.disabled = true;
  button.textContent = 'Сохраняем…';
  errorBox.textContent = '';
  const user = tgApi?.getTelegramUser();
  const fd = new FormData(form);
  const payload = {
    display_name: String(fd.get('display_name') || '').trim(),
    username: String(fd.get('username') || '').trim().replace(/^@/, ''),
    bio: String(fd.get('bio') || '').trim(),
    role: fd.get('role') || 'member',
    skills: String(fd.get('skills') || '').trim(),
    interests: String(fd.get('interests') || '').trim(),
    transport: String(fd.get('transport') || '').trim(),
    birthday: fd.get('birthday') || null,
    custom_fields: collectCustomFields()
  };
  if (user?.id) payload.telegram_id = user.id;
  Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === null || (Array.isArray(payload[k]) && !payload[k].length)) delete payload[k]; });
  try {
    if (user?.id) {
      const { data: existing, error: lookupError } = await supabaseApi.client.from('profiles').select('id').eq('telegram_id', user.id).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) throw new Error('Профиль для этого Telegram уже существует. Открой его в списке участников.');
    }
    const { error } = await supabaseApi.client.from('profiles').insert(payload);
    if (error) throw error;
    await participants();
  } catch (e) {
    console.error(e);
    errorBox.textContent = `Не удалось создать профиль: ${e.message}`;
    button.disabled = false;
    button.textContent = 'Создать профиль';
  }
}

function viewProfile(p) {
  const custom = parseCustomFields(p.custom_fields);
  const name = p.display_name || p.name || p.username || 'Участник';
  const fields = [['Username', p.username ? `@${p.username}` : ''], ['О себе', p.bio], ['Роль', roleLabel(p.role)], ['Навыки', p.skills], ['Интересы', p.interests], ['Транспорт', p.transport], ['День рождения', p.birthday]].filter(([,v]) => v);
  const standard = fields.map(([k,v]) => `<div class="profile-detail"><strong>${esc(k)}</strong><span>${esc(v)}</span></div>`).join('');
  const extra = custom.length ? `<h3 class="profile-extra-title">Дополнительно</h3>${custom.map(f => `<div class="profile-detail"><strong>${esc(f.label)}</strong><span>${esc(f.value)}</span></div>`).join('')}` : '';
  section.innerHTML = `<button class="back" id="back">← Участники</button><div class="profile-view"><div class="profile-avatar large">${esc(initials(p))}</div><p class="section-kicker">₳₣₲ · MEMBER</p><h2>${esc(name)}</h2>${standard}${extra}</div>`;
  bindBack(participants);
}

function showHome() { section.classList.add('hidden'); home.classList.remove('hidden'); }

async function boot() {
  const tg = tgApi?.initTelegram();
  const user = tgApi?.getTelegramUser();
  if (user) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    document.getElementById('welcome-text').textContent = `${name || 'Участник'} — приложение компании готово к работе.`;
    const initialsText = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`;
    document.getElementById('user-avatar').textContent = initialsText || '₳';
  }
  try {
    const { error } = await supabaseApi.client.from('profiles').select('id').limit(1);
    if (error) throw error;
    document.getElementById('connection-status').textContent = 'AFG v2 · Telegram подключён · Supabase подключён ✓';
  } catch (e) {
    document.getElementById('connection-status').textContent = `AFG v2 · Supabase: ошибка · ${e.message}`;
  }
  document.querySelectorAll('.tile').forEach(tile => tile.onclick = () => tile.dataset.section === 'participants' ? participants() : tg?.showAlert?.(`Раздел «${tile.querySelector('strong').textContent}» добавим следующим этапом.`));
}

document.addEventListener('DOMContentLoaded', boot);