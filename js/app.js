const tgApi = window.AFGTelegram;

function boot() {
  const tg = tgApi?.initTelegram();
  const user = tgApi?.getTelegramUser();

  const welcome = document.getElementById('welcome-text');
  const avatar = document.getElementById('user-avatar');
  const status = document.getElementById('connection-status');

  if (user) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    welcome.textContent = `${name || 'Участник'} — приложение компании готово к подключению.`;

    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.trim();
    avatar.textContent = initials || '₳';
  } else {
    welcome.textContent = 'Открой приложение из Telegram, чтобы подключить свой профиль.';
  }

  if (tg) {
    status.textContent = 'Telegram подключён · Supabase подключим следующим этапом';
  }

  document.querySelectorAll('.tile').forEach((tile) => {
    tile.addEventListener('click', () => {
      const section = tile.dataset.section;
      if (tg?.showAlert) {
        tg.showAlert(`Раздел «${tile.querySelector('strong').textContent}» подключим следующим этапом.`);
      } else {
        console.log(`AFG section: ${section}`);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', boot);
