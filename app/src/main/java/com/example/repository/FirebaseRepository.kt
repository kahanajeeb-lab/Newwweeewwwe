package com.example.repository

import android.util.Log
import com.example.model.ChatMessage
import com.example.model.ChatRequest
import com.example.model.ConversationItem
import com.example.model.UserProfile
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.MutableData
import com.google.firebase.database.ServerValue
import com.google.firebase.database.Transaction
import com.google.firebase.database.ValueEventListener
import kotlin.random.Random

object FirebaseRepository {
    private const val TAG = "FirebaseRepository"
    private const val DATABASE_URL = "https://chat-7305d-default-rtdb.firebaseio.com"

    val database: FirebaseDatabase by lazy {
        FirebaseDatabase.getInstance(DATABASE_URL)
    }

    private val usersRef get() = database.getReference("users")
    private val userIdsRef get() = database.getReference("user_ids")
    private val requestsRef get() = database.getReference("requests")
    private val chatsRef get() = database.getReference("chats")
    private val userChatsRef get() = database.getReference("user_chats")

    /**
     * Deterministic chat ID: sorted Firebase UIDs joined by '_'
     */
    fun getChatId(uid1: String, uid2: String): String {
        return if (uid1 < uid2) "${uid1}_$uid2" else "${uid2}_$uid1"
    }

    /**
     * Sets up real-time presence using .info/connected and onDisconnect
     */
    fun setupPresence(uid: String) {
        if (uid.isBlank()) return
        val connectedRef = database.getReference(".info/connected")
        val userStatusRef = usersRef.child(uid)

        connectedRef.addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val connected = snapshot.getValue(Boolean::class.java) ?: false
                if (connected) {
                    val disconnectUpdates = mapOf<String, Any>(
                        "online" to false,
                        "lastSeen" to ServerValue.TIMESTAMP
                    )
                    userStatusRef.onDisconnect().updateChildren(disconnectUpdates)

                    val onlineUpdates = mapOf<String, Any>(
                        "online" to true,
                        "lastSeen" to ServerValue.TIMESTAMP
                    )
                    userStatusRef.updateChildren(onlineUpdates)
                }
            }

            override fun onCancelled(error: DatabaseError) {
                Log.w(TAG, "Presence listener cancelled: ${error.message}")
            }
        })
    }

    /**
     * Checks if user profile exists; if not, safely claims a 6-digit User ID via transaction and creates profile.
     */
    fun createOrLoadUserProfile(
        firebaseUser: FirebaseUser,
        onComplete: (UserProfile) -> Unit
    ) {
        val userRef = usersRef.child(firebaseUser.uid)
        userRef.addListenerForSingleValueEvent(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                if (snapshot.exists()) {
                    val uid = snapshot.child("uid").getValue(String::class.java) ?: firebaseUser.uid
                    val userId = snapshot.child("userId").getValue(String::class.java) ?: "100000"
                    val name = snapshot.child("name").getValue(String::class.java)
                        ?: firebaseUser.displayName?.ifBlank { null } ?: "M&H User"
                    val email = snapshot.child("email").getValue(String::class.java)
                        ?: firebaseUser.email ?: ""
                    val photoUrl = snapshot.child("photoUrl").getValue(String::class.java)
                        ?: firebaseUser.photoUrl?.toString() ?: ""
                    val createdAt = snapshot.child("createdAt").getValue(Long::class.java)
                        ?: System.currentTimeMillis()

                    val existing = UserProfile(
                        uid = uid,
                        userId = userId,
                        name = name,
                        email = email,
                        photoUrl = photoUrl,
                        online = true,
                        lastSeen = System.currentTimeMillis(),
                        createdAt = createdAt
                    )

                    // Ensure mapping in user_ids exists
                    userIdsRef.child(userId).setValue(uid)

                    // Update online status and setup presence
                    setupPresence(uid)

                    onComplete(existing)
                } else {
                    // Claim unique 6-digit numeric User ID with atomic transaction to prevent race conditions
                    claimUnique6DigitId(firebaseUser.uid) { claimedId ->
                        val newProfile = UserProfile(
                            uid = firebaseUser.uid,
                            userId = claimedId,
                            name = firebaseUser.displayName?.ifBlank { null } ?: "M&H User",
                            email = firebaseUser.email ?: "",
                            photoUrl = firebaseUser.photoUrl?.toString() ?: "",
                            online = true,
                            lastSeen = System.currentTimeMillis(),
                            createdAt = System.currentTimeMillis()
                        )

                        val data = mapOf(
                            "uid" to newProfile.uid,
                            "userId" to newProfile.userId,
                            "name" to newProfile.name,
                            "email" to newProfile.email,
                            "photoUrl" to newProfile.photoUrl,
                            "online" to true,
                            "lastSeen" to ServerValue.TIMESTAMP,
                            "createdAt" to ServerValue.TIMESTAMP
                        )

                        userRef.setValue(data).addOnCompleteListener {
                            setupPresence(firebaseUser.uid)
                            onComplete(newProfile)
                        }
                    }
                }
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e(TAG, "createOrLoadUserProfile error: ${error.message}")
            }
        })
    }

    /**
     * Atomically claims a random 6-digit numeric User ID
     */
    private fun claimUnique6DigitId(uid: String, onClaimed: (String) -> Unit) {
        val candidate = Random.nextInt(100000, 1000000).toString()
        val candidateRef = userIdsRef.child(candidate)

        candidateRef.runTransaction(object : Transaction.Handler {
            override fun doTransaction(currentData: MutableData): Transaction.Result {
                val currentVal = currentData.getValue(String::class.java)
                return if (currentVal == null || currentVal == uid) {
                    currentData.value = uid
                    Transaction.success(currentData)
                } else {
                    Transaction.abort()
                }
            }

            override fun onComplete(error: DatabaseError?, committed: Boolean, currentData: DataSnapshot?) {
                if (committed && error == null) {
                    onClaimed(candidate)
                } else {
                    // Collision or error, retry with a fresh number
                    claimUnique6DigitId(uid, onClaimed)
                }
            }
        })
    }

    /**
     * Search user by 6-digit numeric ID directly using user_ids index
     */
    fun searchUserByNumericId(
        numericId: String,
        onResult: (UserProfile?) -> Unit
    ) {
        val cleanId = numericId.trim()
        if (cleanId.length != 6 || !cleanId.all { it.isDigit() }) {
            onResult(null)
            return
        }

        // Direct O(1) lookup on user_ids index
        userIdsRef.child(cleanId).addListenerForSingleValueEvent(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val targetUid = snapshot.getValue(String::class.java)
                if (targetUid != null && targetUid.isNotBlank()) {
                    usersRef.child(targetUid).addListenerForSingleValueEvent(object : ValueEventListener {
                        override fun onDataChange(userSnap: DataSnapshot) {
                            if (userSnap.exists()) {
                                val uid = userSnap.child("uid").getValue(String::class.java) ?: targetUid
                                val userId = userSnap.child("userId").getValue(String::class.java) ?: cleanId
                                val name = userSnap.child("name").getValue(String::class.java) ?: "User"
                                val email = userSnap.child("email").getValue(String::class.java) ?: ""
                                val photoUrl = userSnap.child("photoUrl").getValue(String::class.java) ?: ""
                                val online = userSnap.child("online").getValue(Boolean::class.java) ?: false
                                val lastSeen = userSnap.child("lastSeen").getValue(Long::class.java) ?: 0L

                                onResult(
                                    UserProfile(
                                        uid = uid,
                                        userId = userId,
                                        name = name,
                                        email = email,
                                        photoUrl = photoUrl,
                                        online = online,
                                        lastSeen = lastSeen
                                    )
                                )
                            } else {
                                onResult(null)
                            }
                        }

                        override fun onCancelled(error: DatabaseError) {
                            onResult(null)
                        }
                    })
                } else {
                    // Fallback to query on users with indexOn: ["userId"]
                    usersRef.orderByChild("userId").equalTo(cleanId).limitToFirst(1)
                        .addListenerForSingleValueEvent(object : ValueEventListener {
                            override fun onDataChange(uSnap: DataSnapshot) {
                                for (child in uSnap.children) {
                                    val uid = child.child("uid").getValue(String::class.java) ?: child.key ?: ""
                                    val userId = child.child("userId").getValue(String::class.java) ?: cleanId
                                    val name = child.child("name").getValue(String::class.java) ?: "User"
                                    val email = child.child("email").getValue(String::class.java) ?: ""
                                    val photoUrl = child.child("photoUrl").getValue(String::class.java) ?: ""
                                    val online = child.child("online").getValue(Boolean::class.java) ?: false
                                    val lastSeen = child.child("lastSeen").getValue(Long::class.java) ?: 0L

                                    onResult(
                                        UserProfile(
                                            uid = uid,
                                            userId = userId,
                                            name = name,
                                            email = email,
                                            photoUrl = photoUrl,
                                            online = online,
                                            lastSeen = lastSeen
                                        )
                                    )
                                    return
                                }
                                onResult(null)
                            }

                            override fun onCancelled(error: DatabaseError) {
                                onResult(null)
                            }
                        })
                }
            }

            override fun onCancelled(error: DatabaseError) {
                onResult(null)
            }
        })
    }

    /**
     * Send chat request with duplicate and self checks
     */
    fun sendChatRequest(
        sender: UserProfile,
        receiver: UserProfile,
        onComplete: (Boolean, String) -> Unit
    ) {
        if (sender.uid == receiver.uid) {
            onComplete(false, "You cannot send a request to yourself.")
            return
        }

        // Check if already connected in chats
        val chatId = getChatId(sender.uid, receiver.uid)
        chatsRef.child(chatId).child("participants")
            .addListenerForSingleValueEvent(object : ValueEventListener {
                override fun onDataChange(chatSnap: DataSnapshot) {
                    if (chatSnap.child(sender.uid).getValue(Boolean::class.java) == true &&
                        chatSnap.child(receiver.uid).getValue(Boolean::class.java) == true
                    ) {
                        onComplete(false, "You are already connected with this user!")
                        return
                    }

                    val receiverReqs = requestsRef.child(receiver.uid)
                    receiverReqs.orderByChild("status").equalTo("pending")
                        .addListenerForSingleValueEvent(object : ValueEventListener {
                            override fun onDataChange(reqSnapshot: DataSnapshot) {
                                for (child in reqSnapshot.children) {
                                    val sUid = child.child("senderUid").getValue(String::class.java)
                                    if (sUid == sender.uid) {
                                        onComplete(false, "A pending request has already been sent to this user.")
                                        return
                                    }
                                }

                                val newReqRef = receiverReqs.push()
                                val reqId = newReqRef.key ?: System.currentTimeMillis().toString()
                                val data = mapOf(
                                    "id" to reqId,
                                    "senderUid" to sender.uid,
                                    "receiverUid" to receiver.uid,
                                    "senderName" to sender.name,
                                    "senderUserId" to sender.userId,
                                    "senderPhoto" to sender.photoUrl,
                                    "receiverUserId" to receiver.userId,
                                    "status" to "pending",
                                    "createdAt" to ServerValue.TIMESTAMP
                                )
                                newReqRef.setValue(data).addOnCompleteListener { task ->
                                    if (task.isSuccessful) {
                                        onComplete(true, "Request sent successfully!")
                                    } else {
                                        onComplete(false, task.exception?.message ?: "Failed to send request.")
                                    }
                                }
                            }

                            override fun onCancelled(error: DatabaseError) {
                                onComplete(false, error.message)
                            }
                        })
                }

                override fun onCancelled(error: DatabaseError) {
                    onComplete(false, error.message)
                }
            })
    }

    /**
     * Accept or reject a chat request
     */
    fun respondToChatRequest(
        request: ChatRequest,
        accept: Boolean,
        onComplete: () -> Unit
    ) {
        val reqRef = requestsRef.child(request.receiverUid).child(request.id)
        if (!accept) {
            reqRef.child("status").setValue("rejected").addOnCompleteListener { onComplete() }
            return
        }

        reqRef.child("status").setValue("accepted").addOnCompleteListener {
            val chatId = getChatId(request.senderUid, request.receiverUid)
            val chatRef = chatsRef.child(chatId)

            val participants = mapOf(
                request.senderUid to true,
                request.receiverUid to true
            )
            chatRef.child("participants").updateChildren(participants).addOnCompleteListener {
                // Register chat for both users in user_chats to allow fast, secure list loading
                userChatsRef.child(request.senderUid).child(chatId).setValue(true)
                userChatsRef.child(request.receiverUid).child(chatId).setValue(true)

                // Welcome message
                val msgRef = chatRef.child("messages").push()
                val msgId = msgRef.key ?: System.currentTimeMillis().toString()
                val welcome = mapOf(
                    "id" to msgId,
                    "senderId" to request.receiverUid,
                    "receiverId" to request.senderUid,
                    "text" to "💖 You are now connected on Mahal Kita M&H. Start chatting securely!",
                    "timestamp" to ServerValue.TIMESTAMP,
                    "seen" to true,
                    "type" to "text"
                )
                msgRef.setValue(welcome)

                // Update chat metadata
                chatRef.updateChildren(
                    mapOf(
                        "lastMessage" to "💖 You are now connected on Mahal Kita M&H",
                        "lastTimestamp" to ServerValue.TIMESTAMP,
                        "lastSenderId" to request.receiverUid
                    )
                ).addOnCompleteListener {
                    onComplete()
                }
            }
        }
    }

    /**
     * Real-time listener for incoming pending requests for currentUser
     */
    fun listenToRequests(
        currentUserUid: String,
        onUpdate: (List<ChatRequest>) -> Unit
    ): ValueEventListener {
        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val list = mutableListOf<ChatRequest>()
                for (child in snapshot.children) {
                    val status = child.child("status").getValue(String::class.java) ?: "pending"
                    if (status == "pending") {
                        val req = ChatRequest(
                            id = child.child("id").getValue(String::class.java) ?: child.key ?: "",
                            senderUid = child.child("senderUid").getValue(String::class.java) ?: "",
                            receiverUid = child.child("receiverUid").getValue(String::class.java) ?: "",
                            senderName = child.child("senderName").getValue(String::class.java) ?: "User",
                            senderUserId = child.child("senderUserId").getValue(String::class.java) ?: "",
                            senderPhoto = child.child("senderPhoto").getValue(String::class.java) ?: "",
                            receiverUserId = child.child("receiverUserId").getValue(String::class.java) ?: "",
                            status = status,
                            createdAt = child.child("createdAt").getValue(Long::class.java) ?: 0L
                        )
                        list.add(req)
                    }
                }
                onUpdate(list.sortedByDescending { it.createdAt })
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e(TAG, "listenToRequests error: ${error.message}")
            }
        }
        requestsRef.child(currentUserUid).addValueEventListener(listener)
        return listener
    }

    fun removeRequestsListener(currentUserUid: String, listener: ValueEventListener) {
        requestsRef.child(currentUserUid).removeEventListener(listener)
    }

    /**
     * Real-time listener for user's conversations using user_chats and chat metadata
     */
    fun listenToConversations(
        currentUserUid: String,
        onUpdate: (List<ConversationItem>) -> Unit
    ): ValueEventListener {
        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val chatIds = snapshot.children.mapNotNull { it.key }
                if (chatIds.isEmpty()) {
                    onUpdate(emptyList())
                    return
                }

                val conversationList = mutableListOf<ConversationItem>()
                var pendingCount = chatIds.size

                for (chatId in chatIds) {
                    chatsRef.child(chatId).addListenerForSingleValueEvent(object : ValueEventListener {
                        override fun onDataChange(chatSnap: DataSnapshot) {
                            if (!chatSnap.exists()) {
                                pendingCount--
                                if (pendingCount == 0) onUpdate(conversationList.sortedByDescending { it.timestamp })
                                return
                            }

                            // Extract partner UID from participants or chatId
                            var partnerUid = ""
                            val partsSnap = chatSnap.child("participants")
                            for (p in partsSnap.children) {
                                if (p.key != currentUserUid) {
                                    partnerUid = p.key ?: ""
                                    break
                                }
                            }
                            if (partnerUid.isBlank()) {
                                val split = chatId.split("_")
                                partnerUid = if (split.size == 2) {
                                    if (split[0] == currentUserUid) split[1] else split[0]
                                } else ""
                            }

                            if (partnerUid.isBlank()) {
                                pendingCount--
                                if (pendingCount == 0) onUpdate(conversationList.sortedByDescending { it.timestamp })
                                return
                            }

                            val lastMsg = chatSnap.child("lastMessage").getValue(String::class.java) ?: "Connected"
                            val lastTimestamp = chatSnap.child("lastTimestamp").getValue(Long::class.java) ?: 0L

                            // Calculate unread count for current user
                            var unread = 0
                            val messagesSnap = chatSnap.child("messages")
                            for (m in messagesSnap.children) {
                                val rec = m.child("receiverId").getValue(String::class.java)
                                val seen = m.child("seen").getValue(Boolean::class.java) ?: false
                                if (rec == currentUserUid && !seen) {
                                    unread++
                                }
                            }

                            // Fetch partner profile
                            usersRef.child(partnerUid).addListenerForSingleValueEvent(object : ValueEventListener {
                                override fun onDataChange(userSnap: DataSnapshot) {
                                    val partner = UserProfile(
                                        uid = partnerUid,
                                        userId = userSnap.child("userId").getValue(String::class.java) ?: "000000",
                                        name = userSnap.child("name").getValue(String::class.java) ?: "Partner",
                                        email = userSnap.child("email").getValue(String::class.java) ?: "",
                                        photoUrl = userSnap.child("photoUrl").getValue(String::class.java) ?: "",
                                        online = userSnap.child("online").getValue(Boolean::class.java) ?: false,
                                        lastSeen = userSnap.child("lastSeen").getValue(Long::class.java) ?: 0L
                                    )

                                    conversationList.add(
                                        ConversationItem(
                                            chatId = chatId,
                                            partner = partner,
                                            lastMessage = lastMsg,
                                            timestamp = lastTimestamp,
                                            unreadCount = unread
                                        )
                                    )

                                    pendingCount--
                                    if (pendingCount == 0) {
                                        onUpdate(conversationList.sortedByDescending { it.timestamp })
                                    }
                                }

                                override fun onCancelled(error: DatabaseError) {
                                    pendingCount--
                                    if (pendingCount == 0) {
                                        onUpdate(conversationList.sortedByDescending { it.timestamp })
                                    }
                                }
                            })
                        }

                        override fun onCancelled(error: DatabaseError) {
                            pendingCount--
                            if (pendingCount == 0) {
                                onUpdate(conversationList.sortedByDescending { it.timestamp })
                            }
                        }
                    })
                }
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e(TAG, "listenToConversations error: ${error.message}")
            }
        }
        userChatsRef.child(currentUserUid).addValueEventListener(listener)
        return listener
    }

    fun removeConversationsListener(currentUserUid: String, listener: ValueEventListener) {
        userChatsRef.child(currentUserUid).removeEventListener(listener)
    }

    /**
     * Real-time listener for messages in a chat room
     */
    fun listenToMessages(
        chatId: String,
        onUpdate: (List<ChatMessage>) -> Unit
    ): ValueEventListener {
        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val list = mutableListOf<ChatMessage>()
                for (child in snapshot.children) {
                    val msg = ChatMessage(
                        id = child.child("id").getValue(String::class.java) ?: child.key ?: "",
                        senderId = child.child("senderId").getValue(String::class.java) ?: "",
                        receiverId = child.child("receiverId").getValue(String::class.java) ?: "",
                        text = child.child("text").getValue(String::class.java) ?: "",
                        timestamp = child.child("timestamp").getValue(Long::class.java) ?: 0L,
                        seen = child.child("seen").getValue(Boolean::class.java) ?: false,
                        type = child.child("type").getValue(String::class.java) ?: "text"
                    )
                    list.add(msg)
                }
                onUpdate(list.sortedBy { it.timestamp })
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e(TAG, "listenToMessages error: ${error.message}")
            }
        }
        chatsRef.child(chatId).child("messages").addValueEventListener(listener)
        return listener
    }

    fun removeMessagesListener(chatId: String, listener: ValueEventListener) {
        chatsRef.child(chatId).child("messages").removeEventListener(listener)
    }

    /**
     * Send real-time chat message and update chat metadata
     */
    fun sendMessage(
        chatId: String,
        senderId: String,
        receiverId: String,
        text: String
    ) {
        val clean = text.trim()
        if (clean.isBlank()) return

        val chatRef = chatsRef.child(chatId)
        val msgRef = chatRef.child("messages").push()
        val msgId = msgRef.key ?: System.currentTimeMillis().toString()
        val data = mapOf(
            "id" to msgId,
            "senderId" to senderId,
            "receiverId" to receiverId,
            "text" to clean,
            "timestamp" to ServerValue.TIMESTAMP,
            "seen" to false,
            "type" to "text"
        )
        msgRef.setValue(data)

        // Ensure both users are registered in user_chats
        userChatsRef.child(senderId).child(chatId).setValue(true)
        userChatsRef.child(receiverId).child(chatId).setValue(true)

        // Update chat summary metadata
        chatRef.updateChildren(
            mapOf(
                "lastMessage" to clean,
                "lastTimestamp" to ServerValue.TIMESTAMP,
                "lastSenderId" to senderId
            )
        )
    }

    /**
     * Mark unread messages in a chat as seen. Only marks messages where receiverId == currentUid.
     */
    fun markMessagesAsSeen(chatId: String, currentUid: String) {
        val messagesRef = chatsRef.child(chatId).child("messages")
        messagesRef.addListenerForSingleValueEvent(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val updates = mutableMapOf<String, Any>()
                for (child in snapshot.children) {
                    val recId = child.child("receiverId").getValue(String::class.java)
                    val seen = child.child("seen").getValue(Boolean::class.java) ?: false
                    // Strictly enforce: only receiver can mark message as seen
                    if (recId == currentUid && !seen) {
                        updates["${child.key}/seen"] = true
                    }
                }
                if (updates.isNotEmpty()) {
                    messagesRef.updateChildren(updates)
                }
            }

            override fun onCancelled(error: DatabaseError) {}
        })
    }

    /**
     * Update display name in RTDB
     */
    fun updateDisplayName(uid: String, newName: String, onComplete: () -> Unit) {
        val clean = newName.trim()
        if (clean.isBlank()) return
        usersRef.child(uid).child("name").setValue(clean).addOnCompleteListener {
            onComplete()
        }
    }

    /**
     * Update online status in RTDB
     */
    fun setOnlineStatus(uid: String, online: Boolean) {
        if (uid.isBlank()) return
        val updates = mapOf(
            "online" to online,
            "lastSeen" to ServerValue.TIMESTAMP
        )
        usersRef.child(uid).updateChildren(updates)
    }
}
