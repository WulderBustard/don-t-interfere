import React, { memo, useCallback, useContext, useMemo, useState } from "react";
import { AuthContext } from "../AuthContext";
import VoiceChannelAuto from "./VoiceChannelAuto";
import UserAvatar from "./UserAvatar";

function canDeleteChannel(channel, user) {
  if (!channel || !user) return false;
  if (user.is_admin) return true;
  if (channel.name?.trim().toLowerCase() === "main") return false;
  return channel.owner_username === user.username;
}

const ChannelItem = memo(function ChannelItem({ channel, type, active, onClick, onDelete, canDelete }) {
  const { id, name } = channel;
  const icon = type === "text" ? "#" : "🔊";

  const handleClick = useCallback(() => {
    onClick(id);
  }, [id, onClick]);

  const handleDelete = useCallback(
    (e) => {
      e.stopPropagation();
      onDelete(id);
    },
    [id, onDelete]
  );

  return (
    <div
      className={`channel-item${active ? " active" : ""}`}
      onClick={handleClick}
      title={`Перейти в ${name}`}
      role="button"
      tabIndex={0}
    >
      <span>{icon} {name}</span>
      {canDelete && (
        <button
          className="delete-btn"
          title="Удалить канал"
          onClick={handleDelete}
        >
          🗑️
        </button>
      )}
    </div>
  );
});

export default function ChannelGroup({
  title,
  type,
  list = [],
  current,
  onSwitch,
  onOpenModal,
  micMuted = false,
  onVoiceMembers,
  voiceMembers = {},
  users = [],
}) {
  const { user } = useContext(AuthContext);
  const [activeVoiceProfile, setActiveVoiceProfile] = useState(null);
  const usersByName = useMemo(
    () => new Map(users.map((item) => [item.username, item])),
    [users]
  );

  const handleSwitch = useCallback(
    (id) => {
      const ch = list.find((c) => c.id === id);
      if (!ch) return;

      if (type === "text") {
        onSwitch({ id: ch.id, name: ch.name, type, owner_username: ch.owner_username });
        setActiveVoiceProfile(null);
        onVoiceMembers?.(ch.id, []);
        return;
      }

      if (type === "voice" && user) {
        setActiveVoiceProfile({
          user,
          channelId: ch.id,
          channelName: ch.name,
        });
      }
    },
    [list, onSwitch, onVoiceMembers, type, user]
  );

  const handleDelete = useCallback(
    (id) => {
      const ch = list.find((c) => c.id === id);
      if (ch) {
        onOpenModal({
          open: true,
          mode: "delete",
          id: ch.id,
          name: ch.name,
          type,
        });
      }
    },
    [list, onOpenModal, type]
  );

  const handleAdd = useCallback(() => {
    onOpenModal({ open: true, mode: "add", type });
  }, [onOpenModal, type]);

  const handleDisconnect = useCallback(() => {
    if (activeVoiceProfile) onVoiceMembers?.(activeVoiceProfile.channelId, []);
    setActiveVoiceProfile(null);
  }, [activeVoiceProfile, onVoiceMembers]);

  function getVoiceMemberRows(channelId) {
    const members = voiceMembers[channelId] || [];
    if (members.length > 0) return members;
    if (activeVoiceProfile?.channelId === channelId) {
      return [{ id: "self", name: activeVoiceProfile.user.username }];
    }
    return [];
  }

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
              channel={ch}
              type={type}
              active={current?.id === ch.id && current?.type === type}
              onClick={handleSwitch}
              onDelete={handleDelete}
              canDelete={canDeleteChannel(ch, user)}
            />

            {type === "voice" && activeVoiceProfile?.channelId === ch.id && (
              <div className="voice-channel-members">
                {getVoiceMemberRows(ch.id).map((member) => {
                  const memberUser = usersByName.get(member.name) || {
                    username: member.name,
                    status: "online",
                  };
                  const isSelf = member.name === activeVoiceProfile.user.username;
                  const isMuted = isSelf ? micMuted : Boolean(memberUser.mic_muted);

                  return (
                    <div className="mini-profile" key={member.id || member.name}>
                      <div className="mini-profile-user">
                        <UserAvatar
                          user={memberUser}
                          status={memberUser.status || "online"}
                          size="sm"
                        />
                        <span className="mini-profile-name">{member.name}</span>
                      </div>

                      <div className="mini-profile-actions">
                        <span
                          className={`member-mic ${isMuted ? "muted" : ""}`}
                          title={isMuted ? "Микрофон выключен" : "Микрофон включен"}
                        >
                          {isMuted ? "🔇" : "🎤"}
                        </span>
                        {isSelf && (
                          <button
                            className="voice-disconnect-btn"
                            onClick={handleDisconnect}
                            title="Отключиться"
                            aria-label="Отключиться от голосового канала"
                          >
                            ⊘
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <VoiceChannelAuto
                  channelId={ch.id}
                  displayName={activeVoiceProfile.user.username}
                  muted={micMuted}
                  onMembers={onVoiceMembers}
                />
              </div>
            )}
          </React.Fragment>
        ))
      )}
    </div>
  );
}
