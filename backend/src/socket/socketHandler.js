export const socketHandler = (io) => {
  let agent = null;
  let customer = null;

  io.on("connection", (socket) => {
    console.log("🟢 Connected:", socket.id);

    socket.on("join", ({ role }) => {
      const r = String(role).toLowerCase();

      // ❌ invalid role
      if (r !== "agent" && r !== "customer") {
        socket.emit("join-rejected", "Invalid role");
        return;
      }

      // ❌ same role already connected
      if (r === "agent" && agent) {
        socket.emit("join-rejected", "Agent already connected");
        return;
      }

      if (r === "customer" && customer) {
        socket.emit("join-rejected", "Customer already connected");
        return;
      }

      // ✅ assign role
      if (r === "agent") agent = socket.id;
      if (r === "customer") customer = socket.id;

      socket.join("call-room");
      emitStatus(io);
    });

    // 💬 CHAT
    socket.on("send-message", (msg) => {
      console.log("📥 BACKEND RECEIVED:", msg);
      io.emit("chat-message", msg);
    });

    // ❌ CLEANUP ON DISCONNECT
    socket.on("disconnect", () => {
      if (socket.id === agent) agent = null;
      if (socket.id === customer) customer = null;
      emitStatus(io);
    });

    // ☎️ END CALL
    socket.on("end-call", () => {
      io.to("call-room").emit("call-ended");
      reset();
      emitStatus(io);
    });

    // 🔊 WEBRTC SIGNALING (FIXED)

    socket.on("renegotiate", () => {
      socket.to("call-room").emit("renegotiate");
    });

    socket.on("offer", (offer) => {
      console.log("📞 Offer from", socket.id);
      socket.to("call-room").emit("offer", offer);
    });

    socket.on("answer", (answer) => {
      console.log("✅ Answer from", socket.id);
      socket.to("call-room").emit("answer", answer);
    });

    socket.on("ice-candidate", (candidate) => {
      socket.to("call-room").emit("ice-candidate", candidate);
    });
  });

  function reset() {
    agent = null;
    customer = null;
  }

  function emitStatus(io) {
    const connected = Boolean(agent && customer);
    io.to("call-room").emit("room-status", { connected });
  }
};
