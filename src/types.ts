export interface UserProfile {
  uid: string;
  userId: string; // 6-digit unique numeric ID
  name: string;
  email: string;
  photoUrl?: string;
  createdAt: number;
  online?: boolean;
  lastSeen?: number;
  role?: 'user' | 'admin' | 'owner';
  banned?: boolean;
  blockedUsers?: Record<string, BlockedUserItem | boolean>;
}

export interface BlockedUserItem {
  uid: string;
  userId: string;
  name: string;
  photoUrl?: string;
  timestamp: number;
  reason?: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'romantic';
  timestamp: number;
  active: boolean;
  authorName?: string;
}

export interface AdminStats {
  totalUsers: number;
  onlineUsers: number;
  totalChats: number;
  bannedUsers: number;
  totalAnnouncements: number;
}

export type RequestStatus = 'pending' | 'accepted' | 'rejected';

export interface ChatRequest {
  id: string;
  senderUid: string;
  receiverUid: string;
  senderName: string;
  senderPhoto?: string;
  senderUserId?: string;
  receiverUserId?: string;
  status: RequestStatus;
  createdAt: number;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  type?: MessageType;
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: number;
  audioDuration?: number;
  voiceEffect?: string;
  delivered?: boolean;
  seen?: boolean;
}

export interface ChatConversation {
  chatId: string;
  otherUser: UserProfile;
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export type CallType = 'audio' | 'video';
export type CallStatus = 'calling' | 'ringing' | 'connected' | 'rejected' | 'ended' | 'missed';

export interface CallSession {
  id: string;
  chatId: string;
  callerUid: string;
  callerName: string;
  callerUserId: string;
  callerPhoto?: string;
  receiverUid: string;
  receiverName: string;
  receiverPhoto?: string;
  type: CallType;
  status: CallStatus;
  timestamp: number;
  duration?: number;
  offer?: any;
  answer?: any;
  callerCandidates?: any;
  receiverCandidates?: any;
}

export type VisualFilterId =
  | 'none'
  | 'warm_sunset'
  | 'noir_film'
  | 'cyber_rose'
  | 'vintage_70s'
  | 'emerald_dream'
  | 'golden_hour'
  | 'moonlight'
  | 'lavender_mist'
  | 'cinematic_teal';

export type FaceEnhancementFilterId =
  | 'none'
  | 'natural_glow'
  | 'soft_skin'
  | 'bright_eyes'
  | 'rosy_radiance'
  | 'studio_light'
  | 'soft_portrait'
  | 'delicate_smooth'
  | 'tone_balance'
  | 'natural_sharpen'
  | 'pearl_radiance';

export type VoiceEffectId =
  | 'natural'
  | 'soft'
  | 'deep'
  | 'bright'
  | 'young_style'
  | 'low_tone'
  | 'high_tone'
  | 'warm'
  | 'echo'
  | 'studio';

export interface UserActivity {
  typing?: boolean;
  recording?: boolean;
  timestamp?: number;
}
