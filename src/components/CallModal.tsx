import React, { useState, useEffect, useRef } from 'react';
import { 
  CallSession, 
  UserProfile, 
  VisualFilterId, 
  FaceEnhancementFilterId, 
  VoiceEffectId 
} from '../types';
import { 
  listenToCallSession, 
  updateCallSession, 
  endCallSession,
  addCallIceCandidate,
  listenToCallIceCandidates
} from '../firebase';
import { 
  startRingtone, 
  stopRingtone, 
  vibrateOnce, 
  getAudioContext, 
  applyVoiceEffectToStream 
} from '../utils/audioEffects';
import { 
  VISUAL_FILTERS, 
  ENHANCEMENT_FILTERS, 
  getCombinedFilterCSS,
  getFavoriteFilters,
  saveFavoriteFilters,
  getAutoApplyPreference,
  setAutoApplyPreference
} from '../utils/videoFilters';
import {
  parseMediaError,
  isMediaDevicesSupported,
  isDisplayMediaSupported
} from '../utils/devicePermissions';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX, 
  SwitchCamera, 
  Monitor, 
  CircleDot, 
  Sparkles, 
  Sliders, 
  Heart, 
  Radio, 
  X,
  Check,
  Download,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface CallModalProps {
  currentUser: UserProfile;
  otherUser: UserProfile;
  callSession: CallSession;
  isIncoming: boolean;
  onClose: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const CallModal: React.FC<CallModalProps> = ({
  currentUser,
  otherUser,
  callSession,
  isIncoming,
  onClose
}) => {
  const [session, setSession] = useState<CallSession>(callSession);
  const [callDuration, setCallDuration] = useState(0);
  const [callConnected, setCallConnected] = useState(false);

  // Media Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(session.type === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Screen Sharing
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  // Call Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [recordedMediaUrl, setRecordedMediaUrl] = useState<string | null>(null);

  // Media & Permission Diagnostic State
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isAudioOnlyFallback, setIsAudioOnlyFallback] = useState(false);

  // Filters & Voice Effects
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [filterTab, setFilterTab] = useState<'visual' | 'enhance' | 'voice'>('visual');

  const favorites = getFavoriteFilters();
  const autoApply = getAutoApplyPreference();

  const [selectedVisual, setSelectedVisual] = useState<VisualFilterId>(
    autoApply && favorites.visual ? favorites.visual : 'none'
  );
  const [selectedEnhance, setSelectedEnhance] = useState<FaceEnhancementFilterId>(
    autoApply && favorites.enhancement ? favorites.enhancement : 'none'
  );
  const [selectedVoiceEffect, setSelectedVoiceEffect] = useState<VoiceEffectId>('natural');

  // WebRTC Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Vibrate once on call ring/start
  useEffect(() => {
    vibrateOnce(250);
    if (!callConnected) {
      startRingtone(isIncoming);
    }
    return () => {
      stopRingtone();
    };
  }, []);

  // Listen for Firebase call updates
  useEffect(() => {
    const unsubscribe = listenToCallSession(session.id, (updated) => {
      if (!updated || updated.status === 'ended' || updated.status === 'rejected') {
        stopRingtone();
        handleCleanup();
        onClose();
        return;
      }
      setSession(updated);

      if (updated.status === 'connected' && !callConnected) {
        setCallConnected(true);
        stopRingtone();
      }

      // If caller receives answer
      if (updated.answer && peerConnectionRef.current && peerConnectionRef.current.signalingState === 'have-local-offer') {
        peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(updated.answer)).catch(console.error);
      }
    });

    return () => unsubscribe();
  }, [session.id, callConnected]);

  // Duration timer
  useEffect(() => {
    let timer: any;
    if (callConnected) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callConnected]);

  // Recording timer
  useEffect(() => {
    let recTimer: any;
    if (isRecording) {
      recTimer = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(recTimer);
  }, [isRecording]);

  // Initialize Media & WebRTC
  const initWebRTC = async (fallbackAudio = false) => {
    setMediaError(null);
    if (!isMediaDevicesSupported()) {
      setMediaError("WebRTC media devices are not supported in this browser environment.");
      return;
    }

    try {
      const wantVideo = session.type === 'video' && !fallbackAudio && !isAudioOnlyFallback;
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: wantVideo ? { facingMode } : false
        });
      } catch (firstErr: any) {
        // If video request failed, attempt audio-only fallback automatically
        if (wantVideo) {
          console.warn("Camera access failed, falling back to audio only:", firstErr);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setIsAudioOnlyFallback(true);
          setMediaError("Camera was unavailable or blocked; connected with audio only.");
        } else {
          throw firstErr;
        }
      }

      localStreamRef.current = stream;
      if (localVideoRef.current && session.type === 'video' && !fallbackAudio && !isAudioOnlyFallback) {
        localVideoRef.current.srcObject = stream;
      }

      // Close any previous peer connection before establishing new
      if (peerConnectionRef.current) {
        try { peerConnectionRef.current.close(); } catch (e) {}
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Listen for remote tracks
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // ICE candidate handling
      const role = isIncoming ? 'receiver' : 'caller';
      const otherRole = isIncoming ? 'caller' : 'receiver';

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addCallIceCandidate(session.id, role, event.candidate.toJSON()).catch(console.error);
        }
      };

      listenToCallIceCandidates(session.id, otherRole, (candidateInit) => {
        if (pc.remoteDescription) {
          pc.addIceCandidate(new RTCIceCandidate(candidateInit)).catch(console.error);
        }
      });

      // Caller creates offer
      if (!isIncoming) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await updateCallSession(session.id, {
          offer: { type: offer.type, sdp: offer.sdp },
          status: 'ringing'
        });
      }
    } catch (err: any) {
      console.error("Failed to access media devices:", err);
      const parsed = parseMediaError(err);
      setMediaError(parsed.message);
    }
  };

  useEffect(() => {
    initWebRTC();
    return () => {
      handleCleanup();
    };
  }, []);

  // Answer call if incoming and accepted
  const handleAcceptCall = async () => {
    stopRingtone();
    setCallConnected(true);
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      if (session.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(session.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await updateCallSession(session.id, {
          answer: { type: answer.type, sdp: answer.sdp },
          status: 'connected'
        });
      }
    } catch (e) {
      console.error("Error creating answer:", e);
    }
  };

  const handleRejectOrEndCall = async () => {
    stopRingtone();
    await endCallSession(session.id, otherUser.uid, currentUser.uid);
    handleCleanup();
    onClose();
  };

  const handleCleanup = () => {
    stopRingtone();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
      mediaRecorderRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch (e) {}
      });
      localStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    if (peerConnectionRef.current) {
      try { peerConnectionRef.current.close(); } catch (e) {}
      peerConnectionRef.current = null;
    }
  };

  // Toggle Microphone
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Switch Front/Back Camera
  const flipCamera = async () => {
    if (session.type !== 'video' || isScreenSharing) return;
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing }
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }

      if (localStreamRef.current) {
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldTrack) oldTrack.stop();
        localStreamRef.current.removeTrack(oldTrack);
        localStreamRef.current.addTrack(newVideoTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    } catch (e) {
      console.warn("Could not switch camera:", e);
    }
  };

  // Screen Sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert to camera
      if (originalVideoTrackRef.current && peerConnectionRef.current) {
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(originalVideoTrackRef.current);
        }
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
      setIsScreenSharing(false);
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];

        if (localStreamRef.current) {
          originalVideoTrackRef.current = localStreamRef.current.getVideoTracks()[0];
        }

        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current
            .getSenders()
            .find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = displayStream;
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (e) {
        console.warn("Screen share cancelled or not allowed:", e);
      }
    }
  };

  // Call Recording
  const startRecording = () => {
    try {
      const combinedStream = new MediaStream();

      // Add local audio
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => combinedStream.addTrack(t));
      }

      // Add video or remote video
      if (session.type === 'video' && remoteVideoRef.current && (remoteVideoRef.current.srcObject as MediaStream)) {
        const remoteStream = remoteVideoRef.current.srcObject as MediaStream;
        remoteStream.getVideoTracks().forEach((t) => combinedStream.addTrack(t));
        remoteStream.getAudioTracks().forEach((t) => combinedStream.addTrack(t));
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
      });

      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedMediaUrl(url);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) {
      console.error("Recording start error:", e);
      alert("Call recording could not be started in this environment.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Save Recording Manually
  const handleSaveRecording = () => {
    if (!recordedMediaUrl) return;
    const a = document.createElement('a');
    a.href = recordedMediaUrl;
    a.download = `MahalKita_Call_${new Date().toISOString().slice(0, 10)}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Voice Effect Selection
  const handleVoiceEffectChange = (effectId: VoiceEffectId) => {
    setSelectedVoiceEffect(effectId);
    if (!localStreamRef.current) return;

    try {
      const ctx = getAudioContext();
      audioContextRef.current = ctx;
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const audioStream = new MediaStream([audioTrack]);
        const sourceNode = ctx.createMediaStreamSource(audioStream);
        const processedNode = applyVoiceEffectToStream(ctx, sourceNode, effectId);
        const destination = ctx.createMediaStreamDestination();
        processedNode.connect(destination);

        const newAudioTrack = destination.stream.getAudioTracks()[0];
        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current
            .getSenders()
            .find((s) => s.track && s.track.kind === 'audio');
          if (sender) {
            sender.replaceTrack(newAudioTrack);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to apply real-time voice effect:", e);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const combinedCSSFilter = getCombinedFilterCSS(selectedVisual, selectedEnhance);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between text-white select-none overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black opacity-90 -z-10" />

      {/* Top Header */}
      <div className="p-4 flex items-center justify-between z-20 bg-gradient-to-b from-slate-950/80 to-transparent">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="text-xs font-semibold text-rose-300 uppercase tracking-widest">
            {callConnected ? formatTimer(callDuration) : isIncoming ? 'Incoming Call' : 'Connecting...'}
          </span>
          {isRecording && (
            <div className="flex items-center gap-1 ml-3 px-2 py-0.5 rounded-full bg-red-600/30 border border-red-500 text-red-300 text-[10px] font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>REC {formatTimer(recordingDuration)}</span>
            </div>
          )}
        </div>

        {/* Right Header: Recording & Effects Buttons */}
        <div className="flex items-center gap-2">
          {session.type === 'video' && (
            <button
              onClick={() => setShowFiltersMenu(!showFiltersMenu)}
              className={`p-2 rounded-xl border transition-all text-xs flex items-center gap-1.5 ${
                showFiltersMenu || selectedVisual !== 'none' || selectedEnhance !== 'none' || selectedVoiceEffect !== 'natural'
                  ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-900/40'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">Filters</span>
            </button>
          )}

          {callConnected && (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              title={isRecording ? "Stop Recording" : "Record Call"}
              className={`p-2 rounded-xl border transition-all text-xs flex items-center gap-1.5 ${
                isRecording 
                  ? 'bg-red-600 border-red-500 text-white animate-pulse' 
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white'
              }`}
            >
              <CircleDot size={16} />
              <span className="hidden sm:inline">{isRecording ? "Stop REC" : "Record"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Video or Audio Stage */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {session.type === 'video' ? (
          <>
            {/* Remote Video Stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Local Video Stream Preview */}
            <div className="absolute top-4 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-rose-500/60 bg-slate-900 z-10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ filter: combinedCSSFilter }}
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              <div className="absolute bottom-1 left-2 text-[9px] font-bold text-rose-300 bg-slate-950/70 px-1.5 py-0.5 rounded backdrop-blur">
                You
              </div>
            </div>

            {/* Screen sharing banner */}
            {isScreenSharing && (
              <div className="absolute top-4 left-4 bg-emerald-600/90 text-white text-xs px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-lg backdrop-blur">
                <Monitor size={14} />
                <span>Screen Sharing Active</span>
              </div>
            )}
          </>
        ) : (
          /* Pure Audio Call Screen */
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-full ring-4 ring-rose-500/30 p-1 bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center shadow-2xl">
                <img
                  src={otherUser.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${otherUser.name}`}
                  alt={otherUser.name}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="absolute bottom-1 right-2 w-5 h-5 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">{otherUser.name}</h2>
              <p className="text-xs font-mono text-rose-400">ID: {otherUser.userId}</p>
              <p className="text-sm text-slate-400">
                {callConnected ? 'Audio Call in Progress' : isIncoming ? 'Mahal Kita Incoming Voice...' : 'Ringing...'}
              </p>
            </div>
          </div>
        )}

        {/* Saved Recording Notification Alert */}
        {recordedMediaUrl && (
          <div className="absolute top-16 left-4 right-4 bg-slate-900/95 border border-emerald-500/50 rounded-2xl p-3 shadow-2xl flex items-center justify-between z-30 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs text-slate-200">
              <Check size={16} className="text-emerald-400" />
              <span>Call recorded successfully!</span>
            </div>
            <button
              onClick={handleSaveRecording}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow"
            >
              <Download size={14} />
              <span>Save to device</span>
            </button>
          </div>
        )}

        {/* Media & Permission Diagnostic Error Alert */}
        {mediaError && (
          <div className="absolute top-4 left-4 right-4 bg-rose-950/95 border border-rose-600/80 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 z-40 animate-fade-scale">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 text-xs text-rose-200">
                <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{mediaError}</span>
              </div>
              <button
                onClick={() => setMediaError(null)}
                className="text-rose-400 hover:text-white p-0.5"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1 self-end">
              {session.type === 'video' && !isAudioOnlyFallback && (
                <button
                  onClick={() => initWebRTC(true)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg transition"
                >
                  Use Audio Only
                </button>
              )}
              <button
                onClick={() => initWebRTC(false)}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 transition shadow"
              >
                <RotateCcw size={12} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter & Voice Effects Panel (Expandable Drawer) */}
      {showFiltersMenu && (
        <div className="bg-slate-900/95 border-t border-slate-800 p-4 space-y-3 max-h-72 overflow-y-auto backdrop-blur z-30">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterTab('visual')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  filterTab === 'visual' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                10 Visual Filters
              </button>
              <button
                onClick={() => setFilterTab('enhance')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  filterTab === 'enhance' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                10 Face Enhancement
              </button>
              <button
                onClick={() => setFilterTab('voice')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  filterTab === 'voice' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                10 Voice Presets
              </button>
            </div>
            <button
              onClick={() => setShowFiltersMenu(false)}
              className="p-1 rounded-full text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Category A: Visual Filters */}
          {filterTab === 'visual' && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {VISUAL_FILTERS.map((f) => {
                const isSelected = selectedVisual === f.id;
                const isFav = favorites.visual === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedVisual(f.id)}
                    className={`relative p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-rose-950/70 border-rose-500 shadow-md ring-1 ring-rose-500'
                        : 'bg-slate-800/80 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`w-2.5 h-2.5 rounded-full ${f.badgeColor}`} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveFavoriteFilters({ ...favorites, visual: f.id });
                        }}
                        title="Favorite this filter"
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <Heart size={12} className={isFav ? "text-rose-500 fill-rose-500" : ""} />
                      </button>
                    </div>
                    <p className="text-xs font-bold text-white mt-1.5">{f.name}</p>
                    <p className="text-[10px] text-slate-400 leading-tight line-clamp-1">{f.description}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Category B: Face Enhancement Filters */}
          {filterTab === 'enhance' && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ENHANCEMENT_FILTERS.map((f) => {
                const isSelected = selectedEnhance === f.id;
                const isFav = favorites.enhancement === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedEnhance(f.id)}
                    className={`relative p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-pink-950/70 border-pink-500 shadow-md ring-1 ring-pink-500'
                        : 'bg-slate-800/80 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`w-2.5 h-2.5 rounded-full ${f.badgeColor}`} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveFavoriteFilters({ ...favorites, enhancement: f.id });
                        }}
                        title="Favorite this filter"
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <Heart size={12} className={isFav ? "text-rose-500 fill-rose-500" : ""} />
                      </button>
                    </div>
                    <p className="text-xs font-bold text-white mt-1.5">{f.name}</p>
                    <p className="text-[10px] text-slate-400 leading-tight line-clamp-1">{f.description}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Category C: Real-Time Voice Presets */}
          {filterTab === 'voice' && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'natural', name: 'Natural (Bypass)', desc: 'Unprocessed voice' },
                { id: 'soft', name: 'Soft', desc: 'Gentle warmth rolloff' },
                { id: 'deep', name: 'Deep', desc: 'Lower tone resonance' },
                { id: 'bright', name: 'Bright', desc: 'High presence lift' },
                { id: 'young_style', name: 'Young-style', desc: 'Formant brightness' },
                { id: 'low_tone', name: 'Low Tone', desc: 'Rich bass resonance' },
                { id: 'high_tone', name: 'High Tone', desc: 'Crisp high clarity' },
                { id: 'warm', name: 'Warm', desc: 'Analog tape saturation' },
                { id: 'echo', name: 'Echo', desc: 'Spatial delay reflection' },
                { id: 'studio', name: 'Studio', desc: 'Vocal compressor EQ' },
              ].map((v) => {
                const isSelected = selectedVoiceEffect === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => handleVoiceEffectChange(v.id as VoiceEffectId)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/70 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                        : 'bg-slate-800/80 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <Radio size={14} className={isSelected ? 'text-indigo-400' : 'text-slate-500'} />
                    <p className="text-xs font-bold text-white mt-1.5">{v.name}</p>
                    <p className="text-[10px] text-slate-400">{v.desc}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bottom Call Action Bar */}
      <div className="p-5 bg-gradient-to-t from-black via-slate-950/90 to-transparent flex items-center justify-center gap-4 z-20">
        {isIncoming && !callConnected ? (
          /* Incoming Call Controls: Accept or Reject */
          <div className="flex items-center gap-8">
            <button
              onClick={handleRejectOrEndCall}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-red-900/50 transition-all"
            >
              <PhoneOff size={28} />
            </button>
            <button
              onClick={handleAcceptCall}
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-emerald-900/50 transition-all animate-bounce"
            >
              <Phone size={28} />
            </button>
          </div>
        ) : (
          /* In-Call Controls */
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
            {/* Mic Mute */}
            <button
              onClick={toggleMute}
              className={`p-3.5 rounded-full border transition-all active:scale-95 ${
                isMuted
                  ? 'bg-red-600/80 border-red-500 text-white'
                  : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Camera Enable/Disable */}
            {session.type === 'video' && (
              <button
                onClick={toggleCamera}
                className={`p-3.5 rounded-full border transition-all active:scale-95 ${
                  !isVideoEnabled
                    ? 'bg-red-600/80 border-red-500 text-white'
                    : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
                title={isVideoEnabled ? "Disable Camera" : "Enable Camera"}
              >
                {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
            )}

            {/* Flip Front/Back Camera */}
            {session.type === 'video' && (
              <button
                onClick={flipCamera}
                className="p-3.5 rounded-full bg-slate-800/90 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-all active:scale-95"
                title="Switch Camera"
              >
                <SwitchCamera size={20} />
              </button>
            )}

            {/* Screen Share */}
            {session.type === 'video' && (
              <button
                onClick={toggleScreenShare}
                className={`p-3.5 rounded-full border transition-all active:scale-95 ${
                  isScreenSharing
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
                title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
              >
                <Monitor size={20} />
              </button>
            )}

            {/* End Call Button */}
            <button
              onClick={handleRejectOrEndCall}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-rose-900/60 transition-all ml-2"
              title="End Call"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
