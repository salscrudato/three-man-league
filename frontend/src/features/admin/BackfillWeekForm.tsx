/**
 * Backfill Week Form - Enter picks for all members for a specific week
 */

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../auth/AuthContext";
import { apiPost, getErrorMessage } from "../../lib/api";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { LuArrowLeft, LuCircleAlert, LuLoader } from "react-icons/lu";
import type { LeagueMember, Player, BackfillMemberPick, BackfillWeekResponse } from "../../types";
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
}

const positionConfig = {
  qb: { label: "QB", color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200" },
  rb: { label: "RB", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  wr: { label: "WR", color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
};

export const BackfillWeekForm: React.FC<BackfillWeekFormProps> = ({
  leagueId,
  weekNumber,
  members,
  onBack,
  onComplete,
}) => {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberPicks, setMemberPicks] = useState<Record<string, MemberPickState>>({});

  // Load players
  useEffect(() => {
    async function loadPlayers() {
      try {
        setLoading(true);
        const playersRef = collection(db, "players");
        const snap = await getDocs(playersRef);
        const playerList: Player[] = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Player & { id: string }));
        setPlayers(playerList);

        // Initialize member picks
        const initialPicks: Record<string, MemberPickState> = {};
        members.forEach(m => {
          initialPicks[m.userId] = {};
        });
        setMemberPicks(initialPicks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load players");
      } finally {
        setLoading(false);
      }
    }
    loadPlayers();
  }, [members]);

  // Update a member's pick
  const handlePickChange = (userId: string, position: PositionKey, playerId: string | undefined) => {
    setMemberPicks(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [`${position}PlayerId`]: playerId,
      },
    }));
  };

  // Filter players by position
  const getPlayersForPosition = useCallback((position: PositionKey): Player[] => {
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
        <p className="text-body text-text-secondary mt-4">Loading players...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-body-sm text-text-secondary hover:text-text-primary mb-4">
          <LuArrowLeft className="w-4 h-4" />
          Back to Week List
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-page-title font-bold text-text-primary">Week {weekNumber} Backfill</h1>
            <p className="text-body text-text-secondary mt-1">
              Enter picks for each member from your spreadsheet.
            </p>
          </div>
          <div className="text-right">
            <p className="text-body-sm text-text-muted">{filledCount} / {members.length} members</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-card text-danger text-body-sm flex items-center gap-2">
          <LuCircleAlert className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Member Picks Grid */}
      <div className="space-y-4 mb-8">
        {members.map(member => (
          <MemberPickRow
            key={member.userId}
            member={member}
            picks={memberPicks[member.userId] || {}}
            onPickChange={(pos, playerId) => handlePickChange(member.userId, pos, playerId)}
            getPlayersForPosition={getPlayersForPosition}
          />
        ))}
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-0 bg-background border-t border-border py-4 -mx-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-body-sm text-text-muted">
            {filledCount === 0 ? "No picks entered yet" : `${filledCount} member(s) with picks`}
          </p>
          <button
            onClick={handleSubmit}
            disabled={saving || filledCount === 0}
            className="px-6 py-3 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <LuLoader className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : "Save & Score Week"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Member pick row component
interface MemberPickRowProps {
  member: LeagueMember;
  picks: MemberPickState;
  onPickChange: (position: PositionKey, playerId: string | undefined) => void;
  getPlayersForPosition: (position: PositionKey) => Player[];
}

const MemberPickRow: React.FC<MemberPickRowProps> = ({
  member,
  picks,
  onPickChange,
  getPlayersForPosition,
}) => {
  const positions: PositionKey[] = ["qb", "rb", "wr"];

  return (
    <div className="bg-surface rounded-card border border-border p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center text-body-sm font-semibold">
          {member.displayName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
        </div>
        <div>
          <p className="text-body font-medium text-text-primary">{member.displayName}</p>
          <p className="text-caption text-text-muted">{member.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {positions.map(pos => {
          const config = positionConfig[pos];
          const positionPlayers = getPlayersForPosition(pos);
          const selectedId = picks[`${pos}PlayerId` as keyof MemberPickState];

          return (
            <div key={pos}>
              <label className={`block text-caption font-medium mb-1 ${config.color}`}>
                {config.label}
              </label>
              <PlayerSearchDropdown
                players={positionPlayers}
                selectedPlayerId={selectedId}
                onSelect={(playerId) => onPickChange(pos, playerId)}
                placeholder={`Select ${config.label}`}
                position={pos}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

