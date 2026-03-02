import React, { memo, useCallback, useState, useContext } from "react";
import { AuthContext } from "../AuthContext"; // путь подкорректируй
import VoiceChannelAuto from "./VoiceChannelAuto";

// ====================== ChannelItem ======================
const ChannelItem = memo(function ChannelItem({ id, name, type, active, onClick, onDelete }) {
  const icon = type === "text" ? "#" : "🔊";

  const handleClick = useCallback(() => {
    onClick(id);
  }, [id, onClick]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete(id);
  }, [id, onDelete]);

  return (
    <div
      className={`channel-item${active ? " active" : ""}`}
      onClick={handleClick}
      title={`Перейти в ${name}`}
      role="button"
      tabIndex={0}
    >
      <span>{icon} {name}</span>
      <button
        className="delete-btn"
        title="Удалить канал"
        onClick={handleDelete}
      >
        🗑️
      </button>
    </div>
  );
});

// ====================== ChannelGroup ======================
export default function ChannelGroup({
  title,
  type,
  list = [],
  current,
  onSwitch,
  onOpenModal
}) {
  const { user } = useContext(AuthContext); // авторизованный пользователь
  const [activeVoiceProfile, setActiveVoiceProfile] = useState(null);

  const handleSwitch = useCallback(
    (id) => {
      const ch = list.find((c) => c.id === id);
      if (!ch) return;

      if (type === "text") {
        onSwitch({ id: ch.id, name: ch.name, type });
        setActiveVoiceProfile(null); // закрываем мини-профиль
      } else if (type === "voice" && user) {
        // показываем мини-профиль с авторизованным пользователем
        setActiveVoiceProfile({
          userName: user.username,
          avatar: user.avatar || null,
          channelId: ch.id
        });
      }
    },
    [list, onSwitch, type, user]
  );

  const handleDelete = useCallback(
    (id) => {
      const ch = list.find((c) => c.id === id);
      if (ch)
        onOpenModal({
          open: true,
          mode: "delete",
          id: ch.id,
          name: ch.name,
          type
        });
    },
    [list, onOpenModal, type]
  );

  const handleAdd = useCallback(() => {
    onOpenModal({ open: true, mode: "add", type });
  }, [onOpenModal, type]);

  return (
    <div className="channel-group">
      <div className="channel-category">
        <span>{title}</span>
        <button onClick={handleAdd} title="Добавить канал">+</button>
      </div>

      {list.length === 0 ? (
        <p className="text-muted">Нет каналов</p>
      ) : (
        list.map((ch) => (
          <React.Fragment key={ch.id}>
            <ChannelItem
              id={ch.id}
              name={ch.name}
              type={type}
              active={current?.id === ch.id && current?.type === type}
              onClick={handleSwitch}
              onDelete={handleDelete}
            />

            {activeVoiceProfile?.userName &&
             type === "voice" &&
             activeVoiceProfile.channelId === ch.id && (
              <div className="mini-profile">
                {activeVoiceProfile.avatar && (
                  <img src={activeVoiceProfile.avatar} alt="avatar" className="avatar" />
                )}
                <span>{activeVoiceProfile.userName}</span>
                <button onClick={() => setActiveVoiceProfile(null)}>
                  Отключиться
                </button>

                {/* Подключение к голосовому каналу */}
                <VoiceChannelAuto
                  key={ch.id}
                  channelId={ch.id}
                  displayName={activeVoiceProfile.userName}
                  onMembers={(id, members) => console.log("Members in", id, members)}
                />
              </div>
            )}
          </React.Fragment>
        ))
      )}
    </div>
  );
}
