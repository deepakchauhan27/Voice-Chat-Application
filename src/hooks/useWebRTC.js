import { useRef, useEffect } from "react";

export const useWebRTC = (socket, isCaller, isConnected) => {
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const initializedRef = useRef(false);

  // ===============================
  // CREATE PEER (CLEAN & SAFE)
  // ===============================
  const createPeer = async () => {
    if (peerRef.current) return peerRef.current;

    // 🎤 Mic with proper echo cancellation
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    localStreamRef.current = stream;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Reserve bidirectional audio (important)
    pc.addTransceiver("audio", { direction: "sendrecv" });

    // Add mic track
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Receive remote audio
    pc.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", e.candidate);
    };

    peerRef.current = pc;
    return pc;
  };

  // ===============================
  // SIGNALING
  // ===============================
  useEffect(() => {
    if (!socket || !isConnected || initializedRef.current) return;
    initializedRef.current = true;

    // Customer receives offer
    socket.on("offer", async (offer) => {
      if (isCaller) return;
      const pc = await createPeer();
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", answer);
    });

    // Agent receives answer
    socket.on("answer", async (answer) => {
      if (!isCaller || !peerRef.current) return;
      await peerRef.current.setRemoteDescription(answer);
    });

    socket.on("ice-candidate", async (candidate) => {
      try {
        await peerRef.current?.addIceCandidate(candidate);
      } catch {}
    });

    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [socket, isCaller, isConnected]);

  // ===============================
  // START AUDIO
  // ===============================
  const startAudio = async () => {
    const pc = await createPeer();
    if (isCaller) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", offer);
    }
  };

  // ===============================
  // STOP AUDIO
  // ===============================
  const stopAudio = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerRef.current?.close();
    peerRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  };

  return { startAudio, stopAudio, remoteAudioRef };
};
