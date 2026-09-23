package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.*
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
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.MyApplicationTheme
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

enum class ScreenState {
    CALCULATOR,
    AUTH,
    MAIN_APP,
    CHAT_ROOM
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
    val lastSeen: Long = System.currentTimeMillis()
)

data class ChatMessage(
    val id: String = "",
    val senderId: String = "",
    val receiverId: String = "",
    val text: String = "",
    val timestamp: Long = System.currentTimeMillis(),
    val seen: Boolean = false
)

data class ChatRequest(
    val id: String = "",
    val senderUid: String = "",
    val receiverUid: String = "",
    val senderName: String = "",
    val senderUserId: String = "",
    val status: String = "pending",
    val createdAt: Long = System.currentTimeMillis()
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                AppNavigator()
            }
        }
    }
}

@Composable
fun AppNavigator() {
    var screenState by remember { mutableStateOf(ScreenState.CALCULATOR) }
    var currentUser by remember { 
        mutableStateOf<UserProfile?>(null) 
    }
    var activeChatUser by remember { mutableStateOf<UserProfile?>(null) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF0F172A)
    ) {
        when (screenState) {
            ScreenState.CALCULATOR -> {
                CalculatorScreen(
                    onUnlock = {
                        if (currentUser != null) {
                            screenState = ScreenState.MAIN_APP
                        } else {
                            screenState = ScreenState.AUTH
                        }
                    }
                )
            }
            ScreenState.AUTH -> {
                AuthScreen(
                    onSuccess = { user ->
                        currentUser = user
                        screenState = ScreenState.MAIN_APP
                    },
                    onBackToCalculator = {
                        screenState = ScreenState.CALCULATOR
                    }
                )
            }
            ScreenState.MAIN_APP -> {
                currentUser?.let { user ->
                    MainChatScreen(
                        currentUser = user,
                        onOpenChat = { target ->
                            activeChatUser = target
                            screenState = ScreenState.CHAT_ROOM
                        },
                        onLockToCalculator = {
                            screenState = ScreenState.CALCULATOR
                        },
                        onLogout = {
                            currentUser = null
                            screenState = ScreenState.CALCULATOR
                        }
                    )
                } ?: run {
                    screenState = ScreenState.AUTH
                }
            }
            ScreenState.CHAT_ROOM -> {
                if (currentUser != null && activeChatUser != null) {
                    ChatRoomScreen(
                        currentUser = currentUser!!,
                        otherUser = activeChatUser!!,
                        onBack = {
                            screenState = ScreenState.MAIN_APP
                        }
                    )
                } else {
                    screenState = ScreenState.MAIN_APP
                }
            }
        }
    }
}

/* ==========================================================================
   1. CALCULATOR SCREEN (FIRST ENTRY SCREEN WITH 2580 = SEQUENCE)
   ========================================================================== */

@Composable
fun CalculatorScreen(onUnlock: () -> void) {
    var display by remember { mutableStateOf("0") }
    var equation by remember { mutableStateOf("") }
    var waitingForOperand by remember { mutableStateOf(false) }
    var prevValue by remember { mutableStateOf<Double?>(null) }
    var operator by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF17171C))
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Status row
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("RAD", color = Color(0xFF64748B), fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Text("Calculator", color = Color(0xFF64748B), fontSize = 12.sp)
        }

        // Display Area
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(bottom = 16.dp),
            verticalArrangement = Arrangement.Bottom,
            horizontalAlignment = Alignment.End
        ) {
            Text(
                text = equation,
                color = Color(0xFF94A3B8),
                fontSize = 16.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = display,
                color = Color.White,
                fontSize = if (display.length > 8) 40.sp else 64.sp,
                fontWeight = FontWeight.Light,
                maxLines = 1
            )
        }

        // Keypad Grid
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            val numBg = Color(0xFF2E2F38)
            val secBg = Color(0xFF4E505F)
            val opBg = Color(0xFF4B5EFC)

            // Row 1: C, +/-, %, ÷
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                CalcButton("C", secBg, Modifier.weight(1f)) {
                    display = "0"
                    equation = ""
                    prevValue = null
                    operator = null
                    waitingForOperand = false
                }
                CalcButton("+/-", secBg, Modifier.weight(1f)) {
                    val d = display.toDoubleOrNull() ?: 0.0
                    display = (d * -1).toString().removeSuffix(".0")
                }
                CalcButton("%", secBg, Modifier.weight(1f)) {
                    val d = display.toDoubleOrNull() ?: 0.0
                    display = (d / 100).toString()
                }
                CalcButton("÷", opBg, Modifier.weight(1f)) {
                    prevValue = display.toDoubleOrNull()
                    operator = "÷"
                    equation = "$display ÷"
                    waitingForOperand = true
                }
            }

            // Row 2: 7, 8, 9, ×
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                CalcButton("7", numBg, Modifier.weight(1f)) {
                    display = if (waitingForOperand || display == "0") "7" else display + "7"
                    waitingForOperand = false
                }
                CalcButton("8", numBg, Modifier.weight(1f)) {
                    display = if (waitingForOperand || display == "0") "8" else display + "8"
                    waitingForOperand = false
                }
                CalcButton("9", numBg, Modifier.weight(1f)) {
                    display = if (waitingForOperand || display == "0") "9" else display + "9"
                    waitingForOperand = false
                }
                CalcButton("×", opBg, Modifier.weight(1f)) {
                    prevValue = display.toDoubleOrNull()
                    operator = "×"
                    equation = "$display ×"
                    waitingForOperand = true
                }
            }

            // Row 3: 4, 5, 6, -
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                CalcButton("4", numBg, Modifier.weight(1f)) {
                    display = if (waitingForOperand || display == "0") "4" else display + "4"
                    waitingForOperand = false
                }
                CalcButton("5", numBg, Modifier.weight(1f)) {
                    display = if (waitingForOperand || display == "0") "5" else display + "5"
                    waitingForOperand = false
                }
                CalcButton("6", numBg, Modifier.weight(1f)) {
                    display = if (waitingForOperand || display == "0") "6" else display + "6"
                    waitingForOperand = false
                }
                CalcButton("-", opBg, Modifier.weight(1f)) {
                    prevValue = display.toDoubleOrNull()
                    operator = "-"
                    equation = "$display -"
                    waitingForOperand = true
                }
            }

            // Row 4: 1, 2, 3, +
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                CalcButton("1", numBg, Modifier.weight(1f)) {
                    display = if (waitingForOperand || display == "0") "1" else display + "1"
                    waitingForOperand = false
                }
                CalcButton("2", numBg, Modifier.weight(1f)) {
                    display = if (waitingForOperand || display == "0") "2" else display + "2"
                    waitingForOperand = false
                }
                CalcButton("3", numBg, Modifier.weight(1f)) {
                    display = if (waitingForOperand || display == "0") "3" else display + "3"
                    waitingForOperand = false
                }
                CalcButton("+", opBg, Modifier.weight(1f)) {
                    prevValue = display.toDoubleOrNull()
                    operator = "+"
                    equation = "$display +"
                    waitingForOperand = true
                }
            }

            // Row 5: ⌫, 0, ., =
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                CalcButton("⌫", numBg, Modifier.weight(1f)) {
                    display = if (display.length > 1) display.dropLast(1) else "0"
                }
                CalcButton("0", numBg, Modifier.weight(1f)) {
                    display = if (waitingForOperand || display == "0") "0" else display + "0"
                    waitingForOperand = false
                }
                CalcButton(".", numBg, Modifier.weight(1f)) {
                    if (!display.contains(".")) {
                        display = if (waitingForOperand) "0." else "$display."
                        waitingForOperand = false
                    }
                }
                CalcButton("=", opBg, Modifier.weight(1f)) {
                    // Secret Code Check: "2580" and press "="
                    if (display.trim() == "2580") {
                        onUnlock()
                    } else {
                        // Standard calculation
                        val current = display.toDoubleOrNull() ?: 0.0
                        val prev = prevValue
                        val op = operator
                        if (prev != null && op != null) {
                            val res = when (op) {
                                "+" -> prev + current
                                "-" -> prev - current
                                "×" -> prev * current
                                "÷" -> if (current != 0.0) prev / current else 0.0
                                else -> current
                            }
                            equation = "$prev $op $current ="
                            display = res.toString().removeSuffix(".0")
                            prevValue = null
                            operator = null
                            waitingForOperand = true
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CalcButton(
    text: String,
    bg: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .height(68.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(bg)
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            color = Color.White,
            fontSize = 24.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

/* ==========================================================================
   2. GOOGLE LOGIN SCREEN
   ========================================================================== */

@Composable
fun AuthScreen(
    onSuccess: (UserProfile) -> Unit,
    onBackToCalculator: () -> Unit
) {
    var loading by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF020617))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Top lock back
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            horizontalArrangement = Arrangement.Start
        ) {
            IconButton(
                onClick = onBackToCalculator,
                modifier = Modifier
                    .clip(CircleShape)
                    .background(Color(0xFF0F172A))
            ) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color(0xFF94A3B8))
            }
        }

        // Branding
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color(0xFFE11D48)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Favorite,
                    contentDescription = "Love",
                    tint = Color.White,
                    modifier = Modifier.size(40.dp)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            Text(
                text = "Mahal Kita M&H",
                color = Color.White,
                fontSize = 28.sp,
                fontWeight = FontWeight.ExtraBold
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Private encrypted real-time chat.\nSign in with your Google account to connect.",
                color = Color(0xFF94A3B8),
                fontSize = 13.sp,
                textAlign = TextAlign.Center,
                lineHeight = 18.sp
            )

            Spacer(modifier = Modifier.height(36.dp))

            Button(
                onClick = {
                    loading = true
                    // Simulate real Google account sign-in profile creation
                    val random6Digit = (100000..999999).random().toString()
                    val user = UserProfile(
                        uid = "uid_${System.currentTimeMillis()}",
                        userId = random6Digit,
                        name = "M&H Partner",
                        email = "user@gmail.com",
                        photoUrl = ""
                    )
                    loading = false
                    onSuccess(user)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White)
            ) {
                if (loading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.Black)
                } else {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.AccountCircle,
                            contentDescription = "Google",
                            tint = Color(0xFF4285F4),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Continue with Google",
                            color = Color(0xFF1E293B),
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }

        Text(
            text = "Firebase Project: chat-7305d\nEnd-to-End Encrypted",
            color = Color(0xFF475569),
            fontSize = 11.sp,
            textAlign = TextAlign.Center
        )
    }
}

/* ==========================================================================
   3. MAIN CHAT APPLICATION SCREEN
   ========================================================================== */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainChatScreen(
    currentUser: UserProfile,
    onOpenChat: (UserProfile) -> Unit,
    onLockToCalculator: () -> Unit,
    onLogout: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(NavigationTab.CHATS) }

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
                    IconButton(onClick = onLockToCalculator) {
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
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == NavigationTab.REQUESTS,
                    onClick = { selectedTab = NavigationTab.REQUESTS },
                    icon = { Icon(Icons.Default.MailOutline, contentDescription = "Requests") },
                    label = { Text("Requests", fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFFE11D48),
                        indicatorColor = Color(0xFF1E293B)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == NavigationTab.FIND_USER,
                    onClick = { selectedTab = NavigationTab.FIND_USER },
                    icon = { Icon(Icons.Default.Search, contentDescription = "Find User") },
                    label = { Text("Find User", fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFFE11D48),
                        indicatorColor = Color(0xFF1E293B)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == NavigationTab.PROFILE,
                    onClick = { selectedTab = NavigationTab.PROFILE },
                    icon = { Icon(Icons.Default.Person, contentDescription = "Profile") },
                    label = { Text("Profile", fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFFE11D48),
                        indicatorColor = Color(0xFF1E293B)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == NavigationTab.SETTINGS,
                    onClick = { selectedTab = NavigationTab.SETTINGS },
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                    label = { Text("Settings", fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFFE11D48),
                        indicatorColor = Color(0xFF1E293B)
                    )
                )
            }
        },
        containerColor = Color(0xFF020617)
    ) { padding ->
        val conversations = remember {
            mutableStateListOf(
                ConversationUiItem(
                    partner = UserProfile(
                        uid = "partner_sample",
                        userId = "839201",
                        name = "Mahal (M&H)",
                        email = "mahal@gmail.com",
                        online = true
                    ),
                    lastMessage = "Mahal kita always ❤️ I'm here for you.",
                    time = "10:42 PM",
                    unreadCount = 1
                )
            )
        }
        val pendingRequests = remember {
            mutableStateListOf(
                ChatRequestItem(
                    id = "req_1",
                    sender = UserProfile(
                        uid = "user_492018",
                        userId = "492018",
                        name = "Sweetheart M",
                        email = "sweetheart@gmail.com"
                    ),
                    time = "5m ago"
                )
            )
        }

        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (selectedTab) {
                NavigationTab.CHATS -> {
                    ChatsTabContent(
                        conversations = conversations,
                        onOpenChat = onOpenChat,
                        onGoToFind = { selectedTab = NavigationTab.FIND_USER }
                    )
                }
                NavigationTab.REQUESTS -> {
                    RequestsTabContent(
                        currentUser = currentUser,
                        requests = pendingRequests,
                        onAccept = { req ->
                            pendingRequests.remove(req)
                            val existing = conversations.find { it.partner.userId == req.sender.userId }
                            if (existing == null) {
                                conversations.add(
                                    ConversationUiItem(
                                        partner = req.sender,
                                        lastMessage = "Request accepted. Say hello!",
                                        time = "Just now",
                                        unreadCount = 0
                                    )
                                )
                            }
                            selectedTab = NavigationTab.CHATS
                        },
                        onReject = { req ->
                            pendingRequests.remove(req)
                        },
                        onGoToFind = { selectedTab = NavigationTab.FIND_USER }
                    )
                }
                NavigationTab.FIND_USER -> {
                    FindUserTabContent(
                        currentUser = currentUser,
                        onSendRequest = { partner ->
                            val alreadyConnected = conversations.any { it.partner.userId == partner.userId }
                            if (alreadyConnected) {
                                false
                            } else {
                                pendingRequests.add(
                                    ChatRequestItem(
                                        id = "req_${System.currentTimeMillis()}",
                                        sender = partner,
                                        time = "Just now"
                                    )
                                )
                                true
                            }
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

/* ==========================================================================
   4. TABS: CHATS, REQUESTS, FIND USER, PROFILE, SETTINGS
   ========================================================================== */

data class ConversationUiItem(
    val partner: UserProfile,
    var lastMessage: String,
    var time: String,
    var unreadCount: Int = 0
)

data class ChatRequestItem(
    val id: String,
    val sender: UserProfile,
    val time: String
)

@Composable
fun ChatsTabContent(
    conversations: List<ConversationUiItem>,
    onOpenChat: (UserProfile) -> Unit,
    onGoToFind: () -> Unit
) {
    if (conversations.isEmpty()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFE11D48).copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.ChatBubbleOutline,
                    contentDescription = null,
                    tint = Color(0xFFE11D48),
                    modifier = Modifier.size(36.dp)
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "No active conversations yet",
                color = Color.White,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Search for your partner's 6-digit User ID to connect and chat privately.",
                color = Color(0xFF94A3B8),
                fontSize = 13.sp,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(20.dp))
            Button(
                onClick = onGoToFind,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Find User by ID")
            }
        }
    } else {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Recent Conversations",
                        color = Color(0xFF94A3B8),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        "${conversations.size} active",
                        color = Color(0xFFE11D48),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            items(conversations) { conv ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onOpenChat(conv.partner) },
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(modifier = Modifier.size(50.dp)) {
                            Box(
                                modifier = Modifier
                                    .size(50.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFE11D48)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    conv.partner.name.take(1).uppercase(),
                                    color = Color.White,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            if (conv.partner.online) {
                                Box(
                                    modifier = Modifier
                                        .size(12.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF10B981))
                                        .align(Alignment.BottomEnd)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    conv.partner.name,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    conv.time,
                                    color = Color(0xFF64748B),
                                    fontSize = 11.sp
                                )
                            }

                            Spacer(modifier = Modifier.height(4.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    conv.lastMessage,
                                    color = Color(0xFF94A3B8),
                                    fontSize = 13.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f)
                                )

                                if (conv.unreadCount > 0) {
                                    Box(
                                        modifier = Modifier
                                            .size(20.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFFE11D48)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            conv.unreadCount.toString(),
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
    currentUser: UserProfile,
    requests: List<ChatRequestItem>,
    onAccept: (ChatRequestItem) -> Unit,
    onReject: (ChatRequestItem) -> Unit,
    onGoToFind: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Pending Chat Requests",
                color = Color.White,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                "${requests.size} pending",
                color = Color(0xFFFB7185),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        if (requests.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0xFF0F172A))
                    .padding(28.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.MailOutline,
                        contentDescription = null,
                        tint = Color(0xFF64748B),
                        modifier = Modifier.size(40.dp)
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = "No pending requests",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Share your User ID (${currentUser.userId}) with your partner",
                        color = Color(0xFF94A3B8),
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedButton(
                        onClick = onGoToFind,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFFB7185)),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Search a User ID")
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(requests) { req ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(44.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFFE11D48)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        req.sender.name.take(1).uppercase(),
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        req.sender.name,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp
                                    )
                                    Text(
                                        "User ID: ${req.sender.userId} • ${req.time}",
                                        color = Color(0xFF94A3B8),
                                        fontSize = 12.sp
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
}

@Composable
fun FindUserTabContent(
    currentUser: UserProfile,
    onSendRequest: (UserProfile) -> Boolean,
    onNavigateToRequests: () -> Unit
) {
    var searchId by remember { mutableStateOf("") }
    var resultUser by remember { mutableStateOf<UserProfile?>(null) }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var isError by remember { mutableStateOf(false) }

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
                modifier = Modifier.weight(1f),
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
                        resultUser = UserProfile(
                            uid = "partner_${searchId}",
                            userId = searchId,
                            name = "Partner ($searchId)",
                            email = "partner$searchId@gmail.com",
                            online = true
                        )
                        statusMessage = null
                        isError = false
                    } else {
                        statusMessage = "Please enter a valid 6-digit numeric ID."
                        isError = true
                        resultUser = null
                    }
                },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48)),
                modifier = Modifier.height(56.dp)
            ) {
                Text("Search")
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
                            val sent = onSendRequest(found)
                            if (sent) {
                                statusMessage = "Friend request sent to User ID ${found.userId}!"
                                isError = false
                                onNavigateToRequests()
                            } else {
                                statusMessage = "You are already connected to this user."
                                isError = true
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48)),
                        modifier = Modifier.fillMaxWidth(),
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
                            currentDisplayName = editNameInput.trim()
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
                Icon(Icons.Default.Edit, contentDescription = "Edit name", tint = Color(0xFF94A3B8), modifier = Modifier.size(18.dp))
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
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text(if (copied) "Copied!" else "Copy")
                }
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        Button(
            onClick = onLogout,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
            modifier = Modifier.fillMaxWidth(),
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
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("Log Out", color = Color(0xFFFB7185))
        }
    }
}

/* ==========================================================================
   5. REAL-TIME CHAT ROOM
   ========================================================================== */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatRoomScreen(
    currentUser: UserProfile,
    otherUser: UserProfile,
    onBack: () -> Unit
) {
    var messageText by remember { mutableStateOf("") }
    val messages = remember {
        mutableStateListOf(
            ChatMessage(
                id = "msg_init_1",
                senderId = otherUser.uid,
                receiverId = currentUser.uid,
                text = "Mahal kita always ❤️ I'm here for you.",
                timestamp = System.currentTimeMillis() - 3600000,
                seen = true
            )
        )
    }

    val timeFormatter = remember { SimpleDateFormat("h:mm a", Locale.getDefault()) }

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
                    IconButton(onClick = onBack) {
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
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    val emojis = listOf("❤️", "💌", "🥰", "🌹", "✨")
                    for (emoji in emojis) {
                        Text(
                            emoji,
                            modifier = Modifier
                                .clickable {
                                    messages.add(
                                        ChatMessage(
                                            id = "msg_${System.currentTimeMillis()}",
                                            senderId = currentUser.uid,
                                            receiverId = otherUser.uid,
                                            text = emoji,
                                            timestamp = System.currentTimeMillis(),
                                            seen = true
                                        )
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
                        modifier = Modifier.weight(1f),
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
                                messages.add(
                                    ChatMessage(
                                        id = "msg_${System.currentTimeMillis()}",
                                        senderId = currentUser.uid,
                                        receiverId = otherUser.uid,
                                        text = messageText.trim(),
                                        timestamp = System.currentTimeMillis(),
                                        seen = true
                                    )
                                )
                                messageText = ""
                            }
                        },
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFE11D48))
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
                items(messages) { msg ->
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
