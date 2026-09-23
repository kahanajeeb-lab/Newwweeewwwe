import React, { useEffect, useState, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb, sendChatMessage, markChatAsSeen } from '../firebase';
import { UserProfile, ChatMessage } from '../types';
import { ArrowLeft, Send, Check, CheckCheck, Lock } from 'lucide-react';

interface ChatRoomScreenProps {
  currentUser: UserProfile;
  otherUser: UserProfile;
  chatId: string;
  onBack: () => void;
}

export const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({
  currentUser,
  otherUser,
  chatId,
  onBack,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

      // Sort chronological
      list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(list);
      setLoading(false);

      // Automatically mark received messages as seen
      markChatAsSeen(chatId, currentUser.uid).catch(console.error);
    });

    return () => unsubscribe();
  }, [chatId, currentUser.uid]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputVal.trim();
    if (!text || sending) return;

    setSending(true);
    setInputVal('');

    try {
      await sendChatMessage(chatId, currentUser.uid, otherUser.uid, text);
    } catch (err) {
      console.error("Failed to send message:", err);
      setInputVal(text); // restore on error
    } finally {
      setSending(false);
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
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur border-b border-slate-800/80 sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="relative">
            <img
              src={otherUser.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${otherUser.name}`}
              alt={otherUser.name}
              className="w-10 h-10 rounded-full object-cover border border-rose-500/40 bg-slate-800"
            />
            {otherUser.online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-slate-950 rounded-full"></span>
            )}
          </div>

          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-white leading-tight">
              {otherUser.name}
            </h3>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="text-rose-400 font-mono text-[10px]">ID: {otherUser.userId}</span>
              <span>•</span>
              <span className={otherUser.online ? "text-emerald-400" : "text-slate-400"}>
                {otherUser.online ? 'Online' : formatLastSeen(otherUser.lastSeen)}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-rose-400 font-medium bg-rose-950/40 border border-rose-900/50 px-2 py-1 rounded-lg">
          <Lock size={12} />
          <span>M&H</span>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-slate-950 to-slate-950">
        {loading ? (
          <div className="flex justify-center items-center h-full text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mr-2"></div>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-400 mb-3 shadow">
              <Lock size={24} />
            </div>
            <p className="text-sm font-semibold text-white mb-1">Encrypted Conversation</p>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Messages in this chat are synchronized in real time between you and {otherUser.name}. Say hello!
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
                  className={`max-w-[78%] px-4 py-2.5 rounded-2xl shadow-sm text-sm break-words ${
                    isMe
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-br-xs'
                      : 'bg-slate-800/90 border border-slate-700/60 text-slate-100 rounded-bl-xs'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isMe ? 'text-rose-200/80' : 'text-slate-400'
                    }`}
                  >
                    <span>{formatMessageTime(msg.timestamp)}</span>
                    {isMe && (
                      msg.seen ? (
                        <CheckCheck size={13} className="text-pink-200" />
                      ) : (
                        <Check size={13} className="text-rose-200" />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Text Input Bar */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur sticky bottom-0 z-10">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Write a message..."
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
          />

          <button
            type="submit"
            disabled={!inputVal.trim() || sending}
            className="w-12 h-12 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 active:scale-95 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none shadow-md shadow-rose-950/50"
          >
            <Send size={18} className={sending ? 'animate-pulse' : ''} />
          </button>
        </form>
      </div>
    </div>
  );
};
