import React, { useMemo, useContext } from "react";
import { AuthContext } from "../AuthContext";
import UserAvatar from "./UserAvatar";

function MemberItem({ user, status, micMuted, isSelf = false, canDelete = false, onDelete }) {
  return (
    <div className={`member ${isSelf ? "self" : ""}`}>
      <UserAvatar user={user} status={status} size="sm" />

      <span className="member-name">
        {user.username} {isSelf ? "(Вы)" : ""} {user.is_admin ? "Admin" : ""}
      </span>

      <span
        className={`member-mic ${micMuted ? "muted" : ""}`}
        title={micMuted ? "Микрофон выключен" : "Микрофон включен"}
      >
        {micMuted ? "🔇" : "🎤"}
      </span>

      {canDelete && (
        <button
          type="button"
          className="member-delete"
          onClick={() => onDelete(user.username)}
          title="Удалить пользователя"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function MembersPanel({
  users = [],
  selfStatus,
  selfMicMuted = false,
  onDeleteUser,
}) {
  const { user } = useContext(AuthContext);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (a.is_admin !== b.is_admin) return a.is_admin ? -1 : 1;

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
          const canDelete = Boolean(user?.is_admin && !isSelf && !item.is_admin);

          return (
            <MemberItem
              key={item.id || item.username}
              user={item}
              status={status}
              micMuted={micMuted}
              isSelf={isSelf}
              canDelete={canDelete}
              onDelete={onDeleteUser}
            />
          );
        })
      )}
    </aside>
  );
}
