/**
 * Backfill Week Form - Enter picks for all members for a specific week
 * Optimized UI with existing picks loading and inline editing
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../auth/AuthContext";
import { apiPost, apiGet, getErrorMessage } from "../../lib/api";
import { mapPlayer, mapDocs } from "../../lib/firestore";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { LuArrowLeft, LuCircleAlert, LuLoader, LuCheck, LuSave } from "react-icons/lu";
import type { LeagueMember, PlayerWithId, BackfillMemberPick, BackfillWeekResponse, BackfillMemberResult } from "../../types";
import { PlayerSearchDropdown } from "./PlayerSearchDropdown";

interface BackfillWeekFormProps {
  leagueId: string;
  weekNumber: number;
  members: LeagueMember[];
  onBack: () => void;
  onComplete: (response: BackfillWeekResponse) => void;
}

type PositionKey = "qb" | "rb" | "wr";

interface MemberPickState {
  qbPlayerId?: string;
  rbPlayerId?: string;
  wrPlayerId?: string;
  // Track scores from existing data
  qbPoints?: number;
  rbPoints?: number;
  wrPoints?: number;
  totalPoints?: number;
}

const positions: PositionKey[] = ["qb", "rb", "wr"];

export const BackfillWeekForm: React.FC<BackfillWeekFormProps> = ({
  leagueId,
  weekNumber,
  members,
  onBack,
  onComplete,
}) => {
  const { user } = useAuth();
  const [players, setPlayers] = useState<PlayerWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberPicks, setMemberPicks] = useState<Record<string, MemberPickState>>({});
  const [originalPicks, setOriginalPicks] = useState<Record<string, MemberPickState>>({});
  const [hasExistingData, setHasExistingData] = useState(false);

  // Create player lookup map for quick access
  const playerMap = useMemo(() => {
    const map = new Map<string, PlayerWithId>();
    players.forEach(p => {
      map.set(p.id, p);
    });
    return map;
  }, [players]);

  // Load players and existing picks
  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        setLoading(true);

        // Load players
        const playersRef = collection(db, "players");
        const snap = await getDocs(playersRef);
        const playerList = mapDocs(snap.docs, mapPlayer);
        setPlayers(playerList);

        // Initialize member picks
        const initialPicks: Record<string, MemberPickState> = {};
        members.forEach(m => {
          initialPicks[m.userId] = {};
        });

        // Try to load existing picks for this week
        try {
          const response = await apiGet<{ ok: boolean; scores: BackfillMemberResult[] }>(
            `getBackfillWeekScores?leagueId=${leagueId}&weekNumber=${weekNumber}`,
            user
          );

          if (response.ok && response.scores && response.scores.length > 0) {
            setHasExistingData(true);
            response.scores.forEach((score: BackfillMemberResult) => {
              initialPicks[score.userId] = {
                qbPlayerId: score.qbPlayerId,
                rbPlayerId: score.rbPlayerId,
                wrPlayerId: score.wrPlayerId,
                qbPoints: score.qbPoints,
                rbPoints: score.rbPoints,
                wrPoints: score.wrPoints,
                totalPoints: score.totalPoints,
              };
            });
          }
        } catch {
          // No existing data - that's fine
        }

        setMemberPicks(initialPicks);
        setOriginalPicks(JSON.parse(JSON.stringify(initialPicks)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [leagueId, weekNumber, members, user]);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(memberPicks) !== JSON.stringify(originalPicks);
  }, [memberPicks, originalPicks]);

  // Update a member's pick
  const handlePickChange = (userId: string, position: PositionKey, playerId: string | undefined) => {
    setMemberPicks(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [`${position}PlayerId`]: playerId,
        // Clear points when pick changes - will be recalculated on save
        [`${position}Points`]: undefined,
        totalPoints: undefined,
      },
    }));
  };

  // Filter players by position
  const getPlayersForPosition = useCallback((position: PositionKey): PlayerWithId[] => {
    const posUpper = position.toUpperCase();
    return players.filter(p => {
      if (posUpper === "QB") return p.position === "QB";
      if (posUpper === "RB") return p.position === "RB";
      if (posUpper === "WR") return p.position === "WR" || p.position === "TE";
      return false;
    });
  }, [players]);

  // Submit backfill
  const handleSubmit = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const memberPicksArray: BackfillMemberPick[] = Object.entries(memberPicks).map(([userId, picks]) => ({
        userId,
        qbPlayerId: picks.qbPlayerId,
        rbPlayerId: picks.rbPlayerId,
        wrPlayerId: picks.wrPlayerId,
      }));

      const data = await apiPost<BackfillWeekResponse>("/backfillWeekForLeague", {
        leagueId,
        weekNumber,
        memberPicks: memberPicksArray,
      }, user);

      onComplete(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Count filled picks
  const filledCount = Object.values(memberPicks).filter(p => p.qbPlayerId || p.rbPlayerId || p.wrPlayerId).length;

  if (loading) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <LuLoader className="w-8 h-8 text-primary mx-auto animate-spin" />
        <p className="text-body text-text-secondary mt-4">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-body-sm text-text-secondary hover:text-text-primary mb-4 group">
          <LuArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Week List
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center">
              <span className="text-section-title font-bold text-primary">{weekNumber}</span>
            </div>
            <div>
              <h1 className="text-page-title font-bold text-text-primary">Week {weekNumber}</h1>
              <p className="text-body-sm text-text-secondary">
                {hasExistingData ? "Edit existing picks" : "Enter picks for each member"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {hasExistingData && (
              <span className="px-3 py-1 bg-success/10 text-success text-caption font-medium rounded-full flex items-center gap-1">
                <LuCheck className="w-3.5 h-3.5" />
                Previously saved
              </span>
            )}
            <div className="text-right bg-surface px-4 py-2 rounded-card border border-border">
              <p className="text-section-title font-bold text-text-primary">{filledCount}/{members.length}</p>
              <p className="text-caption text-text-muted">members</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-card text-danger text-body-sm flex items-center gap-2">
          <LuCircleAlert className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Compact Table Header */}
      <div className="bg-subtle rounded-t-card border border-border border-b-0 px-4 py-3 grid grid-cols-[1fr,180px,180px,180px,80px] gap-3 text-caption font-semibold text-text-secondary">
        <div>Member</div>
        <div className="text-center text-red-600">QB</div>
        <div className="text-center text-blue-600">RB</div>
        <div className="text-center text-amber-600">WR/TE</div>
        <div className="text-right">Points</div>
      </div>

      {/* Member Rows */}
      <div className="border border-border rounded-b-card divide-y divide-border bg-surface">
        {members.map(member => {
          const picks = memberPicks[member.userId] || {};
          const hasPicks = picks.qbPlayerId || picks.rbPlayerId || picks.wrPlayerId;

          return (
            <div
              key={member.userId}
              className={`px-4 py-3 grid grid-cols-[1fr,180px,180px,180px,80px] gap-3 items-center ${
                hasPicks ? "bg-surface" : "bg-subtle/30"
              }`}
            >
              {/* Member Name */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center text-caption font-semibold flex-shrink-0">
                  {member.displayName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                </div>
                <span className="text-body-sm font-medium text-text-primary truncate">
                  {member.displayName}
                </span>
              </div>

              {/* Position Dropdowns */}
              {positions.map(pos => (
                <div key={pos}>
                  <PlayerSearchDropdown
                    players={getPlayersForPosition(pos)}
                    selectedPlayerId={picks[`${pos}PlayerId` as keyof MemberPickState] as string | undefined}
                    onSelect={(playerId) => handlePickChange(member.userId, pos, playerId)}
                    placeholder="Select..."
                    position={pos}
                    playerMap={playerMap}
                  />
                </div>
              ))}

              {/* Points */}
              <div className="text-right">
                {picks.totalPoints !== undefined ? (
                  <span className="text-body-sm font-semibold text-text-primary">
                    {picks.totalPoints.toFixed(1)}
                  </span>
                ) : hasPicks ? (
                  <span className="text-caption text-text-muted">—</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border py-4 px-4 shadow-lg z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-body-sm font-medium text-text-primary">
              {filledCount === 0 ? "No picks entered" : `${filledCount} of ${members.length} members have picks`}
            </p>
            {hasChanges && (
              <p className="text-caption text-warning">You have unsaved changes</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              disabled={saving}
              className="px-4 py-2.5 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {hasChanges ? "Discard" : "Back"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || filledCount === 0}
              className="px-6 py-2.5 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {saving ? (
                <LuLoader className="w-4 h-4 animate-spin" />
              ) : (
                <LuSave className="w-4 h-4" />
              )}
              {saving ? "Saving..." : "Save & Calculate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

