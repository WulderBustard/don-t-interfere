// client/src/api.js

// Vite использует import.meta.env для переменных окружения вместо process.env
// Получаем базовый URL API из переменной окружения VITE_API_URL или используем локальный адрес
const API = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

// ===== Каналы =====

// Получить список каналов
export async function fetchChannels() {
  const res = await fetch(`${API}/channels`);
  if (!res.ok) throw new Error("Failed to fetch channels");
  return res.json(); // [{id, name, type, created_at}, ...]
}

// Создать новый канал
export async function createChannel(name, type) {
  const res = await fetch(`${API}/channels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, type })
  });

  if (res.status === 409) throw new Error("exists");
  if (!res.ok) throw new Error("create failed");

  return res.json();
}

// Удалить канал по id
export async function deleteChannelApi(id) {
  const res = await fetch(`${API}/channels/${id}`, { method: "DELETE" });
  if (res.status === 404) throw new Error("not found");
  if (!res.ok) throw new Error("delete failed");
  return res.json();
}

// ===== Сообщения =====

// Получить все сообщения по всем каналам
export async function fetchMessages() {
  const res = await fetch(`${API}/messages`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json(); // { [channelId]: [ {user, text, time}, ... ] }
}

// Отправить сообщение в конкретный канал
export async function sendMessageApi(channelId, message) {
  const res = await fetch(`${API}/messages/${channelId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json(); // возвращает сохранённое сообщение
}
