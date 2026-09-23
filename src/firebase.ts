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
  DatabaseReference
} from 'firebase/database';
import { UserProfile, ChatRequest, ChatMessage } from './types';

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

  // Add initial system greeting
  const messagesRef = child(chatRef, 'messages');
  const initMsgRef = push(messagesRef);
  await set(initMsgRef, {
    id: initMsgRef.key,
    senderId: 'system',
    receiverId: 'all',
    text: "💖 You are now connected on Mahal Kita M&H. Start chatting securely!",
    timestamp: Date.now(),
    type: 'text',
    seen: true
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
