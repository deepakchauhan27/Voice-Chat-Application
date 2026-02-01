import { useEffect, useRef, useState } from "react";
import ChatBox from "../components/ChatBox";
import StatusBar from "../components/StatusBar";
import { useWebRTC } from "../hooks/useWebRTC";

const CallRoom = ({ socket, user }) => {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("Connecting");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [roomConnected, setRoomConnected] = useState(false);

  const hasJoined = useRef(false);
  const isAgent = user.role.toLowerCase() === "agent";

  const { startAudio, stopAudio, remoteAudioRef } = useWebRTC(
    socket,
    isAgent,
    roomConnected,
  );

  useEffect(() => {
    if (!hasJoined.current) {
      console.log("👤 Joining as", user.role);
      socket.emit("join", { role: user.role.toLowerCase() });
      hasJoined.current = true;
    }

    socket.on("room-status", ({ connected }) => {
      console.log("📊 Room status:", connected ? "Connected" : "Connecting");
      setStatus(connected ? "Connected" : "Connecting");
      setRoomConnected(connected);
    });

    socket.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("call-ended", () => {
      console.log("📞 Call ended");
      stopAudio();
      window.location.reload();
    });

    socket.on("join-rejected", (reason) => {
      alert(reason);
      window.location.reload();
    });

    return () => {
      console.log("🧹 Cleaning up");
      stopAudio();
      socket.off("room-status");
      socket.off("chat-message");
      socket.off("call-ended");
      socket.off("join-rejected");
    };
  }, [socket, user.role]);

  const sendMessage = (text) => {
    if (!text.trim()) return;
    socket.emit("send-message", {
      text,
      sender: user.name,
      role: user.role,
      time: new Date().toLocaleTimeString(),
    });
  };

  const enableAudio = async () => {
    console.log("🎧 Enable audio clicked");

    // Initialize audio element
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.autoplay = true;
    }

    try {
      await startAudio();
      setAudioEnabled(true);

      // Try to play audio after a delay
      setTimeout(() => {
        if (remoteAudioRef.current && remoteAudioRef.current.srcObject) {
          remoteAudioRef.current
            .play()
            .then(() => console.log("✅ Audio playing"))
            .catch((e) => console.log("⚠️ Play blocked:", e.message));
        }
      }, 1000);
    } catch (error) {
      console.error("❌ Error starting audio:", error);
    }
  };

  const endCall = () => {
    socket.emit("end-call");
    stopAudio();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Voice Call – {user.role}</h2>
          <p className="text-sm text-gray-400">{user.name}</p>
        </div>
        <StatusBar status={status} />
      </div>

      {status === "Connected" && !audioEnabled && (
        <button
          onClick={enableAudio}
          className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded mb-4 self-start"
        >
          {isAgent ? "Start Call" : "Join Call"}
        </button>
      )}

      {/* Audio element for remote stream */}
      <audio ref={remoteAudioRef} playsInline autoPlay className="hidden" />

      <div className="flex-1">
        <ChatBox messages={messages} sendMessage={sendMessage} />
      </div>

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
