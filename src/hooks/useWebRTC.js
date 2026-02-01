import { useRef, useEffect } from "react";

export const useWebRTC = (socket, isCaller, isConnected) => {
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const readyRef = useRef(false);

  const createPeer = async () => {
    if (peerRef.current) return peerRef.current;

    // 🎤 MIC CREATED IMMEDIATELY (BOTH SIDES)
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    localStreamRef.current = stream;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.addTransceiver("audio", { direction: "sendrecv" });

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (e) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0];
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", e.candidate);
    };

    peerRef.current = pc;
    return pc;
  };

  useEffect(() => {
    if (!socket || !isConnected) return;

    // BOTH SIDES PREPARE MIC & PEER
    createPeer().then(() => {
      socket.emit("ready");
    });

    socket.on("ready", async () => {
      if (!isCaller || readyRef.current) return;
      readyRef.current = true;

      const pc = peerRef.current;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", offer);
    });

    socket.on("offer", async (offer) => {
      if (isCaller) return;
      const pc = peerRef.current;
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", answer);
    });

    socket.on("answer", async (answer) => {
      if (!isCaller) return;
      await peerRef.current.setRemoteDescription(answer);
    });

    socket.on("ice-candidate", async (c) => {
      try {
        await peerRef.current?.addIceCandidate(c);
      } catch {}
    });

    return () => {
      socket.off("ready");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [socket, isCaller, isConnected]);

  const stopAudio = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerRef.current?.close();
    peerRef.current = null;
  };

  return { remoteAudioRef, stopAudio };
};
