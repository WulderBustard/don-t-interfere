// ====================== Вспомогательные функции ======================

// Эмодзи для статуса пользователя
export const statusEmoji = (s) =>
  ({
    online: "🟢",
    idle: "🟡",
    dnd: "⛔",
    offline: "⚫",
  }[s] || "⚫");

// Подписи статусов (для тултипов и меню)
export const statusLabel = (s) =>
  ({
    online: "Онлайн",
    idle: "Нет на месте",
    dnd: "Не беспокоить",
    offline: "Невидимый",
  }[s] || "Невидимый");

// CSS-класс для статуса
export const statusClass = (s) =>
  ({
    online: "status-online",
    idle: "status-idle",
    dnd: "status-dnd",
    offline: "status-offline",
  }[s] || "status-offline");

// Текущее время в формате HH:MM
export const timeHHMM = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
