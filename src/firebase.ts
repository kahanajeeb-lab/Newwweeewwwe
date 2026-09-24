import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  get, 
  set, 
  update, 
  push, 
  child, 
  onValue, 
  query, 
  orderByChild, 
  equalTo,
  serverTimestamp,
  DatabaseReference,
  remove
} from 'firebase/database';
import { UserProfile, ChatRequest, ChatMessage, CallSession, MessageType, UserActivity, BlockedUserItem, SystemAnnouncement, AdminStats } from './types';

// Supplied Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBTQKtAJDWLk-iwfOuSJ6ST4qEy0N4qlKg",
  authDomain: "chat-7305d.firebaseapp.com",
  databaseURL: "https://chat-7305d-default-rtdb.firebaseio.com",
  projectId: "chat-7305d",
  storageBucket: "chat-7305d.firebasestorage.app",
  messagingSenderId: "68083133837",
  appId: "1:68083133837:web:42e126a1872d056df121c4",
  measurementId: "G-7K6PPVTBCB"
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const rtdb = getDatabase(app, "https://chat-7305d-default-rtdb.firebaseio.com");
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Generate a deterministic Chat ID from two user UIDs
 */
export function getChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/**
 * Generates a random 6-digit numeric User ID and verifies uniqueness in RTDB
 */
export async function generateUniqueUserId(): Promise<string> {
  const usersRef = ref(rtdb, 'users');
  let uniqueId = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    // Generate 6 digit number string between 100000 and 999999
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    uniqueId = randomNum.toString();

    // Query Realtime Database for existing user with this ID
    try {
      const q = query(usersRef, orderByChild('userId'), equalTo(uniqueId));
      const snapshot = await get(q);
      if (!snapshot.exists()) {
        isUnique = true;
      }
    } catch {
      // If index query fails or is empty, fallback to direct check
      const allUsersSnap = await get(usersRef);
      if (allUsersSnap.exists()) {
        const data = allUsersSnap.val();
        const exists = Object.values(data).some((u: any) => u.userId === uniqueId);
        if (!exists) isUnique = true;
      } else {
        isUnique = true;
      }
    }
  }

  return uniqueId || Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Loads existing user profile from Firebase RTDB or creates a new one with a 6-digit User ID.
 */
export async function createOrLoadUserProfile(user: User): Promise<UserProfile> {
  const userRef = ref(rtdb, `users/${user.uid}`);
  const snapshot = await get(userRef);

  if (snapshot.exists()) {
    // Existing profile found: update status and return
    const existing = snapshot.val() as UserProfile;
    await update(userRef, {
      online: true,
      lastSeen: Date.now(),
      name: user.displayName || existing.name || 'User',
      photoUrl: user.photoURL || existing.photoUrl || ''
    });
    // Ensure user_ids mapping
    if (existing.userId) {
      await set(ref(rtdb, `user_ids/${existing.userId}`), user.uid);
    }
    return {
      ...existing,
      name: user.displayName || existing.name || 'User',
      photoUrl: user.photoURL || existing.photoUrl || '',
      online: true,
      lastSeen: Date.now()
    };
  }

  // First time login: generate unique 6-digit ID
  const newUserId = await generateUniqueUserId();
  const newProfile: UserProfile = {
    uid: user.uid,
    userId: newUserId,
    name: user.displayName || 'M&H User',
    email: user.email || '',
    photoUrl: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || 'MH')}`,
    createdAt: Date.now(),
    online: true,
    lastSeen: Date.now()
  };

  await set(userRef, newProfile);
  await set(ref(rtdb, `user_ids/${newUserId}`), user.uid);
  return newProfile;
}

/**
 * Searches for a user by 6-digit numeric User ID
 */
export async function searchUserByNumericId(numericId: string): Promise<UserProfile | null> {
  const cleanId = numericId.trim();
  if (cleanId.length !== 6) return null;

  const usersRef = ref(rtdb, 'users');
  try {
    const q = query(usersRef, orderByChild('userId'), equalTo(cleanId));
    const snapshot = await get(q);
    if (snapshot.exists()) {
      const val = snapshot.val();
      const firstKey = Object.keys(val)[0];
      return val[firstKey] as UserProfile;
    }
  } catch (err) {
    console.warn("Index query error, checking user list:", err);
  }

  // Fallback scan if index query fails
  const allUsersSnap = await get(usersRef);
  if (allUsersSnap.exists()) {
    const data = allUsersSnap.val();
    for (const key of Object.keys(data)) {
      if (data[key]?.userId === cleanId) {
        return data[key] as UserProfile;
      }
    }
  }
  return null;
}

/**
 * Send a chat/friend request
 */
export async function sendChatRequest(
  sender: UserProfile, 
  receiver: UserProfile
): Promise<{ success: boolean; message: string }> {
  if (sender.uid === receiver.uid) {
    return { success: false, message: "You cannot send a request to yourself." };
  }

  const receiverRequestsRef = ref(rtdb, `requests/${receiver.uid}`);
  const existingReqsSnap = await get(receiverRequestsRef);

  if (existingReqsSnap.exists()) {
    const reqs = existingReqsSnap.val();
    const existing = Object.values(reqs).find((r: any) => 
      r.senderUid === sender.uid && r.status === 'pending'
    );
    if (existing) {
      return { success: false, message: "A pending request has already been sent to this user." };
    }
  }

  // Check if already friends/connected
  const chatId = getChatId(sender.uid, receiver.uid);
  const chatParticipantsRef = ref(rtdb, `chats/${chatId}/participants`);
  const participantsSnap = await get(chatParticipantsRef);
  if (participantsSnap.exists()) {
    const participants = participantsSnap.val();
    if (participants[sender.uid] && participants[receiver.uid]) {
      return { success: false, message: "You are already connected with this user!" };
    }
  }

  const newReqRef = push(receiverRequestsRef);
  const requestData: ChatRequest = {
    id: newReqRef.key!,
    senderUid: sender.uid,
    receiverUid: receiver.uid,
    senderName: sender.name,
    senderPhoto: sender.photoUrl || '',
    senderUserId: sender.userId,
    receiverUserId: receiver.userId,
    status: 'pending',
    createdAt: Date.now()
  };

  await set(newReqRef, requestData);
  return { success: true, message: "Request sent successfully!" };
}

/**
 * Accept or reject a chat request
 */
export async function respondToChatRequest(
  request: ChatRequest, 
  action: 'accepted' | 'rejected'
): Promise<void> {
  const reqRef = ref(rtdb, `requests/${request.receiverUid}/${request.id}`);

  if (action === 'rejected') {
    await update(reqRef, { status: 'rejected' });
    return;
  }

  // If accepted:
  await update(reqRef, { status: 'accepted' });

  // Create chat entry with both participants
  const chatId = getChatId(request.senderUid, request.receiverUid);
  const chatRef = ref(rtdb, `chats/${chatId}`);

  await update(child(chatRef, 'participants'), {
    [request.senderUid]: true,
    [request.receiverUid]: true
  });

  // Track chat in user_chats for both users
  await set(ref(rtdb, `user_chats/${request.senderUid}/${chatId}`), true);
  await set(ref(rtdb, `user_chats/${request.receiverUid}/${chatId}`), true);

  // Add initial system greeting
  const messagesRef = child(chatRef, 'messages');
  const initMsgRef = push(messagesRef);
  await set(initMsgRef, {
    id: initMsgRef.key,
    senderId: request.receiverUid,
    receiverId: request.senderUid,
    text: "💖 You are now connected on Mahal Kita M&H. Start chatting securely!",
    timestamp: Date.now(),
    type: 'text',
    seen: true
  });

  await update(chatRef, {
    lastMessage: "💖 You are now connected on Mahal Kita M&H. Start chatting securely!",
    lastTimestamp: Date.now(),
    lastSenderId: request.receiverUid
  });
}

/**
 * Send a chat message
 */
export async function sendChatMessage(
  chatId: string, 
  senderId: string, 
  receiverId: string, 
  text: string
): Promise<void> {
  if (!text.trim()) return;

  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const newMsgRef = push(messagesRef);

  const message: ChatMessage = {
    id: newMsgRef.key!,
    senderId,
    receiverId,
    text: text.trim(),
    timestamp: Date.now(),
    type: 'text',
    seen: false
  };

  await set(newMsgRef, message);

  // Ensure user_chats is updated
  await set(ref(rtdb, `user_chats/${senderId}/${chatId}`), true);
  await set(ref(rtdb, `user_chats/${receiverId}/${chatId}`), true);

  // Update chat summary metadata
  await update(ref(rtdb, `chats/${chatId}`), {
    lastMessage: text.trim(),
    lastTimestamp: Date.now(),
    lastSenderId: senderId
  });
}

/**
 * Mark messages in a chat as seen by the current user
 */
export async function markChatAsSeen(chatId: string, currentUserId: string): Promise<void> {
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const snapshot = await get(messagesRef);

  if (snapshot.exists()) {
    const messages = snapshot.val();
    const updates: Record<string, any> = {};

    Object.keys(messages).forEach((msgId) => {
      const msg = messages[msgId];
      if (msg.receiverId === currentUserId && !msg.seen) {
        updates[`${msgId}/seen`] = true;
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(messagesRef, updates);
    }
  }
}

/**
 * Mark messages in a chat as delivered
 */
export async function markChatAsDelivered(chatId: string, currentUserId: string): Promise<void> {
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const snapshot = await get(messagesRef);

  if (snapshot.exists()) {
    const messages = snapshot.val();
    const updates: Record<string, any> = {};

    Object.keys(messages).forEach((msgId) => {
      const msg = messages[msgId];
      if (msg.receiverId === currentUserId && !msg.delivered) {
        updates[`${msgId}/delivered`] = true;
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(messagesRef, updates);
    }
  }
}

/**
 * Send media message (image, video, voice note)
 */
export async function sendMediaChatMessage(
  chatId: string,
  senderId: string,
  receiverId: string,
  params: {
    type: MessageType;
    mediaUrl: string;
    mediaName?: string;
    mediaSize?: number;
    text?: string;
    audioDuration?: number;
    voiceEffect?: string;
  }
): Promise<void> {
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const newMsgRef = push(messagesRef);

  const fallbackText = params.text?.trim() || (
    params.type === 'image' ? '📷 Image' :
    params.type === 'video' ? '🎥 Video' :
    params.type === 'audio' ? '🎤 Voice Message' : 'Media'
  );

  const message: ChatMessage = {
    id: newMsgRef.key!,
    senderId,
    receiverId,
    text: fallbackText,
    timestamp: Date.now(),
    type: params.type,
    mediaUrl: params.mediaUrl,
    mediaName: params.mediaName,
    mediaSize: params.mediaSize,
    audioDuration: params.audioDuration,
    voiceEffect: params.voiceEffect,
    delivered: true,
    seen: false
  };

  await set(newMsgRef, message);

  // Update user_chats mapping
  await set(ref(rtdb, `user_chats/${senderId}/${chatId}`), true);
  await set(ref(rtdb, `user_chats/${receiverId}/${chatId}`), true);

  // Update chat summary metadata
  await update(ref(rtdb, `chats/${chatId}`), {
    lastMessage: fallbackText,
    lastTimestamp: Date.now(),
    lastSenderId: senderId
  });
}

/**
 * Real-time typing & voice recording indicators
 */
export async function setUserActivity(
  chatId: string,
  uid: string,
  activity: { typing?: boolean; recording?: boolean }
): Promise<void> {
  const activityRef = ref(rtdb, `chats/${chatId}/activity/${uid}`);
  if (!activity.typing && !activity.recording) {
    await remove(activityRef);
  } else {
    await set(activityRef, {
      ...activity,
      timestamp: Date.now()
    });
  }
}

export function listenToUserActivity(
  chatId: string,
  otherUid: string,
  callback: (activity: UserActivity | null) => void
): () => void {
  const activityRef = ref(rtdb, `chats/${chatId}/activity/${otherUid}`);
  return onValue(activityRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    const val = snapshot.val();
    // Inactivity timeout: if older than 5 seconds, treat as expired
    if (Date.now() - (val.timestamp || 0) > 5000) {
      callback(null);
    } else {
      callback(val);
    }
  });
}

/**
 * =========================================================================
 * WEBRTC CALL SIGNALING (Audio & Video 1-to-1 Calling)
 * =========================================================================
 */

export async function createCallSession(call: Omit<CallSession, 'id'>): Promise<string> {
  const callsRef = ref(rtdb, 'calls');
  const newCallRef = push(callsRef);
  const callId = newCallRef.key!;

  const session: CallSession = {
    ...call,
    id: callId
  };

  await set(newCallRef, session);

  // Also set incoming call trigger on receiver's user record
  await set(ref(rtdb, `users/${call.receiverUid}/incomingCall`), {
    callId,
    callerUid: call.callerUid,
    callerName: call.callerName,
    callerUserId: call.callerUserId,
    callerPhoto: call.callerPhoto || '',
    type: call.type,
    chatId: call.chatId,
    timestamp: Date.now()
  });

  return callId;
}

export function listenToCallSession(
  callId: string,
  callback: (session: CallSession | null) => void
): () => void {
  const callRef = ref(rtdb, `calls/${callId}`);
  return onValue(callRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback(snapshot.val());
  });
}

export async function updateCallSession(callId: string, updates: Partial<CallSession>): Promise<void> {
  const callRef = ref(rtdb, `calls/${callId}`);
  await update(callRef, updates);
}

export async function endCallSession(callId: string, receiverUid?: string, callerUid?: string): Promise<void> {
  const callRef = ref(rtdb, `calls/${callId}`);
  await update(callRef, {
    status: 'ended',
    duration: Date.now()
  });

  if (receiverUid) {
    await remove(ref(rtdb, `users/${receiverUid}/incomingCall`));
  }
  if (callerUid) {
    await remove(ref(rtdb, `users/${callerUid}/incomingCall`));
  }
}

export function listenToIncomingCalls(
  uid: string,
  callback: (callData: any | null) => void
): () => void {
  const incomingRef = ref(rtdb, `users/${uid}/incomingCall`);
  return onValue(incomingRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    const callData = snapshot.val();
    // Auto-ignore/reject call if caller is blocked
    try {
      const cached = JSON.parse(localStorage.getItem(`mahal_blocked_${uid}`) || '{}');
      if (callData?.callerUid && cached[callData.callerUid]) {
        remove(incomingRef);
        callback(null);
        return;
      }
    } catch (e) {}
    callback(callData);
  });
}

export async function addCallIceCandidate(
  callId: string,
  role: 'caller' | 'receiver',
  candidate: RTCIceCandidateInit
): Promise<void> {
  const listRef = ref(rtdb, `calls/${callId}/${role}Candidates`);
  const newCandidateRef = push(listRef);
  await set(newCandidateRef, JSON.parse(JSON.stringify(candidate)));
}

export function listenToCallIceCandidates(
  callId: string,
  targetRole: 'caller' | 'receiver',
  callback: (candidate: RTCIceCandidateInit) => void
): () => void {
  const listRef = ref(rtdb, `calls/${callId}/${targetRole}Candidates`);
  return onValue(listRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const candidates = snapshot.val();
    Object.keys(candidates).forEach((key) => {
      callback(candidates[key]);
    });
  });
}

/**
 * =====================================================================
 * BLOCK / UNBLOCK USERS MANAGEMENT
 * =====================================================================
 */

/**
 * Blocks a contact. Saves to RTDB (blocks/$currentUid/$targetUid & users/$currentUid/blocked/$targetUid) and local cache.
 */
export async function blockUser(
  currentUser: { uid: string },
  targetUser: { uid: string; userId: string; name: string; photoUrl?: string },
  reason: string = 'Blocked by user'
): Promise<void> {
  const blockItem: BlockedUserItem = {
    uid: targetUser.uid,
    userId: targetUser.userId,
    name: targetUser.name,
    photoUrl: targetUser.photoUrl || '',
    timestamp: Date.now(),
    reason
  };

  // 1. Write to blocks node
  try {
    await set(ref(rtdb, `blocks/${currentUser.uid}/${targetUser.uid}`), blockItem);
  } catch (e) {
    console.warn('Block write to blocks/ fallback:', e);
  }

  // 2. Write to users/uid/blocked
  try {
    await set(ref(rtdb, `users/${currentUser.uid}/blocked/${targetUser.uid}`), blockItem);
  } catch (e) {
    console.warn('Block write to users/uid/blocked fallback:', e);
  }

  // 3. Save to localStorage for instant client-side synchronous checks
  try {
    const key = `mahal_blocked_${currentUser.uid}`;
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    existing[targetUser.uid] = blockItem;
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) {}
}

/**
 * Unblocks a previously blocked contact.
 */
export async function unblockUser(currentUid: string, targetUid: string): Promise<void> {
  try {
    await remove(ref(rtdb, `blocks/${currentUid}/${targetUid}`));
  } catch (e) {
    console.warn('Remove block fallback:', e);
  }
  try {
    await remove(ref(rtdb, `users/${currentUid}/blocked/${targetUid}`));
  } catch (e) {
    console.warn('Remove block from users fallback:', e);
  }
  try {
    const key = `mahal_blocked_${currentUid}`;
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    delete existing[targetUid];
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) {}
}

/**
 * Listens to blocked contacts for a given user.
 */
export function listenToBlockedUsers(
  currentUid: string,
  callback: (list: BlockedUserItem[]) => void
): () => void {
  const blocksRef = ref(rtdb, `blocks/${currentUid}`);
  const fallbackRef = ref(rtdb, `users/${currentUid}/blocked`);

  // Initial read from local cache
  try {
    const key = `mahal_blocked_${currentUid}`;
    const cached = JSON.parse(localStorage.getItem(key) || '{}');
    const cachedList = Object.values(cached) as BlockedUserItem[];
    if (cachedList.length > 0) callback(cachedList);
  } catch (e) {}

  return onValue(blocksRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list: BlockedUserItem[] = Object.keys(data).map((k) => data[k]);
      list.sort((a, b) => b.timestamp - a.timestamp);
      try {
        localStorage.setItem(`mahal_blocked_${currentUid}`, JSON.stringify(data));
      } catch (e) {}
      callback(list);
    } else {
      // Check fallback ref
      get(fallbackRef).then((fbSnap) => {
        if (fbSnap.exists()) {
          const fbData = fbSnap.val();
          const list: BlockedUserItem[] = Object.keys(fbData).map((k) => fbData[k]);
          list.sort((a, b) => b.timestamp - a.timestamp);
          callback(list);
        } else {
          callback([]);
        }
      }).catch(() => callback([]));
    }
  });
}

/**
 * Checks whether current user blocked target user, or target user blocked current user.
 */
export async function checkBlockStatus(
  myUid: string,
  otherUid: string
): Promise<{ blockedByMe: boolean; blockedByThem: boolean }> {
  let blockedByMe = false;
  let blockedByThem = false;

  // Local storage quick check
  try {
    const cached = JSON.parse(localStorage.getItem(`mahal_blocked_${myUid}`) || '{}');
    if (cached[otherUid]) blockedByMe = true;
  } catch (e) {}

  try {
    const mySnap = await get(ref(rtdb, `blocks/${myUid}/${otherUid}`));
    if (mySnap.exists()) blockedByMe = true;
  } catch (e) {}

  try {
    const themSnap = await get(ref(rtdb, `blocks/${otherUid}/${myUid}`));
    if (themSnap.exists()) blockedByThem = true;
  } catch (e) {}

  return { blockedByMe, blockedByThem };
}

/**
 * =====================================================================
 * ADMIN PANEL & CONTROL CENTER SERVICES
 * =====================================================================
 */

/**
 * Fetches all registered users from RTDB for Admin management.
 */
export async function fetchAllUsers(): Promise<UserProfile[]> {
  const usersRef = ref(rtdb, 'users');
  const snapshot = await get(usersRef);
  if (!snapshot.exists()) return [];

  const val = snapshot.val();
  const users: UserProfile[] = Object.keys(val).map((k) => ({
    ...val[k],
    uid: k
  }));

  // Fetch banned records
  try {
    const bannedSnap = await get(ref(rtdb, 'banned_users'));
    if (bannedSnap.exists()) {
      const bannedData = bannedSnap.val();
      users.forEach((u) => {
        if (bannedData[u.uid]) {
          u.banned = true;
        }
      });
    }
  } catch (e) {}

  return users;
}

/**
 * Bans or unbans a user account (Admin only).
 */
export async function setUserBanStatus(
  targetUid: string,
  banned: boolean,
  reason: string = 'Account suspended by Administrator'
): Promise<void> {
  if (banned) {
    await set(ref(rtdb, `banned_users/${targetUid}`), {
      banned: true,
      reason,
      timestamp: Date.now()
    });
    try {
      await update(ref(rtdb, `users/${targetUid}`), { banned: true });
    } catch (e) {}
  } else {
    await remove(ref(rtdb, `banned_users/${targetUid}`));
    try {
      await update(ref(rtdb, `users/${targetUid}`), { banned: false });
    } catch (e) {}
  }
}

/**
 * Checks if a given user is currently banned.
 */
export async function checkUserBanned(uid: string): Promise<{ banned: boolean; reason?: string }> {
  try {
    const snap = await get(ref(rtdb, `banned_users/${uid}`));
    if (snap.exists()) {
      const data = snap.val();
      return { banned: true, reason: data.reason || 'Account suspended' };
    }
  } catch (e) {}
  return { banned: false };
}

/**
 * Sets user role (user, admin, owner).
 */
export async function setUserRole(targetUid: string, role: 'user' | 'admin' | 'owner'): Promise<void> {
  try {
    await update(ref(rtdb, `users/${targetUid}`), { role });
  } catch (e) {
    console.warn('Set user role fallback:', e);
  }
}

/**
 * Posts a system announcement broadcasted to all users.
 */
export async function createSystemAnnouncement(
  announcement: Omit<SystemAnnouncement, 'id' | 'timestamp'>
): Promise<void> {
  const annRef = push(ref(rtdb, 'system_announcements'));
  await set(annRef, {
    ...announcement,
    id: annRef.key,
    timestamp: Date.now(),
    active: true
  });
}

/**
 * Deletes a system announcement.
 */
export async function deleteSystemAnnouncement(announcementId: string): Promise<void> {
  await remove(ref(rtdb, `system_announcements/${announcementId}`));
}

/**
 * Listens to active system announcements.
 */
export function listenToSystemAnnouncements(
  callback: (list: SystemAnnouncement[]) => void
): () => void {
  const annRef = ref(rtdb, 'system_announcements');
  return onValue(annRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const val = snapshot.val();
    const list: SystemAnnouncement[] = Object.keys(val).map((k) => ({
      ...val[k],
      id: k
    }));
    list.sort((a, b) => b.timestamp - a.timestamp);
    callback(list);
  });
}

/**
 * Fetches admin statistics.
 */
export async function getAdminStats(): Promise<AdminStats> {
  let totalUsers = 0;
  let onlineUsers = 0;
  let bannedUsers = 0;
  let totalChats = 0;
  let totalAnnouncements = 0;

  try {
    const usersSnap = await get(ref(rtdb, 'users'));
    if (usersSnap.exists()) {
      const users = usersSnap.val();
      const keys = Object.keys(users);
      totalUsers = keys.length;
      keys.forEach((k) => {
        if (users[k].online) onlineUsers++;
      });
    }
  } catch (e) {}

  try {
    const bannedSnap = await get(ref(rtdb, 'banned_users'));
    if (bannedSnap.exists()) {
      bannedUsers = Object.keys(bannedSnap.val()).length;
    }
  } catch (e) {}

  try {
    const chatsSnap = await get(ref(rtdb, 'chats'));
    if (chatsSnap.exists()) {
      totalChats = Object.keys(chatsSnap.val()).length;
    }
  } catch (e) {}

  try {
    const annSnap = await get(ref(rtdb, 'system_announcements'));
    if (annSnap.exists()) {
      totalAnnouncements = Object.keys(annSnap.val()).length;
    }
  } catch (e) {}

  return {
    totalUsers,
    onlineUsers,
    totalChats,
    bannedUsers,
    totalAnnouncements
  };
}


