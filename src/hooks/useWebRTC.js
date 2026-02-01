import { useRef, useEffect } from "react";

export const useWebRTC = (socket, isCaller, isConnected) => {
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const isNegotiatingRef = useRef(false);
  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const audioWorkletNodeRef = useRef(null);

  // Initialize AudioContext for echo cancellation
  const initAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create gain node for volume control
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 0.5; // Start with 50% volume to reduce echo
      
      // Try to load AudioWorklet for advanced processing
      if (audioContextRef.current.audioWorklet) {
        try {
          await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');
          audioWorkletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
        } catch (e) {
          console.warn("AudioWorklet not available, using ScriptProcessor:", e);
        }
      }
    }
  };

  const createPeer = async () => {
    if (peerRef.current) return peerRef.current;

    console.log("🧱 Creating RTCPeerConnection for", isCaller ? "Agent" : "Customer");

    try {
      // Initialize audio context first
      await initAudioContext();
      
      // Get user media with STRONG echo cancellation settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: false }, // Disable auto gain to prevent echo
          channelCount: 1, // Mono reduces echo significantly
          sampleRate: 16000, // Lower sample rate can help
          latency: 0.01, // Low latency
          deviceId: await getPreferredMicrophone()
        }
      });
      
      localStreamRef.current = stream;
      console.log("🎤 Local stream acquired with echo cancellation enabled");
      
      // Process local stream through AudioContext for additional echo suppression
      if (audioContextRef.current && stream) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const destination = audioContextRef.current.createMediaStreamDestination();
        
        // Connect through processing nodes
        if (audioWorkletNodeRef.current) {
          source.connect(audioWorkletNodeRef.current);
          audioWorkletNodeRef.current.connect(gainNodeRef.current);
        } else {
          source.connect(gainNodeRef.current);
        }
        
        gainNodeRef.current.connect(destination);
        localStreamRef.current = destination.stream;
      }
      
    } catch (err) {
      console.error("Failed to get optimized audio stream:", err);
      // Fallback to basic audio
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false
          } 
        });
        localStreamRef.current = fallbackStream;
        console.log("✅ Using fallback audio stream");
      } catch (fallbackErr) {
        console.error("Fallback also failed:", fallbackErr);
        return null;
      }
    }

    // Create RTCPeerConnection with audio optimization
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      sdpSemantics: 'unified-plan'
    });

    // Configure audio codec preferences (Opus is best for echo cancellation)
    const senders = [];

    if (localStreamRef.current) {
      console.log("🎤 Adding local audio tracks with echo optimization");
      
      localStreamRef.current.getAudioTracks().forEach(track => {
        // Apply track constraints for echo reduction
        track.applyConstraints({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 1
        }).catch(e => console.warn("Track constraints warning:", e));
        
        const sender = pc.addTrack(track, localStreamRef.current);
        senders.push(sender);
        
        console.log("✅ Added track with echo cancellation:", track.label);
      });

      // Set codec preferences for Opus (best for voice)
      if (senders.length > 0 && RTCRtpSender.getCapabilities) {
        const capabilities = RTCRtpSender.getCapabilities('audio');
        const opusCodec = capabilities.codecs.find(codec => 
          codec.mimeType.toLowerCase().includes('opus')
        );
        
        if (opusCodec) {
          const params = senders[0].getParameters();
          params.codecs = [opusCodec];
          senders[0].setParameters(params);
          console.log("🔧 Using Opus codec for better echo cancellation");
        }
      }
    }

    // Handle remote audio stream
    pc.ontrack = (event) => {
      console.log("🔊 ONTRACK FIRED - Received remote stream");
      
      if (event.track.kind === 'audio' && remoteAudioRef.current) {
        console.log("🎵 Processing remote audio for echo reduction");
        
        // Create a clean MediaStream
        const remoteStream = new MediaStream([event.track]);
        
        // Process remote audio through AudioContext to apply filters
        if (audioContextRef.current) {
          const remoteSource = audioContextRef.current.createMediaStreamSource(remoteStream);
          const remoteDestination = audioContextRef.current.createMediaStreamDestination();
          
          // Create filters for echo reduction
          const lowPassFilter = audioContextRef.current.createBiquadFilter();
          lowPassFilter.type = 'lowpass';
          lowPassFilter.frequency.value = 4000; // Limit high frequencies
          
          const highPassFilter = audioContextRef.current.createBiquadFilter();
          highPassFilter.type = 'highpass';
          highPassFilter.frequency.value = 80; // Remove low rumble
          
          // Connect: source → highpass → lowpass → gain → destination
          remoteSource.connect(highPassFilter);
          highPassFilter.connect(lowPassFilter);
          lowPassFilter.connect(gainNodeRef.current);
          gainNodeRef.current.connect(remoteDestination);
          
          remoteAudioRef.current.srcObject = remoteDestination.stream;
        } else {
          remoteAudioRef.current.srcObject = remoteStream;
        }
        
        // Apply additional settings to audio element
        if (remoteAudioRef.current) {
          remoteAudioRef.current.volume = 0.5; // Lower volume initially
          remoteAudioRef.current.muted = false;
        }
        
        console.log("✅ Remote audio processed and attached");
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", event.candidate);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("❄️ ICE connection state:", pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log("📶 Signaling state:", pc.signalingState);
    };

    peerRef.current = pc;
    return pc;
  };

  // Helper function to get preferred microphone
  const getPreferredMicrophone = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      // Prefer devices with "chat" or "communication" in the label
      const preferred = audioInputs.find(device => 
        device.label.toLowerCase().includes('chat') || 
        device.label.toLowerCase().includes('communication')
      );
      
      return preferred ? preferred.deviceId : undefined;
    } catch (e) {
      console.warn("Could not enumerate devices:", e);
      return undefined;
    }
  };

  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log("🔌 Setting up WebRTC signaling for", isCaller ? "Agent" : "Customer");

    // CUSTOMER receives offer
    socket.on("offer", async (offer) => {
      if (isCaller) return;
      
      console.log("📞 Customer received offer");
      
      if (isNegotiatingRef.current) return;
      isNegotiatingRef.current = true;

      try {
        const pc = await createPeer();
        if (!pc) return;

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Create answer with voice optimization
        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
          voiceActivityDetection: true
        });
        
        await pc.setLocalDescription(answer);
        socket.emit("answer", answer);
        console.log("📤 Answer sent to agent");
      } catch (err) {
        console.error("Error handling offer:", err);
      } finally {
        isNegotiatingRef.current = false;
      }
    });

    // AGENT receives answer
    socket.on("answer", async (answer) => {
      if (!isCaller) return;
      
      const pc = peerRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("✅ Agent set remote description");
      } catch (err) {
        console.error("Error setting remote description:", err);
      }
    });

    socket.on("ice-candidate", async (candidate) => {
      try {
        if (peerRef.current && candidate) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.warn("Failed to add ICE candidate:", err);
      }
    });

    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      isNegotiatingRef.current = false;
    };
  }, [socket, isCaller, isConnected]);

  const startAudio = async () => {
    console.log("🎤 Starting WebRTC audio");
    
    try {
      const pc = await createPeer();
      if (!pc) return;

      if (isCaller) {
        console.log("📞 Agent creating optimized offer");
        
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          voiceActivityDetection: true,
          iceRestart: false
        });
        
        // Set bandwidth constraints to optimize for voice
        offer.sdp = setBandwidthConstraints(offer.sdp);
        
        await pc.setLocalDescription(offer);
        socket.emit("offer", offer);
        console.log("📤 Optimized offer sent");
      }
    } catch (err) {
      console.error("Error in startAudio:", err);
    }
  };

  // Helper to set SDP bandwidth constraints for voice
  const setBandwidthConstraints = (sdp) => {
    // Limit bandwidth to reduce echo
    let modifiedSdp = sdp;
    
    // Add bandwidth limitations for audio
    modifiedSdp = modifiedSdp.replace(
      /a=mid:audio\r\n/g,
      'a=mid:audio\r\nb=AS:50\r\nb=TIAS:50000\r\n'
    );
    
    // Prefer opus/48000/2 for voice
    modifiedSdp = modifiedSdp.replace(
      /a=rtpmap:\d+ opus\/48000\/2/g,
      (match) => `${match}\na=fmtp:111 maxplaybackrate=16000; stereo=0; sprop-stereo=0`
    );
    
    return modifiedSdp;
  };

  const stopAudio = () => {
    console.log("🛑 Stopping WebRTC");
    
    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
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

  // Function to adjust remote volume (for echo control)
  const setRemoteVolume = (volume) => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = Math.max(0, Math.min(1, volume));
      console.log("🔊 Remote volume set to:", volume);
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = volume;
    }
  };

  return { startAudio, stopAudio, remoteAudioRef, setRemoteVolume };
};