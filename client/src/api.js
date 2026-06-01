function getDefaultApiBase() {
  const fallbackHost = import.meta.env.VITE_API_HOST || "10.21.3.86";

  if (typeof window === "undefined") return `https://${fallbackHost}:3001`;

  const protocol = window.location.protocol || "https:";
  const hostname = window.location.hostname || "localhost";
  const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  const apiHost = isIpAddress ? hostname : fallbackHost;

  return `${protocol}//${apiHost}:3001`;
}

export const API_BASE = (
  import.meta.env.VITE_API_URL?.replace("localhost", "10.21.3.86") ||
  getDefaultApiBase()
).replace(/\/$/, "");

function authHeaders() {
  const token = localStorage.getItem("token");
  return token
    ? {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }
    : {
        "Content-Type": "application/json",
      };
}

function authOnlyHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchChannels() {
  const res = await fetch(`${API_BASE}/channels`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch channels");
  return res.json();
}

export async function createChannel(name, type) {
  const res = await fetch(`${API_BASE}/channels`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, type }),
  });

  const data = await res.json();
  if (res.status === 409) throw new Error("exists");
  if (!res.ok) throw new Error(data.error || "create failed");

  return data;
}

export async function deleteChannelApi(id) {
  const res = await fetch(`${API_BASE}/channels/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  const data = await res.json();
  if (res.status === 404) throw new Error("not found");
  if (!res.ok) throw new Error(data.error || "delete failed");

  return data;
}

export async function fetchMessages() {
  const res = await fetch(`${API_BASE}/messages`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function sendMessageApi(channelId, message) {
  const res = await fetch(`${API_BASE}/messages/${channelId}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(message),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to send message");

  return data;
}

export async function fetchUsers() {
  const res = await fetch(`${API_BASE}/users`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function fetchMe() {
  const res = await fetch(`${API_BASE}/users/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function updatePresence({ status, micMuted }) {
  const res = await fetch(`${API_BASE}/users/me/presence`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status, micMuted }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update presence");
  return data;
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("avatar", file);

  const res = await fetch(`${API_BASE}/users/me/avatar`, {
    method: "POST",
    headers: authOnlyHeaders(),
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to upload avatar");
  return data;
}
