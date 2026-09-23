import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb, getChatId } from '../firebase';
import { UserProfile, ChatConversation } from '../types';
import { ChatsScreen } from './ChatsScreen';
import { RequestsScreen } from './RequestsScreen';
import { FindUserScreen } from './FindUserScreen';
import { ProfileScreen } from './ProfileScreen';
import { SettingsScreen } from './SettingsScreen';
import { ChatRoomScreen } from './ChatRoomScreen';
import { 
  MessageSquare, 
  Inbox, 
  Search, 
  User as UserIcon, 
  Settings, 
  Heart, 
  Lock,
  Smartphone
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

  // Monitor pending requests count for the badge
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

  // If a chat room is currently open
  if (activeChat) {
    return (
      <ChatRoomScreen
        currentUser={currentUser}
        otherUser={activeChat.otherUser}
        chatId={activeChat.chatId}
        onBack={() => setActiveChat(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-950 text-white select-none">
      {/* Top Header */}
      <header className="px-5 py-3.5 bg-slate-900/90 backdrop-blur border-b border-slate-800/80 sticky top-0 z-30 flex items-center justify-between shadow-md">
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

        {/* Right Header: Lock Back to Calculator & Avatar */}
        <div className="flex items-center gap-2">
          <button
            onClick={onLockToCalculator}
            title="Lock back to Calculator"
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
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-slate-950 rounded-full"></span>
          </button>
        </div>
      </header>

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
            onRequestAccepted={(senderUid) => {
              // Automatically switch to chats tab
              setActiveTab('chats');
            }}
          />
        )}

        {activeTab === 'find' && (
          <FindUserScreen
            currentUser={currentUser}
            onRequestSent={() => {
              // Prompt user to check requests or stay
            }}
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
            <span className="absolute 1 top-0.5 right-2 min-w-4 h-4 px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
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
