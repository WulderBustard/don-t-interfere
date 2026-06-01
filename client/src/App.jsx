import React, { useState, useContext, useCallback, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./index.css";
import { useChannels } from "./hooks/useChannels";
import { API_BASE, fetchUsers, sendMessageApi, updatePresence } from "./api";
import { AuthContext } from "./AuthContext";
import ChannelList from "./components/ChannelList";
import ChatPanel from "./components/ChatPanel";
import MembersPanel from "./components/MembersPanel";
import ChannelModal from "./components/ChannelModal";
import VoiceChannelAuto from "./components/VoiceChannelAuto";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  API_BASE;

export default function App() {
  const { user, updateUser } = useContext(AuthContext);

  const {
    channels,
    current,
    setCurrent,
    messagesByChannel,
    setMessagesByChannel,
    addChannel,
    deleteChannel,
  } = useChannels();

  const [users, setUsers] = useState([]);
  const [isMembersOpen, setMembersOpen] = useState(false);
  const [isMicMuted, setMicMuted] = useState(Boolean(user?.mic_muted));
  const [selfStatus, setSelfStatus] = useState(user?.status || "online");
  const [modal, setModal] = useState({ open: false });
  const [voiceMembersByChannel, setVoiceMembersByChannel] = useState({});

  const socketRef = useRef(null);
  const hasMarkedOnlineRef = useRef(false);

  const toggleMembers = useCallback(() => setMembersOpen((prev) => !prev), []);
  const closeModal = useCallback(() => setModal({ open: false }), []);
  const handleVoiceMembers = useCallback((channelId, members) => {
    setVoiceMembersByChannel((prev) => ({
      ...prev,
      [channelId]: members,
    }));
  }, []);

  const patchUserInList = useCallback((nextUser) => {
    if (!nextUser?.username) return;

    setUsers((prev) => {
      const exists = prev.some((item) => item.username === nextUser.username);
      if (!exists) return [...prev, nextUser].sort((a, b) => a.username.localeCompare(b.username));

      return prev.map((item) =>
        item.username === nextUser.username ? { ...item, ...nextUser } : item
      );
    });
  }, []);

  const persistPresence = useCallback(
    async ({ status = selfStatus, micMuted = isMicMuted }) => {
      if (!user) return null;

      const nextUser = await updatePresence({ status, micMuted });
      updateUser(nextUser);
      patchUserInList(nextUser);
      return nextUser;
    },
    [isMicMuted, patchUserInList, selfStatus, updateUser, user]
  );

  const setPresenceStatus = useCallback(
    (status) => {
      setSelfStatus(status);
      persistPresence({ status, micMuted: isMicMuted }).catch(console.error);
    },
    [isMicMuted, persistPresence]
  );

  const toggleMic = useCallback(() => {
    setMicMuted((prev) => {
      const next = !prev;
      persistPresence({ status: selfStatus, micMuted: next }).catch(console.error);
      return next;
    });
  }, [persistPresence, selfStatus]);

  const handleUserUpdated = useCallback(
    (nextUser) => {
      patchUserInList(nextUser);
      if (nextUser?.username === user?.username) {
        updateUser(nextUser);
        setSelfStatus(nextUser.status || "online");
        setMicMuted(Boolean(nextUser.mic_muted));
      }
    },
    [patchUserInList, updateUser, user?.username]
  );

  const leaveVoiceChannel = useCallback(() => {
    setCurrent(null);
    setVoiceMembersByChannel({});
  }, [setCurrent]);

  useEffect(() => {
    if (!user) return;

    setSelfStatus(user.status || "online");
    setMicMuted(Boolean(user.mic_muted));
  }, [user]);

  useEffect(() => {
    if (!user || hasMarkedOnlineRef.current) return;
    hasMarkedOnlineRef.current = true;
    if (user.status !== "online") setPresenceStatus("online");
  }, [setPresenceStatus, user]);

  useEffect(() => {
    if (!user) return;

    fetchUsers()
      .then(setUsers)
      .catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("message:new", (message) => {
      const channelKey = String(message.channelId ?? message.channel_id);

      setMessagesByChannel((prev) => {
        const existing = prev[channelKey] || [];
        const alreadyExists = existing.some((item) => item.id === message.id);
        if (alreadyExists) return prev;

        return {
          ...prev,
          [channelKey]: [...existing, message],
        };
      });
    });

    socket.on("user:updated", handleUserUpdated);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [handleUserUpdated, setMessagesByChannel, user]);

  useEffect(() => {
    if (!user) return undefined;

    const markOffline = () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      fetch(`${API_BASE}/users/me/presence`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "offline", micMuted: isMicMuted }),
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener("beforeunload", markOffline);
    return () => window.removeEventListener("beforeunload", markOffline);
  }, [isMicMuted, user]);

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
        onChangeStatus={setPresenceStatus}
        micMuted={isMicMuted}
        onToggleMic={toggleMic}
        onLeaveVoice={current?.type === "voice" ? leaveVoiceChannel : undefined}
        onUserUpdated={handleUserUpdated}
        onVoiceMembers={handleVoiceMembers}
        voiceMembersByChannel={voiceMembersByChannel}
        users={users}
      />

      {current ? (
        <ChatPanel
          current={current}
          messages={messagesByChannel[current.id] || []}
          users={users}
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
          users={users}
          voiceMembers={voiceMembersByChannel[current.id] || []}
          selfStatus={selfStatus}
          selfMicMuted={isMicMuted}
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
          muted={isMicMuted}
          onMembers={handleVoiceMembers}
        />
      )}
    </div>
  );
}
