// client/src/components/VoiceChannelAuto.jsx
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SIGNALING_SERVER = import.meta.env.VITE_VOICE_URL || "https://10.21.3.106:3001";
const ICE_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function VoiceChannelAuto({ channelId, displayName = "You", onMembers }) {
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcsRef = useRef({});
  const pendingAnswers = useRef({});
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [members, setMembers] = useState([]);

  // создаём PeerConnection только для удалённого пира
  const createPeer = (remoteId) => {
    if (remoteId === socketRef.current.id) return null;

    const pc = new RTCPeerConnection(ICE_CONFIG);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current.emit("signal:ice", { to: remoteId, candidate: e.candidate });
    };

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

    pcsRef.current[remoteId] = pc;
    return pc;
  };

  const leave = () => {
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
  };

  const toggleMute = () => {
    const on = !muted;
    setMuted(on);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !on);
    }
  };

  useEffect(() => {
    if (!channelId) return;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        stream.getAudioTracks().forEach(t => t.enabled = !muted);

        // локальный аудио элемент — замьючен, чтобы себя не слышать
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

      const socket = io(SIGNALING_SERVER, { transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-channel", { channelId, name: displayName });
      });

      socket.on("existing-peers", async ({ peers }) => {
        for (const remoteId of peers) {
          if (remoteId === socket.id) continue; // не создаём соединение с собой
          const pc = createPeer(remoteId);
          if (!pc) continue;
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
      });

      socket.on("signal:offer", async ({ from, sdp }) => {
        if (from === socket.id) return; // игнорируем свои офферы
        let pc = pcsRef.current[from] || createPeer(from);
        if (!pc) return;

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("signal:answer", { to: from, sdp: answer });

          if (pendingAnswers.current[from]) {
            await pc.setRemoteDescription(new RTCSessionDescription(pendingAnswers.current[from]));
            delete pendingAnswers.current[from];
          }
        } catch (err) {
          console.error("handle offer error", err);
        }
      });

      socket.on("signal:answer", async ({ from, sdp }) => {
        const pc = pcsRef.current[from];
        if (!pc) return;
        try {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          } else {
            pendingAnswers.current[from] = sdp;
          }
        } catch (err) {
          console.error("handle answer error", err);
        }
      });

      socket.on("signal:ice", async ({ from, candidate }) => {
        const pc = pcsRef.current[from];
        if (pc && candidate) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
          catch (err) { console.error("addIceCandidate error", err); }
        }
      });

      socket.on("disconnect", () => {
        Object.values(pcsRef.current).forEach(pc => { try { pc.close(); } catch {} });
        pcsRef.current = {};
      });

      setJoined(true);
    }

    start();

    return () => leave();
  }, [channelId, displayName]);

}
