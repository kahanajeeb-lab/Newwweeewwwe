package com.example.model

enum class ScreenState {
    CALCULATOR,
    AUTH,
    MAIN_APP,
    CHAT_ROOM,
    CALL
}

enum class NavigationTab {
    CHATS,
    REQUESTS,
    FIND_USER,
    PROFILE,
    SETTINGS
}

data class UserProfile(
    val uid: String = "",
    val userId: String = "",
    val name: String = "",
    val email: String = "",
    val photoUrl: String = "",
    val online: Boolean = true,
    val lastSeen: Long = System.currentTimeMillis(),
    val createdAt: Long = System.currentTimeMillis()
)

data class ChatMessage(
    val id: String = "",
    val senderId: String = "",
    val receiverId: String = "",
    val text: String = "",
    val timestamp: Long = System.currentTimeMillis(),
    val seen: Boolean = false,
    val delivered: Boolean = false,
    val type: String = "text",
    val mediaUrl: String = "",
    val mediaName: String = "",
    val audioDuration: Int = 0,
    val voiceEffect: String = ""
)

data class ChatRequest(
    val id: String = "",
    val senderUid: String = "",
    val receiverUid: String = "",
    val senderName: String = "",
    val senderUserId: String = "",
    val senderPhoto: String = "",
    val receiverUserId: String = "",
    val status: String = "pending",
    val createdAt: Long = System.currentTimeMillis()
)

data class ConversationItem(
    val chatId: String,
    val partner: UserProfile,
    val lastMessage: String,
    val timestamp: Long,
    val unreadCount: Int = 0
)

data class CallSession(
    val id: String = "",
    val chatId: String = "",
    val callerUid: String = "",
    val callerName: String = "",
    val callerUserId: String = "",
    val callerPhoto: String = "",
    val receiverUid: String = "",
    val receiverName: String = "",
    val receiverPhoto: String = "",
    val type: String = "audio", // "audio" or "video"
    val status: String = "calling", // "calling", "ringing", "connected", "ended"
    val timestamp: Long = System.currentTimeMillis()
)

data class UserActivity(
    val typing: Boolean = false,
    val recording: Boolean = false,
    val timestamp: Long = System.currentTimeMillis()
)
