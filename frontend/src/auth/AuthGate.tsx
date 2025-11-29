import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { auth, signInWithGoogle, signInWithEmail, signUpWithEmail, logout, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { FiCalendar } from "react-icons/fi";
import { LuTrophy, LuUsers, LuLoader, LuMail, LuLock, LuUser, LuLogOut, LuUserCog } from "react-icons/lu";
import { AuthContext } from "./AuthContext";

// Google icon SVG
const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// Loading spinner
const LoadingSpinner = () => (
  <div className="flex flex-col items-center gap-3">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    <p className="text-tiny text-text-muted">Loading your league...</p>
  </div>
);

// Login screen component
const LoginScreen: React.FC = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!displayName.trim()) {
          setError("Please enter your name");
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, displayName.trim());
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      // Clean up Firebase error messages
      if (message.includes("auth/email-already-in-use")) {
        setError("This email is already registered. Please sign in instead.");
      } else if (message.includes("auth/weak-password")) {
        setError("Password should be at least 6 characters.");
      } else if (message.includes("auth/invalid-email")) {
        setError("Please enter a valid email address.");
      } else if (message.includes("auth/invalid-credential")) {
        setError("Invalid email or password.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-sm w-full">
        <div className="bg-surface rounded-lg shadow-card border border-border/40 p-5">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-3">
              <span className="text-white font-bold text-lg">3</span>
            </div>
            <h1 className="text-section-title text-text-primary mb-1">
              three<span className="text-primary">man</span>league
            </h1>
            <p className="text-body-sm text-text-secondary">Fantasy football pick 'em game</p>
          </div>

          {error && (
            <div className="mb-3 p-2 bg-danger/10 border border-danger/20 rounded-md text-tiny text-danger">{error}</div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-2.5">
            {mode === "signup" && (
              <div>
                <label className="flex items-center gap-1 text-tiny text-text-muted mb-1">
                  <LuUser className="w-3 h-3" /> Name
                </label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name"
                  className="w-full px-2.5 py-1.5 bg-surface border border-border/40 rounded-md text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary" required />
              </div>
            )}
            <div>
              <label className="flex items-center gap-1 text-tiny text-text-muted mb-1">
                <LuMail className="w-3 h-3" /> Email
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full px-2.5 py-1.5 bg-surface border border-border/40 rounded-md text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary" required />
            </div>
            <div>
              <label className="flex items-center gap-1 text-tiny text-text-muted mb-1">
                <LuLock className="w-3 h-3" /> Password
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full px-2.5 py-1.5 bg-surface border border-border/40 rounded-md text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary" required minLength={6} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-md text-body-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">
              {loading ? <LuLoader className="w-3.5 h-3.5 animate-spin" /> : null}
              {mode === "signup" ? "Create Account" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-tiny text-text-muted mt-3">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} className="text-primary hover:underline font-medium">
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-tiny text-text-muted">or</span>
            <div className="flex-1 h-px bg-border/40" />
          </div>

          <button onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-surface border border-border/40 rounded-md text-body-sm font-medium text-text-primary hover:bg-subtle hover:border-border transition-all">
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="flex flex-col items-center">
                <FiCalendar className="w-4 h-4 text-primary mb-0.5" />
                <p className="text-tiny text-text-muted">Weekly Picks</p>
              </div>
              <div className="flex flex-col items-center">
                <LuTrophy className="w-4 h-4 text-primary mb-0.5" />
                <p className="text-tiny text-text-muted">Compete</p>
              </div>
              <div className="flex flex-col items-center">
                <LuUsers className="w-4 h-4 text-primary mb-0.5" />
                <p className="text-tiny text-text-muted">Join Leagues</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-tiny text-text-subtle mt-4">
          By signing in, you agree to participate in the league and its rules.
        </p>
      </div>
    </div>
  );
};

// User menu dropdown component
const UserMenu: React.FC<{ user: User }> = ({ user }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <div ref={menuRef} className="relative">
      <button onClick={() => setOpen(!open)} aria-label="User menu" aria-expanded={open}
        className="flex items-center gap-1.5 p-1 rounded-md hover:bg-subtle transition-colors">
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName || "User"} className="w-7 h-7 rounded-full object-cover border border-border/40" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center text-tiny font-semibold">{initials}</div>
        )}
        <svg className={`w-3 h-3 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-surface rounded-lg shadow-dropdown border border-border/40 animate-fade-in z-50">
          <div className="px-3 py-2 border-b border-border/30">
            <p className="text-body-sm font-medium text-text-primary truncate">{user.displayName || "Player"}</p>
            <p className="text-tiny text-text-muted truncate">{user.email}</p>
          </div>
          <div className="p-1 space-y-0.5">
            <Link to="/profile" onClick={() => setOpen(false)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-body-sm text-text-secondary hover:text-text-primary hover:bg-subtle rounded-md transition-colors">
              <LuUserCog className="w-3.5 h-3.5" /> Edit Profile
            </Link>
            <button onClick={logout}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-body-sm text-text-secondary hover:text-text-primary hover:bg-subtle rounded-md transition-colors">
              <LuLogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);

      // Sync user profile to Firestore on sign-in
      if (u) {
        try {
          await setDoc(doc(db, "users", u.uid), {
            displayName: u.displayName || "Unknown",
            email: u.email || "",
            photoURL: u.photoURL || "",
            lastSignIn: new Date(),
          }, { merge: true });
        } catch {
          // Silently fail - user doc creation is not critical
        }
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Authenticated state - provide user context to children
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export { UserMenu };

