import { useRef, useEffect } from "react";

export const useWebRTC = (socket, isCaller) => {
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const initializedRef = useRef(false);

  // ===============================
  // CREATE / ENSURE PEER
  // ===============================
  const createPeer = async () => {
    if (peerRef.current) return peerRef.current;

    console.log("🧱 Creating RTCPeerConnection");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      console.log("🔊 ONTRACK FIRED");
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", event.candidate);
      }
    };

    peerRef.current = pc;
    return pc;
  };

  // ===============================
  // SOCKET LISTENERS (ONCE)
  // ===============================
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // ---------- CUSTOMER: RECEIVE OFFER ----------
    socket.on("offer", async (offer) => {
      if (isCaller) return;

      console.log("📞 Customer received offer");

      const pc = await createPeer();
      await pc.setRemoteDescription(offer);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", answer);
    });

    // ---------- AGENT: RECEIVE ANSWER ----------
    socket.on("answer", async (answer) => {
      if (!isCaller) return;

      const pc = peerRef.current;
      if (!pc) return;

      if (pc.signalingState !== "have-local-offer") {
        console.warn("⚠️ Ignoring answer, state =", pc.signalingState);
        return;
      }

      console.log("✅ Agent applying answer");
      await pc.setRemoteDescription(answer);
    });

    // ---------- ICE ----------
    socket.on("ice-candidate", async (candidate) => {
      try {
        await peerRef.current?.addIceCandidate(candidate);
      } catch {}
    });

    // ---------- 🔁 RENEGOTIATION (THE FIX) ----------
    socket.on("renegotiate", async () => {
  if (!isCaller || !peerRef.current) return;

  console.log("🔁 Agent renegotiating");

  // 🔥 FORCE track refresh
  const stream = localStreamRef.current;
  if (stream) {
    stream.getTracks().forEach((track) => {
      peerRef.current.addTrack(track, stream);
    });
  }

  const offer = await peerRef.current.createOffer({
    offerToReceiveAudio: true,
  });

  await peerRef.current.setLocalDescription(offer);
  socket.emit("offer", offer);
});


    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("renegotiate");
    };
  }, [socket, isCaller]);

  // ===============================
  // START AUDIO
  // ===============================
  const startAudio = async () => {
    console.log("🎤 Starting WebRTC");

    const pc = await createPeer();

    if (isCaller) {
      console.log("📞 Agent creating offer");
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
  };

  return { startAudio, stopAudio, remoteAudioRef };
};
