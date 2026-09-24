import React, { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { rtdb, listenToIncomingCalls, listenToSystemAnnouncements } from '../firebase';
import { UserProfile, ChatConversation, CallSession, SystemAnnouncement } from '../types';
import { ChatsScreen } from './ChatsScreen';
import { RequestsScreen } from './RequestsScreen';
import { FindUserScreen } from './FindUserScreen';
import { ProfileScreen } from './ProfileScreen';
import { SettingsScreen } from './SettingsScreen';
import { ChatRoomScreen } from './ChatRoomScreen';
import { CallModal } from './CallModal';
import { showSystemNotification } from '../utils/devicePermissions';
import { 
  MessageSquare, 
  Inbox, 
  Search, 
  User as UserIcon, 
  Settings, 
  Heart, 
  Smartphone,
  Sparkles,
  Flame,
  WifiOff
} from 'lucide-react';

interface MainScreenProps {
  currentUser: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onLogout: () => void;
  onLockToCalculator: () => void;
}

type TabType = 'chats' | 'requests' | 'find' | 'profile' | 'settings';

export const MainScreen: React.FC<MainScreenProps> = ({
  currentUser,
  onUpdateProfile,
  onLogout,
  onLockToCalculator,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [activeChat, setActiveChat] = useState<{
    chatId: string;
    otherUser: UserProfile;
  } | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online / offline connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connectedRef = ref(rtdb, '.info/connected');
    const unsub = onValue(connectedRef, (snap) => {
      if (snap.val() === false) {
        setIsOnline(false);
      } else if (snap.val() === true) {
        setIsOnline(true);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsub();
    };
  }, []);

  // Active call state
  const [activeCallSession, setActiveCallSession] = useState<{
    session: CallSession;
    otherUser: UserProfile;
    isIncoming: boolean;
  } | null>(null);

  // System Announcements state
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);

  // Listen to system announcements
  useEffect(() => {
    const unsub = listenToSystemAnnouncements((list) => {
      setAnnouncements(list.filter((a) => a.active));
    });
    return () => unsub();
  }, []);

  // Background / Foreground presence handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      const userRef = ref(rtdb, `users/${currentUser.uid}`);
      update(userRef, {
        online: isVisible,
        lastSeen: Date.now()
      }).catch(console.error);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser.uid]);

  // Monitor pending requests count for badge
  useEffect(() => {
    const reqsRef = ref(rtdb, `requests/${currentUser.uid}`);
    const unsubscribe = onValue(reqsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setPendingRequestsCount(0);
        return;
      }
      const data = snapshot.val();
      const count = Object.values(data).filter((r: any) => r.status === 'pending').length;
      setPendingRequestsCount(count);
    });

    return () => unsubscribe();
  }, [currentUser.uid]);

  // Listen for incoming 1-to-1 WebRTC calls
  useEffect(() => {
    const unsubscribe = listenToIncomingCalls(currentUser.uid, (incoming) => {
      if (incoming && incoming.callId) {
        showSystemNotification(`Incoming ${incoming.type === 'video' ? 'Video' : 'Audio'} Call`, {
          body: `${incoming.callerName || 'Partner'} is calling you on Mahal Kita.`
        });

        setActiveCallSession({
          session: {
            id: incoming.callId,
            chatId: incoming.chatId,
            callerUid: incoming.callerUid,
            callerName: incoming.callerName,
            callerUserId: incoming.callerUserId,
            callerPhoto: incoming.callerPhoto,
            receiverUid: currentUser.uid,
            receiverName: currentUser.name,
            type: incoming.type,
            status: 'ringing',
            timestamp: incoming.timestamp
          },
          otherUser: {
            uid: incoming.callerUid,
            userId: incoming.callerUserId || '000000',
            name: incoming.callerName || 'Partner',
            email: '',
            photoUrl: incoming.callerPhoto,
            createdAt: incoming.timestamp
          },
          isIncoming: true
        });
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // If a call is active (incoming or outgoing)
  if (activeCallSession) {
    return (
      <CallModal
        currentUser={currentUser}
        otherUser={activeCallSession.otherUser}
        callSession={activeCallSession.session}
        isIncoming={activeCallSession.isIncoming}
        onClose={() => setActiveCallSession(null)}
      />
    );
  }

  // If a chat room is currently open
  if (activeChat) {
    return (
      <ChatRoomScreen
        currentUser={currentUser}
        otherUser={activeChat.otherUser}
        chatId={activeChat.chatId}
        onBack={() => setActiveChat(null)}
        onStartCall={(session) => {
          setActiveCallSession({
            session,
            otherUser: activeChat.otherUser,
            isIncoming: false
          });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-950 text-white select-none">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-[11px] font-semibold py-1.5 px-3 flex items-center justify-center gap-1.5 z-40 animate-slide-up shadow-sm">
          <WifiOff size={13} />
          <span>No internet connection. Reconnecting to server...</span>
        </div>
      )}

      {/* Top Header */}
      <header className="px-4 py-3 bg-slate-900/90 backdrop-blur border-b border-slate-800/80 sticky top-0 z-30 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center shadow-md shadow-rose-950/40">
            <Heart size={18} className="text-white fill-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <span>Mahal Kita</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-300">
                M&amp;H
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider">
              ID: {currentUser.userId}
            </p>
          </div>
        </div>

        {/* Right Header Actions: Panic Button, Lock Button, Avatar */}
        <div className="flex items-center gap-2">
          {/* Quick Panic Button (Requirement 3) */}
          <button
            onClick={onLockToCalculator}
            title="Panic Mode: Instant disguise"
            className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-300 hover:text-white transition-all active:scale-95 flex items-center gap-1"
          >
            <Flame size={16} className="text-rose-400" />
            <span className="text-[10px] font-bold hidden sm:inline">Panic</span>
          </button>

          <button
            onClick={onLockToCalculator}
            title="Disguise as Calculator"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60 active:scale-95"
          >
            <Smartphone size={16} />
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className="relative rounded-full focus:outline-none ring-2 ring-rose-500/40"
          >
            <img
              src={currentUser.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover bg-slate-800"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-slate-950 rounded-full" />
          </button>
        </div>
      </header>

      {/* Owner Signature Ribbon (Requirement 1: "Owner by Raha Hamza Khan") */}
      <div className="mx-4 mt-2 p-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-pink-500/10 border border-amber-500/20 flex items-center justify-between shadow-sm animate-in fade-in duration-500">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-amber-400" />
          <span className="text-[11px] font-serif italic text-amber-200/95 font-semibold tracking-wide">
            Owner by Raha Hamza Khan
          </span>
        </div>
        <span className="text-[9px] font-mono text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800/40">
          Private Vault
        </span>
      </div>

      {/* Broadcast Announcements */}
      {announcements
        .filter((a) => !dismissedAnnouncements.includes(a.id))
        .map((a) => (
          <div
            key={a.id}
            className={`mx-4 mt-2 p-2.5 rounded-xl border flex items-start justify-between gap-2 shadow-sm text-xs animate-in fade-in ${
              a.priority === 'urgent'
                ? 'bg-rose-950/70 border-rose-700/80 text-rose-200'
                : a.priority === 'warning'
                ? 'bg-amber-950/70 border-amber-700/80 text-amber-200'
                : 'bg-indigo-950/70 border-indigo-700/80 text-indigo-200'
            }`}
          >
            <div>
              <p className="font-bold text-white text-[11px] flex items-center gap-1.5">
                <Bell size={12} />
                <span>{a.title}</span>
              </p>
              <p className="text-[10px] opacity-90 mt-0.5 leading-snug">{a.message}</p>
            </div>
            <button
              onClick={() => setDismissedAnnouncements((prev) => [...prev, a.id])}
              className="text-slate-400 hover:text-white p-0.5"
            >
              ×
            </button>
          </div>
        ))}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 pb-20 pt-2">
        {activeTab === 'chats' && (
          <ChatsScreen
            currentUser={currentUser}
            onSelectChat={(convo: ChatConversation) =>
              setActiveChat({ chatId: convo.chatId, otherUser: convo.otherUser })
            }
            onNavigateToFind={() => setActiveTab('find')}
          />
        )}

        {activeTab === 'requests' && (
          <RequestsScreen
            currentUser={currentUser}
            onRequestAccepted={() => {
              setActiveTab('chats');
            }}
          />
        )}

        {activeTab === 'find' && (
          <FindUserScreen
            currentUser={currentUser}
            onRequestSent={() => {}}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileScreen
            currentUser={currentUser}
            onUpdateProfile={onUpdateProfile}
            onLogout={onLogout}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            currentUser={currentUser}
            onLogout={onLogout}
            onLockToCalculator={onLockToCalculator}
          />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur border-t border-slate-800/80 px-2 py-2 flex items-center justify-around z-30 shadow-2xl">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'chats'
              ? 'text-rose-400 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <MessageSquare size={20} />
          <span className="text-[10px]">Chats</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'requests'
              ? 'text-rose-400 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Inbox size={20} />
          <span className="text-[10px]">Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="absolute top-0.5 right-2 min-w-4 h-4 px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('find')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'find'
              ? 'text-rose-400 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Search size={20} />
          <span className="text-[10px]">Find User</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'profile'
              ? 'text-rose-400 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <UserIcon size={20} />
          <span className="text-[10px]">Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'settings'
              ? 'text-rose-400 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Settings size={20} />
          <span className="text-[10px]">Settings</span>
        </button>
      </nav>
    </div>
  );
};
