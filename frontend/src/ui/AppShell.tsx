import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { UserMenu } from "../auth/AuthGate";
import { LeagueSwitcher } from "../league/LeagueSwitcher";
import { LuSettings, LuClipboardCheck, LuTrophy, LuBookOpen, LuMenu, LuX } from "react-icons/lu";

const navItems = [
  { to: "/picks", label: "Picks", icon: LuClipboardCheck },
  { to: "/standings", label: "Standings", icon: LuTrophy },
  { to: "/league-settings", label: "Settings", icon: LuSettings },
  { to: "/rules", label: "Rules", icon: LuBookOpen },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  React.useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-container mx-auto px-4 sm:px-5">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <NavLink to="/" className="flex items-center gap-1.5 group">
                <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shadow-sm">
                  <span className="text-white font-semibold text-xs">3</span>
                </div>
                <span className="hidden sm:inline text-body font-semibold text-text-primary tracking-tight">
                  three<span className="text-primary">man</span>
                </span>
              </NavLink>
              <div className="hidden sm:block h-3.5 w-px bg-border/60" />
              <LeagueSwitcher />
            </div>

            <nav className="hidden md:flex items-center">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-1 px-2.5 py-1 mx-0.5 rounded-button text-body-sm font-medium transition-all duration-100 ${
                        isActive ? "text-primary bg-primary-soft/80" : "text-text-muted hover:text-text-primary hover:bg-subtle"
                      }`
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="hidden md:block">{user && <UserMenu user={user} />}</div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 -mr-1 rounded-button text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <LuX className="w-4.5 h-4.5" /> : <LuMenu className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/40 bg-white animate-slide-down">
            <nav className="max-w-container mx-auto px-3 py-2 space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-2.5 py-2 rounded-button text-body-sm font-medium transition-colors ${
                        isActive ? "bg-primary-soft/80 text-primary" : "text-text-secondary hover:text-text-primary hover:bg-subtle"
                      }`
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
              {user && (
                <div className="mt-2 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-2 px-2.5 py-1.5">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center text-tiny font-semibold">
                        {user.displayName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium text-text-primary truncate">{user.displayName || "Player"}</p>
                      <p className="text-tiny text-text-muted truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <div className="max-w-container mx-auto px-4 sm:px-5 py-4 sm:py-5">{children}</div>
      </main>

      <footer className="border-t border-border/40 bg-white/80">
        <div className="max-w-container mx-auto px-4 sm:px-5 py-3">
          <div className="flex items-center justify-between text-tiny text-text-muted">
            <div className="flex items-center gap-1">
              <div className="w-3.5 h-3.5 bg-primary rounded-sm flex items-center justify-center">
                <span className="text-white font-semibold text-[7px]">3</span>
              </div>
              <span>© 2025 Three-Man League</span>
            </div>
            <span className="text-text-subtle hidden sm:inline">Fantasy Football Pick 'Em</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

