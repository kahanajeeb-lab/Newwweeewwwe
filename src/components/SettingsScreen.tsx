import React, { useState } from 'react';
import { UserProfile } from '../types';
import { 
  Bell, 
  Shield, 
  User, 
  Info, 
  LogOut, 
  Heart, 
  Lock, 
  Smartphone, 
  ChevronRight,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface SettingsScreenProps {
  currentUser: UserProfile;
  onLogout: () => void;
  onLockToCalculator: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currentUser,
  onLogout,
  onLockToCalculator,
}) => {
  const [notifications, setNotifications] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [showAboutModal, setShowAboutModal] = useState(false);

  return (
    <div className="flex flex-col space-y-4 py-3 text-xs select-none">
      {/* Quick Stealth Lock Button */}
      <button
        onClick={onLockToCalculator}
        className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-800/40 text-left flex items-center justify-between shadow transition-all hover:bg-slate-900 active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Smartphone size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Disguise &amp; Lock Now</h4>
            <p className="text-[11px] text-slate-400">Switch back to outer Calculator screen immediately</p>
          </div>
        </div>
        <span className="text-blue-400 font-bold text-xs bg-blue-950 px-2.5 py-1 rounded-lg border border-blue-800/50">
          Lock
        </span>
      </button>

      {/* Account Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 font-bold text-slate-300 flex items-center gap-2">
          <User size={15} className="text-rose-400" />
          <span>Account</span>
        </div>
        <div className="divide-y divide-slate-800/60">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-slate-400">Display Name</span>
            <span className="font-semibold text-white">{currentUser.name}</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-slate-400">Google Email</span>
            <span className="font-medium text-slate-300">{currentUser.email || 'Connected'}</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-slate-400">Unique User ID</span>
            <span className="font-mono font-bold text-rose-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {currentUser.userId}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 font-bold text-slate-300 flex items-center gap-2">
          <Bell size={15} className="text-pink-400" />
          <span>Notifications</span>
        </div>
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-white text-xs">Real-Time Alerts</p>
            <p className="text-[11px] text-slate-400">Display instant banners on incoming messages</p>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className="text-rose-500 hover:text-rose-400 transition-colors"
          >
            {notifications ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Privacy Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 font-bold text-slate-300 flex items-center gap-2">
          <Shield size={15} className="text-emerald-400" />
          <span>Privacy &amp; Security</span>
        </div>
        <div className="divide-y divide-slate-800/60">
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white text-xs">Read Receipts (Seen ✓✓)</p>
              <p className="text-[11px] text-slate-400">Let partner know when you read their message</p>
            </div>
            <button
              onClick={() => setReadReceipts(!readReceipts)}
              className="text-rose-500 hover:text-rose-400 transition-colors"
            >
              {readReceipts ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-600" />}
            </button>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white text-xs">Access Code</p>
              <p className="text-[11px] text-slate-400">Sequence in calculator: 2580 followed by =</p>
            </div>
            <span className="font-mono text-xs font-bold text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
              2580 =
            </span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 font-bold text-slate-300 flex items-center gap-2">
          <Info size={15} className="text-indigo-400" />
          <span>About</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>Mahal Kita M&amp;H</span>
                <Heart size={14} className="text-rose-500 fill-rose-500" />
              </h4>
              <p className="text-[11px] text-slate-400">Private Messenger &amp; Vault</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
              v1.0.0
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2.5">
            Designed exclusively for private, secure communication between two souls. Features a discreet calculator entrance and real-time Firebase backend synchronization.
          </p>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full h-11 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/60 text-rose-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
      >
        <LogOut size={15} />
        <span>Log Out of Account</span>
      </button>
    </div>
  );
};
