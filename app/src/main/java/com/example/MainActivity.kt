package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.example.model.ScreenState
import com.example.model.UserProfile
import com.example.repository.FirebaseRepository
import com.example.ui.AuthScreen
import com.example.ui.CalculatorScreen
import com.example.ui.ChatRoomScreen
import com.example.ui.MainChatScreen
import com.example.ui.theme.MyApplicationTheme
import com.google.firebase.auth.FirebaseAuth

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
    var currentUser by remember { mutableStateOf<UserProfile?>(null) }
    var activeChatUser by remember { mutableStateOf<UserProfile?>(null) }
    var isLoadingProfile by remember { mutableStateOf(false) }

    val auth = remember { FirebaseAuth.getInstance() }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF0F172A)
    ) {
        when (screenState) {
            ScreenState.CALCULATOR -> {
                CalculatorScreen(
                    onUnlock = {
                        val firebaseUser = auth.currentUser
                        if (firebaseUser != null) {
                            if (currentUser != null) {
                                screenState = ScreenState.MAIN_APP
                            } else {
                                isLoadingProfile = true
                                FirebaseRepository.createOrLoadUserProfile(firebaseUser) { profile ->
                                    currentUser = profile
                                    isLoadingProfile = false
                                    screenState = ScreenState.MAIN_APP
                                }
                            }
                        } else {
                            screenState = ScreenState.AUTH
                        }
                    }
                )
                if (isLoadingProfile) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = Color(0xFFE11D48))
                    }
                }
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
                            FirebaseRepository.setOnlineStatus(user.uid, false)
                            auth.signOut()
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
