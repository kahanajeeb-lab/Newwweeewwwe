import React, { useState } from 'react';
import { searchUserByNumericId, sendChatRequest } from '../firebase';
import { UserProfile } from '../types';
import { Search, UserPlus, AlertCircle, CheckCircle2, ShieldCheck, User } from 'lucide-react';

interface FindUserScreenProps {
  currentUser: UserProfile;
  onRequestSent?: () => void;
}

export const FindUserScreen: React.FC<FindUserScreenProps> = ({ currentUser, onRequestSent }) => {
  const [searchId, setSearchId] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = searchId.trim();

    if (clean.length !== 6 || !/^\d+$/.test(clean)) {
      setError("Please enter a valid 6-digit numeric User ID.");
      setFoundUser(null);
      return;
    }

    if (clean === currentUser.userId) {
      setError("This is your own User ID. You cannot search or connect with yourself.");
      setFoundUser(null);
      return;
    }

    setSearching(true);
    setError(null);
    setSuccessMsg(null);
    setFoundUser(null);

    try {
      const user = await searchUserByNumericId(clean);
      if (user) {
        setFoundUser(user);
      } else {
        setError(`No user found with ID: ${clean}. Please verify the 6-digit number with your partner.`);
      }
    } catch (err: any) {
      setError("Failed to search database: " + (err.message || "Unknown error"));
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!foundUser) return;
    setSendingRequest(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await sendChatRequest(currentUser, foundUser);
      if (res.success) {
        setSuccessMsg(res.message);
        if (onRequestSent) onRequestSent();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError("Failed to send request: " + (err.message || "Network issue"));
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="flex flex-col space-y-5 py-4">
      {/* Search Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <Search size={18} className="text-rose-400" />
          <span>Find by 6-Digit ID</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Ask your partner for their unique 6-digit numeric ID located in their Profile tab to start connecting.
        </p>

        {/* Input box */}
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={searchId}
              onChange={(e) => setSearchId(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 482731"
              className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-4 py-3 text-base text-white font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans placeholder-slate-500 focus:outline-none transition-colors"
            />
            {searchId.length === 6 && (
              <span className="absolute right-3.5 top-3.5 text-xs text-emerald-400 font-semibold">
                ✓
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={searchId.length !== 6 || searching}
            className="px-5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-lg shadow-rose-950/40 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
          >
            {searching ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>Search</span>
            )}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3.5 bg-rose-950/50 border border-rose-800 text-rose-200 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-950/50 border border-emerald-800 text-emerald-200 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Found User Card */}
      {foundUser && (
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg animate-in zoom-in-95">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={foundUser.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${foundUser.name}`}
                alt={foundUser.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-rose-500 bg-slate-800 shadow"
              />
              <span className="absolute bottom-0 right-0 bg-slate-900 border border-slate-700 text-rose-400 p-1 rounded-full">
                <ShieldCheck size={12} />
              </span>
            </div>

            <div className="flex-1">
              <h4 className="text-base font-bold text-white mb-0.5">{foundUser.name}</h4>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <span>Numeric ID:</span>
                <span className="bg-slate-800 text-rose-300 font-mono font-bold px-2 py-0.5 rounded tracking-wider">
                  {foundUser.userId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Verified Firebase User
              </p>
            </div>
          </div>

          <button
            onClick={handleSendRequest}
            disabled={sendingRequest || !!successMsg}
            className="w-full mt-4 h-11 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 active:scale-98 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition-all disabled:opacity-50"
          >
            <UserPlus size={16} />
            <span>
              {sendingRequest
                ? 'Sending Request...'
                : successMsg
                ? 'Request Sent'
                : 'Send Chat Request'}
            </span>
          </button>
        </div>
      )}

      {/* Helpful reminder */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400 space-y-1">
        <p className="font-semibold text-slate-300">Your User ID:</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-rose-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 tracking-wider">
            {currentUser.userId}
          </span>
          <span className="text-[11px] text-slate-400">
            Share this number with your partner so they can find you.
          </span>
        </div>
      </div>
    </div>
  );
};
