const tgApi = window.AFGTelegram;
const supabaseApi = window.AFGSupabase;

async function testSupabaseConnection() {
  const status = document.getElementById('connection-status');

  if (!supabaseApi?.client) {
    status.textContent = 'Supabase не подключён';
    return;
  }

  try {
    const { error } = await supabaseApi.client
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) throw error;
    status.textContent = 'Telegram подключён · Supabase подключён ✓';
  } catch (error) {
    console.error('Supabase connection error:', error);
    status.textContent = `Supabase: ошибка · ${error.message}`;
  }
}

function showAlert(message) {
  const tg = tgApi?.tg;
  if (tg?.showAlert) tg.showAlert(message);
  else alert(message);
}

function createParticipantsModal() {
  if (document.getElementById('participants-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'participants-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="participants-title">
      <div class="modal-head">
        <div>
          <div class="eyebrow">₳₣₲ · PEOPLE</div>
          <h2 id="participants-title">Участники</h2>
        </div>
        <button class="modal-close" id="participants-close" aria-label="Закрыть">×</button>
      </div>
      <div id="participants-list" class="participants-list">
        <div class="empty-state">Загружаем участников…</div>
      </div>
    </section>
  `;

  document.body.appendChild(modal);
  document.getElementById('participants-close').addEventListener('click', closeParticipants);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeParticipants();
  });
}

function closeParticipants() {
  document.getElementById('participants-modal')?.remove();
}

function getProfileName(profile) {
  return profile.name || profile.full_name || profile.display_name || profile.username || 'Участник AFG';
}

function renderProfile(profile) {
  const name = getProfileName(profile);
  const role = profile.role || 'member';
  const bio = profile.bio || profile.description || 'Профиль пока без описания.';
  const avatar = profile.avatar_url || profile.photo_url || '';
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return `
    <article class="participant-card">
      <div class="participant-avatar">
        ${avatar ? `<img src="${avatar}" alt="">` : `<span>${initials || '₳'}</span>`}
      </div>
      <div class="participant-info">
        <strong>${escapeHtml(name)}</strong>
        <span class="participant-role">${escapeHtml(role)}</span>
        <p>${escapeHtml(bio)}</p>
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function openParticipants() {
  createParticipantsModal();
  const list = document.getElementById('participants-list');

  try {
    const { data, error } = await supabaseApi.client
      .from('profiles')
      .select('*')
      .limit(100);

    if (error) throw error;

    if (!data?.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <strong>Пока никого нет</strong>
          <p>Первый профиль добавим следующим шагом.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = data.map(renderProfile).join('');
  } catch (error) {
    console.error('Profiles error:', error);
    list.innerHTML = `
      <div class="empty-state error-state">
        <strong>Не удалось загрузить участников</strong>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

function boot() {
  const tg = tgApi?.initTelegram();
  const user = tgApi?.getTelegramUser();

  const welcome = document.getElementById('welcome-text');
  const avatar = document.getElementById('user-avatar');

  if (user) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    welcome.textContent = `${name || 'Участник'} — приложение компании готово к работе.`;

    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.trim();
    avatar.textContent = initials || '₳';
  } else {
    welcome.textContent = 'Открой приложение из Telegram, чтобы подключить свой профиль.';
  }

  testSupabaseConnection();

  document.querySelectorAll('.tile').forEach((tile) => {
    tile.addEventListener('click', () => {
      const section = tile.dataset.section;

      if (section === 'participants') {
        openParticipants();
        return;
      }

      showAlert(`Раздел «${tile.querySelector('strong').textContent}» подключим следующим этапом.`);
    });
  });
}

document.addEventListener('DOMContentLoaded', boot);
