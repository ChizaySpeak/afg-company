const tg = window.Telegram?.WebApp || null;

function initTelegram() {
  if (!tg) return null;

  tg.ready();
  tg.expand();

  return tg;
}

function getTelegramUser() {
  return tg?.initDataUnsafe?.user || null;
}

function getTelegramInitData() {
  return tg?.initData || '';
}

window.AFGTelegram = {
  tg,
  initTelegram,
  getTelegramUser,
  getTelegramInitData
};
