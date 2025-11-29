/**
 * League Settings Page - Manage league settings (owner only)
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useLeague } from "../../league/LeagueContext";
import { apiPost, getErrorMessage } from "../../lib/api";
import { mapLeagueMember, mapDocs } from "../../lib/firestore";
import { LuArrowLeft, LuCopy, LuCheck, LuRefreshCw, LuUsers, LuSettings, LuDollarSign, LuLock, LuLockOpen, LuCalendar, LuChevronRight, LuGlobe, LuEye, LuEyeOff } from "react-icons/lu";
import type { LeagueMember } from "../../types";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";

export const LeagueSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeLeague, activeLeagueId, userRole, refreshActiveLeague } = useLeague();
  
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Editable fields
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [membershipLocked, setMembershipLocked] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);

  // Load members
  useEffect(() => {
    const loadMembers = async () => {
      if (!activeLeagueId) return;
      
      try {
        setLoadingMembers(true);
        const membersRef = collection(db, "leagues", activeLeagueId, "members");
        const q = query(membersRef, where("isActive", "==", true));
        const snap = await getDocs(q);
        
        const memberList = mapDocs(snap.docs, mapLeagueMember);

        setMembers(memberList.sort((a, b) => {
          // Owner first, then by name
          if (a.role === "owner") return -1;
          if (b.role === "owner") return 1;
          return a.displayName.localeCompare(b.displayName);
        }));
      } catch (err) {
        console.error("Error loading members:", err);
      } finally {
        setLoadingMembers(false);
      }
    };
    
    loadMembers();
  }, [activeLeagueId]);

  // Initialize editable fields
  useEffect(() => {
    if (activeLeague) {
      setNewName(activeLeague.name);
      setMembershipLocked(activeLeague.membershipLocked || false);
      setIsPublic(activeLeague.isPublic ?? true);
      setPasscode(activeLeague.passcode || "");
    }
  }, [activeLeague]);

  if (userRole !== "owner") {
    return (
      <div className="max-w-xs mx-auto text-center py-6">
        <LuLock className="w-8 h-8 text-text-muted mx-auto mb-2" />
        <h1 className="text-body-sm font-semibold text-text-primary mb-0.5">Access Denied</h1>
        <p className="text-tiny text-text-secondary mb-3">Only the league owner can access settings.</p>
        <button onClick={() => navigate(-1)} className="px-3 py-1.5 bg-primary text-white rounded-md text-body-sm font-medium hover:bg-primary-hover transition-colors">Go Back</button>
      </div>
    );
  }

  if (!activeLeague) {
    return <div className="max-w-xs mx-auto text-center py-6"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>;
  }

  const handleCopyCode = async () => {
    if (activeLeague.joinCode) {
      await navigator.clipboard.writeText(activeLeague.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    if (!user || !activeLeagueId) return;

    setRegenerating(true);
    setError(null);

    try {
      await apiPost("/regenerateJoinCode", { leagueId: activeLeagueId }, user);
      await refreshActiveLeague();
      setSuccessMessage("Join code regenerated!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveName = async () => {
    if (!user || !activeLeagueId || newName.trim() === activeLeague.name) {
      setEditingName(false);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiPost("/updateLeagueSettings", { leagueId: activeLeagueId, name: newName.trim() }, user);
      await refreshActiveLeague();
      setEditingName(false);
      setSuccessMessage("League name updated!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMembershipLock = async () => {
    if (!user || !activeLeagueId) return;

    setSaving(true);
    setError(null);

    try {
      await apiPost("/updateLeagueSettings", { leagueId: activeLeagueId, membershipLocked: !membershipLocked }, user);
      setMembershipLocked(!membershipLocked);
      await refreshActiveLeague();
      setSuccessMessage(membershipLocked ? "League is now open for new members" : "League is now locked");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublic = async () => {
    if (!user || !activeLeagueId) return;

    // If making private, require a passcode
    if (isPublic && !passcode) {
      setError("Please set a passcode before making the league private");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiPost("/updateLeagueSettings", {
        leagueId: activeLeagueId,
        isPublic: !isPublic,
        passcode: !isPublic ? undefined : passcode, // Include passcode when making private
      }, user);
      setIsPublic(!isPublic);
      await refreshActiveLeague();
      setSuccessMessage(isPublic ? "League is now private" : "League is now public");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePasscode = async () => {
    if (!user || !activeLeagueId) return;

    if (passcode.length < 4) {
      setError("Passcode must be at least 4 characters");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiPost("/updateLeagueSettings", { leagueId: activeLeagueId, passcode }, user);
      await refreshActiveLeague();
      setSuccessMessage("Passcode updated!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-tiny text-text-secondary hover:text-text-primary mb-2">
          <LuArrowLeft className="w-3 h-3" /> Back
        </button>
        <h1 className="text-section-title text-text-primary">League Settings</h1>
        <p className="text-tiny text-text-muted mt-0.5">{activeLeague.name}</p>
      </div>

      {error && <div className="mb-3 p-2 bg-error-soft border border-error/20 rounded-md text-error text-tiny">{error}</div>}
      {successMessage && <div className="mb-3 p-2 bg-success/10 border border-success/20 rounded-md text-success text-tiny">{successMessage}</div>}

      <div className="space-y-3">
        <div className="bg-white rounded-lg border border-border/40 p-3">
          <div className="flex items-center gap-1 mb-2">
            <LuSettings className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-body-sm font-medium text-text-primary">General</h2>
          </div>
          <div className="space-y-2">
            <div>
              <label className="block text-tiny font-medium text-text-primary mb-1">Name</label>
              {editingName ? (
                <div className="flex gap-1.5">
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 px-2 py-1 bg-white border border-border/40 rounded-md text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary" maxLength={50} autoFocus />
                  <button onClick={handleSaveName} disabled={saving || newName.trim().length < 2} className="px-2 py-1 bg-primary text-white rounded-md text-tiny font-medium hover:bg-primary-hover disabled:opacity-50">{saving ? "..." : "Save"}</button>
                  <button onClick={() => { setEditingName(false); setNewName(activeLeague.name); }} className="px-2 py-1 bg-subtle text-text-secondary rounded-md text-tiny font-medium hover:bg-border">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-text-primary">{activeLeague.name}</span>
                  <button onClick={() => setEditingName(true)} className="text-tiny text-primary hover:text-primary-hover font-medium">Edit</button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div>
                <p className="text-tiny font-medium text-text-primary">Lock Membership</p>
                <p className="text-tiny text-text-muted">Prevent new members</p>
              </div>
              <button onClick={handleToggleMembershipLock} disabled={saving}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-tiny font-medium ${membershipLocked ? "bg-warning/10 text-warning" : "bg-subtle text-text-secondary hover:bg-border"}`}>
                {membershipLocked ? <LuLock className="w-3 h-3" /> : <LuLockOpen className="w-3 h-3" />}
                {membershipLocked ? "Locked" : "Open"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border/40 p-3">
          <div className="flex items-center gap-1 mb-2">
            <LuGlobe className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-body-sm font-medium text-text-primary">Visibility</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tiny font-medium text-text-primary">{isPublic ? "Public" : "Private"}</p>
                <p className="text-tiny text-text-secondary">{isPublic ? "Anyone can join" : "Passcode required"}</p>
              </div>
              <button onClick={handleTogglePublic} disabled={saving || (!isPublic && !passcode)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-tiny font-medium ${isPublic ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                {isPublic ? <LuGlobe className="w-3 h-3" /> : <LuLock className="w-3 h-3" />}
                {isPublic ? "Public" : "Private"}
              </button>
            </div>
            {!isPublic && (
              <div>
                <label className="block text-tiny font-medium text-text-primary mb-1">Passcode</label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input type={showPasscode ? "text" : "password"} value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Enter passcode"
                      className="w-full px-2 py-1 bg-white border border-border/40 rounded-md text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary pr-7" maxLength={20} />
                    <button type="button" onClick={() => setShowPasscode(!showPasscode)} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                      {showPasscode ? <LuEyeOff className="w-3 h-3" /> : <LuEye className="w-3 h-3" />}
                    </button>
                  </div>
                  <button onClick={handleSavePasscode} disabled={saving || passcode.length < 4} className="px-2 py-1 bg-primary text-white rounded-md text-tiny font-medium hover:bg-primary-hover disabled:opacity-50">{saving ? "..." : "Save"}</button>
                </div>
                <p className="mt-0.5 text-tiny text-text-muted">Share with invitees.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border/40 p-3">
          <div className="flex items-center gap-1 mb-2">
            <LuUsers className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-body-sm font-medium text-text-primary">Invite</h2>
          </div>
          <div>
            <label className="block text-tiny font-medium text-text-primary mb-1">Join Code</label>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 px-2.5 py-1.5 bg-subtle/60 border border-border/30 rounded-md text-center text-body-sm font-mono font-semibold text-primary tracking-widest">{activeLeague.joinCode}</code>
              <button onClick={handleCopyCode} className="p-1.5 bg-subtle/60 border border-border/30 rounded-md hover:bg-border transition-colors">
                {copied ? <LuCheck className="w-3.5 h-3.5 text-success" /> : <LuCopy className="w-3.5 h-3.5 text-text-secondary" />}
              </button>
              <button onClick={handleRegenerateCode} disabled={regenerating} className="p-1.5 bg-subtle/60 border border-border/30 rounded-md hover:bg-border disabled:opacity-50">
                <LuRefreshCw className={`w-3.5 h-3.5 text-text-secondary ${regenerating ? "animate-spin" : ""}`} />
              </button>
            </div>
            <p className="mt-0.5 text-tiny text-text-muted">Share to invite friends.</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <LuUsers className="w-3.5 h-3.5 text-primary" />
              <h2 className="text-body-sm font-medium text-text-primary">Members</h2>
            </div>
            <span className="text-tiny text-text-muted">{members.length}</span>
          </div>
          {loadingMembers ? (
            <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-1">
              {members.map((member) => (
                <div key={member.userId} className="flex items-center gap-1.5 p-1.5 bg-subtle/60 rounded-md">
                  <div className="w-6 h-6 rounded-full bg-primary-soft text-primary flex items-center justify-center text-tiny font-semibold">
                    {member.displayName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-tiny font-medium text-text-primary truncate">{member.displayName}</p>
                    <p className="text-tiny text-text-muted truncate">{member.email}</p>
                  </div>
                  <span className={`text-tiny font-medium px-1 py-0.5 rounded ${member.role === "owner" ? "bg-primary-soft text-primary" : "bg-subtle text-text-muted"}`}>
                    {member.role === "owner" ? "Owner" : "Member"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-border/40 p-3">
          <div className="flex items-center gap-1 mb-2">
            <LuDollarSign className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-body-sm font-medium text-text-primary">Info</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-tiny">
            <div><p className="text-text-muted">Season</p><p className="font-medium text-text-primary">{activeLeague.season}</p></div>
            <div><p className="text-text-muted">Entry</p><p className="font-medium text-text-primary">${activeLeague.entryFee}</p></div>
            <div><p className="text-text-muted">Pot</p><p className="font-medium text-text-primary">${activeLeague.payoutTotal?.toLocaleString() || 0}</p></div>
            <div><p className="text-text-muted">Status</p><p className="font-medium text-text-primary capitalize">{activeLeague.status}</p></div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border/40 p-3">
          <div className="flex items-center gap-1 mb-2">
            <LuCalendar className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-body-sm font-medium text-text-primary">Mid-Season Setup</h2>
          </div>
          <p className="text-tiny text-text-secondary mb-2">Import historical picks and scores.</p>
          <button onClick={() => navigate("/admin/backfill")} className="w-full flex items-center justify-between p-2 bg-subtle/60 rounded-md hover:bg-border transition-colors">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-primary-soft text-primary flex items-center justify-center"><LuCalendar className="w-3 h-3" /></div>
              <div className="text-left">
                <p className="text-body-sm font-medium text-text-primary">Backfill Wizard</p>
                <p className="text-tiny text-text-muted">Enter historical data</p>
              </div>
            </div>
            <LuChevronRight className="w-3.5 h-3.5 text-text-muted" />
          </button>
        </div>
      </div>
    </div>
  );
};

