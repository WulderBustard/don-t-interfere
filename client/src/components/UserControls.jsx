import React, { useState, useEffect, useRef, useContext } from "react";
import { AuthContext } from "../AuthContext";
import { uploadAvatar } from "../api";
import UserAvatar from "./UserAvatar";

function statusLabel(status) {
  return status === "online" ? "В сети" : "Не в сети";
}

function statusEmoji(status) {
  return status === "online" ? "🟢" : "⚫";
}

export default function UserControls({
  status,
  onChangeStatus,
  micMuted,
  onToggleMic,
  onLeaveVoice,
  onUserUpdated,
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileRef = useRef(null);
  const ref = useRef(null);
  const { user, logout, updateUser } = useContext(AuthContext);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setStatusOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setAvatarError("");

    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("JPG, PNG или WEBP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Максимум 2 МБ");
      return;
    }

    setAvatarLoading(true);
    try {
      const nextUser = await uploadAvatar(file);
      updateUser(nextUser);
      onUserUpdated?.(nextUser);
    } catch (err) {
      setAvatarError(err.message || "Ошибка аватара");
    } finally {
      setAvatarLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="user-controls" ref={ref}>
      <UserAvatar
        user={user}
        status={status}
        onClick={() => setStatusOpen((prev) => !prev)}
        title="Изменить статус"
      />

      <div className="user-info">
        <span className="username">{user.username}</span>
        {avatarError && <span className="avatar-error">{avatarError}</span>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="avatar-input"
        onChange={handleAvatarChange}
      />

      <div className="actions">
        <button
          className={`mic ${micMuted ? "muted" : ""}`}
          onClick={onToggleMic}
          title={micMuted ? "Микрофон выключен" : "Микрофон включен"}
        >
          {micMuted ? "🔇" : "🎙️"}
        </button>

        {onLeaveVoice && (
          <button className="leave-voice" onClick={onLeaveVoice} title="Выйти из голосового канала">
            🔈×
          </button>
        )}

        <button className="btn-settings" title="Настройки" onClick={() => setMenuOpen((prev) => !prev)}>
          ⚙️
        </button>

        {menuOpen && (
          <div className="status-menu settings-menu">
            <button onClick={() => fileRef.current?.click()} disabled={avatarLoading}>
              {avatarLoading ? "Загрузка..." : "Сменить аватар"}
            </button>
            <button className="logout-button" onClick={() => logout()}>
              🔒 Выйти
            </button>
          </div>
        )}
      </div>

      {statusOpen && (
        <div className="status-menu">
          {["online", "offline"].map((item) => (
            <button
              key={item}
              className={item === status ? "active" : ""}
              onClick={() => {
                onChangeStatus(item);
                setStatusOpen(false);
              }}
            >
              {statusEmoji(item)} {statusLabel(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
