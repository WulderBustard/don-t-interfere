import React, { useMemo, useContext } from "react";
import { AuthContext } from "../AuthContext";

// Утилита для статуса
function statusClass(status) {
  switch (status) {
    case "online": return "online";
    case "idle": return "idle";
    case "dnd": return "dnd";
    default: return "offline";
  }
}

// ====================== MemberItem ======================
function MemberItem({ name, status, micMuted, isSelf = false }) {
  return (
    <div className={`member${isSelf ? " self" : ""}`}>
      <div className="avatar">
        <div className={`status-dot ${statusClass(status)}`} title={status}></div>
      </div>
      <span>{isSelf ? "Ты" : name}</span>
      <span title={micMuted ? "Микрофон выключен" : "Микрофон включен"}>
        {micMuted ? "🔇" : "🎙️"}
      </span>
    </div>
  );
}

// ====================== MembersPanel ======================
export default function MembersPanel({ current, voiceChannels, selfStatus }) {
  const { user } = useContext(AuthContext); // Получаем текущего пользователя

  const members = useMemo(() => {
    if (current.type !== "voice") return [];
    return voiceChannels[current.id]?.members || [];
  }, [current, voiceChannels]);

  const isVoice = current.type === "voice";
  const isText = current.type === "text";

  return (
    <aside className="members-panel">
      <h6>Участники</h6>

      {isText && <p className="text-muted">Нет участников</p>}

      {isVoice && (
        <>
          {members.length === 0 ? (
            <p className="text-muted">Никого нет в голосовом канале</p>
          ) : (
            members.map((m, i) => (
              <MemberItem
                key={m.id ?? i}
                name={m.name}
                status={m.status}
                micMuted={m.micMuted}
              />
            ))
          )}

          {/* Текущий пользователь */}
          {user && (
            <MemberItem
              name={user.username}
              status={selfStatus}
              micMuted={false}
              isSelf
            />
          )}
        </>
      )}
    </aside>
  );
}
