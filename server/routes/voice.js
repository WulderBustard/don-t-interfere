// routes/voice.js
module.exports = function(io) {
  const channels = {}; // { channelId: { socketId: name } }

  io.on("connection", (socket) => {
    console.log("New voice connection:", socket.id);

    socket.on("join-channel", ({ channelId, name }) => {
      if (!channels[channelId]) channels[channelId] = {};
      channels[channelId][socket.id] = name;

      // Отправляем существующих пиров
      const peers = Object.keys(channels[channelId]).filter(id => id !== socket.id);
      socket.emit("existing-peers", { peers });

      // Обновляем участников
      const members = Object.entries(channels[channelId]).map(([id, n]) => ({ id, name: n }));
      io.to(channelId).emit("members-update", { members });

      socket.join(channelId);

      // Для фронта звуковой сигнал
      socket.emit("play-connect-sound");
    });

    socket.on("leave-channel", ({ channelId }) => {
      if (channels[channelId]) {
        delete channels[channelId][socket.id];
        const members = Object.entries(channels[channelId]).map(([id, name]) => ({ id, name }));
        io.to(channelId).emit("members-update", { members });
      }
      socket.leave(channelId);
    });

    // Сигналы WebRTC
    socket.on("signal:offer", ({ to, sdp }) => io.to(to).emit("signal:offer", { from: socket.id, sdp }));
    socket.on("signal:answer", ({ to, sdp }) => io.to(to).emit("signal:answer", { from: socket.id, sdp }));
    socket.on("signal:ice", ({ to, candidate }) => io.to(to).emit("signal:ice", { from: socket.id, candidate }));

    socket.on("disconnect", () => {
      for (const channelId in channels) {
        if (channels[channelId][socket.id]) {
          delete channels[channelId][socket.id];
          const members = Object.entries(channels[channelId]).map(([id, name]) => ({ id, name }));
          io.to(channelId).emit("members-update", { members });
        }
      }
      console.log("Voice disconnected:", socket.id);
    });
  });
};
