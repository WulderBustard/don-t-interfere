import React, { useState, useContext, useCallback } from "react";
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
  const { user } = useContext(AuthContext);

  const {
    channels,
    current,
    setCurrent,
    messagesByChannel,
    setMessagesByChannel,
    addChannel,
    deleteChannel
  } = useChannels();

  // Локальные части UI разнесены по отдельным стейтам
  const [isMembersOpen, setMembersOpen] = useState(false);
  const [isMicMuted, setMicMuted] = useState(false);
  const [selfStatus, setSelfStatus] = useState("online");
  const [modal, setModal] = useState({ open: false });

  const [voiceChannel, setVoiceChannel] = useState(null);
  const [voiceMembers, setVoiceMembers] = useState([]);

  const toggleMembers = useCallback(() => setMembersOpen(prev => !prev), []);
  const toggleMic = useCallback(() => setMicMuted(prev => !prev), []);
  const closeModal = useCallback(() => setModal({ open: false }), []);

  // Отправка сообщения (оптимизировано useCallback)
  const sendMessage = useCallback(async (text) => {
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
  }, [current, user, setMessagesByChannel]);

  // Подтверждение модалки
  const handleConfirmModal = useCallback((data) => {
    if (modal.mode === "add") addChannel(data.name, data.type);
    if (modal.mode === "delete") deleteChannel(data.id, data.type);
    closeModal();
  }, [modal, addChannel, deleteChannel, closeModal]);

  return (
    <div className={`app-grid${isMembersOpen ? " members-open" : ""}`}>
      <ChannelList
        channels={channels}
        current={current}
        onSwitch={setCurrent}
        onOpenModal={setModal}
        selfStatus={selfStatus}
        onChangeStatus={setSelfStatus}
        micMuted={isMicMuted}
        onToggleMic={toggleMic}
      />

      {current ? (
        <ChatPanel
          current={current}
          messages={messagesByChannel[current.id] || []}
          onSend={sendMessage}
          onToggleMembers={toggleMembers}
        />
      ) : (
        <div className="empty-panel">Выберите канал</div>
      )}

      {isMembersOpen && current && (
        <MembersPanel
          current={current}
          voiceChannels={channels.voice}
          selfStatus={selfStatus}
          selfName={user?.username}
        />
      )}

      {modal.open && (
        <ChannelModal
          {...modal}
          onClose={closeModal}
          onConfirm={handleConfirmModal}
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
