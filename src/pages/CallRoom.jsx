import { useEffect, useRef, useState } from "react";
import ChatBox from "../components/ChatBox";
import StatusBar from "../components/StatusBar";
import { useWebRTC } from "../hooks/useWebRTC";

const CallRoom = ({ socket, user }) => {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("Connecting");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [roomConnected, setRoomConnected] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const hasJoined = useRef(false);
  const isAgent = user.role.toLowerCase() === "agent";

  const { startAudio, stopAudio, remoteAudioRef, setRemoteVolume } = useWebRTC(
    socket,
    isAgent,
    roomConnected,
  );

  // ===============================
  // SOCKET + ROOM SETUP
  // ===============================
  useEffect(() => {
    if (!hasJoined.current) {
      socket.emit("join", { role: user.role.toLowerCase() });
      hasJoined.current = true;
    }

    socket.on("room-status", ({ connected }) => {
      setStatus(connected ? "Connected" : "Connecting");
      setRoomConnected(connected);
    });

    socket.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("call-ended", () => {
      stopAudio();
      window.location.reload();
    });

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
  }, [socket, user.role]);

  // ===============================
  // ENABLE AUDIO
  // ===============================
  const enableAudio = async () => {
    console.log("🎧 Enable Audio");

    if (!roomConnected) return;

    // Apply initial volume
    setVolume(0.5);
    if (setRemoteVolume) setRemoteVolume(0.5);

    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 0.5;
    }

    try {
      await startAudio();
      setAudioEnabled(true);
    } catch (err) {
      console.error("Error enabling audio:", err);
    }
  };

  // Handle volume change
  const handleVolumeChange = (newVolume) => {
    const safeVolume = Math.max(0.1, Math.min(1, newVolume));
    setVolume(safeVolume);

    if (setRemoteVolume) {
      setRemoteVolume(safeVolume);
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = safeVolume;
    }
  };

  // ===============================
  // END CALL
  // ===============================
  const endCall = () => {
    socket.emit("end-call");
    stopAudio();
    setAudioEnabled(false);
  };

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

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 flex flex-col">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Voice Call - {user.role}</h2>
          <p className="text-sm text-gray-400">{user.name}</p>
        </div>
        <StatusBar status={status} />
      </div>

      {/* ENABLE AUDIO BUTTON */}
      {status === "Connected" && !audioEnabled && (
        <div className="mb-6">
          <button
            onClick={enableAudio}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            {isAgent ? "Start Voice Call" : "Join Voice Call"}
          </button>
        </div>
      )}

      {/* VOLUME CONTROL */}
      {audioEnabled && (
        <div className="mb-6 p-4 bg-gray-900 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Volume Control</span>
            <span className="text-sm text-gray-400">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500"
          />
        </div>
      )}

      {/* REMOTE AUDIO ELEMENT */}
      <audio ref={remoteAudioRef} playsInline autoPlay className="hidden" />

      {/* CHAT */}
      <div className="flex-1">
        <ChatBox messages={messages} sendMessage={sendMessage} />
      </div>

      {/* END CALL */}
      <div className="flex justify-end mt-4 pt-4 border-t border-gray-800">
        <button
          onClick={endCall}
          className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-semibold transition-colors"
        >
          End Call
        </button>
      </div>
    </div>
  );
};

export default CallRoom;
