import React, { useMemo, useContext, useEffect, useState } from "react";
import { AuthContext } from "../AuthContext";
import { fetchUsers } from "../api";

function statusClass(status) {
  switch (status) {
    case "online":
      return "online";
    case "idle":
      return "idle";
    case "dnd":
      return "dnd";
    default:
      return "offline";
  }
}

function MemberItem({ name, status, micMuted, isSelf = false }) {
  return (
    <div className={`member ${isSelf ? "self" : ""}`}>
      <div className="avatar">
        {name?.[0]?.toUpperCase() || "U"}
        <div className={`status-dot ${statusClass(status)}`} title={status}></div>
      </div>

      <span>
        {name} {isSelf ? "(Вы)" : ""}
      </span>

      <span title={micMuted ? "Микрофон выключен" : "Микрофон включен"}>
        {micMuted ? "🔇" : "🎤"}
      </span>
    </div>
  );
}

export default function MembersPanel({ current, voiceChannels, selfStatus }) {
  const { user } = useContext(AuthContext);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      try {
        const users = await fetchUsers();
        if (mounted) setAllUsers(users);
      } catch (err) {
        console.error("Не удалось загрузить пользователей", err);
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    }

    loadUsers();

    return () => {
      mounted = false;
    };
  }, []);

  const voiceMembers = useMemo(() => {
    if (current.type !== "voice") return [];
    return voiceChannels?.[current.id]?.members || [];
  }, [current, voiceChannels]);

  return (
    <aside className="members-panel">
      <h6>Участники</h6>

      {loadingUsers ? (
        <p className="text-muted">Загрузка пользователей...</p>
      ) : allUsers.length === 0 ? (
        <p className="text-muted">Пользователей пока нет.</p>
      ) : (
        allUsers.map((u) => {
          const isSelf = u.username === user?.username;
          const inVoice = voiceMembers.some((m) => m.name === u.username);

          return (
            <MemberItem
              key={u.id}
              name={u.username}
              status={isSelf ? selfStatus : inVoice ? "online" : "offline"}
              micMuted={!inVoice}
              isSelf={isSelf}
            />
          );
        })
      )}
    </aside>
  );
}
