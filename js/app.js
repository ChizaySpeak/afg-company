const tgApi = window.AFGTelegram;
const supabaseApi = window.AFGSupabase;

async function testSupabaseConnection() {
  const status = document.getElementById('connection-status');
  if (!supabaseApi?.client) { status.textContent = 'Supabase не подключён'; return; }
  try {
    const { error } = await supabaseApi.client.from('profiles').select('id').limit(1);
    if (error) throw error;
    status.textContent = 'Telegram подключён · Supabase подключён ✓';
  } catch (error) {
    console.error('Supabase connection error:', error);
    status.textContent = `Supabase: ошибка · ${error.message}`;
  }
}

function showAlert(message) {
  const tg = tgApi?.tg;
  if (tg?.showAlert) tg.showAlert(message); else alert(message);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function createParticipantsModal() {
  if (document.getElementById('participants-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'participants-modal'; modal.className = 'modal-backdrop';
  modal.innerHTML = `<section class="modal-card" role="dialog" aria-modal="true">
    <div class="modal-head"><div><div class="eyebrow">₳₣₲ · PEOPLE</div><h2>Участники</h2></div><button class="modal-close" id="participants-close" aria-label="Закрыть">×</button></div>
    <div id="participants-list" class="participants-list"><div class="empty-state">Загружаем участников…</div></div>
  </section>`;
  document.body.appendChild(modal);
  document.getElementById('participants-close').addEventListener('click', closeParticipants);
  modal.addEventListener('click', (event) => { if (event.target === modal) closeParticipants(); });
}
function closeParticipants() { document.getElementById('participants-modal')?.remove(); }
function getProfileName(profile) { return profile.name || profile.full_name || profile.display_name || profile.username || 'Участник AFG'; }
function renderProfile(profile) {
  const name = getProfileName(profile), role = profile.role || 'member';
  const bio = profile.bio || profile.description || 'Профиль пока без описания.';
  const avatar = profile.avatar_url || profile.photo_url || '';
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return `<article class="participant-card"><div class="participant-avatar">${avatar ? `<img src="${avatar}" alt="">` : `<span>${initials || '₳'}</span>`}</div><div class="participant-info"><strong>${escapeHtml(name)}</strong><span class="participant-role">${escapeHtml(role)}</span><p>${escapeHtml(bio)}</p></div></article>`;
}
async function openParticipants() {
  createParticipantsModal(); const list = document.getElementById('participants-list');
  try {
    const { data, error } = await supabaseApi.client.from('profiles').select('*').limit(100);
    if (error) throw error;
    if (!data?.length) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><strong>Пока никого нет</strong><p>Первый профиль добавим следующим шагом.</p></div>`; return; }
    list.innerHTML = data.map(renderProfile).join('');
  } catch (error) {
    console.error('Profiles error:', error);
    list.innerHTML = `<div class="empty-state error-state"><strong>Не удалось загрузить участников</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function createPlacesModal() {
  if (document.getElementById('places-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'places-modal'; modal.className = 'modal-backdrop';
  modal.innerHTML = `<section class="modal-card" role="dialog" aria-modal="true">
    <div class="modal-head"><div><div class="eyebrow">₳₣₲ · PLACES</div><h2>Места</h2></div><button class="modal-close" id="places-close" aria-label="Закрыть">×</button></div>
    <div class="places-actions"><button class="primary-button" id="place-add">＋ Добавить место</button></div>
    <div id="places-list" class="participants-list"><div class="empty-state">Загружаем места…</div></div>
  </section>`;
  document.body.appendChild(modal);
  document.getElementById('places-close').addEventListener('click', closePlaces);
  document.getElementById('place-add').addEventListener('click', openAddPlace);
  modal.addEventListener('click', (event) => { if (event.target === modal) closePlaces(); });
}
function closePlaces() { document.getElementById('places-modal')?.remove(); }
function renderPlace(place) {
  const category = place.category || 'место';
  const rating = place.rating !== null && place.rating !== undefined ? `⭐ ${place.rating}` : '';
  const address = place.address || 'Адрес пока не указан';
  const description = place.description || 'Без описания.';
  const tags = Array.isArray(place.tags) ? place.tags : [];
  return `<article class="participant-card"><div class="participant-avatar"><span>📍</span></div><div class="participant-info"><strong>${escapeHtml(place.name || 'Место без названия')}</strong><span class="participant-role">${escapeHtml(category)}${rating ? ` · ${escapeHtml(rating)}` : ''}</span><p>${escapeHtml(address)}<br>${escapeHtml(description)}${tags.length ? `<br>${tags.map((tag) => `#${escapeHtml(tag)}`).join(' ')}` : ''}</p></div></article>`;
}
async function openPlaces() {
  createPlacesModal(); const list = document.getElementById('places-list');
  try {
    const { data, error } = await supabaseApi.client.from('places').select('id, name, category, description, address, rating, tags, url, created_at').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    if (!data?.length) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">📍</div><strong>Мест пока нет</strong><p>Добавим первую локацию следующим шагом.</p></div>`; return; }
    list.innerHTML = data.map(renderPlace).join('');
  } catch (error) {
    console.error('Places error:', error);
    list.innerHTML = `<div class="empty-state error-state"><strong>Не удалось загрузить места</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function createAddPlaceModal() {
  if (document.getElementById('add-place-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'add-place-modal'; modal.className = 'modal-backdrop';
  modal.innerHTML = `<section class="modal-card" role="dialog" aria-modal="true">
    <div class="modal-head"><div><div class="eyebrow">₳₣₲ · PLACES</div><h2>Новое место</h2></div><button class="modal-close" id="add-place-close" aria-label="Закрыть">×</button></div>
    <form id="add-place-form" class="place-form">
      <label>Название<input name="name" type="text" placeholder="Например, AFG Office" required></label>
      <label>Категория<input name="category" type="text" placeholder="Клуб, ресторан, офис…"></label>
      <label>Адрес<input name="address" type="text" placeholder="Адрес или ориентир"></label>
      <label>Описание<textarea name="description" rows="3" placeholder="Что важно знать об этом месте?"></textarea></label>
      <label>Рейтинг<input name="rating" type="number" min="0" max="5" step="0.1" placeholder="0–5"></label>
      <label>Теги<input name="tags" type="text" placeholder="например: тусовка, спорт, центр"></label>
      <label>Ссылка<input name="url" type="url" placeholder="https://…"></label>
      <div class="form-actions"><button type="button" class="secondary-button" id="add-place-back">← Назад</button><button type="submit" class="primary-button">Сохранить место</button></div>
    </form>
  </section>`;
  document.body.appendChild(modal);
  document.getElementById('add-place-close').addEventListener('click', closeAddPlace);
  document.getElementById('add-place-back').addEventListener('click', closeAddPlace);
  document.getElementById('add-place-form').addEventListener('submit', savePlace);
}
function closeAddPlace() { document.getElementById('add-place-modal')?.remove(); }
function openAddPlace() { createAddPlaceModal(); }
async function savePlace(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const name = String(formData.get('name') || '').trim();
  const category = String(formData.get('category') || '').trim() || null;
  const address = String(formData.get('address') || '').trim() || null;
  const description = String(formData.get('description') || '').trim() || null;
  const url = String(formData.get('url') || '').trim() || null;
  const tagsRaw = String(formData.get('tags') || '').trim();
  const tags = tagsRaw ? tagsRaw.split(',').map((tag) => tag.trim()).filter(Boolean) : [];
  const ratingRaw = String(formData.get('rating') || '').trim();
  const rating = ratingRaw ? Number(ratingRaw) : null;
  if (!name) return;
  submit.disabled = true; submit.textContent = 'Сохраняем…';
  try {
    const { error } = await supabaseApi.client.from('places').insert({ name, category, address, description, rating, tags, url });
    if (error) throw error;
    closeAddPlace();
    await openPlaces();
    showAlert('Место добавлено ✓');
  } catch (error) {
    console.error('Create place error:', error);
    showAlert(`Не удалось сохранить место: ${error.message}`);
    submit.disabled = false; submit.textContent = 'Сохранить место';
  }
}

function boot() {
  tgApi?.initTelegram();
  const user = tgApi?.getTelegramUser();
  const welcome = document.getElementById('welcome-text'), avatar = document.getElementById('user-avatar');
  if (user) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    welcome.textContent = `${name || 'Участник'} — приложение компании готово к работе.`;
    avatar.textContent = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.trim() || '₳';
  } else welcome.textContent = 'Открой приложение из Telegram, чтобы подключить свой профиль.';
  testSupabaseConnection();
  document.querySelectorAll('.tile').forEach((tile) => tile.addEventListener('click', () => {
    const section = tile.dataset.section;
    if (section === 'participants') return openParticipants();
    if (section === 'places') return openPlaces();
    showAlert(`Раздел «${tile.querySelector('strong').textContent}» подключим следующим этапом.`);
  }));
}

document.addEventListener('DOMContentLoaded', boot);
