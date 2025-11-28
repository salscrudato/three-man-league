import React, { useEffect, useState, useRef } from "react";
import { auth, signInWithGoogle, logout } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { FiCalendar } from "react-icons/fi";
import { LuTrophy, LuBot } from "react-icons/lu";
import { AuthContext } from "./AuthContext";

// Google icon SVG
const GoogleIcon = () => (
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
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// Loading spinner
const LoadingSpinner = () => (
  <div className="flex flex-col items-center gap-4">
    <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    <p className="text-body-sm text-text-muted">Loading your league...</p>
  </div>
);

// User menu dropdown component
const UserMenu: React.FC<{ user: User }> = ({ user }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1.5 rounded-button hover:bg-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="User menu"
        aria-expanded={open}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || "User"}
            className="w-8 h-8 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center text-caption font-semibold">
            {initials}
          </div>
        )}
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-surface rounded-card shadow-dropdown border border-border animate-fade-in z-50">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-body-sm font-medium text-text-primary truncate">
              {user.displayName || "Player"}
            </p>
            <p className="text-caption text-text-muted truncate">{user.email}</p>
          </div>
          <div className="p-2">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-text-secondary hover:text-text-primary hover:bg-subtle rounded-button transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
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
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
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
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-4">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-md w-full">
          {/* Login card */}
          <div className="bg-surface rounded-card shadow-modal border border-border p-8">
            {/* Logo and title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
                <span className="text-white font-bold text-2xl">3</span>
              </div>
              <h1 className="text-page-title text-text-primary mb-2">
                three<span className="text-primary">man</span>league
              </h1>
              <p className="text-body text-text-secondary">
                Fantasy football pick 'em game. Pick one QB, RB, and WR each week.
                Use each player only once per season.
              </p>
            </div>

            {/* Sign in button */}
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-surface border border-border rounded-button font-medium text-text-primary hover:bg-subtle hover:border-border-strong transition-all duration-150 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            {/* Features preview */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center">
                  <FiCalendar className="w-6 h-6 text-primary mb-1" />
                  <p className="text-caption text-text-muted">Weekly Picks</p>
                </div>
                <div className="flex flex-col items-center">
                  <LuTrophy className="w-6 h-6 text-primary mb-1" />
                  <p className="text-caption text-text-muted">$3,450 Pot</p>
                </div>
                <div className="flex flex-col items-center">
                  <LuBot className="w-6 h-6 text-primary mb-1" />
                  <p className="text-caption text-text-muted">AI Advisor</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer text */}
          <p className="text-center text-caption text-text-subtle mt-6">
            By signing in, you agree to participate in the league and its rules.
          </p>
        </div>
      </div>
    );
  }

  // Authenticated state - provide user context to children
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export { UserMenu };

