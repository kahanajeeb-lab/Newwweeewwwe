package com.example.ui

import android.app.Activity
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import com.example.model.UserProfile
import com.example.repository.FirebaseRepository
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.launch

@Composable
fun AuthScreen(
    onSuccess: (UserProfile) -> Unit,
    onBackToCalculator: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val auth = remember { FirebaseAuth.getInstance() }
    val credentialManager = remember { CredentialManager.create(context) }

    var loading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // Google Web Client ID for Firebase project chat-7305d
    val googleWebClientId = "68083133837-h87j0kflsmh1n84t2e3o7v7k6p4e7u8k.apps.googleusercontent.com"

    fun handleFirebaseUser(firebaseUser: com.google.firebase.auth.FirebaseUser) {
        FirebaseRepository.createOrLoadUserProfile(firebaseUser) { profile ->
            loading = false
            onSuccess(profile)
        }
    }

    fun initiateGoogleSignIn() {
        loading = true
        errorMessage = null

        coroutineScope.launch {
            try {
                val googleIdOption = GetGoogleIdOption.Builder()
                    .setFilterByAuthorizedAccounts(false)
                    .setServerClientId(googleWebClientId)
                    .setAutoSelectEnabled(false)
                    .build()

                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build()

                val activity = context as? Activity
                if (activity == null) {
                    loading = false
                    errorMessage = "Context is not an Activity. Unable to launch Google Sign-In."
                    return@launch
                }

                val result = credentialManager.getCredential(
                    request = request,
                    context = activity
                )

                val credential = result.credential
                if (credential is CustomCredential &&
                    credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                ) {
                    val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                    val idToken = googleIdTokenCredential.idToken
                    val authCredential = GoogleAuthProvider.getCredential(idToken, null)

                    auth.signInWithCredential(authCredential)
                        .addOnCompleteListener { task ->
                            if (task.isSuccessful) {
                                val user = auth.currentUser
                                if (user != null) {
                                    handleFirebaseUser(user)
                                } else {
                                    loading = false
                                    errorMessage = "Authentication failed: No user returned."
                                }
                            } else {
                                loading = false
                                errorMessage = task.exception?.localizedMessage ?: "Google Sign-In failed."
                            }
                        }
                } else {
                    loading = false
                    errorMessage = "Unexpected credential received from Google provider."
                }
            } catch (e: GetCredentialException) {
                loading = false
                errorMessage = "Google Sign-In: ${e.localizedMessage}"
            } catch (e: Exception) {
                loading = false
                errorMessage = e.localizedMessage ?: "Google Sign-In failed."
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF020617))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Top lock back to calculator
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp),
            horizontalArrangement = Arrangement.Start
        ) {
            IconButton(
                onClick = onBackToCalculator,
                modifier = Modifier
                    .clip(CircleShape)
                    .background(Color(0xFF0F172A))
                    .testTag("auth_back_to_calculator")
            ) {
                Icon(
                    Icons.Default.ArrowBack,
                    contentDescription = "Back to Calculator",
                    tint = Color(0xFF94A3B8)
                )
            }
        }

        // Branding and Google Sign-In Only
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(
                modifier = Modifier
                    .size(88.dp)
                    .clip(RoundedCornerShape(26.dp))
                    .background(Color(0xFFE11D48)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Favorite,
                    contentDescription = "Love",
                    tint = Color.White,
                    modifier = Modifier.size(44.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

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

            errorMessage?.let { err ->
                Spacer(modifier = Modifier.height(16.dp))
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF4C0519)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = err,
                        color = Color(0xFFFECDD3),
                        fontSize = 12.sp,
                        modifier = Modifier.padding(14.dp),
                        textAlign = TextAlign.Center
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            Button(
                onClick = { initiateGoogleSignIn() },
                enabled = !loading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .testTag("google_login_button"),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White)
            ) {
                if (loading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color(0xFF1E293B))
                } else {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.AccountCircle,
                            contentDescription = "Google",
                            tint = Color(0xFF4285F4),
                            modifier = Modifier.size(26.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Sign in with Google",
                            color = Color(0xFF1E293B),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(bottom = 12.dp)
        ) {
            Text(
                text = "Firebase Project: chat-7305d",
                color = Color(0xFF64748B),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "End-to-End Encrypted via Realtime Database",
                color = Color(0xFF475569),
                fontSize = 11.sp
            )
        }
    }
}
