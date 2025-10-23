module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Пример события голосового сообщения
    socket.on("voice-message", (data) => {
      console.log("Voice message received:", data);
      // Отправляем всем остальным клиентам
      socket.broadcast.emit("voice-message", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};
