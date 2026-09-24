import React, { useState, useEffect } from 'react';
import { UserProfile, BlockedUserItem } from '../types';
import { 
  listenToBlockedUsers, 
  unblockUser, 
  blockUser, 
  searchUserByNumericId 
} from '../firebase';
import { 
  UserX, 
  UserCheck, 
  Search, 
  X, 
  Check, 
  AlertCircle, 
  ShieldAlert, 
  ShieldCheck,
  Plus
} from 'lucide-react';

interface BlockedUsersModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const BlockedUsersModal: React.FC<BlockedUsersModalProps> = ({
  currentUser,
  isOpen,
  onClose,
}) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Manual block by ID state
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [targetUserIdInput, setTargetUserIdInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = listenToBlockedUsers(currentUser.uid, (list) => {
      setBlockedUsers(list);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, currentUser.uid]);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleUnblock = async (blockedItem: BlockedUserItem) => {
    try {
      await unblockUser(currentUser.uid, blockedItem.uid);
      showStatus(`Unblocked ${blockedItem.name}`);
    } catch (err) {
      showStatus('Failed to unblock contact.');
    }
  };

  const handleManualBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    const cleanId = targetUserIdInput.trim();

    if (cleanId.length !== 6) {
      setSearchError('Please enter a valid 6-digit User ID.');
      return;
    }

    if (cleanId === currentUser.userId) {
      setSearchError('You cannot block your own User ID.');
      return;
    }

    setIsSearching(true);
    try {
      const user = await searchUserByNumericId(cleanId);
      if (!user) {
        setSearchError(`No user found with ID #${cleanId}`);
        return;
      }

      await blockUser(currentUser, user, 'Manual block by ID');
      showStatus(`Blocked contact ${user.name} (#${user.userId})`);
      setTargetUserIdInput('');
      setShowAddBlock(false);
    } catch (err) {
      setSearchError('Error blocking user. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
              <UserX size={18} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Blocked Contacts</h3>
              <p className="text-[11px] text-slate-400">
                {blockedUsers.length} contact{blockedUsers.length === 1 ? '' : 's'} blocked
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddBlock(!showAddBlock)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-semibold text-xs flex items-center gap-1 transition-colors px-2.5"
            >
              <Plus size={14} />
              <span>Block ID</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Status notification */}
        {statusMessage && (
          <div className="px-4 py-2 bg-emerald-950/80 border-b border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Check size={14} className="shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Manual Block Form */}
        {showAddBlock && (
          <form
            onSubmit={handleManualBlock}
            className="p-4 bg-slate-900/90 border-b border-slate-800 space-y-2 animate-in slide-in-from-top-2"
          >
            <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-rose-400" />
              <span>Block Contact by 6-Digit User ID</span>
            </h5>

            {searchError && (
              <div className="p-2 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-[11px] flex items-center gap-1.5">
                <AlertCircle size={13} className="shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={targetUserIdInput}
                onChange={(e) => setTargetUserIdInput(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 123456"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Block'}
              </button>
            </div>
          </form>
        )}

        {/* Blocked List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {blockedUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                <ShieldCheck size={24} />
              </div>
              <p className="text-xs">You haven't blocked any contacts.</p>
              <p className="text-[11px] text-slate-600 max-w-xs mx-auto">
                Blocked contacts will not be able to message you or start voice/video calls.
              </p>
            </div>
          ) : (
            blockedUsers.map((item) => (
              <div
                key={item.uid}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      item.photoUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        item.name
                      )}`
                    }
                    alt={item.name}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                  />
                  <div>
                    <h5 className="font-bold text-white text-xs">{item.name}</h5>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span className="font-mono text-rose-400 font-semibold">
                        ID: {item.userId}
                      </span>
                      <span>•</span>
                      <span>Blocked {new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleUnblock(item)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-950/60 hover:text-emerald-300 hover:border-emerald-800 border border-slate-700/60 rounded-xl text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-98"
                >
                  <UserCheck size={13} />
                  <span>Unblock</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono">
          Private Disguise • Safe Contact Protocol
        </div>
      </div>
    </div>
  );
};
