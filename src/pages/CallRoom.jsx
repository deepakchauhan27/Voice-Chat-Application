import { useEffect, useRef, useState } from "react";
import ChatBox from "../components/ChatBox";
import StatusBar from "../components/StatusBar";
import { useWebRTC } from "../hooks/useWebRTC";

const CallRoom = ({ socket, user }) => {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("Connecting");
  const [audioEnabled, setAudioEnabled] = useState(false);

  const hasJoined = useRef(false);

  const isAgent = user.role.toLowerCase() === "agent";
  const { startAudio, stopAudio, remoteAudioRef } = useWebRTC(socket, isAgent);

  useEffect(() => {
    // ✅ JOIN ONLY ONCE
    if (!hasJoined.current) {
      socket.emit("join", {
        role: user.role.toLowerCase(),
      });
      hasJoined.current = true;
    }

    // ✅ ROOM STATUS
    socket.on("room-status", ({ connected }) => {
      setStatus(connected ? "Connected" : "Connecting");
    });

    // ✅ CHAT
    socket.on("chat-message", (msg) => {
      console.log("📨 FRONTEND RECEIVED:", msg);
      setMessages((prev) => [...prev, msg]);
    });

    // ✅ CALL END
    socket.on("call-ended", () => {
      stopAudio();
      window.location.reload();
    });

    // ✅ JOIN REJECT
    socket.on("join-rejected", (reason) => {
      alert(reason);
      window.location.reload();
    });

    console.log("🔗 Socket connected?", socket.connected);

    return () => {
      stopAudio();
      socket.off("room-status");
      socket.off("chat-message");
      socket.off("call-ended");
    };
  }, [socket, user.role, stopAudio]);

  const sendMessage = (text) => {
    if (!text.trim()) return;

    console.log("📤 FRONTEND SEND:", text);

    socket.emit("send-message", {
      text,
      sender: user.name,
      role: user.role,
      time: new Date().toLocaleTimeString(),
    });
  };

  const enableAudio = async () => {
    console.log("🎧 Enable Audio clicked");
    await startAudio();
    setAudioEnabled(true);
  };

  const endCall = () => {
    socket.emit("end-call");
    stopAudio();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 flex flex-col">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Connected as {user.role}</h2>
          <p className="text-sm text-gray-400">{user.name}</p>
        </div>
        <StatusBar status={status} />
      </div>

      {/* 🔊 ENABLE AUDIO BUTTON */}
      {status === "Connected" && !audioEnabled && (
        <button
          onClick={enableAudio}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded mb-4 self-start"
        >
          Enable Audio
        </button>
      )}

      {/* 🔊 REMOTE AUDIO OUTPUT */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* CHAT */}
      <div className="flex-1">
        <ChatBox messages={messages} sendMessage={sendMessage} />
      </div>

      {/* END CALL */}
      <div className="flex justify-end mt-4">
        <button
          onClick={endCall}
          className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-semibold"
        >
          End Call
        </button>
      </div>
    </div>
  );
};

export default CallRoom;
