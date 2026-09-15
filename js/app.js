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
    status.textContent = 'Supabase подключён, но БД пока не отвечает';
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
      if (tg?.showAlert) {
        tg.showAlert(`Раздел «${tile.querySelector('strong').textContent}» подключим следующим этапом.`);
      } else {
        console.log(`AFG section: ${section}`);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', boot);
