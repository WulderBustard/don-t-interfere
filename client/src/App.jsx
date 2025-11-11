import React, { useState, useContext } from "react";
import "./index.css";

import { useChannels } from "./hooks/useChannels";
import { sendMessageApi } from "./api";
import { timeHHMM } from "./utils/helpers";
import { AuthContext } from "./AuthContext";

import ChannelList from "./components/ChannelList";
import ChatPanel from "./components/ChatPanel";
import MembersPanel from "./components/MembersPanel";
import ChannelModal from "./components/ChannelModal";
import VoiceChannelAuto from "./components/VoiceChannelAuto";


export default function App() {
  const { user } = useContext(AuthContext); // текущий пользователь

  const {
    channels,
    current,
    setCurrent,
    messagesByChannel,
    setMessagesByChannel,
    addChannel,
    deleteChannel
  } = useChannels();

  const [voiceChannel, setVoiceChannel] = useState(null);
  const [voiceMembers, setVoiceMembers] = useState([]);

  const [ui, setUi] = useState({
    selfStatus: "online",
    micMuted: false,
    membersOpen: false,
    modal: { open: false }
  });

  const toggle = key => setUi(prev => ({ ...prev, [key]: !prev[key] }));
  const closeModal = () => setUi(prev => ({ ...prev, modal: { open: false } }));

  // Отправка сообщения
  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || !current || current.type !== "text") return;
    if (!user) return alert("Вы не авторизованы");

    const payload = { user: user.username, text: trimmed, time: timeHHMM() };

    try {
      const saved = await sendMessageApi(current.id, payload);
      setMessagesByChannel(prev => ({
        ...prev,
        [current.id]: [...(prev[current.id] || []), saved]
      }));
    } catch {
      alert("Не удалось отправить сообщение");
    }
  }

  return (
    <div className={`app-grid${ui.membersOpen ? " members-open" : ""}`}>
      <ChannelList
        channels={channels}
        current={current}
        onSwitch={setCurrent}
        onOpenModal={modal => setUi(prev => ({ ...prev, modal }))}
        selfStatus={ui.selfStatus}
        onChangeStatus={status => setUi(prev => ({ ...prev, selfStatus: status }))}
        micMuted={ui.micMuted}
        onToggleMic={() => toggle("micMuted")}
      />

      {current && (
        <ChatPanel
          current={current}
          messages={messagesByChannel[current.id] || []}
          onSend={sendMessage}
          onToggleMembers={() => toggle("membersOpen")}
        />
      )}

      {ui.membersOpen && current && (
        <MembersPanel
          current={current}
          voiceChannels={channels.voice}
          selfStatus={ui.selfStatus}
          selfName={user?.username} // передаём имя текущего пользователя
        />
      )}

      {ui.modal.open && (
        <ChannelModal
          {...ui.modal}
          onClose={closeModal}
          onConfirm={data => {
            if (ui.modal.mode === "add") addChannel(data.name, data.type);
            else if (ui.modal.mode === "delete") deleteChannel(data.id, data.type);
            closeModal();
          }}
        />
      )}
      {current?.type === "voice" && (
    <VoiceChannelAuto
      channelId={current.id}
      displayName={user?.username || "Аноним"}
      onMembers={(id, members) => {
        setVoiceChannel(channels.voice[id]);
        setVoiceMembers(members);
      }}
    />
  )}

    </div>
  );
}
