import { useEffect, useRef, useState } from "react";
import ChatBox from "../components/ChatBox";
import StatusBar from "../components/StatusBar";
import { useWebRTC } from "../hooks/useWebRTC";

const CallRoom = ({ socket, user }) => {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("Connecting");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [roomConnected, setRoomConnected] = useState(false);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectedWith, setConnectedWith] = useState("");

  const hasJoined = useRef(false);
  const isAgent = user.role.toLowerCase() === "agent";
  const callTimerRef = useRef(null);

  const { startAudio, stopAudio, remoteAudioRef } = useWebRTC(
    socket,
    isAgent,
    roomConnected,
  );

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start/stop call timer
  useEffect(() => {
    if (audioEnabled && remoteAudioRef.current?.srcObject) {
      // Start timer
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Set who we're connected with
      setConnectedWith(isAgent ? "Customer" : "Agent");

      return () => {
        if (callTimerRef.current) {
          clearInterval(callTimerRef.current);
        }
      };
    } else {
      // Reset timer when call ends
      setCallDuration(0);
      setConnectedWith("");
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    }
  }, [audioEnabled, remoteAudioRef.current?.srcObject, isAgent]);

  // ===============================
  // SOCKET + ROOM SETUP
  // ===============================
  useEffect(() => {
    if (!hasJoined.current) {
      console.log("👤 Joining as", user.role);
      socket.emit("join", { role: user.role.toLowerCase() });
      hasJoined.current = true;
    }

    socket.on("room-status", ({ connected }) => {
      console.log("Room status:", connected ? "Connected" : "Connecting");
      setStatus(connected ? "Connected" : "Connecting");
      setRoomConnected(connected);
    });

    socket.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("call-ended", () => {
      console.log("Call ended");
      stopAudio();
      window.location.reload();
    });

    socket.on("join-rejected", (reason) => {
      alert(reason);
      window.location.reload();
    });

    // Listen for who joined the room
    socket.on("user-joined", (data) => {
      if (data.role !== user.role) {
        setConnectedWith(data.role === "agent" ? "Agent" : "Customer");
      }
    });

    return () => {
      console.log("Cleaning up");
      stopAudio();
      socket.off("room-status");
      socket.off("chat-message");
      socket.off("call-ended");
      socket.off("join-rejected");
      socket.off("user-joined");
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
    console.log("Enable audio clicked");

    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = false;
    }

    try {
      await startAudio();
      setAudioEnabled(true);

      // Emit that user joined the call
      socket.emit("user-joined-call", { role: user.role, name: user.name });

      // Check if audio can play automatically
      setTimeout(() => {
        if (remoteAudioRef.current && remoteAudioRef.current.srcObject) {
          remoteAudioRef.current
            .play()
            .then(() => {
              console.log("Audio playing automatically");
              setNeedsManualPlay(false);
            })
            .catch((e) => {
              console.log("Auto-play blocked, need manual play");
              setNeedsManualPlay(true);
            });
        }
      }, 1000);
    } catch (error) {
      console.error("Error starting audio:", error);
    }
  };

  const manualPlayAudio = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current
        .play()
        .then(() => {
          console.log("Manual audio play successful");
          setNeedsManualPlay(false);
        })
        .catch((e) => {
          console.error("Manual play failed:", e);
        });
    }
  };

  const toggleMute = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
      setIsMuted(!isMuted);
      console.log(isMuted ? "Unmuted" : "Muted");
    }
  };

  const endCall = () => {
    socket.emit("end-call");
    stopAudio();
    setAudioEnabled(false);
    setConnectedWith("");
    setCallDuration(0);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 flex flex-col">
      {/* HEADER - Who you are and who you're connected with */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">
            {isAgent ? "Agent" : "Customer"} - {user.name}
          </h2>

          <div className="flex items-center gap-4 mt-2">
            <div
              className={`px-3 py-1 rounded text-sm font-medium ${
                status === "Connected"
                  ? "bg-green-900/30 text-green-400 border border-green-700/50"
                  : "bg-yellow-900/30 text-yellow-400 border border-yellow-700/50"
              }`}
            >
              {status}
            </div>

            {connectedWith && (
              <div className="px-3 py-1 rounded text-sm font-medium bg-blue-900/30 text-blue-400 border border-blue-700/50">
                Connected with: {connectedWith}
              </div>
            )}

            {callDuration > 0 && (
              <div className="px-3 py-1 rounded text-sm font-medium bg-purple-900/30 text-purple-400 border border-purple-700/50">
                Duration: {formatDuration(callDuration)}
              </div>
            )}
          </div>
        </div>

        <StatusBar status={status} />
      </div>

      {/* CALL CONTROLS */}
      <div className="mb-6 space-y-4">
        {/* START/JOIN CALL BUTTON */}
        {status === "Connected" && !audioEnabled && (
          <div className="p-4 bg-gray-900 rounded-lg">
            <button
              onClick={enableAudio}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              {isAgent ? "Start Call" : "Join Call"}
            </button>
            <p className="text-sm text-gray-400 mt-2">
              {isAgent
                ? "Click to start the voice call with customer"
                : "Click to join the voice call with agent"}
            </p>
          </div>
        )}

        {/* MANUAL PLAY BUTTON */}
        {needsManualPlay && (
          <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700/30">
            <button
              onClick={manualPlayAudio}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Click to Play Audio
            </button>
            <p className="text-sm text-gray-400 mt-2">
              Browser requires permission to play audio
            </p>
          </div>
        )}

        {/* AUDIO CONTROLS WHEN CALL IS ACTIVE */}
        {audioEnabled && (
          <div className="p-4 bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-lg">Call Controls</h3>
              <div className="text-sm text-gray-400">
                {callDuration > 0 &&
                  `Call time: ${formatDuration(callDuration)}`}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={toggleMute}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                  isMuted
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {isMuted ? "Unmute" : "Mute"}
              </button>

              <button
                onClick={manualPlayAudio}
                className="flex-1 py-3 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Play Audio
              </button>

              <button
                onClick={endCall}
                className="flex-1 py-3 rounded-lg font-medium bg-red-600 hover:bg-red-700 transition-colors"
              >
                End Call
              </button>
            </div>

            {connectedWith && (
              <p className="text-sm text-gray-400 mt-3">
                Currently in call with{" "}
                <span className="text-blue-300">{connectedWith}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <audio ref={remoteAudioRef} playsInline autoPlay className="hidden" />

      <div className="flex-1">
        <ChatBox messages={messages} sendMessage={sendMessage} />
      </div>

      {audioEnabled && (
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-800">
          <button
            onClick={endCall}
            className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            End Call
          </button>
        </div>
      )}
    </div>
  );
};

export default CallRoom;
