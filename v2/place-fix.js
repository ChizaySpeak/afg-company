// AFG Places patch
// places.created_by is UUID, Telegram user id is numeric — keep creator empty for now.
window.AFGPlaceFix = true;

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

  Object.keys(p).forEach((k) => {
    if (p[k] === '') delete p[k];
  });

  try {
    if (existing?.id) {
      const { error } = await window.AFGSupabase.client
        .from('places')
        .update(p)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
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
      const { error } = await window.AFGSupabase.client
        .from('places')
        .delete()
        .eq('id', place.id);
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

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeDeleteModal();
  });
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
  const rating = p.rating !== null && p.rating !== undefined && p.rating !== ''
    ? `⭐ ${esc(p.rating)}`
    : '';
  const link = p.url
    ? `<a class="place-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">🔗 Открыть ссылку</a>`
    : '';

  const addressBlock = address
    ? `<div class="profile-detail"><strong>📍 Адрес</strong><span>${esc(address)}</span></div>`
    : '';
  const ratingBlock = rating
    ? `<div class="profile-detail"><strong>Рейтинг</strong><span>${rating}</span></div>`
    : '';
  const descriptionBlock = description
    ? `<div class="profile-detail"><strong>Описание</strong><span>${esc(description)}</span></div>`
    : '';

  section.innerHTML = `
    <button class="back" id="back">← Места</button>
    <div class="profile-view place-view">
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
}
