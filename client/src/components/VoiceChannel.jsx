// client/src/components/VoiceChannelAuto.jsx
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SIGNALING_SERVER = import.meta.env.VITE_VOICE_URL || "https://10.21.3.106:3001";
const ICE_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

socketRef.current.on("play-connect-sound", () => {
  const audio = new Audio("../assets/sounds/join.wav"); // путь относительно public/
  audio.play().catch(() => {});
});


export default function VoiceChannelAuto({ channelId, displayName = "You", onMembers }) {
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcsRef = useRef({});
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [members, setMembers] = useState([]);

  function createPeer(remoteId) {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }
    pc.ontrack = (evt) => {
      let audio = document.getElementById(`audio-${remoteId}`);
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = `audio-${remoteId}`;
        audio.autoplay = true;
        audio.style.display = "none";
        document.body.appendChild(audio);
      }
      audio.srcObject = evt.streams[0];
    };
    pc.onicecandidate = (evt) => {
      if (evt.candidate) {
        socketRef.current.emit("signal:ice", { to: remoteId, candidate: evt.candidate });
      }
    };
    return pc;
  }

  function toggleMute() {
    const on = !muted;
    setMuted(on);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !on);
    }
  }

  function leave() {
    if (!socketRef.current) return;
    socketRef.current.emit("leave-channel", { channelId });
    Object.values(pcsRef.current).forEach(pc => { try { pc.close(); } catch {} });
    pcsRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setJoined(false);
    setMembers([]);
    if (onMembers) onMembers(channelId, []);
    document.querySelectorAll("[id^='audio-']").forEach(a => a.remove());
    socketRef.current.disconnect();
    socketRef.current = null;
  }

  // функция проигрывания звука
  function playConnectSound() {
    const audio = new Audio(CONNECT_SOUND);
    audio.volume = 0.5; // уровень громкости
    audio.play().catch(() => {}); // игнорируем ошибки автоплей
  }

  useEffect(() => {
    if (!channelId) return;

    async function start() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = s;
        s.getAudioTracks().forEach(t => t.enabled = !muted);

        const localAudio = document.createElement("audio");
        localAudio.autoplay = true;
        localAudio.muted = true;
        localAudio.srcObject = s;
        localAudio.style.display = "none";
        document.body.appendChild(localAudio);
      } catch (err) {
        console.warn("Микрофон недоступен:", err);
      }

      const socket = io(SIGNALING_SERVER, { transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-channel", { channelId, name: displayName });
      });

      socket.on("existing-peers", async ({ peers }) => {
        for (const remoteId of peers) {
          const pc = createPeer(remoteId);
          pcsRef.current[remoteId] = pc;
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("signal:offer", { to: remoteId, sdp: offer });
          } catch (err) {
            console.error("offer error", err);
          }
        }
      });

      socket.on("members-update", ({ members: srvMembers }) => {
        setMembers(srvMembers);
        if (onMembers) onMembers(channelId, srvMembers);

        // если мы только что подключились, воспроизвести звук
        if (!joined) {
          playConnectSound();
        }
      });

      socket.on("signal:offer", async ({ from, sdp }) => {
        try {
          let pc = pcsRef.current[from];
          if (!pc) {
            pc = createPeer(from);
            pcsRef.current[from] = pc;
          }
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("signal:answer", { to: from, sdp: answer });
        } catch (err) {
          console.error("handle offer error", err);
        }
      });

      socket.on("signal:answer", async ({ from, sdp }) => {
        try {
          const pc = pcsRef.current[from];
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch (err) {
          console.error("handle answer error", err);
        }
      });

      socket.on("signal:ice", async ({ from, candidate }) => {
        try {
          const pc = pcsRef.current[from];
          if (pc && candidate) await pc.addIceCandidate(candidate);
        } catch (err) {
          console.error("addIceCandidate error", err);
        }
      });

      socket.on("disconnect", () => {
        Object.values(pcsRef.current).forEach(pc => { try { pc.close(); } catch {} });
        pcsRef.current = {};
      });

      setJoined(true);
      playConnectSound(); // проигрываем при первой успешной установке соединения
    }

    start();
  }, [channelId]);

  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontSize: 13, color: "#cfcfcf" }}>
        Голосовой канал: <b>{channelId}</b> — {joined ? "Подключён" : "Не подключён"}
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button onClick={toggleMute}>{muted ? "Включить мик" : "Выключить мик"}</button>
        <button onClick={leave}>Выйти из голос. канала</button>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13, color: "#aaa" }}>Участники:</div>
        <ul>
          {members.map(m => (
            <li key={m.id}>{m.name} {m.id === (socketRef.current?.id) ? "(Вы)" : ""}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
