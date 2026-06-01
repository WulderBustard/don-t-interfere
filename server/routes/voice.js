module.exports = function setupVoice(io) {
  const channels = {};

  io.on("connection", (socket) => {
    console.log("New voice connection:", socket.id);

    socket.on("join-channel", ({ channelId, name }) => {
      const roomId = String(channelId);
      if (!channels[roomId]) channels[roomId] = {};

      const peers = Object.keys(channels[roomId]);
      socket.emit("existing-peers", { peers });

      socket.join(roomId);
      channels[roomId][socket.id] = name;

      const members = Object.entries(channels[roomId]).map(([id, memberName]) => ({
        id,
        name: memberName,
      }));
      io.to(roomId).emit("members-update", { members });
      socket.emit("play-connect-sound");
    });

    socket.on("leave-channel", ({ channelId }) => {
      const roomId = String(channelId);
      if (channels[roomId]) {
        delete channels[roomId][socket.id];
        const members = Object.entries(channels[roomId]).map(([id, name]) => ({ id, name }));
        io.to(roomId).emit("members-update", { members });
      }
      socket.leave(roomId);
    });

    socket.on("signal:offer", ({ to, sdp }) => {
      io.to(to).emit("signal:offer", { from: socket.id, sdp });
    });

    socket.on("signal:answer", ({ to, sdp }) => {
      io.to(to).emit("signal:answer", { from: socket.id, sdp });
    });

    socket.on("signal:ice", ({ to, candidate }) => {
      io.to(to).emit("signal:ice", { from: socket.id, candidate });
    });

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
