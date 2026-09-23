export interface UserProfile {
  uid: string;
  userId: string; // 6-digit unique numeric ID
  name: string;
  email: string;
  photoUrl?: string;
  createdAt: number;
  online?: boolean;
  lastSeen?: number;
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

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  type?: 'text' | 'image';
  seen?: boolean;
}

export interface ChatConversation {
  chatId: string;
  otherUser: UserProfile;
  lastMessage?: ChatMessage;
  unreadCount: number;
}
