// AFG Places patch
// Places photos use Supabase Storage bucket: afg-places
window.AFGPlaceFix = true;

const PLACE_PHOTO_BUCKET = 'afg-places';

function getPlacePhotoFiles(form) {
  const input = form.querySelector('#place-photos');
  return input?.files ? [...input.files] : [];
}

async function uploadPlacePhotos(files, placeId) {
  if (!files.length) return [];

  const storage = window.AFGSupabase.client.storage.from(PLACE_PHOTO_BUCKET);
  const uploaded = [];

  for (const file of files) {
    if (!file.type.startsWith('image/')) throw new Error(`Файл «${file.name}» не является изображением.`);
    if (file.size > 10 * 1024 * 1024) throw new Error(`Фото «${file.name}» больше 10 МБ.`);

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${placeId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await storage.upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });
    if (error) throw error;

    const { data } = storage.getPublicUrl(path);
    if (data?.publicUrl) uploaded.push(data.publicUrl);
  }

  return uploaded;
}

function placePhotoPreview(files) {
  const preview = document.getElementById('place-photo-preview');
  if (!preview) return;
  preview.innerHTML = '';

  files.forEach((file) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.src = url;
    img.alt = file.name;
    img.onload = () => URL.revokeObjectURL(url);
    preview.appendChild(img);
  });
}

function placeForm(existing = null) {
  const existingPhotos = Array.isArray(existing?.photos) ? existing.photos : [];

  section.innerHTML = `
    <button class="back" id="back">← Места</button>
    <p class="section-kicker">₳₣₲ · PLACE</p>
    <h2>${existing ? 'Редактировать место' : 'Добавить место'}</h2>
    <p class="form-subtitle">Сохраним место в общей базе AFG.</p>
    <form id="place-form" class="profile-form">
      <label>Название<input name="name" required maxlength="120" value="${esc(existing?.name || '')}" placeholder="Например: Crazy Daisy"></label>
      <label>Категория<input name="category" maxlength="80" value="${esc(existing?.category || '')}" placeholder="Бар, ресторан, клуб, спорт…"></label>
      <label>Адрес<input name="address" maxlength="250" value="${esc(existing?.address || '')}" placeholder="Адрес или ориентир"></label>
      <label>Ссылка<input name="url" type="url" maxlength="500" value="${esc(existing?.url || '')}" placeholder="https://…"></label>
      <label>Описание<textarea name="description" maxlength="1000" rows="5" placeholder="Что это за место и зачем оно нам?">${esc(existing?.description || '')}</textarea></label>
      <div class="place-photo-field">
        <div class="place-photo-head">
          <div>
            <strong>📸 Фотографии</strong>
            <small>До 10 МБ на фото</small>
          </div>
          <label class="photo-add-btn" for="place-photos">＋ Фото</label>
        </div>
        <input id="place-photos" name="photos" type="file" accept="image/*" multiple hidden>
        <div id="place-photo-preview" class="place-photo-preview"></div>
        ${existingPhotos.length ? `<p class="photo-existing-hint">Уже загружено: ${existingPhotos.length}. Новые фото добавятся к ним.</p>` : ''}
      </div>
      <button class="primary-btn submit-btn" type="submit">${existing ? 'Сохранить изменения' : 'Добавить место'}</button>
      <p class="form-error" id="place-error"></p>
    </form>
  `;

  bindBack(places);
  const photoInput = document.getElementById('place-photos');
  photoInput?.addEventListener('change', () => placePhotoPreview(getPlacePhotoFiles(document.getElementById('place-form'))));
  document.getElementById('place-form').onsubmit = e => savePlace(e, existing);
}

async function savePlace(e, existing = null) {
  e.preventDefault();
  const f = e.currentTarget;
  const b = f.querySelector('button[type="submit"]');
  const err = document.getElementById('place-error');
  b.disabled = true;
  b.textContent = 'Сохраняем…';
  err.textContent = '';

  const fd = new FormData(f);
  const p = {
    name: String(fd.get('name') || '').trim(),
    category: String(fd.get('category') || '').trim(),
    address: String(fd.get('address') || '').trim(),
    url: String(fd.get('url') || '').trim(),
    description: String(fd.get('description') || '').trim()
  };

  Object.keys(p).forEach(k => { if (p[k] === '') delete p[k]; });

  try {
    const placeId = existing?.id || crypto.randomUUID();
    const oldPhotos = Array.isArray(existing?.photos) ? existing.photos : [];
    const newPhotos = await uploadPlacePhotos(getPlacePhotoFiles(f), placeId);
    const photos = [...oldPhotos, ...newPhotos];

    if (photos.length) p.photos = photos;
    else if (existing?.id) p.photos = [];

    if (existing?.id) {
      const { error } = await window.AFGSupabase.client
        .from('places')
        .update(p)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      p.id = placeId;
      const { error } = await window.AFGSupabase.client
        .from('places')
        .insert(p);
      if (error) throw error;
    }

    await places();
  } catch (x) {
    console.error(x);
    err.textContent = `Не удалось сохранить: ${x.message}`;
    b.disabled = false;
    b.textContent = existing ? 'Сохранить изменения' : 'Добавить место';
  }
}

function closeDeleteModal() {
  document.getElementById('afg-delete-modal')?.remove();
}

function showDeleteModal(place) {
  closeDeleteModal();
  const modal = document.createElement('div');
  modal.id = 'afg-delete-modal';
  modal.className = 'afg-modal-backdrop';
  modal.innerHTML = `
    <div class="afg-modal" role="dialog" aria-modal="true" aria-labelledby="afg-delete-title">
      <p class="section-kicker">₳₣₲ · PLACES</p>
      <h3 id="afg-delete-title">Удалить место?</h3>
      <p>Ты точно хочешь удалить <strong>${esc(place.name || 'Без названия')}</strong>?</p>
      <div class="afg-modal-actions">
        <button type="button" class="secondary-btn wide" id="afg-delete-cancel">Отмена</button>
        <button type="button" class="primary-btn wide danger-btn" id="afg-delete-confirm">Удалить</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('afg-delete-cancel').onclick = closeDeleteModal;
  document.getElementById('afg-delete-confirm').onclick = async () => {
    const button = document.getElementById('afg-delete-confirm');
    button.disabled = true;
    button.textContent = 'Удаляем…';
    try {
      const { error } = await window.AFGSupabase.client.from('places').delete().eq('id', place.id);
      if (error) throw error;
      closeDeleteModal();
      await places();
    } catch (x) {
      console.error(x);
      button.disabled = false;
      button.textContent = 'Удалить';
      alert(`Не удалось удалить место: ${x.message}`);
    }
  };
  modal.addEventListener('click', e => { if (e.target === modal) closeDeleteModal(); });
}

async function deletePlace(placeId) {
  const place = currentPlaces.find(p => String(p.id) === String(placeId));
  if (!place) return;
  showDeleteModal(place);
}

function viewPlace(p) {
  if (!p) return;
  const name = p.name || 'Без названия';
  const category = p.category || 'Место AFG';
  const address = p.address || '';
  const description = p.description || '';
  const rating = p.rating !== null && p.rating !== undefined && p.rating !== '' ? `⭐ ${esc(p.rating)}` : '';
  const link = p.url ? `<a class="place-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">🔗 Открыть ссылку</a>` : '';
  const photos = Array.isArray(p.photos) ? p.photos.filter(Boolean) : [];
  const gallery = photos.length ? `
    <div class="place-gallery" aria-label="Фотографии места">
      ${photos.map((url, i) => `<button type="button" class="place-photo" data-photo-index="${i}"><img src="${esc(url)}" alt="${esc(name)} — фото ${i + 1}" loading="lazy"></button>`).join('')}
    </div>
  ` : '';
  const addressBlock = address ? `<div class="profile-detail"><strong>📍 Адрес</strong><span>${esc(address)}</span></div>` : '';
  const ratingBlock = rating ? `<div class="profile-detail"><strong>Рейтинг</strong><span>${rating}</span></div>` : '';
  const descriptionBlock = description ? `<div class="profile-detail"><strong>Описание</strong><span>${esc(description)}</span></div>` : '';

  section.innerHTML = `
    <button class="back" id="back">← Места</button>
    <div class="profile-view place-view">
      ${gallery}
      <div class="profile-avatar large">📍</div>
      <p class="section-kicker">₳₣₲ · PLACE</p>
      <h2>${esc(name)}</h2>
      <p class="form-subtitle">${esc(category)}</p>
      ${addressBlock}
      ${ratingBlock}
      ${descriptionBlock}
      ${link}
      <div class="place-actions">
        <button class="primary-btn wide" id="edit-place">✏️ Редактировать место</button>
        <button class="secondary-btn wide danger-btn" id="delete-place">🗑️ Удалить место</button>
      </div>
    </div>
  `;

  bindBack(places);
  document.getElementById('edit-place')?.addEventListener('click', () => placeForm(p));
  document.getElementById('delete-place')?.addEventListener('click', () => deletePlace(p.id));
  section.querySelectorAll('.place-photo').forEach(btn => btn.addEventListener('click', () => openPlacePhotoViewer(photos, Number(btn.dataset.photoIndex), name)));
}

function openPlacePhotoViewer(photos, index, name) {
  if (!photos.length) return;
  let current = index;
  const modal = document.createElement('div');
  modal.className = 'place-photo-viewer';
  modal.innerHTML = `
    <button class="photo-viewer-close" type="button" aria-label="Закрыть">×</button>
    <button class="photo-viewer-nav photo-viewer-prev" type="button" aria-label="Предыдущее фото">‹</button>
    <img class="photo-viewer-image" alt="">
    <button class="photo-viewer-nav photo-viewer-next" type="button" aria-label="Следующее фото">›</button>
    <div class="photo-viewer-count"></div>
  `;
  document.body.appendChild(modal);

  const image = modal.querySelector('.photo-viewer-image');
  const count = modal.querySelector('.photo-viewer-count');
  const render = () => {
    image.src = photos[current];
    image.alt = `${name} — фото ${current + 1}`;
    count.textContent = `${current + 1} / ${photos.length}`;
  };
  const close = () => modal.remove();
  modal.querySelector('.photo-viewer-close').onclick = close;
  modal.querySelector('.photo-viewer-prev').onclick = () => { current = (current - 1 + photos.length) % photos.length; render(); };
  modal.querySelector('.photo-viewer-next').onclick = () => { current = (current + 1) % photos.length; render(); };
  modal.onclick = e => { if (e.target === modal) close(); };
  document.addEventListener('keydown', function onKey(e) {
    if (!document.body.contains(modal)) { document.removeEventListener('keydown', onKey); return; }
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    if (e.key === 'ArrowLeft') { current = (current - 1 + photos.length) % photos.length; render(); }
    if (e.key === 'ArrowRight') { current = (current + 1) % photos.length; render(); }
  });
  render();
}

// Search + category filters for Places
let placesSearchQuery = '';
let placesCategoryFilter = 'all';

function renderPlacesList() {
  const list = document.getElementById('places-list');
  const empty = document.getElementById('places-filter-empty');
  if (!list) return;

  const query = placesSearchQuery.trim().toLowerCase();
  const filtered = currentPlaces.filter(p => {
    const category = String(p.category || '').trim();
    const haystack = [p.name, p.address, p.description, category].map(v => String(v || '').toLowerCase()).join(' ');
    const matchesSearch = !query || haystack.includes(query);
    const matchesCategory = placesCategoryFilter === 'all' || category === placesCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  list.innerHTML = filtered.map(p => `<button class="profile-card" data-place-id="${esc(p.id)}"><div class="profile-avatar">📍</div><div><div class="profile-name">${esc(p.name || 'Без названия')}</div><div class="profile-meta">${esc(p.address || p.category || 'Место AFG')}</div></div></button>`).join('');
  list.querySelectorAll('[data-place-id]').forEach(c => c.onclick = () => viewPlace(currentPlaces.find(p => String(p.id) === c.dataset.placeId)));

  if (empty) empty.classList.toggle('hidden', filtered.length !== 0);
}

function placesFilters() {
  const categories = [...new Set(currentPlaces.map(p => String(p.category || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'ru'));
  return `
    <div class="places-tools">
      <input id="places-search" class="places-search" type="search" maxlength="100" placeholder="🔎 Найти место…" autocomplete="off">
      <div class="places-filters" id="places-filters">
        <button type="button" class="places-filter active" data-category="all">Все</button>
        ${categories.map(c => `<button type="button" class="places-filter" data-category="${esc(c)}">${esc(c)}</button>`).join('')}
      </div>
    </div>
  `;
}

async function places() {
  home.classList.add('hidden');
  section.classList.remove('hidden');
  section.innerHTML = '<button class="back" id="back">← Назад</button><div class="section-head"><div><p class="section-kicker">₳₣₲ · PLACES</p><h2>Места</h2></div><button class="primary-btn" id="create-place">＋ Место</button></div><p class="loading" id="places-loading">Загружаем места AFG…</p>';
  bindBack();

  try {
    const { data, error } = await supabaseApi.client.from('places').select('*').order('name', { ascending: true });
    if (error) throw error;
    currentPlaces = data || [];

    document.getElementById('create-place').onclick = () => placeForm();

    if (!currentPlaces.length) {
      document.getElementById('places-loading').outerHTML = '<div class="empty-state"><div class="empty-icon">📍</div><h3>Пока мест нет</h3><p>Добавь первое место AFG.</p><button class="primary-btn wide" id="empty-place">＋ Добавить место</button></div>';
      document.getElementById('empty-place').onclick = () => placeForm();
      return;
    }

    document.getElementById('places-loading').remove();
    placesSearchQuery = '';
    placesCategoryFilter = 'all';
    section.insertAdjacentHTML('beforeend', placesFilters() + '<div id="places-filter-empty" class="places-filter-empty hidden"><div class="empty-icon">🔎</div><h3>Ничего не нашли</h3><p>Попробуй изменить запрос или фильтр.</p></div><div id="places-list"></div>');

    const search = document.getElementById('places-search');
    search.addEventListener('input', () => {
      placesSearchQuery = search.value;
      renderPlacesList();
    });

    document.querySelectorAll('.places-filter').forEach(btn => btn.addEventListener('click', () => {
      placesCategoryFilter = btn.dataset.category || 'all';
      document.querySelectorAll('.places-filter').forEach(x => x.classList.toggle('active', x === btn));
      renderPlacesList();
    }));

    renderPlacesList();
  } catch (e) {
    console.error(e);
    const loading = document.getElementById('places-loading');
    if (loading) loading.outerHTML = `<div class="empty-state"><div class="empty-icon">📍</div><h3>Не удалось загрузить места</h3><p>Проверь подключение к Supabase.</p><small>${esc(e.message)}</small></div>`;
  }
}
