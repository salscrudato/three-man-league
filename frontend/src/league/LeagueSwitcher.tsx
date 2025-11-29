import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLeague } from "./LeagueContext";
import { LuChevronDown, LuPlus, LuUsers, LuCheck, LuSettings } from "react-icons/lu";

export const LeagueSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const { activeLeague, userLeagues, loading, loadingLeagues, setActiveLeague, userRole } = useLeague();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading || loadingLeagues) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-subtle/60 rounded-md animate-pulse">
        <div className="w-3 h-3 bg-border/60 rounded" />
        <div className="w-16 h-3 bg-border/60 rounded" />
      </div>
    );
  }

  if (userLeagues.length === 0) {
    return (
      <div className="flex items-center gap-1">
        <button onClick={() => navigate("/create-league")}
          className="flex items-center gap-1 px-2 py-1 bg-primary text-white rounded-md text-body-sm font-medium hover:bg-primary-hover transition-colors">
          <LuPlus className="w-3 h-3" /> Create
        </button>
        <button onClick={() => navigate("/join")}
          className="flex items-center gap-1 px-2 py-1 bg-subtle/60 text-text-secondary rounded-md text-body-sm font-medium hover:bg-border transition-colors">
          <LuUsers className="w-3 h-3" /> Join
        </button>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 bg-subtle/60 hover:bg-border/60 rounded-md transition-colors">
        <LuUsers className="w-3 h-3 text-primary" />
        <span className="text-body-sm font-medium text-text-primary max-w-[100px] truncate">{activeLeague?.name || "Select League"}</span>
        <LuChevronDown className={`w-3 h-3 text-text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-lg shadow-dropdown border border-border/40 animate-fade-in z-50">
          <div className="max-h-48 overflow-y-auto py-0.5">
            {userLeagues.map((league) => (
              <button key={league.id} onClick={() => { setActiveLeague(league.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-subtle transition-colors text-left ${league.id === activeLeague?.id ? "bg-primary-soft" : ""}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-text-primary truncate">{league.name}</p>
                  <p className="text-tiny text-text-muted">{league.memberCount} members</p>
                </div>
                {league.id === activeLeague?.id && <LuCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            ))}
          </div>

          <div className="border-t border-border/30 p-1">
            {userRole === "owner" && activeLeague && (
              <button onClick={() => { navigate("/league-settings"); setOpen(false); }}
                className="w-full flex items-center gap-1.5 px-2 py-1 text-body-sm text-text-secondary hover:text-text-primary hover:bg-subtle rounded-md transition-colors">
                <LuSettings className="w-3 h-3" /> Settings
              </button>
            )}
            <button onClick={() => { navigate("/create-league"); setOpen(false); }}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-body-sm text-text-secondary hover:text-text-primary hover:bg-subtle rounded-md transition-colors">
              <LuPlus className="w-3 h-3" /> Create League
            </button>
            <button onClick={() => { navigate("/join"); setOpen(false); }}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-body-sm text-text-secondary hover:text-text-primary hover:bg-subtle rounded-md transition-colors">
              <LuUsers className="w-3 h-3" /> Join League
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

