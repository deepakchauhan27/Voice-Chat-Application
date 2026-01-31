import { useRef } from "react";

export const useWebRTC = (socket) => {
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const startAudio = async () => {
    localStreamRef.current =
      await navigator.mediaDevices.getUserMedia({ audio: true });

    peerRef.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    localStreamRef.current.getTracks().forEach(track =>
      peerRef.current.addTrack(track, localStreamRef.current)
    );

    peerRef.current.ontrack = e => {
      remoteAudioRef.current.srcObject = e.streams[0];
    };

    peerRef.current.onicecandidate = e => {
      if (e.candidate) {
        socket.emit("ice-candidate", e.candidate);
      }
    };
  };

  return { peerRef, remoteAudioRef, startAudio };
};
