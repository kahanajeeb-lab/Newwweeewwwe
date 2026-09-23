import React, { useEffect, useState } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { rtdb } from '../firebase';
import { UserProfile, ChatConversation, ChatMessage } from '../types';
import { MessageSquare, Search, Clock, Check, CheckCheck } from 'lucide-react';

interface ChatsScreenProps {
  currentUser: UserProfile;
  onSelectChat: (conversation: ChatConversation) => void;
  onNavigateToFind: () => void;
}

export const ChatsScreen: React.FC<ChatsScreenProps> = ({
  currentUser,
  onSelectChat,
  onNavigateToFind,
}) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const chatsRef = ref(rtdb, 'chats');

    // Listen to chats in real time
    const unsubscribe = onValue(chatsRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const allChats = snapshot.val();
      const loadedConvos: ChatConversation[] = [];

      for (const chatId of Object.keys(allChats)) {
        const chatData = allChats[chatId];
        const participants = chatData.participants || {};

        // Check if current user is participant
        if (participants[currentUser.uid]) {
          const otherUid = Object.keys(participants).find((uid) => uid !== currentUser.uid);
          if (!otherUid) continue;

          // Fetch other user profile
          let otherProfile: UserProfile | null = null;
          try {
            const userSnap = await get(ref(rtdb, `users/${otherUid}`));
            if (userSnap.exists()) {
              otherProfile = userSnap.val() as UserProfile;
            }
          } catch (e) {
            console.error("Error fetching other user:", e);
          }

          if (!otherProfile) {
            otherProfile = {
              uid: otherUid,
              userId: '000000',
              name: 'Connected User',
              email: '',
              photoUrl: `https://api.dicebear.com/7.x/initials/svg?seed=MH`,
              createdAt: Date.now()
            };
          }

          // Extract last message and unread count
          const messages = chatData.messages || {};
          const msgKeys = Object.keys(messages);
          let lastMsg: ChatMessage | undefined;
          let unread = 0;

          if (msgKeys.length > 0) {
            // Find latest message by timestamp
            const sortedMsgs = msgKeys
              .map((k) => messages[k] as ChatMessage)
              .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            lastMsg = sortedMsgs[0];

            unread = sortedMsgs.filter(
              (m) => m.receiverId === currentUser.uid && !m.seen
            ).length;
          }

          loadedConvos.push({
            chatId,
            otherUser: otherProfile,
            lastMessage: lastMsg,
            unreadCount: unread
          });
        }
      }

      // Sort conversations by latest message timestamp
      loadedConvos.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp || 0;
        const timeB = b.lastMessage?.timestamp || 0;
        return timeB - timeA;
      });

      setConversations(loadedConvos);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser.uid]);

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-64 text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs">Loading secure chats...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/40 border border-rose-900/50 flex items-center justify-center text-rose-400 mb-4 shadow-inner">
          <MessageSquare size={32} />
        </div>
        <h3 className="text-lg font-bold text-white mb-1.5">No Conversations Yet</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-6">
          Use the 6-digit numeric User ID of your partner to find each other and start your private encrypted dialogue.
        </p>
        <button
          onClick={onNavigateToFind}
          className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 active:scale-95 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-lg shadow-rose-950/50 transition-all"
        >
          <Search size={15} />
          <span>Find User with 6-Digit ID</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2 py-2">
      {conversations.map((convo) => (
        <div
          key={convo.chatId}
          onClick={() => onSelectChat(convo)}
          className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 active:scale-[0.99] border border-slate-800/80 transition-all cursor-pointer group shadow-sm"
        >
          {/* Avatar with Online indicator */}
          <div className="relative shrink-0">
            <img
              src={convo.otherUser.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${convo.otherUser.name}`}
              alt={convo.otherUser.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 bg-slate-800"
            />
            {convo.otherUser.online && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-white truncate group-hover:text-rose-300 transition-colors">
                {convo.otherUser.name}
              </h4>
              <span className="text-[11px] text-slate-400 shrink-0">
                {formatTime(convo.lastMessage?.timestamp)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                {convo.lastMessage?.senderId === currentUser.uid && (
                  convo.lastMessage.seen ? (
                    <CheckCheck size={14} className="text-rose-400 shrink-0" />
                  ) : (
                    <Check size={14} className="text-slate-400 shrink-0" />
                  )
                )}
                <span className="truncate">
                  {convo.lastMessage?.text || 'Connected! Tap to chat.'}
                </span>
              </div>

              {convo.unreadCount > 0 && (
                <span className="shrink-0 min-w-5 h-5 px-1.5 bg-rose-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {convo.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
