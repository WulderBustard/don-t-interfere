import React, { memo } from "react";
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
}) {
  const textChannels = Object.values(channels.text || {});
  const voiceChannels = Object.values(channels.voice || {});

  return (
    <aside className="channel-list">
      <div className="channel-groups">
        <ChannelGroup
          title="ТЕКСТОВЫЕ КАНАЛЫ"
          type="text"
          list={textChannels}
          current={current}
          onSwitch={onSwitch}
          onOpenModal={onOpenModal}
        />

        <ChannelGroup
          title="ГОЛОСОВЫЕ КАНАЛЫ"
          type="voice"
          list={voiceChannels}
          current={current}
          onSwitch={onSwitch}
          onOpenModal={onOpenModal}
        />

        {textChannels.length === 0 && voiceChannels.length === 0 && (
          <p className="text-muted empty-message">
            Нет каналов. Добавьте новый с помощью кнопки «+».
          </p>
        )}
      </div>

      <UserControls
        status={selfStatus}
        onChangeStatus={onChangeStatus}
        micMuted={micMuted}
        onToggleMic={onToggleMic}
      />
    </aside>
  );
});

export default ChannelList;
