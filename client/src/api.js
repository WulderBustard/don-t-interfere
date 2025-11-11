const API = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

// Получаем токен из localStorage
function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { "Content-Type": "application/json", "Authorization": `Bearer ${token}` } : { "Content-Type": "application/json" };
}

// ===== Каналы =====
export async function fetchChannels() {
  const res = await fetch(`${API}/channels`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch channels");
  return res.json();
}

export async function createChannel(name, type) {
  const res = await fetch(`${API}/channels`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, type })
  });

  const data = await res.json();
  if (res.status === 409) throw new Error("exists");
  if (!res.ok) throw new Error(data.error || "create failed");

  return data;
}

export async function deleteChannelApi(id) {
  const res = await fetch(`${API}/channels/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  const data = await res.json();
  if (res.status === 404) throw new Error("not found");
  if (!res.ok) throw new Error(data.error || "delete failed");

  return data;
}

// ===== Сообщения =====
export async function fetchMessages() {
  const res = await fetch(`${API}/messages`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function sendMessageApi(channelId, message) {
  const res = await fetch(`${API}/messages/${channelId}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(message),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to send message");

  return data;
}
