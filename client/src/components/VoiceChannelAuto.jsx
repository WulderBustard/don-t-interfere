// client/src/components/VoiceChannelAuto.jsx

import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

// URL для сигналинга и базовая WebRTC конфигурация
const SIGNALING_SERVER = import.meta.env.VITE_VOICE_URL || "https://localhost:3001";
const ICE_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function VoiceChannelAuto({ channelId, displayName = "You", onMembers }) {
  // Сокет соединение
  const socketRef = useRef(null);
  // Локальный аудиопоток
  const localStreamRef = useRef(null);
  // Хранилище WebRTC соединений по ID пользователя
  const pcsRef = useRef({});
  // Буфер для answer, если offer ещё не применён
  const pendingAnswers = useRef({});

  // Стейты канала
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [members, setMembers] = useState([]);

  // Создание PeerConnection для удалённого пользователя
  const createPeer = (remoteId) => {
    // Своё соединение нам не нужно
    if (remoteId === socketRef.current.id) return null;

    const pc = new RTCPeerConnection(ICE_CONFIG);

    // Добавляем локальный микрофон в PeerConnection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }

    // Отправка ICE-кандидатов через сигнальный сервер
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit("signal:ice", { to: remoteId, candidate: e.candidate });
      }
    };

    // Обработка входящего аудио потока
    pc.ontrack = (evt) => {
      let audio = document.getElementById(`audio-${remoteId}`);

      // Если аудио элемент не создан — создаём скрытый audio
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = `audio-${remoteId}`;
        audio.autoplay = true;
        audio.style.display = "none";
        document.body.appendChild(audio);
      }

      audio.srcObject = evt.streams[0];
    };

    pcsRef.current[remoteId] = pc;
    return pc;
  };

  // Функция выхода из канала
  const leave = () => {
    if (!socketRef.current) return;

    // Уведомляем сервер
    socketRef.current.emit("leave-channel", { channelId });

    // Закрываем все WebRTC соединения
    Object.values(pcsRef.current).forEach(pc => { try { pc.close(); } catch {} });
    pcsRef.current = {};

    // Останавливаем локальные треки
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    // Сброс стейтов
    setJoined(false);
    setMembers([]);
    if (onMembers) onMembers(channelId, []);

    // Удаляем все audio элементы участников
    document.querySelectorAll("[id^='audio-']").forEach(a => a.remove());

    // Закрываем socket.io
    socketRef.current.disconnect();
    socketRef.current = null;
  };

  // Включение/выключение микрофона
  const toggleMute = () => {
    const on = !muted;
    setMuted(on);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !on);
    }
  };

  // Основная логика: WebRTC + сигналинг + синхронизация
  useEffect(() => {
    if (!channelId) return;

    async function start() {
      // Получаем микрофон
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        // Применяем состояние mute
        stream.getAudioTracks().forEach(t => t.enabled = !muted);

        // Создаём скрытый локальный audio, чтобы браузер "разрешил" воспроизведение
        const localAudio = document.createElement("audio");
        localAudio.autoplay = true;
        localAudio.muted = true;
        localAudio.srcObject = stream;
        localAudio.style.display = "none";
        document.body.appendChild(localAudio);
      } catch (err) {
        console.warn("Микрофон недоступен:", err);
        return;
      }

      // Подключение к сигнальному серверу
      const socket = io(SIGNALING_SERVER, { transports: ["websocket"] });
      socketRef.current = socket;

      // После подключения — входим в канал
      socket.on("connect", () => {
        socket.emit("join-channel", { channelId, name: displayName });
      });

      // Получаем список существующих участников
      socket.on("existing-peers", async ({ peers }) => {
        for (const remoteId of peers) {
          if (remoteId === socket.id) continue;

          const pc = createPeer(remoteId);
          if (!pc) continue;

          try {
            // Создаём offer и отправляем
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("signal:offer", { to: remoteId, sdp: offer });
          } catch (err) {
            console.error("offer error", err);
          }
        }
      });

      // Обновление списка участников
      socket.on("members-update", ({ members: srvMembers }) => {
        setMembers(srvMembers);
        if (onMembers) onMembers(channelId, srvMembers);
      });

      // Входящий offer
      socket.on("signal:offer", async ({ from, sdp }) => {
        if (from === socket.id) return;

        let pc = pcsRef.current[from] || createPeer(from);
        if (!pc) return;

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("signal:answer", { to: from, sdp: answer });

          // Если answer от этого пользователя уже приходил — применяем
          if (pendingAnswers.current[from]) {
            await pc.setRemoteDescription(new RTCSessionDescription(pendingAnswers.current[from]));
            delete pendingAnswers.current[from];
          }
        } catch (err) {
          console.error("handle offer error", err);
        }
      });

      // Входящий answer
      socket.on("signal:answer", async ({ from, sdp }) => {
        const pc = pcsRef.current[from];
        if (!pc) return;

        try {
          // Если offer уже отправлен — применяем
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          } else {
            // Иначе — откладываем
            pendingAnswers.current[from] = sdp;
          }
        } catch (err) {
          console.error("handle answer error", err);
        }
      });

      // Входящий ICE-кандидат
      socket.on("signal:ice", async ({ from, candidate }) => {
        const pc = pcsRef.current[from];
        if (pc && candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("addIceCandidate error", err);
          }
        }
      });

      // При потере соединения — закрываем WebRTC
      socket.on("disconnect", () => {
        Object.values(pcsRef.current).forEach(pc => { try { pc.close(); } catch {} });
        pcsRef.current = {};
      });

      setJoined(true);
    }

    start();

    // Выход при размонтировании
    return () => leave();
  }, [channelId, displayName]);
}
