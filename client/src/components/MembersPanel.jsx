import React, { useMemo, useContext } from "react";
import { AuthContext } from "../AuthContext";
import UserAvatar from "./UserAvatar";

function MemberItem({ user, status, micMuted, isSelf = false }) {
  return (
    <div className={`member ${isSelf ? "self" : ""}`}>
      <UserAvatar user={user} status={status} size="sm" />

      <span className="member-name">
        {user.username} {isSelf ? "(Вы)" : ""}
      </span>

      <span
        className={`member-mic ${micMuted ? "muted" : ""}`}
        title={micMuted ? "Микрофон выключен" : "Микрофон включен"}
      >
        {micMuted ? "🔇" : "🎤"}
      </span>
    </div>
  );
}

export default function MembersPanel({
  users = [],
  selfStatus,
  selfMicMuted = false,
}) {
  const { user } = useContext(AuthContext);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const statusWeight = { online: 0, offline: 1 };
      const aWeight = statusWeight[a.status] ?? 2;
      const bWeight = statusWeight[b.status] ?? 2;
      if (aWeight !== bWeight) return aWeight - bWeight;
      return a.username.localeCompare(b.username);
    });
  }, [users]);

  return (
    <aside className="members-panel">
      <h6>Участники</h6>

      {sortedUsers.length === 0 ? (
        <p className="text-muted">Пользователей пока нет.</p>
      ) : (
        sortedUsers.map((item) => {
          const isSelf = item.username === user?.username;
          const status = isSelf ? selfStatus : item.status || "offline";
          const micMuted = isSelf ? selfMicMuted : Boolean(item.mic_muted);

          return (
            <MemberItem
              key={item.id || item.username}
              user={item}
              status={status}
              micMuted={micMuted}
              isSelf={isSelf}
            />
          );
        })
      )}
    </aside>
  );
}
