/**
 * Admin Backfill Page - Mid-season setup wizard for league owners
 * Allows backfilling historical weeks with picks and scores
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useLeague } from "../../league/LeagueContext";
import { apiGet, apiPost, getErrorMessage } from "../../lib/api";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { LuArrowLeft, LuCalendar, LuCheck, LuCircleAlert, LuLoader, LuChevronRight, LuLock } from "react-icons/lu";
import type { LeagueMember, BackfillStatusResponse, BackfillWeekStatus, BackfillWeekResponse } from "../../types";
import { BackfillWeekForm } from "./BackfillWeekForm";

export const BackfillPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeLeagueId, userRole } = useLeague();

  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [backfillStatus, setBackfillStatus] = useState<BackfillStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Setup state
  const [setupMode, setSetupMode] = useState(false);
  const [fromWeek, setFromWeek] = useState(1);
  const [toWeek, setToWeek] = useState(1);
  const [enablingBackfill, setEnablingBackfill] = useState(false);

  // Active week being edited
  const [activeWeek, setActiveWeek] = useState<number | null>(null);

  // Load members and backfill status
  const loadData = useCallback(async () => {
    if (!activeLeagueId || !user) return;

    try {
      setLoading(true);
      setError(null);

      // Load members
      const membersRef = collection(db, "leagues", activeLeagueId, "members");
      const q = query(membersRef, where("isActive", "==", true));
      const snap = await getDocs(q);

      const memberList: LeagueMember[] = snap.docs.map(doc => ({
        userId: doc.id,
        ...doc.data(),
      } as LeagueMember));

      setMembers(memberList.sort((a, b) => a.displayName.localeCompare(b.displayName)));

      // Load backfill status
      try {
        const data = await apiGet<BackfillStatusResponse>(
          `/getBackfillStatus?leagueId=${activeLeagueId}`,
          user
        );
        setBackfillStatus(data);
        if (data.backfillFromWeek) setFromWeek(data.backfillFromWeek);
        if (data.backfillToWeek) setToWeek(data.backfillToWeek);
      } catch {
        // Backfill status not available is not an error
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [activeLeagueId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Enable backfill mode
  const handleEnableBackfill = async () => {
    if (!user || !activeLeagueId) return;

    setEnablingBackfill(true);
    setError(null);

    try {
      await apiPost("/enableBackfill", { leagueId: activeLeagueId, fromWeek, toWeek }, user);
      setSetupMode(false);
      await loadData();
      setSuccessMessage("Backfill mode enabled! Select a week to begin.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setEnablingBackfill(false);
    }
  };

  // Handle week backfill completion
  const handleWeekBackfilled = async (weekNumber: number, response: BackfillWeekResponse) => {
    setActiveWeek(null);
    await loadData();
    setSuccessMessage(`Week ${weekNumber} backfilled successfully! ${response.results.length} members scored.`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Redirect if not owner
  if (userRole !== "owner" && userRole !== "coOwner") {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <LuLock className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h1 className="text-section-title font-bold text-text-primary mb-2">Access Denied</h1>
        <p className="text-body text-text-secondary mb-6">
          Only league owners can access the backfill wizard.
        </p>
        <button onClick={() => navigate(-1)} className="px-6 py-3 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <LuLoader className="w-8 h-8 text-primary mx-auto animate-spin" />
        <p className="text-body text-text-secondary mt-4">Loading backfill data...</p>
      </div>
    );
  }

  // If editing a specific week, show the week form
  if (activeWeek !== null) {
    return (
      <BackfillWeekForm
        leagueId={activeLeagueId!}
        weekNumber={activeWeek}
        members={members}
        onBack={() => setActiveWeek(null)}
        onComplete={(response) => handleWeekBackfilled(activeWeek, response)}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate("/league-settings")} className="flex items-center gap-2 text-body-sm text-text-secondary hover:text-text-primary mb-4">
          <LuArrowLeft className="w-4 h-4" />
          Back to Settings
        </button>
        <h1 className="text-page-title font-bold text-text-primary">Mid-Season Setup</h1>
        <p className="text-body text-text-secondary mt-1">
          Backfill historical weeks with picks and scores from your spreadsheet.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-card text-danger text-body-sm flex items-center gap-2">
          <LuCircleAlert className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-card text-success text-body-sm flex items-center gap-2">
          <LuCheck className="w-5 h-5 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Setup Mode - Enable Backfill */}
      {!backfillStatus?.backfillEnabled && !setupMode && (
        <div className="bg-surface rounded-card border border-border p-8 text-center">
          <LuCalendar className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-section-title font-bold text-text-primary mb-2">Enable Mid-Season Setup</h2>
          <p className="text-body text-text-secondary mb-6 max-w-md mx-auto">
            This wizard helps you import historical data from your spreadsheet. 
            You'll enter picks for each member for past weeks, and scores will be calculated automatically.
          </p>
          <button onClick={() => setSetupMode(true)} className="px-6 py-3 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-colors">
            Start Setup
          </button>
        </div>
      )}

      {/* Week Range Selection */}
      {setupMode && !backfillStatus?.backfillEnabled && (
        <div className="bg-surface rounded-card border border-border p-6">
          <h2 className="text-body font-semibold text-text-primary mb-4">Select Week Range to Backfill</h2>
          <p className="text-body-sm text-text-secondary mb-6">
            Choose the range of weeks you need to import from your spreadsheet.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-body-sm font-medium text-text-primary mb-2">From Week</label>
              <select value={fromWeek} onChange={(e) => setFromWeek(parseInt(e.target.value))} className="w-full px-4 py-2 bg-surface border border-border rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-primary">
                {Array.from({ length: 18 }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-body-sm font-medium text-text-primary mb-2">To Week</label>
              <select value={toWeek} onChange={(e) => setToWeek(parseInt(e.target.value))} className="w-full px-4 py-2 bg-surface border border-border rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-primary">
                {Array.from({ length: 18 }, (_, i) => i + 1).filter(w => w >= fromWeek).map(w => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setSetupMode(false)} className="px-4 py-2 bg-subtle text-text-secondary rounded-button font-medium hover:bg-border transition-colors">
              Cancel
            </button>
            <button onClick={handleEnableBackfill} disabled={enablingBackfill || fromWeek > toWeek} className="px-6 py-2 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2">
              {enablingBackfill && <LuLoader className="w-4 h-4 animate-spin" />}
              Enable Backfill
            </button>
          </div>
        </div>
      )}

      {/* Week List */}
      {backfillStatus?.backfillEnabled && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-body font-semibold text-text-primary">Weeks to Backfill</h2>
            <span className="text-body-sm text-text-muted">
              {backfillStatus.weeks.filter(w => w.status === "backfilled").length} / {backfillStatus.weeks.length} completed
            </span>
          </div>

          <div className="bg-surface rounded-card border border-border divide-y divide-border">
            {backfillStatus.weeks.map((week: BackfillWeekStatus) => (
              <WeekRow key={week.weekNumber} week={week} onSelect={() => setActiveWeek(week.weekNumber)} />
            ))}
          </div>

          {backfillStatus.weeks.every(w => w.status === "backfilled") && (
            <div className="bg-success/10 border border-success/20 rounded-card p-6 text-center">
              <LuCheck className="w-8 h-8 text-success mx-auto mb-2" />
              <h3 className="text-body font-semibold text-success mb-1">All Weeks Backfilled!</h3>
              <p className="text-body-sm text-text-secondary">
                Your league is now fully set up. Season standings have been updated.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Week row component
const WeekRow: React.FC<{ week: BackfillWeekStatus; onSelect: () => void }> = ({ week, onSelect }) => {
  const isBackfilled = week.status === "backfilled";

  return (
    <button onClick={onSelect} className="w-full flex items-center justify-between p-4 hover:bg-subtle transition-colors text-left">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isBackfilled ? "bg-success/10 text-success" : "bg-subtle text-text-muted"}`}>
          {isBackfilled ? <LuCheck className="w-4 h-4" /> : <span className="text-body-sm font-medium">{week.weekNumber}</span>}
        </div>
        <div>
          <p className="text-body font-medium text-text-primary">Week {week.weekNumber}</p>
          {isBackfilled && (
            <p className="text-caption text-text-muted">{week.memberCount} members scored</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isBackfilled && (
          <span className="text-caption text-success font-medium">Completed</span>
        )}
        <LuChevronRight className="w-5 h-5 text-text-muted" />
      </div>
    </button>
  );
};

export default BackfillPage;

