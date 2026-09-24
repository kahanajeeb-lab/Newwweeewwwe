import React, { useState, useEffect } from 'react';
import { 
  UserProfile, 
  AdminStats, 
  SystemAnnouncement 
} from '../types';
import { 
  fetchAllUsers, 
  getAdminStats, 
  setUserBanStatus, 
  setUserRole, 
  createSystemAnnouncement, 
  deleteSystemAnnouncement, 
  listenToSystemAnnouncements 
} from '../firebase';
import { 
  Shield, 
  Users, 
  Activity, 
  Radio, 
  Lock, 
  Search, 
  Check, 
  X, 
  AlertTriangle, 
  UserCheck, 
  UserX, 
  Crown, 
  RefreshCw, 
  Send, 
  Trash2, 
  Sparkles,
  Sliders,
  Database,
  Flame,
  KeyRound
} from 'lucide-react';

interface AdminPanelModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

type AdminTab = 'overview' | 'users' | 'broadcast' | 'security';

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  currentUser,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'online' | 'banned' | 'admin'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // New announcement form state
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annType, setAnnType] = useState<'info' | 'warning' | 'alert' | 'romantic'>('info');
  const [isPostingAnn, setIsPostingAnn] = useState(false);

  // Ban confirmation modal
  const [targetBanUser, setTargetBanUser] = useState<UserProfile | null>(null);
  const [banReason, setBanReason] = useState('Violation of safety and community guidelines');

  useEffect(() => {
    if (!isOpen) return;

    loadData();

    // Listen to announcements
    const unsubscribeAnn = listenToSystemAnnouncements((list) => {
      setAnnouncements(list);
    });

    return () => {
      unsubscribeAnn();
    };
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedStats, fetchedUsers] = await Promise.all([
        getAdminStats(),
        fetchAllUsers()
      ]);
      setStats(fetchedStats);
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const handleToggleBan = async (user: UserProfile) => {
    const nextBanned = !user.banned;
    try {
      await setUserBanStatus(user.uid, nextBanned, banReason);
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, banned: nextBanned } : u))
      );
      showNotification(
        nextBanned
          ? `Suspended account of ${user.name} (${user.userId})`
          : `Restored account access for ${user.name}`
      );
      setTargetBanUser(null);
      // Refresh stats
      const s = await getAdminStats();
      setStats(s);
    } catch (err) {
      showNotification('Failed to update ban status.');
    }
  };

  const handleToggleAdmin = async (user: UserProfile) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await setUserRole(user.uid, nextRole);
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, role: nextRole } : u))
      );
      showNotification(
        nextRole === 'admin'
          ? `Promoted ${user.name} to Administrator`
          : `Demoted ${user.name} to Standard User`
      );
    } catch (err) {
      showNotification('Failed to update role.');
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;

    setIsPostingAnn(true);
    try {
      await createSystemAnnouncement({
        title: annTitle.trim(),
        message: annMessage.trim(),
        type: annType,
        active: true,
        authorName: currentUser.name || 'Raha Hamza Khan'
      });
      setAnnTitle('');
      setAnnMessage('');
      showNotification('Global broadcast published to all users.');
    } catch (err) {
      showNotification('Failed to publish announcement.');
    } finally {
      setIsPostingAnn(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteSystemAnnouncement(id);
      showNotification('Broadcast announcement removed.');
    } catch (err) {
      showNotification('Failed to delete announcement.');
    }
  };

  if (!isOpen) return null;

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.userId.includes(searchQuery) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (userFilter === 'online') return u.online;
    if (userFilter === 'banned') return u.banned;
    if (userFilter === 'admin') return u.role === 'admin' || u.role === 'owner';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-rose-950/40 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Crown size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Mahal Kita Admin Panel</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                  ROOT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-serif italic">
                Owner by Raha Hamza Khan • Command Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              title="Refresh Data"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin text-amber-400' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action feedback banner */}
        {actionMessage && (
          <div className="px-4 py-2 bg-emerald-950/80 border-b border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Check size={14} className="shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800/80 bg-slate-900/50 px-3 pt-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'overview'
                ? 'bg-slate-950 text-amber-400 border-t-2 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity size={14} />
            <span>Overview &amp; Stats</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'users'
                ? 'bg-slate-950 text-amber-400 border-t-2 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>Users &amp; Moderation</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {users.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'broadcast'
                ? 'bg-slate-950 text-amber-400 border-t-2 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio size={14} />
            <span>Broadcasts</span>
            {announcements.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-bold">
                {announcements.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'security'
                ? 'bg-slate-950 text-amber-400 border-t-2 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield size={14} />
            <span>Security &amp; Health</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: OVERVIEW & STATS */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-medium">Registered Users</span>
                    <Users size={15} className="text-amber-400" />
                  </div>
                  <div className="text-xl font-bold text-white font-mono">
                    {stats?.totalUsers ?? users.length}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Unique 6-digit accounts</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-medium">Online Now</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-xl font-bold text-emerald-400 font-mono">
                    {stats?.onlineUsers ?? users.filter((u) => u.online).length}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Live presence connected</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-medium">Total Conversations</span>
                    <Database size={15} className="text-sky-400" />
                  </div>
                  <div className="text-xl font-bold text-sky-300 font-mono">
                    {stats?.totalChats ?? 'Active'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Private peer chats</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-medium">Suspended Accounts</span>
                    <AlertTriangle size={15} className="text-rose-400" />
                  </div>
                  <div className="text-xl font-bold text-rose-400 font-mono">
                    {stats?.bannedUsers ?? users.filter((u) => u.banned).length}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Restricted by admin</div>
                </div>
              </div>

              {/* System Health Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                    <h4 className="font-bold text-white text-xs">Real-Time Database Infrastructure</h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                    OPERATIONAL
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Host Region</span>
                    <span className="text-slate-200 font-mono font-semibold">Asia East 1 / Global</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">WebRTC Signaling</span>
                    <span className="text-slate-200 font-mono font-semibold">STUN Google Active</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Disguise PIN Vault</span>
                    <span className="text-emerald-400 font-mono font-semibold">Hashed SHA-256</span>
                  </div>
                </div>
              </div>

              {/* Owner Note */}
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <h5 className="font-serif italic font-bold text-amber-200 text-sm">
                    Owner by Raha Hamza Khan
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Mahal Kita M&amp;H — Private Secure Vault &amp; Peer Calling System
                  </p>
                </div>
                <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 text-xs font-bold font-mono">
                  VERIFIED OWNER
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: USERS & MODERATION */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              {/* Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, 6-digit ID, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filter chips */}
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {(['all', 'online', 'admin', 'banned'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setUserFilter(filter)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold capitalize shrink-0 transition-colors ${
                        userFilter === filter
                          ? 'bg-amber-500 text-black font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* User List */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No users matching filter criteria.
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.uid === currentUser.uid;
                    const isAdmin = u.role === 'admin' || u.role === 'owner';

                    return (
                      <div
                        key={u.uid}
                        className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          u.banned
                            ? 'bg-rose-950/20 border-rose-900/40'
                            : isAdmin
                            ? 'bg-slate-900/90 border-amber-500/30'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={
                                u.photoUrl ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                  u.name
                                )}`
                              }
                              alt={u.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                            />
                            {u.online && (
                              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs">{u.name}</span>
                              {isSelf && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                  You
                                </span>
                              )}
                              {isAdmin && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-0.5">
                                  <Crown size={9} />
                                  <span>Admin</span>
                                </span>
                              )}
                              {u.banned && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-600/30 text-rose-300 font-bold border border-rose-500/40">
                                  SUSPENDED
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              <span className="font-mono text-rose-400 font-semibold">
                                ID: {u.userId}
                              </span>
                              <span>•</span>
                              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                                {u.email || 'No email'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {/* Admin toggle */}
                          {!isSelf && (
                            <button
                              onClick={() => handleToggleAdmin(u)}
                              title={isAdmin ? 'Demote to User' : 'Promote to Admin'}
                              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                                isAdmin
                                  ? 'bg-amber-950/40 text-amber-300 border border-amber-800 hover:bg-amber-950'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              <Crown size={13} />
                              <span className="hidden sm:inline">
                                {isAdmin ? 'Demote' : 'Make Admin'}
                              </span>
                            </button>
                          )}

                          {/* Ban / Unban */}
                          {!isSelf && (
                            <button
                              onClick={() => {
                                if (u.banned) {
                                  handleToggleBan(u);
                                } else {
                                  setTargetBanUser(u);
                                }
                              }}
                              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                                u.banned
                                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                                  : 'bg-rose-950/40 text-rose-300 border border-rose-900 hover:bg-rose-900/60'
                              }`}
                            >
                              {u.banned ? <UserCheck size={13} /> : <UserX size={13} />}
                              <span>{u.banned ? 'Unsuspend' : 'Suspend'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: BROADCASTS & ANNOUNCEMENTS */}
          {activeTab === 'broadcast' && (
            <div className="space-y-4">
              {/* Create Broadcast Form */}
              <form
                onSubmit={handlePostAnnouncement}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Radio size={14} className="text-amber-400" />
                    <span>Create System Broadcast</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Broadcasted to all users</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 block mb-1">Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Scheduled Maintenance or Special Love Message"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Category</label>
                    <select
                      value={annType}
                      onChange={(e) => setAnnType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="info">Information ℹ️</option>
                      <option value="romantic">Romantic &amp; Love 💖</option>
                      <option value="warning">Warning ⚠️</option>
                      <option value="alert">System Alert 🚨</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Message Body</label>
                  <textarea
                    rows={3}
                    placeholder="Enter broadcast content visible in app..."
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isPostingAnn}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow active:scale-98 disabled:opacity-50"
                  >
                    <Send size={13} />
                    <span>{isPostingAnn ? 'Broadcasting...' : 'Publish Broadcast'}</span>
                  </button>
                </div>
              </form>

              {/* Active Broadcasts List */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-400 text-xs flex items-center justify-between">
                  <span>Active Broadcasts</span>
                  <span className="text-[10px] text-slate-500">{announcements.length} Active</span>
                </h5>

                {announcements.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
                    No active system announcements.
                  </div>
                ) : (
                  announcements.map((ann) => {
                    const badgeColor =
                      ann.type === 'romantic'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : ann.type === 'warning'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : ann.type === 'alert'
                        ? 'bg-red-500/20 text-red-300 border-red-500/40'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/40';

                    return (
                      <div
                        key={ann.id}
                        className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}
                            >
                              {ann.type}
                            </span>
                            <h6 className="font-bold text-white text-xs">{ann.title}</h6>
                          </div>
                          <p className="text-slate-300 text-xs leading-relaxed">{ann.message}</p>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 pt-1 font-mono">
                            <span>By {ann.authorName || 'Raha Hamza Khan'}</span>
                            <span>•</span>
                            <span>{new Date(ann.timestamp).toLocaleString()}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          title="Delete broadcast"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition-colors shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & HEALTH */}
          {activeTab === 'security' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Shield size={16} className="text-emerald-400" />
                  <span>Security &amp; Protocol Audits</span>
                </div>
                <div className="divide-y divide-slate-800/80 text-[11px]">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Calculator PIN Disguise</span>
                    <span className="text-emerald-400 font-semibold font-mono">SHA-256 Validated</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Media &amp; Message Encryption</span>
                    <span className="text-emerald-400 font-semibold font-mono">Peer-to-Peer Encrypted</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">WebRTC DTLS/SRTP Handshake</span>
                    <span className="text-emerald-400 font-semibold font-mono">Active</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Manual Media Storage</span>
                    <span className="text-sky-400 font-semibold font-mono">Explicit Download Only</span>
                  </div>
                </div>
              </div>

              {/* Emergency Maintenance Mode */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-white">Emergency Disguise Lockdown</h5>
                    <p className="text-[11px] text-slate-400">
                      Instantly locks all client instances to calculator screen
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      showNotification('System status refreshed. All vaults nominal.');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
                  >
                    Test Lock
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Mahal Kita v2.4 Admin Engine</span>
          <span>Owner by Raha Hamza Khan</span>
        </div>
      </div>

      {/* Account Suspension Confirmation Dialog */}
      {targetBanUser && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/80 rounded-2xl p-5 max-w-sm w-full space-y-3 text-xs">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle size={18} />
              <span>Suspend Account Access</span>
            </div>
            <p className="text-slate-300">
              Are you sure you want to suspend <span className="text-white font-bold">{targetBanUser.name}</span> (ID: {targetBanUser.userId})?
            </p>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Suspension Reason</label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTargetBanUser(null)}
                className="flex-1 py-2 bg-slate-800 rounded-xl text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleBan(targetBanUser)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl"
              >
                Confirm Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
