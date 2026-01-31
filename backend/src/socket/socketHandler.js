import {
  addUser,
  removeUser,
  getUser,
  getPairedUsers,
  getRoomId
} from "./roomManager.js";

export const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", ({ name, role }) => {
      addUser({ socketId: socket.id, name, role });

      socket.join(getRoomId());

      const pair = getPairedUsers();
      if (pair) {
        io.to(getRoomId()).emit("connected");
      }
    });

    // CHAT
    socket.on("send-message", (msg) => {
      io.to(getRoomId()).emit("chat-message", msg);
    });

    // WEBRTC SIGNALING
    socket.on("offer", (offer) => {
      socket.to(getRoomId()).emit("offer", offer);
    });

    socket.on("answer", (answer) => {
      socket.to(getRoomId()).emit("answer", answer);
    });

    socket.on("ice-candidate", (candidate) => {
      socket.to(getRoomId()).emit("ice-candidate", candidate);
    });

    // END CALL
    socket.on("end-call", () => {
      io.to(getRoomId()).emit("call-ended");
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      removeUser(socket.id);
      socket.to(getRoomId()).emit("call-ended");
    });
  });
};
