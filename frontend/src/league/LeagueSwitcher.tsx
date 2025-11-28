/**
 * League Switcher - Dropdown to switch between leagues
 */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLeague } from "./LeagueContext";
import { LuChevronDown, LuPlus, LuUsers, LuCheck, LuSettings } from "react-icons/lu";

export const LeagueSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const { activeLeague, userLeagues, loading, loadingLeagues, setActiveLeague, userRole } = useLeague();
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

  if (loading || loadingLeagues) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-subtle rounded-button animate-pulse">
        <div className="w-4 h-4 bg-border rounded" />
        <div className="w-24 h-4 bg-border rounded" />
      </div>
    );
  }

  // No leagues - show create/join prompt
  if (userLeagues.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/create-league")}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-button text-body-sm font-medium hover:bg-primary-hover transition-colors"
        >
          <LuPlus className="w-4 h-4" />
          Create League
        </button>
        <button
          onClick={() => navigate("/join")}
          className="flex items-center gap-2 px-3 py-2 bg-subtle text-text-secondary rounded-button text-body-sm font-medium hover:bg-border transition-colors"
        >
          <LuUsers className="w-4 h-4" />
          Join
        </button>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-subtle hover:bg-border rounded-button transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="Switch league"
        aria-expanded={open}
      >
        <LuUsers className="w-4 h-4 text-primary" />
        <span className="text-body-sm font-medium text-text-primary max-w-[150px] truncate">
          {activeLeague?.name || "Select League"}
        </span>
        <LuChevronDown className={`w-4 h-4 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-surface rounded-card shadow-dropdown border border-border animate-fade-in z-50">
          {/* League list */}
          <div className="max-h-64 overflow-y-auto">
            {userLeagues.map((league) => (
              <button
                key={league.id}
                onClick={() => {
                  setActiveLeague(league.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-subtle transition-colors text-left ${
                  league.id === activeLeague?.id ? "bg-primary-soft" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-text-primary truncate">
                    {league.name}
                  </p>
                  <p className="text-caption text-text-muted">
                    {league.memberCount} members • {league.season}
                  </p>
                </div>
                {league.id === activeLeague?.id && (
                  <LuCheck className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="border-t border-border p-2">
            {userRole === "owner" && activeLeague && (
              <button
                onClick={() => {
                  navigate("/league-settings");
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-text-secondary hover:text-text-primary hover:bg-subtle rounded-button transition-colors"
              >
                <LuSettings className="w-4 h-4" />
                League Settings
              </button>
            )}
            <button
              onClick={() => {
                navigate("/create-league");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-text-secondary hover:text-text-primary hover:bg-subtle rounded-button transition-colors"
            >
              <LuPlus className="w-4 h-4" />
              Create New League
            </button>
            <button
              onClick={() => {
                navigate("/join");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-text-secondary hover:text-text-primary hover:bg-subtle rounded-button transition-colors"
            >
              <LuUsers className="w-4 h-4" />
              Join a League
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

