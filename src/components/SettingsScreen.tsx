import React, { useState, useEffect } from 'react';
import { UserProfile, BlockedUserItem } from '../types';
import { 
  Bell, 
  Shield, 
  User, 
  Info, 
  LogOut, 
  Heart, 
  Lock, 
  Smartphone, 
  KeyRound,
  Check,
  AlertCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Flame,
  UserX,
  Crown,
  Volume2,
  Trash2,
  Database,
  Terminal,
  Key,
  Download,
  Copy,
  ExternalLink,
  Share2
} from 'lucide-react';
import { changePIN, isCustomPINConfigured } from '../utils/security';
import { getAutoApplyPreference, setAutoApplyPreference } from '../utils/videoFilters';
import { listenToBlockedUsers } from '../firebase';
import { BlockedUsersModal } from './BlockedUsersModal';
import { AdminPanelModal } from './AdminPanelModal';

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
  const [sounds, setSounds] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [autoApplyFilter, setAutoApplyFilterState] = useState(getAutoApplyPreference());

  // Blocked users management state
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);

  // Admin Panel state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAdminUnlock, setShowAdminUnlock] = useState(false);
  const [adminPasskey, setAdminPasskey] = useState('');
  const [adminKeyError, setAdminKeyError] = useState<string | null>(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // Change PIN modal state
  const [showChangePin, setShowChangePin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  // Cache clear feedback
  const [cacheClearToast, setCacheClearToast] = useState(false);

  // APK & Android Installation state
  const [showApkInfo, setShowApkInfo] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleCopyLink = () => {
    const shareUrl = window.location.origin || 'https://ais-pre-zeohtlataqft5vtz4haxvz-10643254458.asia-east1.run.app';
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleTriggerInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      setShowApkInfo(true);
    }
  };

  // Listen to blocked users count
  useEffect(() => {
    const unsub = listenToBlockedUsers(currentUser.uid, (list) => {
      setBlockedCount(list.length);
    });
    return () => unsub();
  }, [currentUser.uid]);

  const handleAutoApplyToggle = () => {
    const nextVal = !autoApplyFilter;
    setAutoApplyFilterState(nextVal);
    setAutoApplyPreference(nextVal);
  };

  const handleUpdatePIN = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(false);

    const res = await changePIN(currentPin, newPin, confirmPin);
    if (!res.success) {
      setPinError(res.error || 'Failed to update PIN.');
    } else {
      setPinSuccess(true);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => {
        setShowChangePin(false);
        setPinSuccess(false);
      }, 1600);
    }
  };

  // Determine if user has admin privileges
  const isOwnerOrAdmin = 
    currentUser.role === 'admin' || 
    currentUser.role === 'owner' || 
    currentUser.email === 'hamzakhanradmi637373@gmail.com' ||
    (currentUser.name && currentUser.name.toLowerCase().includes('raha')) ||
    isAdminUnlocked;

  const handleAdminUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminKeyError(null);
    const cleanKey = adminPasskey.trim();

    // Verify master key (e.g. RAHA2026, 2580, or RAHA-ADMIN)
    if (cleanKey === 'RAHA2026' || cleanKey === '2580' || cleanKey.toUpperCase() === 'RAHA-ADMIN') {
      setIsAdminUnlocked(true);
      setShowAdminUnlock(false);
      setShowAdminModal(true);
      setAdminPasskey('');
    } else {
      setAdminKeyError('Invalid Master Admin Key.');
    }
  };

  const handleClearCache = () => {
    try {
      // Clear temporary audio effects and filter cache without destroying credentials or PIN
      sessionStorage.clear();
      setCacheClearToast(true);
      setTimeout(() => setCacheClearToast(false), 2500);
    } catch (e) {}
  };

  return (
    <div className="flex flex-col space-y-4 py-3 text-xs select-none">
      {/* Panic Mode / Quick Disguise Banner (Requirement 3) */}
      <button
        onClick={onLockToCalculator}
        className="w-full p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border border-rose-800/40 text-left flex items-center justify-between shadow-lg transition-all hover:border-rose-600/70 active:scale-[0.99] group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
            <Flame size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-white">Panic Mode (Quick Disguise)</h4>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-600/30 text-rose-300 font-bold border border-rose-500/40">
                Instant
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Instantly exit to Calculator with session securely preserved</p>
          </div>
        </div>
        <span className="text-rose-400 font-bold text-xs bg-rose-950 px-2.5 py-1 rounded-lg border border-rose-800/50">
          Hide Now
        </span>
      </button>

      {/* Owner Signature Card */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-rose-950/30 border border-amber-500/20 text-center shadow">
        <p className="text-[9px] uppercase tracking-[0.25em] text-amber-300 font-medium font-mono">
          Private Messenger &amp; Vault
        </p>
        <h3 className="text-sm font-serif italic font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-200 to-pink-200 mt-0.5 tracking-wide">
          Owner by Raha Hamza Khan
        </h3>
      </div>

      {/* ADMIN PANEL ACCESS CARD */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Crown size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-white">Admin &amp; Control Center</h4>
              {isOwnerOrAdmin ? (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                  ROOT AUTHORIZED
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                  PROTECTED
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Manage users, broadcasts, moderation &amp; infrastructure</p>
          </div>
        </div>

        {isOwnerOrAdmin ? (
          <button
            onClick={() => setShowAdminModal(true)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow active:scale-95"
          >
            <span>Open Panel</span>
          </button>
        ) : (
          <button
            onClick={() => setShowAdminUnlock(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
          >
            <Key size={13} />
            <span>Unlock</span>
          </button>
        )}
      </div>

      {/* Admin Unlock Modal */}
      {showAdminUnlock && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/50 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
              <Terminal size={14} className="text-amber-400" />
              <span>Admin Key Verification</span>
            </h5>
            <button
              onClick={() => setShowAdminUnlock(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          {adminKeyError && (
            <div className="p-2 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-[11px] flex items-center gap-1.5">
              <AlertCircle size={13} className="shrink-0" />
              <span>{adminKeyError}</span>
            </div>
          )}

          <form onSubmit={handleAdminUnlock} className="flex gap-2">
            <input
              type="password"
              placeholder="Enter Master Admin Key (e.g. RAHA2026)"
              value={adminPasskey}
              onChange={(e) => setAdminPasskey(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
            >
              Verify
            </button>
          </form>
        </div>
      )}

      {/* BLOCKED CONTACTS SECTION */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 font-bold text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserX size={15} className="text-rose-400" />
            <span>Blocked Contacts &amp; Privacy</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {blockedCount} Blocked
          </span>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-white text-xs">Manage Blocked Users</p>
            <p className="text-[11px] text-slate-400">
              Blocked users cannot send you messages or start audio/video calls
            </p>
          </div>
          <button
            onClick={() => setShowBlockedModal(true)}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 border border-slate-700 rounded-xl text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-all"
          >
            <UserX size={13} />
            <span>View List</span>
          </button>
        </div>
      </div>

      {/* Security & PIN Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 font-bold text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={15} className="text-emerald-400" />
            <span>Security &amp; PIN</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">
            {isCustomPINConfigured() ? 'Custom PIN Active' : 'Default (2580)'}
          </span>
        </div>

        <div className="divide-y divide-slate-800/60">
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white text-xs">Disguise Unlock Code</p>
              <p className="text-[11px] text-slate-400">Code entered into calculator before pressing =</p>
            </div>
            <button
              onClick={() => setShowChangePin(!showChangePin)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-rose-400 font-semibold text-xs border border-slate-700/60 flex items-center gap-1.5 transition-all"
            >
              <KeyRound size={13} />
              <span>Change PIN</span>
            </button>
          </div>

          {/* Change PIN Form */}
          {showChangePin && (
            <form onSubmit={handleUpdatePIN} className="p-4 bg-slate-950/90 space-y-3 animate-in fade-in">
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Lock size={13} className="text-rose-400" />
                <span>Update Calculator Access PIN</span>
              </h5>

              {pinError && (
                <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-[11px] flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {pinSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-[11px] flex items-center gap-2">
                  <Check size={14} className="shrink-0" />
                  <span>PIN successfully changed and secured!</span>
                </div>
              )}

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Current PIN (Default: 2580)</label>
                <input
                  type="password"
                  maxLength={8}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder="Enter current PIN"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">New PIN (4-8 digits)</label>
                  <input
                    type="password"
                    maxLength={8}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="New PIN"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Confirm New PIN</label>
                  <input
                    type="password"
                    maxLength={8}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Repeat PIN"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowChangePin(false)}
                  className="flex-1 py-2 bg-slate-800 rounded-xl text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-white text-xs font-bold transition-all shadow"
                >
                  Save New PIN
                </button>
              </div>
            </form>
          )}

          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white text-xs">Read Receipts (Seen ✓✓)</p>
              <p className="text-[11px] text-slate-400">Sent (✓), Delivered (✓✓ grey), Seen (✓✓ blue)</p>
            </div>
            <button
              onClick={() => setReadReceipts(!readReceipts)}
              className="text-rose-500 hover:text-rose-400 transition-colors"
            >
              {readReceipts ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-600" />}
            </button>
          </div>
        </div>
      </div>

      {/* Video Call & Filter Preferences */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 font-bold text-slate-300 flex items-center gap-2">
          <Sparkles size={15} className="text-pink-400" />
          <span>Call Filters &amp; Effects</span>
        </div>
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-white text-xs">Auto-Apply Favorite Filter</p>
            <p className="text-[11px] text-slate-400">Automatically activate your saved favorite filter when a video call starts</p>
          </div>
          <button
            onClick={handleAutoApplyToggle}
            className="text-rose-500 hover:text-rose-400 transition-colors"
          >
            {autoApplyFilter ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Notifications & Sound Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 font-bold text-slate-300 flex items-center gap-2">
          <Bell size={15} className="text-sky-400" />
          <span>Notifications &amp; Sound</span>
        </div>
        <div className="divide-y divide-slate-800/60">
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white text-xs">In-App Audio Ringtones</p>
              <p className="text-[11px] text-slate-400">Play ringing sound on incoming and outgoing WebRTC calls</p>
            </div>
            <button
              onClick={() => setSounds(!sounds)}
              className="text-rose-500 hover:text-rose-400 transition-colors"
            >
              {sounds ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-600" />}
            </button>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white text-xs">Haptic Vibration Alert</p>
              <p className="text-[11px] text-slate-400">Single subtle vibration on incoming calls</p>
            </div>
            <button
              onClick={() => setVibration(!vibration)}
              className="text-rose-500 hover:text-rose-400 transition-colors"
            >
              {vibration ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-600" />}
            </button>
          </div>
        </div>
      </div>

      {/* Account Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 font-bold text-slate-300 flex items-center gap-2">
          <User size={15} className="text-rose-400" />
          <span>Account Profile</span>
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
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-slate-400">Storage &amp; Cache</span>
            <button
              onClick={handleClearCache}
              className="text-rose-400 hover:text-rose-300 font-semibold text-xs flex items-center gap-1 transition-colors"
            >
              <Trash2 size={13} />
              <span>{cacheClearToast ? 'Cache Cleared!' : 'Clean Cache'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Android APK & App Download Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 font-bold text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone size={15} className="text-emerald-400" />
            <span>Android APK &amp; Installation</span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded">
            SDK 36 Ready
          </span>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <p className="font-semibold text-white text-xs">Fresh Android Build Verified</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Package: <code className="text-rose-400 font-mono">com.example</code> (Android 12–16). Pre-configured with release signing key and WebRTC permissions.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <a
                href="/app-release.apk"
                download="app-release.apk"
                className="py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/50"
              >
                <Download size={14} />
                <span>Download .APK</span>
              </a>
              <button
                onClick={() => setShowApkInfo(true)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all border border-slate-700"
              >
                <Info size={14} />
                <span>Build Info</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href="/calculator-mahal-kita-project.zip"
                download="calculator-mahal-kita-project.zip"
                className="py-2 px-3 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 font-medium text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all border border-slate-700/60"
              >
                <Download size={12} />
                <span>Project ZIP</span>
              </a>
              <button
                onClick={handleCopyLink}
                className="py-2 px-3 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 font-medium text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all border border-slate-700/60"
              >
                {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedLink ? 'Copied' : 'Copy App Link'}</span>
              </button>
            </div>
          </div>
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

      {/* Modals */}
      <BlockedUsersModal
        currentUser={currentUser}
        isOpen={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
      />

      <AdminPanelModal
        currentUser={currentUser}
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />

      {/* APK & Installation Guide Dialog */}
      {showApkInfo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Smartphone size={18} />
                <span>Android APK &amp; Installation</span>
              </div>
              <button onClick={() => setShowApkInfo(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-slate-300">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1">
                <p className="font-bold text-white text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Direct Download from Workspace &amp; App</span>
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The compiled release APK is ready: tap the green <strong>"Download .APK"</strong> button, or find it directly in your file explorer on the right-side panel:
                </p>
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 text-[10px] font-mono text-emerald-300 space-y-0.5">
                  <p>• /app-release.apk</p>
                  <p>• /app/build/outputs/apk/release/app-release.apk</p>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1">
                <p className="font-bold text-white text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>Instant Android Home Screen Install (WebAPK)</span>
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Open the shared URL in Chrome on any Android phone, tap the Chrome menu (⋮) and tap <strong>"Add to Home screen"</strong> or <strong>"Install App"</strong>. It installs as a native-equivalent standalone app with the Calculator disguise.
                </p>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400 flex justify-between">
                <span>Application ID:</span>
                <span className="text-rose-400 font-bold">com.example</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
              <button
                onClick={() => setShowApkInfo(false)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
