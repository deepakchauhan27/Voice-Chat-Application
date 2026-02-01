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

  // ===============================
  // SOCKET + ROOM SETUP
  // ===============================
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

    return () => {
      stopAudio();
      socket.off("room-status");
      socket.off("chat-message");
      socket.off("call-ended");
      socket.off("join-rejected");
    };
  }, [socket, user.role, stopAudio]);

  // ===============================
  // CHAT SEND
  // ===============================
  const sendMessage = (text) => {
    if (!text.trim()) return;

    socket.emit("send-message", {
      text,
      sender: user.name,
      role: user.role,
      time: new Date().toLocaleTimeString(),
    });
  };

  // ===============================
  // ENABLE AUDIO (CRITICAL)
  // ===============================
  const enableAudio = async () => {
    console.log("🎧 Enable Audio clicked");

    if (!remoteAudioRef.current) return;

    // 🔓 unlock browser audio
    remoteAudioRef.current.muted = false;

    // start WebRTC
    await startAudio();

    // 🔥 play AFTER ontrack attaches stream
    setTimeout(() => {
      remoteAudioRef.current
        ?.play()
        .then(() => console.log("🔊 Audio playing"))
        .catch((e) =>
          console.warn("🔇 Audio play blocked (expected on same device)", e),
        );
    }, 500);

    setAudioEnabled(true);
  };

  // ===============================
  // END CALL
  // ===============================
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

      {/* ENABLE AUDIO */}
      {status === "Connected" && !audioEnabled && (
        <button
          onClick={enableAudio}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded mb-4 self-start"
        >
          Enable Audio
        </button>
      )}

      {/* REMOTE AUDIO */}
      <audio ref={remoteAudioRef} playsInline />

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
