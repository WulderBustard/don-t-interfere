import React from "react";

export default function MiniVoicePanel({ channel, members, onLeave }) {
  if (!channel) return null;

  return (
    <div className="mini-voice-panel">
      <div className="mini-voice-header">
        <span>🎤 {channel.name}</span>
        <button className="leave-btn" onClick={onLeave}>Выйти</button>
      </div>

      <div className="mini-voice-members">
        {members.length > 0 ? (
          members.map(m => (
            <div key={m.id} className="mini-member">
              <img
                src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${m.name}`}
                alt={m.name}
              />
              <span>{m.name}</span>
            </div>
          ))
        ) : (
          <div className="empty-voice">Нет участников</div>
        )}
      </div>
    </div>
  );
}
