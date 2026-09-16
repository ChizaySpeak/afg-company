// AFG Places fix: places.created_by is UUID, while Telegram user id is numeric.
// Keep creator empty for now; creator/profile linking will be added through profiles.id later.
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
