import React, { useState } from 'react';
import { ref, update } from 'firebase/database';
import { rtdb } from '../firebase';
import { UserProfile } from '../types';
import { Copy, Check, Edit2, LogOut, Shield, Mail, Hash, User } from 'lucide-react';

interface ProfileScreenProps {
  currentUser: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  onUpdateProfile,
  onLogout,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(currentUser.name);
  const [saving, setSaving] = useState(false);

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(currentUser.userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveName = async () => {
    if (!newName.trim() || newName === currentUser.name) {
      setIsEditingName(false);
      return;
    }

    setSaving(true);
    try {
      const userRef = ref(rtdb, `users/${currentUser.uid}`);
      await update(userRef, { name: newName.trim() });
      onUpdateProfile({ ...currentUser, name: newName.trim() });
      setIsEditingName(false);
    } catch (e) {
      console.error("Error updating name:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col space-y-5 py-4">
      {/* Profile Avatar Card */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 text-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-rose-900/30 via-pink-900/20 to-rose-900/30"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-3">
            <img
              src={currentUser.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`}
              alt={currentUser.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-rose-500/80 bg-slate-800 shadow-xl"
            />
            <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
          </div>

          {/* Name & Edit */}
          {isEditingName ? (
            <div className="flex items-center gap-2 mt-2 w-full max-w-xs">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 bg-slate-950 border border-rose-500 rounded-xl px-3 py-1.5 text-sm text-white text-center focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-3 py-1.5 rounded-xl font-semibold"
              >
                {saving ? '...' : 'Save'}
              </button>
              <button
                onClick={() => { setIsEditingName(false); setNewName(currentUser.name); }}
                className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1.5 rounded-xl"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-xl font-bold text-white">{currentUser.name}</h2>
              <button
                onClick={() => setIsEditingName(true)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Edit name"
              >
                <Edit2 size={15} />
              </button>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
            <Mail size={12} className="text-slate-500" />
            <span>{currentUser.email || 'Google Account'}</span>
          </p>
        </div>
      </div>

      {/* Prominent 6-digit User ID Card with Copy button */}
      <div className="bg-gradient-to-r from-rose-950/60 to-pink-950/40 border border-rose-800/60 rounded-2xl p-5 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 uppercase tracking-wider">
            <Hash size={15} />
            <span>Your Numeric User ID</span>
          </div>
          <span className="text-[10px] bg-rose-900/50 text-rose-200 px-2 py-0.5 rounded-full border border-rose-700/50">
            Share with partner
          </span>
        </div>

        <div className="flex items-center justify-between bg-slate-950/80 border border-rose-900/50 rounded-xl px-4 py-3">
          <span className="font-mono text-2xl font-black text-white tracking-widest">
            {currentUser.userId}
          </span>

          <button
            onClick={handleCopyUserId}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all active:scale-95 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow'
            }`}
          >
            {copied ? (
              <>
                <Check size={14} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy ID</span>
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
          Your partner enters this 6-digit number in their <strong>Find User</strong> tab to send you a chat request.
        </p>
      </div>

      {/* Security & Account Details */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl divide-y divide-slate-800/80 text-xs">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-300">
            <Shield size={16} className="text-emerald-400" />
            <span>Firebase Security Status</span>
          </div>
          <span className="text-emerald-400 font-semibold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/60">
            Connected
          </span>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-300">
            <User size={16} className="text-rose-400" />
            <span>Permanent Firebase UID</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
            {currentUser.uid}
          </span>
        </div>
      </div>

      {/* Logout Action */}
      <button
        onClick={onLogout}
        className="w-full h-12 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-900 text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
      >
        <LogOut size={16} />
        <span>Log Out of Mahal Kita M&H</span>
      </button>
    </div>
  );
};
