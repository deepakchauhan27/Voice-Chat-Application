import { useRef } from "react";

export const useWebRTC = (socket, isCaller) => {
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const startAudio = async () => {
    if (peerRef.current) return;

    // 🎤 get mic
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;

    peerRef.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // send mic audio
    stream.getTracks().forEach((track) => {
      peerRef.current.addTrack(track, stream);
    });

    // receive remote audio
    peerRef.current.ontrack = (e) => {
      remoteAudioRef.current.srcObject = e.streams[0];
      remoteAudioRef.current.play().catch(() => {});
    };

    peerRef.current.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", e.candidate);
      }
    };

    // 👂 listen for offer
    socket.on("offer", async (offer) => {
      if (!peerRef.current) return;

      await peerRef.current.setRemoteDescription(offer);
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      socket.emit("answer", answer);
    });

    // 👂 listen for answer
    socket.on("answer", async (answer) => {
      await peerRef.current.setRemoteDescription(answer);
    });

    // 👂 listen for ICE
    socket.on("ice-candidate", async (candidate) => {
      try {
        await peerRef.current.addIceCandidate(candidate);
      } catch {}
    });

    // 📞 Agent creates offer
    if (isCaller) {
      const offer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(offer);
      socket.emit("offer", offer);
    }
  };

  const stopAudio = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerRef.current?.close();
    peerRef.current = null;
  };

  return { startAudio, stopAudio, remoteAudioRef };
};
