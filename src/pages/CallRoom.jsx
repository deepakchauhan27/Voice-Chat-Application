import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatBox from "../components/ChatBox";
import CallControls from "../components/CallControls";
import StatusBar from "../components/StatusBar";
import Timer from "../components/Timer";
import { useWebRTC } from "../hooks/useWebRTC";

const CallRoom = ({ socket, user }) => {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("Connecting");
  const navigate = useNavigate();

  const { remoteAudioRef, startAudio } = useWebRTC(socket);

  useEffect(() => {
    startAudio();

    socket.on("connected", () => {
      setStatus("Connected");
    });

    socket.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("call-ended", () => {
      setStatus("Call Ended");
      setTimeout(() => navigate("/"), 1500);
    });

    socket.on("disconnect", () => {
      setStatus("Disconnected");
      navigate("/");
    });

    return () => {
      socket.off("connected");
      socket.off("chat-message");
      socket.off("call-ended");
      socket.off("disconnect");
    };
  }, [socket, navigate, startAudio]);

  const sendMessage = (text) => {
    if (!text.trim()) return;

    socket.emit("send-message", {
      text,
      sender: user.name,
      role: user.role,
      time: new Date().toLocaleTimeString(),
    });
  };

  const endCall = () => {
    socket.emit("end-call");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-4xl bg-gray-900 rounded-2xl shadow-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">
              Connected as <span className="text-indigo-400">{user.role}</span>
            </h2>
            <p className="text-sm text-gray-400">{user.name}</p>
          </div>
          <StatusBar status={status} />
        </div>

        {/* Timer */}
        <Timer />

        {/* Remote audio */}
        <audio ref={remoteAudioRef} autoPlay />

        {/* Chat */}
        <ChatBox messages={messages} sendMessage={sendMessage} />

        {/* Controls */}
        <CallControls onEnd={endCall} />
      </div>
    </div>
  );
};

export default CallRoom;
