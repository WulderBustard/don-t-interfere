import React, { useState, useContext, useCallback, useEffect, useRef } from "react";
import { io } from "socket.io-client";
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

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "https://localhost:3001";

export default function App() {
  const { user } = useContext(AuthContext);

  const {
    channels,
    current,
    setCurrent,
    messagesByChannel,
    setMessagesByChannel,
    addChannel,
    deleteChannel,
  } = useChannels();

  const [isMembersOpen, setMembersOpen] = useState(false);
  const [isMicMuted, setMicMuted] = useState(false);
  const [selfStatus, setSelfStatus] = useState("online");
  const [modal, setModal] = useState({ open: false });
  const [voiceChannel, setVoiceChannel] = useState(null);
  const [voiceMembers, setVoiceMembers] = useState([]);

  const socketRef = useRef(null);

  const toggleMembers = useCallback(() => setMembersOpen((prev) => !prev), []);
  const toggleMic = useCallback(() => setMicMuted((prev) => !prev), []);
  const closeModal = useCallback(() => setModal({ open: false }), []);

  // realtime-подписка на новые текстовые сообщения
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Chat socket connected:", socket.id);
    });

    socket.on("message:new", (message) => {
      const channelKey = String(message.channelId ?? message.channel_id);

      setMessagesByChannel((prev) => {
        const existing = prev[channelKey] || [];

        // защита от дублей:
        // отправитель уже добавляет сообщение локально после POST,
        // а потом получает то же сообщение через socket broadcast
        const alreadyExists = existing.some((item) => item.id === message.id);
        if (alreadyExists) return prev;

        return {
          ...prev,
          [channelKey]: [...existing, message],
        };
      });
    });

    socket.on("disconnect", () => {
      console.log("Chat socket disconnected");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [setMessagesByChannel]);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();

      if (!trimmed || !current || current.type !== "text") return;
      if (!user) {
        alert("Вы не авторизованы");
        return;
      }

      const payload = {
        user: user.username,
        text: trimmed,
        time: timeHHMM(),
      };

      try {
        const saved = await sendMessageApi(current.id, payload);

        setMessagesByChannel((prev) => {
          const existing = prev[current.id] || [];
          const alreadyExists = existing.some((item) => item.id === saved.id);

          if (alreadyExists) return prev;

          return {
            ...prev,
            [current.id]: [...existing, saved],
          };
        });
      } catch (err) {
        console.error(err);
        alert("Не удалось отправить сообщение");
      }
    },
    [current, user, setMessagesByChannel]
  );

  const handleConfirmModal = useCallback(
    (data) => {
      if (modal.mode === "add") addChannel(data.name, data.type);
      if (modal.mode === "delete") deleteChannel(data.id, data.type);
      closeModal();
    },
    [modal, addChannel, deleteChannel, closeModal]
  );

  return (
    <div className={`app-grid ${isMembersOpen ? "members-open" : ""}`}>
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
        <div className="empty-panel">
          <div>Выберите канал</div>
        </div>
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
          displayName={user?.username}
          onMembers={(id, members) => {
            setVoiceChannel(channels.voice?.[id] || null);
            setVoiceMembers(members);
          }}
        />
      )}
    </div>
  );
}
