import { useRef, useEffect } from "react";

export const useWebRTC = (socket, isCaller, isConnected) => {
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const readyRef = useRef(false);

  const createPeer = async () => {
    if (peerRef.current) return peerRef.current;

    console.log("🎤 Getting microphone...");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      console.log("✅ Microphone acquired");

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      // Add transceiver for bidirectional audio
      pc.addTransceiver("audio", { direction: "sendrecv" });

      // Add local audio tracks
      stream.getAudioTracks().forEach((track) => {
        console.log("🎤 Adding track:", track.id);
        pc.addTrack(track, stream);
      });

      pc.ontrack = (e) => {
        console.log("🔊 ONTRACK: Received remote stream");
        if (remoteAudioRef.current && e.streams[0]) {
          remoteAudioRef.current.srcObject = e.streams[0];
          console.log("✅ Remote stream attached to audio element");
          
          // Try to play automatically
          setTimeout(() => {
            if (remoteAudioRef.current) {
              remoteAudioRef.current.play()
                .then(() => console.log("🎵 Audio playing"))
                .catch(e => console.log("⚠️ Auto-play blocked:", e.message));
            }
          }, 500);
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          console.log("🧊 Sending ICE candidate");
          socket.emit("ice-candidate", e.candidate);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("❄️ ICE state:", pc.iceConnectionState);
      };

      peerRef.current = pc;
      return pc;
      
    } catch (error) {
      console.error("❌ Failed to get microphone:", error);
      return null;
    }
  };

  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log("🔌 Setting up WebRTC for", isCaller ? "Agent" : "Customer");

    // Customer receives offer
    socket.on("offer", async (offer) => {
      if (isCaller) return;
      
      console.log("📞 Customer received offer");
      
      const pc = await createPeer();
      if (!pc) return;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("✅ Customer set remote description");
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("📤 Customer sending answer");
      
      socket.emit("answer", answer);
    });

    // Agent receives answer
    socket.on("answer", async (answer) => {
      if (!isCaller) return;
      
      console.log("✅ Agent received answer");
      
      const pc = peerRef.current;
      if (!pc) return;

      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log("✅ Agent set remote description");
    });

    socket.on("ice-candidate", async (candidate) => {
      try {
        const pc = peerRef.current;
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("✅ ICE candidate added");
        }
      } catch (error) {
        console.warn("⚠️ Failed to add ICE candidate:", error);
      }
    });

    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [socket, isCaller, isConnected]);

  const startAudio = async () => {
    console.log("🚀 Starting audio call as", isCaller ? "Agent" : "Customer");
    
    const pc = await createPeer();
    if (!pc) {
      console.error("❌ Failed to create peer connection");
      return;
    }

    // Only agent creates the initial offer
    if (isCaller) {
      console.log("📞 Agent creating offer...");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("📤 Agent sending offer");
      socket.emit("offer", offer);
    }
    
    // Customer doesn't need to do anything here - they wait for offer
  };

  const stopAudio = () => {
    console.log("🛑 Stopping audio");
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        t.stop();
        console.log("🛑 Stopped track:", t.id);
      });
      localStreamRef.current = null;
    }

    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  };

  return { startAudio, stopAudio, remoteAudioRef };
};