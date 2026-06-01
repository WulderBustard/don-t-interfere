import React, { memo, useMemo } from "react";
import ChannelGroup from "./ChannelGroup";
import UserControls from "./UserControls";

const ChannelList = memo(function ChannelList({
  channels = { text: {}, voice: {} },
  current,
  onSwitch,
  onOpenModal,
  selfStatus,
  onChangeStatus,
  micMuted,
  onToggleMic,
  onLeaveVoice,
  onUserUpdated,
  onVoiceMembers,
  voiceMembersByChannel = {},
  users = [],
}) {
  const textChannels = useMemo(
    () => Object.values(channels.text || {}),
    [channels.text]
  );
  const voiceChannels = useMemo(
    () => Object.values(channels.voice || {}),
    [channels.voice]
  );

  const channelGroups = useMemo(
    () => [
      { title: "ТЕКСТОВЫЕ КАНАЛЫ", type: "text", list: textChannels },
      { title: "ГОЛОСОВЫЕ КАНАЛЫ", type: "voice", list: voiceChannels },
    ],
    [textChannels, voiceChannels]
  );

  const isEmpty = textChannels.length === 0 && voiceChannels.length === 0;

  return (
    <aside className="channel-list">
      <div className="channel-groups">
        {channelGroups.map(({ title, type, list }) => (
          <ChannelGroup
            key={type}
            title={title}
            type={type}
            list={list}
            current={current}
            onSwitch={onSwitch}
            onOpenModal={onOpenModal}
            micMuted={micMuted}
            onVoiceMembers={onVoiceMembers}
            voiceMembers={voiceMembersByChannel}
            users={users}
          />
        ))}

        {isEmpty && (
          <p className="text-muted empty-message">
            Нет каналов. Добавьте новый с помощью кнопки "+".
          </p>
        )}
      </div>

      <UserControls
        status={selfStatus}
        onChangeStatus={onChangeStatus}
        micMuted={micMuted}
        onToggleMic={onToggleMic}
        onLeaveVoice={onLeaveVoice}
        onUserUpdated={onUserUpdated}
      />
    </aside>
  );
});

export default ChannelList;
