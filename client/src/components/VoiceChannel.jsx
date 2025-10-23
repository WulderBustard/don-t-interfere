// client/src/components/VoiceChannel.jsx
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

/*
  NOTE:
  - SIGNALING_SERVER должен указывать на тот httpServer, где запущен Socket.IO (в нашем примере тот же server/index.js)
  - в .env: VITE_VOICE_URL=http://77.82.17.9:3001  (или другой хост/порт)
*/
const SIGNALING_SERVER = import.meta.env.VITE_VOICE_URL || "http://77.82.17.9:3001";
const ICE_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function VoiceChannel({ channelId, displayName = "You", onMembers }) {
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcsRef = useRef({}); // { remoteId: RTCPeerConnection }
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [members, setMembers] = useState([]); // [{id, name}]

  // helper to create peer connection and attach local stream
  function createPeer(remoteId) {
    const pc = new RTCPeerConnection(ICE_CONFIG);

    // add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
    }

    // remote track -> attach audio element
    pc.ontrack = (evt) => {
      // ensure we create only one audio element per remoteId
      let audio = document.getElementById(`audio-${remoteId}`);
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = `audio-${remoteId}`;
        audio.autoplay = true;
        audio.style.display = "none"; // we don't need to show it
        document.body.appendChild(audio);
      }
      audio.srcObject = evt.streams[0];
    };

    // ICE candidates: send to remote
    pc.onicecandidate = (evt) => {
      if (evt.candidate) {
        socketRef.current.emit("signal:ice", { to: remoteId, candidate: evt.candidate });
      }
    };

    return pc;
  }

  // toggle mute
  function toggleMute() {
    const on = !muted;
    setMuted(on);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !on; });
    }
  }

  // leave channel
  function leave() {
    if (!socketRef.current) return;
    socketRef.current.emit("leave-channel", { channelId });
    // close peer connections
    Object.values(pcsRef.current).forEach(pc => {
      try { pc.close(); } catch (e) {}
    });
    pcsRef.current = {};
    // stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setJoined(false);
    setMembers([]);
    if (onMembers) onMembers(channelId, []);
    // also remove audio elements
    document.querySelectorAll("[id^='audio-']").forEach(a => a.remove());
    // disconnect socket
    socketRef.current.disconnect();
    socketRef.current = null;
  }

  useEffect(() => {
    let mounted = true;
    if (!channelId) return;

    async function start() {
      // request microphone access
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = s;
        // obey current mute state
        s.getAudioTracks().forEach(t => t.enabled = !muted);
      } catch (err) {
        console.error("Cannot access microphone:", err);
        // still try to join signaling so members list can work; but no local audio
      }

      const socket = io(SIGNALING_SERVER, { transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        // join voice room
        socket.emit("join-channel", { channelId, name: displayName || "User" });
      });

      // server sends list of existing peers (ids) for the newcomer
      socket.on("existing-peers", async ({ peers }) => {
        // create offers to each existing peer
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

      // when new peers join, server will send members-update (we also listen to it separately)
      socket.on("members-update", ({ members: srvMembers }) => {
        setMembers(srvMembers);
        if (onMembers) onMembers(channelId, srvMembers);
      });

      // handle incoming offer
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

      // handle incoming answer
      socket.on("signal:answer", async ({ from, sdp }) => {
        try {
          const pc = pcsRef.current[from];
          if (!pc) {
            console.warn("answer for unknown pc", from);
            return;
          }
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch (err) {
          console.error("handle answer error", err);
        }
      });

      // handle incoming ICE
      socket.on("signal:ice", async ({ from, candidate }) => {
        try {
          const pc = pcsRef.current[from];
          if (pc && candidate) {
            await pc.addIceCandidate(candidate);
          }
        } catch (err) {
          console.error("addIceCandidate error", err);
        }
      });

      // cleanup on disconnect
      socket.on("disconnect", () => {
        // keep local stream running if we want to continue — but remove peers
        Object.values(pcsRef.current).forEach(pc => { try { pc.close(); } catch(e) {} });
        pcsRef.current = {};
      });

      setJoined(true);
    }

    start();

    return () => {
      mounted = false;
      // we intentionally do NOT auto-leave on unmount so session can continue when switching to text
      // If you want to leave when component unmounts, call leave() here.
    };
  }, [channelId]); // start when channelId given

  // Expose leave/mute via simple UI
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
