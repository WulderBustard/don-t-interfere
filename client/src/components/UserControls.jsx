import React, { useState, useEffect, useRef, useContext } from "react";
import { AuthContext } from "../AuthContext"; // путь подкорректируй

function statusClass(status) {
  switch (status) {
    case "online": return "online";
    case "idle": return "idle";
    case "dnd": return "dnd";
    default: return "offline";
  }
}
function statusLabel(status) {
  switch (status) {
    case "online": return "В сети";
    case "idle": return "Не активен";
    case "dnd": return "Не беспокоить";
    default: return "Не в сети";
  }
}
function statusEmoji(status) {
  switch (status) {
    case "online": return "🟢";
    case "idle": return "🌙";
    case "dnd": return "⛔";
    default: return "⚫";
  }
}

export default function UserControls({ status, onChangeStatus, micMuted, onToggleMic, onLeaveVoice }) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);
  const { user, logout } = useContext(AuthContext);

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

  if (!user) return null;

  return (
    <div className="user-controls" ref={ref}>
      <div className="avatar" onClick={() => setStatusOpen(prev => !prev)} title="Изменить статус">
        <div className={`status-dot ${statusClass(status)}`}></div>
      </div>

      <span className="username">{user.username}</span>

      <div className="actions">
        <button className={`mic ${micMuted ? "muted" : ""}`} onClick={onToggleMic} title={micMuted ? "Микрофон выключен" : "Микрофон включен"}>
          {micMuted ? "🔇" : "🎙️"}
        </button>

        {onLeaveVoice && (
          <button className="leave-voice" onClick={onLeaveVoice} title="Выйти из голосового канала">
            🔈✖
          </button>
        )}

        <button className="btn-settings" title="Настройки" onClick={() => setMenuOpen(prev => !prev)}>
          ⚙️
        </button>

        {menuOpen && (
          <div className="status-menu">
            <button className="logout-button" onClick={() => logout()}>🔓 Выйти</button>
          </div>
        )}
      </div>

      {statusOpen && (
        <div className="status-menu">
          {["online", "idle", "dnd", "offline"].map(s => (
            <button key={s} className={s === status ? "active" : ""} onClick={() => { onChangeStatus(s); setStatusOpen(false); }}>
              {statusEmoji(s)} {statusLabel(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
