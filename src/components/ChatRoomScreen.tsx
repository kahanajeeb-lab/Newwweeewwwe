import React, { useEffect, useState, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { 
  rtdb, 
  sendChatMessage, 
  sendMediaChatMessage,
  markChatAsSeen,
  markChatAsDelivered,
  setUserActivity,
  listenToUserActivity,
  createCallSession,
  blockUser,
  unblockUser,
  checkBlockStatus,
  listenToBlockedUsers
} from '../firebase';
import { UserProfile, ChatMessage, UserActivity, CallSession, VoiceEffectId } from '../types';
import { 
  ArrowLeft, 
  Send, 
  Check, 
  CheckCheck, 
  Lock, 
  Phone, 
  Video, 
  Mic, 
  Square, 
  Trash2, 
  Play, 
  Pause, 
  Image as ImageIcon, 
  Paperclip, 
  Download, 
  Sparkles, 
  X,
  Radio,
  FileVideo,
  UserX,
  UserCheck,
  MoreVertical,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { applyVoiceEffectToStream, getAudioContext } from '../utils/audioEffects';
import { compressImage, validateMediaFile, formatBytes } from '../utils/mediaOptimizer';
import { parseMediaError, isMediaDevicesSupported } from '../utils/devicePermissions';

interface ChatRoomScreenProps {
  currentUser: UserProfile;
  otherUser: UserProfile;
  chatId: string;
  onBack: () => void;
  onStartCall: (session: CallSession) => void;
}

export const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({
  currentUser,
  otherUser,
  chatId,
  onBack,
  onStartCall
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Real-time typing & recording activity
  const [partnerActivity, setPartnerActivity] = useState<UserActivity | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Audio Voice Note Recording
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordingDuration, setAudioRecordingDuration] = useState(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [selectedVoiceEffect, setSelectedVoiceEffect] = useState<VoiceEffectId>('natural');
  const [showVoiceEffectPicker, setShowVoiceEffectPicker] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Media Attachment Upload
  const [selectedMediaFile, setSelectedMediaFile] = useState<{
    file: File;
    previewUrl: string;
    type: 'image' | 'video';
    originalSize?: number;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaActionError, setMediaActionError] = useState<string | null>(null);
  const [isCompressingMedia, setIsCompressingMedia] = useState(false);

  // Audio Playback in Chat
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Block status state
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  // Real-time block status listener
  useEffect(() => {
    const unsub = listenToBlockedUsers(currentUser.uid, (list) => {
      const blocked = list.some((b) => b.uid === otherUser.uid);
      setIsBlockedByMe(blocked);
    });

    checkBlockStatus(currentUser.uid, otherUser.uid).then((res) => {
      setIsBlockedByMe(res.blockedByMe);
      setIsBlockedByThem(res.blockedByThem);
    });

    return () => unsub();
  }, [currentUser.uid, otherUser.uid]);

  const handleBlockToggle = async () => {
    try {
      if (isBlockedByMe) {
        await unblockUser(currentUser.uid, otherUser.uid);
        setIsBlockedByMe(false);
      } else {
        await blockUser(currentUser, otherUser, 'Blocked from chat');
        setIsBlockedByMe(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setShowBlockMenu(false);
      setShowBlockConfirm(false);
    }
  };

  // Real-time message listener
  useEffect(() => {
    const messagesRef = ref(rtdb, `chats/${chatId}/messages`);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const val = snapshot.val();
      const list: ChatMessage[] = Object.keys(val).map((k) => ({
        ...val[k],
        id: k,
      }));

      list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(list);
      setLoading(false);

      // Mark delivered and seen
      markChatAsDelivered(chatId, currentUser.uid).catch(console.error);
      markChatAsSeen(chatId, currentUser.uid).catch(console.error);
    });

    return () => unsubscribe();
  }, [chatId, currentUser.uid]);

  // Listen to other user's typing and recording activity
  useEffect(() => {
    const unsubscribe = listenToUserActivity(chatId, otherUser.uid, (activity) => {
      setPartnerActivity(activity);
    });
    return () => {
      unsubscribe();
      setUserActivity(chatId, currentUser.uid, {}).catch(console.error);
    };
  }, [chatId, otherUser.uid, currentUser.uid]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerActivity]);

  // Handle typing input with debounce
  const handleInputChange = (text: string) => {
    setInputVal(text);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setUserActivity(chatId, currentUser.uid, { typing: true }).catch(console.error);

    typingTimeoutRef.current = setTimeout(() => {
      setUserActivity(chatId, currentUser.uid, { typing: false }).catch(console.error);
    }, 2500);
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputVal.trim();
    if (!text || sending) return;

    setSending(true);
    setInputVal('');
    setUserActivity(chatId, currentUser.uid, { typing: false }).catch(console.error);

    try {
      await sendChatMessage(chatId, currentUser.uid, otherUser.uid, text);
    } catch (err) {
      console.error("Failed to send message:", err);
      setInputVal(text);
    } finally {
      setSending(false);
    }
  };

  // Start Audio Recording
  const startAudioRecording = async () => {
    setMediaActionError(null);
    if (!isMediaDevicesSupported()) {
      setMediaActionError("Microphone is not supported in this browser environment.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => {
          try { t.stop(); } catch (err) {}
        });
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingAudio(true);
      setAudioRecordingDuration(0);

      // Signal recording activity to partner
      setUserActivity(chatId, currentUser.uid, { recording: true }).catch(console.error);

      recordingTimerRef.current = setInterval(() => {
        setAudioRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (e: any) {
      console.error("Could not access microphone for voice message:", e);
      const parsed = parseMediaError(e);
      setMediaActionError(parsed.message);
    }
  };

  // Stop Audio Recording & enter preview
  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecordingAudio(false);
    setUserActivity(chatId, currentUser.uid, { recording: false }).catch(console.error);
  };

  // Cancel Audio Recording
  const cancelAudioRecording = () => {
    stopAudioRecording();
    if (audioPreviewUrl) {
      try { URL.revokeObjectURL(audioPreviewUrl); } catch (e) {}
    }
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setAudioRecordingDuration(0);
  };

  // Send Recorded Audio Note
  const handleSendVoiceNote = async () => {
    if (!audioBlob) return;
    setSending(true);
    setMediaActionError(null);

    try {
      // Convert to base64 Data URL for standalone reliable transport
      const reader = new FileReader();
      reader.onerror = () => {
        setMediaActionError("Failed to encode audio recording. Please try again.");
        setSending(false);
      };
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          await sendMediaChatMessage(chatId, currentUser.uid, otherUser.uid, {
            type: 'audio',
            mediaUrl: base64Data,
            audioDuration: audioRecordingDuration,
            voiceEffect: selectedVoiceEffect,
            text: `🎤 Voice note (${audioRecordingDuration}s)`
          });
          cancelAudioRecording();
        } catch (sendErr: any) {
          setMediaActionError(sendErr?.message || "Failed to deliver voice note. Check internet connection.");
        } finally {
          setSending(false);
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (e: any) {
      console.error("Failed to send voice message:", e);
      setMediaActionError("Failed to send voice note. Please try again.");
      setSending(false);
    }
  };

  // Handle Media File Selection (Image or Video)
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMediaActionError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size and mime type
    const validation = validateMediaFile(file);
    if (!validation.valid) {
      setMediaActionError(validation.error || "Invalid media file.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const isVideo = file.type.startsWith('video/');

    // Revoke previous preview if any to prevent memory leaks
    if (selectedMediaFile?.previewUrl) {
      try { URL.revokeObjectURL(selectedMediaFile.previewUrl); } catch (e) {}
    }

    const preview = URL.createObjectURL(file);
    setSelectedMediaFile({
      file,
      previewUrl: preview,
      type: isVideo ? 'video' : 'image',
      originalSize: file.size
    });
  };

  const cancelSelectedMedia = () => {
    if (selectedMediaFile?.previewUrl) {
      try { URL.revokeObjectURL(selectedMediaFile.previewUrl); } catch (e) {}
    }
    setSelectedMediaFile(null);
    setUploadProgress(0);
    setIsCompressingMedia(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send Image or Video Message with on-the-fly Image Compression
  const handleSendMedia = async () => {
    if (!selectedMediaFile) return;
    setSending(true);
    setMediaActionError(null);
    setUploadProgress(15);

    try {
      if (selectedMediaFile.type === 'image') {
        setIsCompressingMedia(true);
        // High quality client-side canvas compression down to ~150KB
        const compressed = await compressImage(selectedMediaFile.file, 1280, 1280, 0.82);
        setIsCompressingMedia(false);
        setUploadProgress(65);

        await sendMediaChatMessage(chatId, currentUser.uid, otherUser.uid, {
          type: 'image',
          mediaUrl: compressed.dataUrl,
          mediaName: selectedMediaFile.file.name,
          mediaSize: compressed.compressedSize,
          text: '📷 Photo'
        });
      } else {
        // Video file reading with progress
        const reader = new FileReader();
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 90));
          }
        };

        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to process video file."));
          reader.readAsDataURL(selectedMediaFile.file);
        });

        setUploadProgress(95);
        await sendMediaChatMessage(chatId, currentUser.uid, otherUser.uid, {
          type: 'video',
          mediaUrl: dataUrl,
          mediaName: selectedMediaFile.file.name,
          mediaSize: selectedMediaFile.file.size,
          text: '🎥 Video'
        });
      }

      cancelSelectedMedia();
      setSending(false);
      setUploadProgress(0);
    } catch (e: any) {
      console.error("Failed to upload media:", e);
      setMediaActionError(e?.message || "Failed to upload media. Please try a smaller file.");
      setSending(false);
      setIsCompressingMedia(false);
      setUploadProgress(0);
    }
  };

  // Manual Media Download (Requirement: Do NOT auto-download, provide "Save to device")
  const handleManualDownload = (url: string, filename: string) => {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `MahalKita_Media_${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("Error downloading file:", e);
    }
  };

  // Play / Pause Voice Message in Chat
  const togglePlayAudio = (id: string, url: string) => {
    if (playingAudioId === id) {
      audioElementRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      const audio = new Audio(url);
      audioElementRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.play().catch(console.error);
      setPlayingAudioId(id);
    }
  };

  // Initiate Outgoing Call
  const handleStartCall = async (type: 'audio' | 'video') => {
    if (isBlockedByMe) {
      alert("Please unblock this contact to start a call.");
      return;
    }
    if (isBlockedByThem) {
      alert("This contact is currently unavailable.");
      return;
    }
    try {
      const callId = await createCallSession({
        chatId,
        callerUid: currentUser.uid,
        callerName: currentUser.name,
        callerUserId: currentUser.userId,
        callerPhoto: currentUser.photoUrl,
        receiverUid: otherUser.uid,
        receiverName: otherUser.name,
        receiverPhoto: otherUser.photoUrl,
        type,
        status: 'calling',
        timestamp: Date.now()
      });

      onStartCall({
        id: callId,
        chatId,
        callerUid: currentUser.uid,
        callerName: currentUser.name,
        callerUserId: currentUser.userId,
        callerPhoto: currentUser.photoUrl,
        receiverUid: otherUser.uid,
        receiverName: otherUser.name,
        receiverPhoto: otherUser.photoUrl,
        type,
        status: 'calling',
        timestamp: Date.now()
      });
    } catch (e) {
      console.error("Failed to start call:", e);
      alert("Could not start call. Please check your connection.");
    }
  };

  const formatMessageTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (ts?: number) => {
    if (!ts) return 'Offline';
    const now = Date.now();
    const diffMin = Math.floor((now - ts) / 60000);
    if (diffMin < 2) return 'Active just now';
    if (diffMin < 60) return `Active ${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    return 'Offline';
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-950 text-white select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 backdrop-blur border-b border-slate-800/80 sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="relative">
            <img
              src={otherUser.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${otherUser.name}`}
              alt={otherUser.name}
              className="w-9 h-9 rounded-full object-cover border border-rose-500/40 bg-slate-800"
            />
            {otherUser.online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-slate-950 rounded-full" />
            )}
          </div>

          <div className="flex flex-col">
            <h3 className="text-xs font-bold text-white leading-tight">
              {otherUser.name}
            </h3>
            {/* Real-time Indicator under name */}
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              {partnerActivity?.recording ? (
                <span className="text-rose-400 font-semibold animate-pulse flex items-center gap-1">
                  <Mic size={10} />
                  <span>Recording voice...</span>
                </span>
              ) : partnerActivity?.typing ? (
                <span className="text-pink-400 font-semibold animate-pulse">
                  Typing...
                </span>
              ) : (
                <>
                  <span className="text-rose-400 font-mono">ID: {otherUser.userId}</span>
                  <span>•</span>
                  <span className={otherUser.online ? "text-emerald-400" : "text-slate-400"}>
                    {otherUser.online ? 'Online' : formatLastSeen(otherUser.lastSeen)}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Audio & Video Calling Buttons + More Menu */}
        <div className="flex items-center gap-1.5 relative">
          <button
            onClick={() => handleStartCall('audio')}
            title={isBlockedByMe ? "Unblock contact to call" : "Start Voice Call"}
            disabled={isBlockedByMe || isBlockedByThem}
            className={`p-2 rounded-xl border transition-colors active:scale-95 ${
              isBlockedByMe || isBlockedByThem
                ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 border-slate-700/60'
            }`}
          >
            <Phone size={16} />
          </button>

          <button
            onClick={() => handleStartCall('video')}
            title={isBlockedByMe ? "Unblock contact to call" : "Start Video Call"}
            disabled={isBlockedByMe || isBlockedByThem}
            className={`p-2 rounded-xl border transition-colors active:scale-95 ${
              isBlockedByMe || isBlockedByThem
                ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 border-slate-700/60'
            }`}
          >
            <Video size={16} />
          </button>

          <button
            onClick={() => setShowBlockMenu(!showBlockMenu)}
            title="More Options"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
          >
            <MoreVertical size={16} />
          </button>

          {/* More / Block Dropdown */}
          {showBlockMenu && (
            <div className="absolute right-0 top-11 z-30 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-1.5 text-xs animate-in fade-in duration-100">
              <div className="px-3 py-1.5 text-[10px] text-slate-500 font-mono border-b border-slate-800">
                User ID: #{otherUser.userId}
              </div>
              <button
                onClick={() => {
                  setShowBlockMenu(false);
                  if (isBlockedByMe) {
                    handleBlockToggle();
                  } else {
                    setShowBlockConfirm(true);
                  }
                }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors ${
                  isBlockedByMe
                    ? 'text-emerald-400 hover:bg-emerald-950/40'
                    : 'text-rose-400 hover:bg-rose-950/40'
                }`}
              >
                {isBlockedByMe ? <UserCheck size={14} /> : <UserX size={14} />}
                <span>{isBlockedByMe ? 'Unblock Contact' : 'Block Contact'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Block Alert Banners */}
      {isBlockedByMe && (
        <div className="px-4 py-2 bg-rose-950/80 border-b border-rose-900/60 text-xs flex items-center justify-between text-rose-200">
          <div className="flex items-center gap-2">
            <UserX size={14} className="text-rose-400 shrink-0" />
            <span>You have blocked this contact.</span>
          </div>
          <button
            onClick={handleBlockToggle}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[11px] transition-colors"
          >
            Unblock
          </button>
        </div>
      )}

      {isBlockedByThem && !isBlockedByMe && (
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-center text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldAlert size={14} className="text-amber-400 shrink-0" />
          <span>This contact is currently unavailable.</span>
        </div>
      )}

      {/* Media / Permission Diagnostic Error Banner */}
      {mediaActionError && (
        <div className="px-4 py-2 bg-rose-950/95 border-b border-rose-900/80 text-xs flex items-center justify-between text-rose-200 animate-slide-up shadow-sm">
          <div className="flex items-center gap-2 pr-2">
            <AlertTriangle size={14} className="text-rose-400 shrink-0" />
            <span className="leading-snug">{mediaActionError}</span>
          </div>
          <button
            onClick={() => setMediaActionError(null)}
            className="p-1 text-rose-400 hover:text-white transition-colors shrink-0"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-slate-950 to-slate-950">
        {loading ? (
          <div className="flex justify-center items-center h-full text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mr-2" />
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-400 mb-3 shadow">
              <Lock size={24} />
            </div>
            <p className="text-sm font-semibold text-white mb-1">Private Encrypted Chat</p>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Real-time messaging, photos, voice notes, and 1-to-1 WebRTC calling.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.uid;
            const isSystem = msg.senderId === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="bg-rose-950/40 border border-rose-900/40 text-rose-200 text-xs px-3.5 py-1.5 rounded-full text-center shadow-sm max-w-xs">
                    {msg.text}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1 animate-in fade-in slide-in-from-bottom-1`}
              >
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl shadow-sm text-sm break-words ${
                    isMe
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-br-xs'
                      : 'bg-slate-800/90 border border-slate-700/60 text-slate-100 rounded-bl-xs'
                  }`}
                >
                  {/* Image Message */}
                  {msg.type === 'image' && msg.mediaUrl && (
                    <div className="mb-2 space-y-1.5">
                      <img
                        src={msg.mediaUrl}
                        alt="Photo"
                        className="rounded-xl max-h-56 w-full object-cover border border-black/20"
                      />
                      <button
                        onClick={() => handleManualDownload(msg.mediaUrl!, `Photo_${msg.timestamp}.jpg`)}
                        className="w-full py-1 px-2 rounded-lg bg-black/40 hover:bg-black/60 text-[10px] text-white font-medium flex items-center justify-center gap-1 transition-all"
                      >
                        <Download size={12} />
                        <span>Save to device</span>
                      </button>
                    </div>
                  )}

                  {/* Video Message */}
                  {msg.type === 'video' && msg.mediaUrl && (
                    <div className="mb-2 space-y-1.5">
                      <video
                        src={msg.mediaUrl}
                        controls
                        className="rounded-xl max-h-56 w-full object-cover border border-black/20"
                      />
                      <button
                        onClick={() => handleManualDownload(msg.mediaUrl!, `Video_${msg.timestamp}.mp4`)}
                        className="w-full py-1 px-2 rounded-lg bg-black/40 hover:bg-black/60 text-[10px] text-white font-medium flex items-center justify-center gap-1 transition-all"
                      >
                        <Download size={12} />
                        <span>Save to device</span>
                      </button>
                    </div>
                  )}

                  {/* Audio Voice Note Message */}
                  {msg.type === 'audio' && msg.mediaUrl && (
                    <div className="flex flex-col space-y-1.5 py-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePlayAudio(msg.id, msg.mediaUrl!)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                            isMe ? 'bg-white text-rose-600' : 'bg-rose-600 text-white'
                          }`}
                        >
                          {playingAudioId === msg.id ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                        </button>
                        <div className="flex-1">
                          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div className={`h-full ${playingAudioId === msg.id ? 'w-full bg-white animate-pulse' : 'w-1/3 bg-white/60'}`} />
                          </div>
                          <div className="flex justify-between items-center text-[10px] opacity-80 mt-1">
                            <span>Voice Note</span>
                            <span>{msg.audioDuration ? `${msg.audioDuration}s` : '0:05'}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleManualDownload(msg.mediaUrl!, `VoiceNote_${msg.timestamp}.webm`)}
                        className="py-0.5 px-2 rounded bg-black/30 hover:bg-black/50 text-[9px] text-white/90 flex items-center justify-center gap-1 self-end transition-all"
                      >
                        <Download size={10} />
                        <span>Save to device</span>
                      </button>
                    </div>
                  )}

                  {/* Text Message Content */}
                  {(!msg.type || msg.type === 'text') && (
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  )}

                  {/* Timestamp & Real Delivery State */}
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isMe ? 'text-rose-200/80' : 'text-slate-400'
                    }`}
                  >
                    <span>{formatMessageTime(msg.timestamp)}</span>
                    {isMe && (
                      <span title={msg.seen ? "Seen" : msg.delivered ? "Delivered" : "Sent"} className="inline-flex items-center">
                        {msg.seen ? (
                          // Blue / Radiant Double Tick = Actually Read
                          <CheckCheck size={13} className="text-sky-300 font-bold" />
                        ) : msg.delivered ? (
                          // Grey Double Tick = Delivered to Recipient
                          <CheckCheck size={13} className="text-slate-300 opacity-70" />
                        ) : (
                          // Single Tick = Sent
                          <Check size={13} className="text-rose-200" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected Media File Preview Modal */}
      {selectedMediaFile && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2 animate-slide-up">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
              {selectedMediaFile.type === 'video' ? <FileVideo size={14} /> : <ImageIcon size={14} />}
              <span>Ready to send {selectedMediaFile.type}</span>
              {selectedMediaFile.originalSize && (
                <span className="text-[10px] text-slate-400 font-mono">({formatBytes(selectedMediaFile.originalSize)})</span>
              )}
            </span>
            <button onClick={cancelSelectedMedia} className="text-slate-400 hover:text-white" title="Cancel">
              <X size={16} />
            </button>
          </div>
          <div className="relative rounded-xl overflow-hidden max-h-40 bg-black flex justify-center border border-slate-800">
            {selectedMediaFile.type === 'video' ? (
              <video src={selectedMediaFile.previewUrl} controls className="max-h-40" />
            ) : (
              <img src={selectedMediaFile.previewUrl} alt="Preview" className="max-h-40 object-contain" />
            )}
            {isCompressingMedia && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center text-xs text-rose-300 font-medium gap-2">
                <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                <span>Optimizing image size...</span>
              </div>
            )}
          </div>
          {uploadProgress > 0 && !isCompressingMedia && (
            <div className="space-y-1">
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
            </div>
          )}
          <button
            onClick={handleSendMedia}
            disabled={sending || isCompressingMedia}
            className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow disabled:opacity-50"
          >
            <Send size={14} />
            <span>Send {selectedMediaFile.type}</span>
          </button>
        </div>
      )}

      {/* Recorded Audio Preview Drawer */}
      {audioPreviewUrl && !selectedMediaFile && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
              <Mic size={14} />
              <span>Voice Note Recorded ({audioRecordingDuration}s)</span>
            </span>
            <button onClick={cancelAudioRecording} className="text-slate-400 hover:text-rose-400">
              <Trash2 size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <audio src={audioPreviewUrl} controls className="flex-1 h-9" />
            <button
              onClick={() => setShowVoiceEffectPicker(!showVoiceEffectPicker)}
              className="p-2 rounded-xl bg-slate-800 text-indigo-400 hover:bg-slate-700 text-xs font-medium flex items-center gap-1 border border-slate-700"
              title="Voice Effect Preset"
            >
              <Sparkles size={14} />
              <span>FX: {selectedVoiceEffect}</span>
            </button>
          </div>

          {/* Voice Presets Selector */}
          {showVoiceEffectPicker && (
            <div className="grid grid-cols-5 gap-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800 text-[10px]">
              {['natural', 'soft', 'deep', 'bright', 'young_style', 'low_tone', 'high_tone', 'warm', 'echo', 'studio'].map((fx) => (
                <button
                  key={fx}
                  onClick={() => {
                    setSelectedVoiceEffect(fx as VoiceEffectId);
                    setShowVoiceEffectPicker(false);
                  }}
                  className={`py-1 px-1.5 rounded text-center capitalize transition-all ${
                    selectedVoiceEffect === fx ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {fx.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={cancelAudioRecording}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300"
            >
              Discard
            </button>
            <button
              onClick={handleSendVoiceNote}
              disabled={sending}
              className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 shadow"
            >
              <Send size={14} />
              <span>Send Voice Note</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Text & Media Input Bar / Blocked state */}
      {isBlockedByMe ? (
        <div className="p-3.5 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between sticky bottom-0 z-10">
          <div className="flex items-center gap-2 text-rose-300 text-xs">
            <UserX size={16} className="text-rose-400" />
            <span>Contact is blocked</span>
          </div>
          <button
            onClick={handleBlockToggle}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow"
          >
            Unblock Contact
          </button>
        </div>
      ) : isBlockedByThem ? (
        <div className="p-3.5 bg-slate-900/95 border-t border-slate-800 text-center text-xs text-slate-500 sticky bottom-0 z-10">
          You cannot send messages to this contact.
        </div>
      ) : !selectedMediaFile && !audioPreviewUrl && (
        <div className="p-2.5 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur sticky bottom-0 z-10">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelected}
            accept="image/*,video/*"
            className="hidden"
          />

          {isRecordingAudio ? (
            /* Active Live Audio Recording Bar */
            <div className="flex items-center justify-between bg-slate-950 border border-rose-600/50 rounded-2xl px-4 py-2 text-sm">
              <div className="flex items-center gap-2 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                <span className="font-mono font-bold text-xs">{audioRecordingDuration}s</span>
                <span className="text-xs text-slate-400 ml-1">Recording voice...</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelAudioRecording}
                  className="p-2 text-slate-400 hover:text-rose-400"
                  title="Cancel Recording"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={stopAudioRecording}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 shadow"
                >
                  <Square size={14} />
                  <span>Done</span>
                </button>
              </div>
            </div>
          ) : (
            /* Normal Text / Attachment Bar */
            <form onSubmit={handleSendText} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Send Photo or Video"
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Paperclip size={18} />
              </button>

              <input
                type="text"
                value={inputVal}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Write a message..."
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-2xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
              />

              {inputVal.trim() ? (
                <button
                  type="submit"
                  disabled={sending}
                  className="w-10 h-10 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 active:scale-95 text-white flex items-center justify-center transition-all shadow-md shadow-rose-950/50"
                >
                  <Send size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startAudioRecording}
                  title="Record Voice Note"
                  className="w-10 h-10 rounded-2xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 border border-slate-700/60 flex items-center justify-center transition-all active:scale-95"
                >
                  <Mic size={18} />
                </button>
              )}
            </form>
          )}
        </div>
      )}

      {/* Block Confirmation Dialog */}
      {showBlockConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-xs w-full space-y-3 text-xs">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <UserX size={18} />
              <span>Block Contact</span>
            </div>
            <p className="text-slate-300">
              Are you sure you want to block <span className="text-white font-bold">{otherUser.name}</span>? They will no longer be able to message or call you.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowBlockConfirm(false)}
                className="flex-1 py-2 bg-slate-800 rounded-xl text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBlockToggle}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
