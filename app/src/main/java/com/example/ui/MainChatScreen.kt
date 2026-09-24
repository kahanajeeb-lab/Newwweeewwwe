package com.example.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.ChatRequest
import com.example.model.ConversationItem
import com.example.model.NavigationTab
import com.example.model.UserProfile
import com.example.repository.FirebaseRepository
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainChatScreen(
    currentUser: UserProfile,
    onOpenChat: (UserProfile) -> Unit,
    onLockToCalculator: () -> Unit,
    onLogout: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(NavigationTab.CHATS) }

    val conversations = remember { mutableStateListOf<ConversationItem>() }
    val pendingRequests = remember { mutableStateListOf<ChatRequest>() }

    // Real-time listeners
    DisposableEffect(currentUser.uid) {
        val convListener = FirebaseRepository.listenToConversations(currentUser.uid) { list ->
            conversations.clear()
            conversations.addAll(list)
        }

        val reqListener = FirebaseRepository.listenToRequests(currentUser.uid) { list ->
            pendingRequests.clear()
            pendingRequests.addAll(list)
        }

        onDispose {
            FirebaseRepository.removeConversationsListener(convListener)
            FirebaseRepository.removeRequestsListener(currentUser.uid, reqListener)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "Mahal Kita ",
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                "M&H",
                                color = Color(0xFFFB7185),
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Text(
                            "Your ID: ${currentUser.userId}",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                },
                actions = {
                    IconButton(
                        onClick = onLockToCalculator,
                        modifier = Modifier.testTag("panic_action")
                    ) {
                        Icon(
                            Icons.Default.Warning,
                            contentDescription = "Panic: Instant Disguise",
                            tint = Color(0xFFFB7185)
                        )
                    }
                    IconButton(
                        onClick = onLockToCalculator,
                        modifier = Modifier.testTag("lock_to_calc_action")
                    ) {
                        Icon(
                            Icons.Default.Lock,
                            contentDescription = "Lock to Calculator",
                            tint = Color(0xFF94A3B8)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF0F172A)
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = Color(0xFF0F172A),
                contentColor = Color.White
            ) {
                NavigationBarItem(
                    selected = selectedTab == NavigationTab.CHATS,
                    onClick = { selectedTab = NavigationTab.CHATS },
                    icon = { Icon(Icons.Default.Chat, contentDescription = "Chats") },
                    label = { Text("Chats", fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFFE11D48),
                        indicatorColor = Color(0xFF1E293B)
                    ),
                    modifier = Modifier.testTag("tab_chats")
                )
                NavigationBarItem(
                    selected = selectedTab == NavigationTab.REQUESTS,
                    onClick = { selectedTab = NavigationTab.REQUESTS },
                    icon = {
                        BadgedBox(
                            badge = {
                                if (pendingRequests.isNotEmpty()) {
                                    Badge(containerColor = Color(0xFFE11D48)) {
                                        Text(pendingRequests.size.toString())
                                    }
                                }
                            }
                        ) {
                            Icon(Icons.Default.MailOutline, contentDescription = "Requests")
                        }
                    },
                    label = { Text("Requests", fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFFE11D48),
                        indicatorColor = Color(0xFF1E293B)
                    ),
                    modifier = Modifier.testTag("tab_requests")
                )
                NavigationBarItem(
                    selected = selectedTab == NavigationTab.FIND_USER,
                    onClick = { selectedTab = NavigationTab.FIND_USER },
                    icon = { Icon(Icons.Default.Search, contentDescription = "Find User") },
                    label = { Text("Find User", fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFFE11D48),
                        indicatorColor = Color(0xFF1E293B)
                    ),
                    modifier = Modifier.testTag("tab_find_user")
                )
                NavigationBarItem(
                    selected = selectedTab == NavigationTab.PROFILE,
                    onClick = { selectedTab = NavigationTab.PROFILE },
                    icon = { Icon(Icons.Default.Person, contentDescription = "Profile") },
                    label = { Text("Profile", fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFFE11D48),
                        indicatorColor = Color(0xFF1E293B)
                    ),
                    modifier = Modifier.testTag("tab_profile")
                )
                NavigationBarItem(
                    selected = selectedTab == NavigationTab.SETTINGS,
                    onClick = { selectedTab = NavigationTab.SETTINGS },
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                    label = { Text("Settings", fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFFE11D48),
                        indicatorColor = Color(0xFF1E293B)
                    ),
                    modifier = Modifier.testTag("tab_settings")
                )
            }
        },
        containerColor = Color(0xFF020617)
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Elegant Owner Branding Banner
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFF1E1B2E),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF4C1D95).copy(alpha = 0.5f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Owner by Raha Hamza Khan",
                        color = Color(0xFFFDE68A),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        fontFamily = FontFamily.Serif
                    )
                    Text(
                        text = "Mahal Kita M&H",
                        color = Color(0xFFFB7185),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            ) {
            when (selectedTab) {
                NavigationTab.CHATS -> {
                    ChatsTabContent(
                        conversations = conversations,
                        onOpenChat = onOpenChat,
                        onNavigateToFind = { selectedTab = NavigationTab.FIND_USER }
                    )
                }
                NavigationTab.REQUESTS -> {
                    RequestsTabContent(
                        requests = pendingRequests,
                        onAccept = { req ->
                            FirebaseRepository.respondToChatRequest(req, true) {
                                // Handled via RTDB listener
                            }
                        },
                        onReject = { req ->
                            FirebaseRepository.respondToChatRequest(req, false) {}
                        }
                    )
                }
                NavigationTab.FIND_USER -> {
                    FindUserTabContent(
                        currentUser = currentUser,
                        onSendRequest = { target ->
                            FirebaseRepository.sendChatRequest(currentUser, target) { _, _ -> }
                        },
                        onNavigateToRequests = { selectedTab = NavigationTab.REQUESTS }
                    )
                }
                NavigationTab.PROFILE -> {
                    ProfileTabContent(
                        currentUser = currentUser,
                        onLogout = onLogout
                    )
                }
                NavigationTab.SETTINGS -> {
                    SettingsTabContent(
                        currentUser = currentUser,
                        onLogout = onLogout,
                        onLockToCalculator = onLockToCalculator
                    )
                }
            }
            }
        }
    }
}

@Composable
fun ChatsTabContent(
    conversations: List<ConversationItem>,
    onOpenChat: (UserProfile) -> Unit,
    onNavigateToFind: () -> Unit
) {
    val timeFormatter = remember { SimpleDateFormat("h:mm a", Locale.getDefault()) }

    if (conversations.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF1E293B)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.FavoriteBorder,
                        contentDescription = null,
                        tint = Color(0xFFFB7185),
                        modifier = Modifier.size(36.dp)
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    "No Conversations Yet",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Share your 6-digit User ID or search for your partner to start chatting privately.",
                    color = Color(0xFF94A3B8),
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(20.dp))
                Button(
                    onClick = onNavigateToFind,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Find Partner")
                }
            }
        }
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(conversations, key = { it.chatId }) { item ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onOpenChat(item.partner) },
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFE11D48)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                item.partner.name.take(1).uppercase(),
                                color = Color.White,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    item.partner.name,
                                    color = Color.White,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                                if (item.timestamp > 0L) {
                                    Text(
                                        timeFormatter.format(Date(item.timestamp)),
                                        color = Color(0xFF64748B),
                                        fontSize = 11.sp
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(4.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    item.lastMessage,
                                    color = Color(0xFF94A3B8),
                                    fontSize = 13.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f)
                                )
                                if (item.unreadCount > 0) {
                                    Box(
                                        modifier = Modifier
                                            .size(20.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFFE11D48)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            item.unreadCount.toString(),
                                            color = Color.White,
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

@Composable
fun RequestsTabContent(
    requests: List<ChatRequest>,
    onAccept: (ChatRequest) -> Unit,
    onReject: (ChatRequest) -> Unit
) {
    if (requests.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Default.MarkEmailRead,
                    contentDescription = null,
                    tint = Color(0xFF475569),
                    modifier = Modifier.size(54.dp)
                )
                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    "No Pending Requests",
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    "Incoming chat requests from other users will show up here.",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp,
                    textAlign = TextAlign.Center
                )
            }
        }
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(requests, key = { it.id }) { req ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFE11D48)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    req.senderName.take(1).uppercase(),
                                    color = Color.White,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    req.senderName,
                                    color = Color.White,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    "User ID: ${req.senderUserId}",
                                    color = Color(0xFFFB7185),
                                    fontSize = 12.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = { onAccept(req) },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Accept")
                            }
                            OutlinedButton(
                                onClick = { onReject(req) },
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF94A3B8)),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Decline")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun FindUserTabContent(
    currentUser: UserProfile,
    onSendRequest: (UserProfile) -> Unit,
    onNavigateToRequests: () -> Unit
) {
    var searchId by remember { mutableStateOf("") }
    var resultUser by remember { mutableStateOf<UserProfile?>(null) }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var isError by remember { mutableStateOf(false) }
    var isSearching by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Find User by 6-Digit ID",
            color = Color.White,
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "Enter the 6-digit numeric User ID of your partner to start chatting.",
            color = Color(0xFF94A3B8),
            fontSize = 12.sp
        )
        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = searchId,
                onValueChange = {
                    if (it.length <= 6 && it.all { char -> char.isDigit() }) {
                        searchId = it
                    }
                },
                placeholder = { Text("e.g. 839201", color = Color(0xFF64748B)) },
                modifier = Modifier
                    .weight(1f)
                    .testTag("search_user_input"),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFFE11D48),
                    unfocusedBorderColor = Color(0xFF334155),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )

            Button(
                onClick = {
                    if (searchId == currentUser.userId) {
                        statusMessage = "You cannot search for your own User ID."
                        isError = true
                        resultUser = null
                    } else if (searchId.length == 6) {
                        isSearching = true
                        statusMessage = null
                        FirebaseRepository.searchUserByNumericId(searchId) { found ->
                            isSearching = false
                            if (found != null) {
                                resultUser = found
                                isError = false
                            } else {
                                statusMessage = "No user found with ID: $searchId."
                                isError = true
                                resultUser = null
                            }
                        }
                    } else {
                        statusMessage = "Please enter a valid 6-digit numeric ID."
                        isError = true
                        resultUser = null
                    }
                },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48)),
                modifier = Modifier
                    .height(56.dp)
                    .testTag("search_user_button"),
                enabled = !isSearching
            ) {
                if (isSearching) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White)
                } else {
                    Text("Search")
                }
            }
        }

        statusMessage?.let { msg ->
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                msg,
                color = if (isError) Color(0xFFFB7185) else Color(0xFF10B981),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )
        }

        resultUser?.let { found ->
            Spacer(modifier = Modifier.height(20.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFE11D48)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                found.name.take(1).uppercase(),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(found.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text("User ID: ${found.userId}", color = Color(0xFFFB7185), fontSize = 13.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Button(
                        onClick = {
                            FirebaseRepository.sendChatRequest(currentUser, found) { success, msg ->
                                if (success) {
                                    statusMessage = msg
                                    isError = false
                                    onNavigateToRequests()
                                } else {
                                    statusMessage = msg
                                    isError = true
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("send_chat_request_button"),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Send Chat Request")
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileTabContent(
    currentUser: UserProfile,
    onLogout: () -> Unit
) {
    val clipboard = LocalClipboardManager.current
    var copied by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }
    var currentDisplayName by remember { mutableStateOf(currentUser.name) }
    var editNameInput by remember { mutableStateOf(currentUser.name) }

    if (showEditDialog) {
        AlertDialog(
            onDismissRequest = { showEditDialog = false },
            title = { Text("Edit Display Name", color = Color.White) },
            text = {
                OutlinedTextField(
                    value = editNameInput,
                    onValueChange = { editNameInput = it },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFFE11D48),
                        unfocusedBorderColor = Color(0xFF334155),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    )
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (editNameInput.isNotBlank()) {
                            val newName = editNameInput.trim()
                            currentDisplayName = newName
                            FirebaseRepository.updateDisplayName(currentUser.uid, newName) {}
                        }
                        showEditDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48))
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showEditDialog = false }) {
                    Text("Cancel", color = Color(0xFF94A3B8))
                }
            },
            containerColor = Color(0xFF0F172A)
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        Box(
            modifier = Modifier
                .size(90.dp)
                .clip(CircleShape)
                .background(Color(0xFFE11D48)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                currentDisplayName.take(1).uppercase(),
                color = Color.White,
                fontSize = 38.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(currentDisplayName, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            IconButton(onClick = {
                editNameInput = currentDisplayName
                showEditDialog = true
            }) {
                Icon(
                    Icons.Default.Edit,
                    contentDescription = "Edit name",
                    tint = Color(0xFF94A3B8),
                    modifier = Modifier.size(18.dp)
                )
            }
        }

        Text(currentUser.email, color = Color(0xFF94A3B8), fontSize = 12.sp)

        Spacer(modifier = Modifier.height(24.dp))

        // Numeric ID Box
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("YOUR USER ID", color = Color(0xFFFB7185), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        currentUser.userId,
                        color = Color.White,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.ExtraBold,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Button(
                    onClick = {
                        clipboard.setText(AnnotatedString(currentUser.userId))
                        copied = true
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (copied) Color(0xFF10B981) else Color(0xFFE11D48)
                    ),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.testTag("copy_user_id_button")
                ) {
                    Text(if (copied) "Copied!" else "Copy")
                }
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        Button(
            onClick = onLogout,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
            modifier = Modifier
                .fillMaxWidth()
                .testTag("profile_logout_button"),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("Log Out", color = Color(0xFFFB7185))
        }
    }
}

@Composable
fun SettingsTabContent(
    currentUser: UserProfile,
    onLogout: () -> Unit,
    onLockToCalculator: () -> Unit
) {
    var notificationsEnabled by remember { mutableStateOf(true) }
    var readReceiptsEnabled by remember { mutableStateOf(true) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Disguise & Lock to Calculator button
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onLockToCalculator() },
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(14.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF4B5EFC))
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Disguise & Lock to Calculator", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Return to the outer calculator screen immediately", color = Color(0xFF94A3B8), fontSize = 11.sp)
                }
                Text("Lock", color = Color(0xFF4B5EFC), fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        }

        // Account Details Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
            shape = RoundedCornerShape(14.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Account", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(10.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Signed In As", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    Text(currentUser.email, color = Color.White, fontSize = 12.sp)
                }
                Spacer(modifier = Modifier.height(6.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Numeric User ID", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    Text(currentUser.userId, color = Color(0xFFFB7185), fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }

        // Preferences Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
            shape = RoundedCornerShape(14.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Preferences & Privacy", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Notifications", color = Color.White, fontSize = 13.sp)
                        Text("Instant message alerts", color = Color(0xFF94A3B8), fontSize = 11.sp)
                    }
                    Switch(
                        checked = notificationsEnabled,
                        onCheckedChange = { notificationsEnabled = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFFE11D48))
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Read Receipts", color = Color.White, fontSize = 13.sp)
                        Text("Show seen status (✓✓) to partner", color = Color(0xFF94A3B8), fontSize = 11.sp)
                    }
                    Switch(
                        checked = readReceiptsEnabled,
                        onCheckedChange = { readReceiptsEnabled = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFFE11D48))
                    )
                }
            }
        }

        // About Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
            shape = RoundedCornerShape(14.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("About", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Text("Mahal Kita M&H", color = Color(0xFFFB7185), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                Text("Version 1.0.0", color = Color(0xFF94A3B8), fontSize = 11.sp)
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    "Private messenger with discreet calculator theme and real-time Firebase backend. Secret trigger: 2580 =",
                    color = Color(0xFF64748B),
                    fontSize = 11.sp
                )
            }
        }

        Button(
            onClick = onLogout,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)),
            modifier = Modifier
                .fillMaxWidth()
                .testTag("settings_logout_button"),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("Log Out", color = Color(0xFFFB7185))
        }
    }
}
