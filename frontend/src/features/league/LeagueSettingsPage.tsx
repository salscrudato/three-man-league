/**
 * League Settings Page - Manage league settings (owner only)
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useLeague } from "../../league/LeagueContext";
import { apiPost, getErrorMessage } from "../../lib/api";
import { LuArrowLeft, LuCopy, LuCheck, LuRefreshCw, LuUsers, LuSettings, LuDollarSign, LuLock, LuLockOpen, LuCalendar, LuChevronRight } from "react-icons/lu";
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

  // Load members
  useEffect(() => {
    const loadMembers = async () => {
      if (!activeLeagueId) return;
      
      try {
        setLoadingMembers(true);
        const membersRef = collection(db, "leagues", activeLeagueId, "members");
        const q = query(membersRef, where("isActive", "==", true));
        const snap = await getDocs(q);
        
        const memberList: LeagueMember[] = snap.docs.map(doc => ({
          userId: doc.id,
          ...doc.data(),
        } as LeagueMember));
        
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
    }
  }, [activeLeague]);

  // Redirect if not owner
  if (userRole !== "owner") {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <LuLock className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h1 className="text-section-title font-bold text-text-primary mb-2">Access Denied</h1>
        <p className="text-body text-text-secondary mb-6">
          Only the league owner can access settings.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!activeLeague) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
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

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-body-sm text-text-secondary hover:text-text-primary mb-4"
        >
          <LuArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-page-title font-bold text-text-primary">League Settings</h1>
        <p className="text-body text-text-secondary mt-1">{activeLeague.name}</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-card text-danger text-body-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-card text-success text-body-sm">
          {successMessage}
        </div>
      )}

      <div className="space-y-6">
        {/* League Name */}
        <div className="bg-surface rounded-card border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <LuSettings className="w-5 h-5 text-primary" />
            <h2 className="text-body font-semibold text-text-primary">General</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-body-sm font-medium text-text-primary mb-2">
                League Name
              </label>
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 px-4 py-2 bg-surface border border-border rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    maxLength={50}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={saving || newName.trim().length < 2}
                    className="px-4 py-2 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {saving ? "..." : "Save"}
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setNewName(activeLeague.name); }}
                    className="px-4 py-2 bg-subtle text-text-secondary rounded-button font-medium hover:bg-border transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-body text-text-primary">{activeLeague.name}</span>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-body-sm text-primary hover:text-primary-hover font-medium"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <p className="text-body-sm font-medium text-text-primary">Lock Membership</p>
                <p className="text-caption text-text-muted">Prevent new members from joining</p>
              </div>
              <button
                onClick={handleToggleMembershipLock}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-button font-medium transition-colors ${
                  membershipLocked
                    ? "bg-warning/10 text-warning hover:bg-warning/20"
                    : "bg-subtle text-text-secondary hover:bg-border"
                }`}
              >
                {membershipLocked ? <LuLock className="w-4 h-4" /> : <LuLockOpen className="w-4 h-4" />}
                {membershipLocked ? "Locked" : "Open"}
              </button>
            </div>
          </div>
        </div>

        {/* Join Code */}
        <div className="bg-surface rounded-card border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <LuUsers className="w-5 h-5 text-primary" />
            <h2 className="text-body font-semibold text-text-primary">Invite Members</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-body-sm font-medium text-text-primary mb-2">
                Join Code
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-3 bg-subtle border border-border rounded-button text-center text-section-title font-mono font-bold text-primary tracking-widest">
                  {activeLeague.joinCode}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="p-3 bg-subtle border border-border rounded-button hover:bg-border transition-colors"
                  aria-label="Copy code"
                >
                  {copied ? <LuCheck className="w-5 h-5 text-success" /> : <LuCopy className="w-5 h-5 text-text-secondary" />}
                </button>
                <button
                  onClick={handleRegenerateCode}
                  disabled={regenerating}
                  className="p-3 bg-subtle border border-border rounded-button hover:bg-border transition-colors disabled:opacity-50"
                  aria-label="Regenerate code"
                >
                  <LuRefreshCw className={`w-5 h-5 text-text-secondary ${regenerating ? "animate-spin" : ""}`} />
                </button>
              </div>
              <p className="mt-2 text-caption text-text-muted">
                Share this code with friends to invite them to your league.
              </p>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="bg-surface rounded-card border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LuUsers className="w-5 h-5 text-primary" />
              <h2 className="text-body font-semibold text-text-primary">Members</h2>
            </div>
            <span className="text-body-sm text-text-muted">{members.length} members</span>
          </div>

          {loadingMembers ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 p-3 bg-subtle rounded-button"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center text-caption font-semibold">
                    {member.displayName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-text-primary truncate">
                      {member.displayName}
                    </p>
                    <p className="text-caption text-text-muted truncate">{member.email}</p>
                  </div>
                  <span className={`text-caption font-medium px-2 py-1 rounded ${
                    member.role === "owner"
                      ? "bg-primary-soft text-primary"
                      : "bg-subtle text-text-muted"
                  }`}>
                    {member.role === "owner" ? "Owner" : "Member"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* League Info */}
        <div className="bg-surface rounded-card border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <LuDollarSign className="w-5 h-5 text-primary" />
            <h2 className="text-body font-semibold text-text-primary">League Info</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 text-body-sm">
            <div>
              <p className="text-text-muted">Season</p>
              <p className="font-medium text-text-primary">{activeLeague.season}</p>
            </div>
            <div>
              <p className="text-text-muted">Entry Fee</p>
              <p className="font-medium text-text-primary">${activeLeague.entryFee}</p>
            </div>
            <div>
              <p className="text-text-muted">Total Pot</p>
              <p className="font-medium text-text-primary">${activeLeague.payoutTotal?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className="text-text-muted">Status</p>
              <p className="font-medium text-text-primary capitalize">{activeLeague.status}</p>
            </div>
          </div>
        </div>

        {/* Mid-Season Setup */}
        <div className="bg-surface rounded-card border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <LuCalendar className="w-5 h-5 text-primary" />
            <h2 className="text-body font-semibold text-text-primary">Mid-Season Setup</h2>
          </div>

          <p className="text-body-sm text-text-secondary mb-4">
            Import historical picks and scores from a spreadsheet to continue an existing league mid-season.
          </p>

          <button
            onClick={() => navigate("/admin/backfill")}
            className="w-full flex items-center justify-between p-4 bg-subtle rounded-button hover:bg-border transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center">
                <LuCalendar className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-body font-medium text-text-primary">Backfill Wizard</p>
                <p className="text-caption text-text-muted">Enter historical picks and compute scores</p>
              </div>
            </div>
            <LuChevronRight className="w-5 h-5 text-text-muted" />
          </button>
        </div>
      </div>
    </div>
  );
};

