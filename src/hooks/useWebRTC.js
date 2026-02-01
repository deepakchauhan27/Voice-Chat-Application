import { useRef, useEffect } from "react";

export const useWebRTC = (socket, isCaller, isConnected) => {
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const createPeer = async () => {
    if (peerRef.current) return peerRef.current;

    console.log("Getting microphone...");
    
    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      console.log("Microphone acquired");

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      // Add ALL local tracks to peer connection
      stream.getTracks().forEach((track) => {
        console.log("Adding local track:", track.kind, track.id);
        pc.addTrack(track, stream);
      });

      // Handle incoming audio (other person's voice)
      pc.ontrack = (e) => {
        console.log("ONTRACK: Received remote stream with", e.streams.length, "stream(s)");
        
        if (e.streams[0] && remoteAudioRef.current) {
          console.log("Attaching remote stream to audio element");
          remoteAudioRef.current.srcObject = e.streams[0];
          
          // Try to play automatically
          setTimeout(() => {
            if (remoteAudioRef.current && remoteAudioRef.current.srcObject) {
              remoteAudioRef.current.play()
                .then(() => console.log("Remote audio playing"))
                .catch(e => console.log("Auto-play blocked:", e.message));
            }
          }, 500);
        }
      };

      // ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("ice-candidate", e.candidate);
        }
      };

      // Connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log("ICE state:", pc.iceConnectionState);
      };

      pc.onconnectionstatechange = () => {
        console.log("Connection state:", pc.connectionState);
      };

      peerRef.current = pc;
      return pc;
      
    } catch (error) {
      console.error("Failed to get microphone:", error);
      return null;
    }
  };

  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log("Setting up WebRTC for", isCaller ? "Agent" : "Customer");

    // Customer receives offer from agent
    socket.on("offer", async (offer) => {
      if (isCaller) return;
      
      console.log(" Customer received offer from agent");
      
      const pc = await createPeer();
      if (!pc) return;

      console.log(" Customer setting remote description");
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      console.log("Customer creating answer");
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log("Customer sending answer to agent");
      socket.emit("answer", answer);
    });

    // Agent receives answer from customer
    socket.on("answer", async (answer) => {
      if (!isCaller) return;
      
      console.log("Agent received answer from customer");
      
      const pc = peerRef.current;
      if (!pc) {
        console.error(" No peer connection for agent");
        return;
      }

      console.log("Agent setting remote description");
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // ICE candidates
    socket.on("ice-candidate", async (candidate) => {
      try {
        const pc = peerRef.current;
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.warn("Failed to add ICE candidate:", error);
      }
    });

    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [socket, isCaller, isConnected]);

  const startAudio = async () => {
    console.log("Starting audio call as", isCaller ? "Agent" : "Customer");
    
    const pc = await createPeer();
    if (!pc) {
      console.error("Failed to create peer connection");
      return;
    }

    // Only AGENT creates the initial offer
    if (isCaller) {
      console.log("Agent creating offer...");
      const offer = await pc.createOffer({
        offerToReceiveAudio: true, // IMPORTANT: Agent wants to receive audio from customer
      });
      
      console.log("Agent setting local description");
      await pc.setLocalDescription(offer);
      
      console.log("Agent sending offer to customer");
      socket.emit("offer", offer);
    } else {
      console.log("Customer waiting for agent's offer");
      // Customer waits for offer - peer is already created with microphone
    }
  };

  const stopAudio = () => {
    console.log("Stopping audio");
    
    // Stop local microphone
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        t.stop();
        console.log("Stopped local track:", t.id);
      });
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    // Clear remote audio
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  };

  return { startAudio, stopAudio, remoteAudioRef };
};