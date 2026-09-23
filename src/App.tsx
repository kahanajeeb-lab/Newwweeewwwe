import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, createOrLoadUserProfile } from './firebase';
import { UserProfile } from './types';
import { CalculatorScreen } from './components/CalculatorScreen';
import { AuthScreen } from './components/AuthScreen';
import { MainScreen } from './components/MainScreen';

type ScreenState = 'CALCULATOR' | 'AUTH' | 'CHAT';

export const App: React.FC = () => {
  // Screen state starts strictly at CALCULATOR on launch
  const [screenState, setScreenState] = useState<ScreenState>('CALCULATOR');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Monitor Firebase Auth state silently in background
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await createOrLoadUserProfile(firebaseUser);
          setCurrentUser(profile);
        } catch (e) {
          console.error("Failed to load profile on auth change:", e);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Triggered when user enters 2580 and presses '=' on Calculator
   */
  const handleUnlockSecret = () => {
    if (currentUser) {
      // Already authenticated, proceed directly to chat
      setScreenState('CHAT');
    } else {
      // Not yet authenticated, show Google Login screen
      setScreenState('AUTH');
    }
  };

  /**
   * Triggered on successful Google / Firebase authentication
   */
  const handleAuthSuccess = (profile: UserProfile) => {
    setCurrentUser(profile);
    setScreenState('CHAT');
  };

  /**
   * Quick lock back to disguise calculator
   */
  const handleLockToCalculator = () => {
    setScreenState('CALCULATOR');
  };

  /**
   * Log out of Firebase and lock back to calculator
   */
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Error signing out:", e);
    }
    setCurrentUser(null);
    setScreenState('CALCULATOR');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
      <div className="w-full max-w-md h-screen relative bg-slate-950 overflow-hidden shadow-2xl">
        {screenState === 'CALCULATOR' && (
          <CalculatorScreen onUnlockSecret={handleUnlockSecret} />
        )}

        {screenState === 'AUTH' && (
          <AuthScreen
            onSuccess={handleAuthSuccess}
            onBackToCalculator={handleLockToCalculator}
          />
        )}

        {screenState === 'CHAT' && currentUser && (
          <MainScreen
            currentUser={currentUser}
            onUpdateProfile={(updated) => setCurrentUser(updated)}
            onLogout={handleLogout}
            onLockToCalculator={handleLockToCalculator}
          />
        )}
      </div>
    </div>
  );
};

export default App;
