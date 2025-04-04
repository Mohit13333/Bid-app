const setupNotificationSocket = (io) => {
    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);
  
      socket.on("join", (userId) => {
        socket.join(userId);
      });
  
      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
    });
  };
  
  export default setupNotificationSocket;
  