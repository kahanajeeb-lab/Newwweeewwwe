import React, { useState } from 'react';
import { 
  signInWithPopup, 
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth, googleProvider, createOrLoadUserProfile } from '../firebase';
import { UserProfile } from '../types';
import { Lock, Heart, Shield, ArrowLeft, AlertCircle, Mail, KeyRound } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (profile: UserProfile) => void;
  onBackToCalculator: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onBackToCalculator }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useEmailFallback, setUseEmailFallback] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      // Primary authentication method: Google Sign-In
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const profile = await createOrLoadUserProfile(result.user);
        onSuccess(profile);
      }
    } catch (err: any) {
      console.warn("Google Sign-In Popup failed or blocked:", err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in popup was closed or blocked. Try again or use Email sign-in below.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`Firebase Auth domain not authorized: Please add '${window.location.hostname}' to Firebase Console > Authentication > Settings > Authorized domains.`);
      } else {
        setError(err.message || "Failed to authenticate with Google. You can also sign in below.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let user;
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        user = cred.user;
        if (displayName && user) {
          // Temporarily attach name
          (user as any).displayName = displayName;
        }
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
      }

      if (user) {
        const profile = await createOrLoadUserProfile(user);
        onSuccess(profile);
      }
    } catch (err: any) {
      console.error("Email auth error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Invalid email or password. If you don't have an account, switch to Register.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Email already in use. Please sign in instead.");
      } else {
        setError(err.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-950 text-slate-100 p-6 justify-between select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-2">
        <button 
          onClick={onBackToCalculator}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full"
        >
          <ArrowLeft size={14} />
          <span>Calculator</span>
        </button>
        <div className="flex items-center gap-1 text-rose-500 font-semibold text-xs tracking-wider uppercase">
          <Shield size={14} />
          <span>End-to-End Vault</span>
        </div>
      </div>

      {/* Main Branding Header */}
      <div className="my-auto py-8 text-center flex flex-col items-center">
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-rose-700 to-rose-400 flex items-center justify-center shadow-xl shadow-rose-950/60 ring-4 ring-rose-500/20">
            <Heart size={38} className="text-white fill-white animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-slate-900 border-2 border-slate-950 p-1 rounded-full text-rose-400 shadow">
            <Lock size={14} />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          Mahal Kita <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-300">M&H</span>
        </h1>
        <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
          Private, encrypted real-time communications for two souls. Connect via unique 6-digit User IDs.
        </p>

        {error && (
          <div className="w-full mt-6 p-3.5 bg-rose-950/60 border border-rose-800 text-rose-200 rounded-xl text-xs flex items-start gap-2.5 text-left animate-in fade-in">
            <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Primary Google Login Button */}
        {!useEmailFallback ? (
          <div className="w-full mt-8 space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-14 bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-900 font-semibold rounded-2xl flex items-center justify-center gap-3.5 shadow-lg shadow-black/40 transition-all border border-slate-200 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Authenticating...' : 'Continue with Google'}</span>
            </button>

            <button
              onClick={() => { setUseEmailFallback(true); setError(null); }}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <Mail size={14} />
              <span>Or sign in with email</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailAuth} className="w-full mt-6 space-y-3.5 text-left">
            {isRegistering && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Your Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Hamza / M&H"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Email / Gmail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition-all disabled:opacity-50 mt-2"
            >
              <KeyRound size={16} />
              <span>{loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Sign In')}</span>
            </button>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-rose-400 hover:underline"
              >
                {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register'}
              </button>
              <button
                type="button"
                onClick={() => { setUseEmailFallback(false); setError(null); }}
                className="text-slate-400 hover:text-slate-200"
              >
                Use Google
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-[11px] text-slate-500 pb-2">
        Protected by Firebase Authentication & Realtime Database.
      </div>
    </div>
  );
};
