package com.example.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.ChatMessage
import com.example.model.UserProfile
import com.example.repository.FirebaseRepository
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatRoomScreen(
    currentUser: UserProfile,
    otherUser: UserProfile,
    onBack: () -> Unit
) {
    var messageText by remember { mutableStateOf("") }
    val messages = remember { mutableStateListOf<ChatMessage>() }
    val chatId = remember(currentUser.uid, otherUser.uid) {
        FirebaseRepository.getChatId(currentUser.uid, otherUser.uid)
    }

    val timeFormatter = remember { SimpleDateFormat("h:mm a", Locale.getDefault()) }

    // Real-time messages listener
    DisposableEffect(chatId) {
        val listener = FirebaseRepository.listenToMessages(chatId) { list ->
            messages.clear()
            messages.addAll(list)
            FirebaseRepository.markMessagesAsSeen(chatId, currentUser.uid)
        }

        onDispose {
            FirebaseRepository.removeMessagesListener(chatId, listener)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFE11D48)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(otherUser.name.take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(otherUser.name, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF10B981))
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Online • ID: ${otherUser.userId}", color = Color(0xFF10B981), fontSize = 11.sp)
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.testTag("chat_room_back_button")
                    ) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F172A))
            )
        },
        bottomBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF0F172A))
                    .padding(horizontal = 8.dp, vertical = 6.dp)
            ) {
                // Quick love emoji bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    val emojis = listOf("❤️", "💌", "🥰", "🌹", "✨")
                    for (emoji in emojis) {
                        Text(
                            emoji,
                            modifier = Modifier
                                .clickable {
                                    FirebaseRepository.sendMessage(
                                        chatId = chatId,
                                        senderId = currentUser.uid,
                                        receiverId = otherUser.uid,
                                        text = emoji
                                    )
                                }
                                .padding(2.dp),
                            fontSize = 20.sp
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = messageText,
                        onValueChange = { messageText = it },
                        placeholder = { Text("Write a message...", color = Color(0xFF64748B)) },
                        modifier = Modifier
                            .weight(1f)
                            .testTag("chat_message_input"),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFFE11D48),
                            unfocusedBorderColor = Color(0xFF334155),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        shape = RoundedCornerShape(20.dp),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    IconButton(
                        onClick = {
                            if (messageText.isNotBlank()) {
                                FirebaseRepository.sendMessage(
                                    chatId = chatId,
                                    senderId = currentUser.uid,
                                    receiverId = otherUser.uid,
                                    text = messageText.trim()
                                )
                                messageText = ""
                            }
                        },
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFE11D48))
                            .testTag("send_message_button")
                    ) {
                        Icon(Icons.Default.Send, contentDescription = "Send", tint = Color.White)
                    }
                }
            }
        },
        containerColor = Color(0xFF020617)
    ) { padding ->
        if (messages.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(24.dp)) {
                    Text("❤️", fontSize = 48.sp)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Mahal Kita M&H", color = Color(0xFFFB7185), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        "Send your first private message to ${otherUser.name}",
                        color = Color(0xFF94A3B8),
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(messages, key = { it.id }) { msg ->
                    val isMe = msg.senderId == currentUser.uid
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = if (isMe) Arrangement.End else Arrangement.Start
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(
                                    RoundedCornerShape(
                                        topStart = 16.dp,
                                        topEnd = 16.dp,
                                        bottomStart = if (isMe) 16.dp else 4.dp,
                                        bottomEnd = if (isMe) 4.dp else 16.dp
                                    )
                                )
                                .background(if (isMe) Color(0xFFE11D48) else Color(0xFF1E293B))
                                .padding(horizontal = 14.dp, vertical = 10.dp)
                        ) {
                            Column {
                                Text(msg.text, color = Color.White, fontSize = 14.sp)
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(
                                    horizontalArrangement = Arrangement.End,
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.align(Alignment.End)
                                ) {
                                    Text(
                                        timeFormatter.format(Date(msg.timestamp)),
                                        color = if (isMe) Color(0xFFFFD1DC) else Color(0xFF94A3B8),
                                        fontSize = 10.sp
                                    )
                                    if (isMe) {
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            if (msg.seen) "✓✓" else "✓",
                                            color = if (msg.seen) Color(0xFF38BDF8) else Color(0xFFFFD1DC),
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
