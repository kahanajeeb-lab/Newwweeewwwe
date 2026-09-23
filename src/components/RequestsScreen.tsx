import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb, respondToChatRequest } from '../firebase';
import { UserProfile, ChatRequest } from '../types';
import { UserCheck, UserX, Clock, Inbox, ShieldCheck } from 'lucide-react';

interface RequestsScreenProps {
  currentUser: UserProfile;
  onRequestAccepted: (senderUid: string) => void;
}

export const RequestsScreen: React.FC<RequestsScreenProps> = ({
  currentUser,
  onRequestAccepted,
}) => {
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const reqsRef = ref(rtdb, `requests/${currentUser.uid}`);

    const unsubscribe = onValue(reqsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const val = snapshot.val();
      const list: ChatRequest[] = Object.keys(val).map((k) => ({
        ...val[k],
        id: k,
      }));

      // Sort by latest request
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setRequests(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser.uid]);

  const handleAction = async (req: ChatRequest, action: 'accepted' | 'rejected') => {
    setProcessingId(req.id);
    try {
      await respondToChatRequest(req, action);
      if (action === 'accepted') {
        onRequestAccepted(req.senderUid);
      }
    } catch (err) {
      console.error(`Failed to ${action} request:`, err);
    } finally {
      setProcessingId(null);
    }
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-64 text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs">Checking requests...</p>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const pastRequests = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="flex flex-col space-y-4 py-3">
      {/* Title */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Inbox size={18} className="text-rose-400" />
          <span>Chat Requests</span>
        </h3>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
          {pendingRequests.length} Pending
        </span>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Inbox size={24} />
          </div>
          <p className="text-sm font-semibold text-white mb-1">No Pending Requests</p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            When someone searches your 6-digit User ID ({currentUser.userId}) and sends an invitation, it will appear here for you to accept.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-3">
                <img
                  src={req.senderPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${req.senderName}`}
                  alt={req.senderName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-rose-500/50 bg-slate-800"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{req.senderName}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-[11px] font-mono text-rose-300 bg-slate-800 px-1.5 py-0.5 rounded">
                      ID: {req.senderUserId || 'User'}
                    </span>
                    <span>•</span>
                    <span className="text-[11px] flex items-center gap-1">
                      <Clock size={11} />
                      {formatTime(req.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => handleAction(req, 'accepted')}
                  disabled={processingId === req.id}
                  className="h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow transition-all disabled:opacity-50"
                >
                  <UserCheck size={16} />
                  <span>Accept</span>
                </button>
                <button
                  onClick={() => handleAction(req, 'rejected')}
                  disabled={processingId === req.id}
                  className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <UserX size={16} />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past Requests History */}
      {pastRequests.length > 0 && (
        <div className="pt-4 border-t border-slate-800/80">
          <h4 className="text-xs font-semibold text-slate-400 mb-2 px-1">Past Requests</h4>
          <div className="space-y-2">
            {pastRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/50 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={req.senderPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${req.senderName}`}
                    alt={req.senderName}
                    className="w-8 h-8 rounded-full object-cover bg-slate-800"
                  />
                  <div>
                    <span className="font-medium text-white">{req.senderName}</span>
                    <span className="text-[10px] text-slate-400 block">{formatTime(req.createdAt)}</span>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    req.status === 'accepted'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {req.status === 'accepted' ? 'Accepted' : 'Rejected'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
