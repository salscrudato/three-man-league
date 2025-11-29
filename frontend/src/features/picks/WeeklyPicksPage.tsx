import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from "firebase/firestore";
import type { GameWithId, PlayerUsage, PlayerOption } from "../../types";
import { Button, Badge, Card, Alert, Input, Select, PlayerListSkeleton } from "../../components";
import { useAuth } from "../../auth/AuthContext";
import { useLeague } from "../../league/LeagueContext";
import { submitPicks as submitPicksApi, getErrorMessage } from "../../lib/api";
import { SEASON, SEASON_START } from "../../lib/config";
import { mapGame, mapPlayer, mapPlayerUsage, mapUserPicks, toDate } from "../../lib/firestore";
import { LuUsers, LuPlus, LuX, LuSearch, LuTriangleAlert, LuLock, LuCheck } from "react-icons/lu";

type PositionKey = "qb" | "rb" | "wr";

interface PicksState {
  qbPlayerId?: string;
  qbGameId?: string;
  qbLocked?: boolean;
  rbPlayerId?: string;
  rbGameId?: string;
  rbLocked?: boolean;
  wrPlayerId?: string;
  wrGameId?: string;
  wrLocked?: boolean;
}

type SortOption = "fantasyPoints" | "kickoff" | "name";

// Helper to parse kickoffTime robustly - handles Timestamp, Timestamp-like object, or string
function parseKickoffTime(kickoffTime: unknown): Date {
  if (kickoffTime instanceof Timestamp) {
    return kickoffTime.toDate();
  }
  if (kickoffTime && typeof kickoffTime === "object" && "seconds" in kickoffTime) {
    // Handle Timestamp-like object with seconds/nanoseconds (from Firestore)
    const ts = kickoffTime as { seconds: number; nanoseconds?: number };
    return new Date(ts.seconds * 1000);
  }
  if (typeof kickoffTime === "string") {
    return new Date(kickoffTime);
  }
  // Fallback - shouldn't happen but treat as far future (unlocked)
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

// Position display configuration - refined colors
const positionConfig = {
  qb: { label: "Quarterback", shortLabel: "QB", color: "text-rose-600", bgColor: "bg-rose-50/80", borderColor: "border-rose-100/60" },
  rb: { label: "Running Back", shortLabel: "RB", color: "text-blue-600", bgColor: "bg-blue-50/80", borderColor: "border-blue-100/60" },
  wr: { label: "Wide Receiver", shortLabel: "WR", color: "text-amber-600", bgColor: "bg-amber-50/80", borderColor: "border-amber-100/60" },
};

export const WeeklyPicksPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { activeLeagueId, loading: leagueLoading } = useLeague();
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [picks, setPicks] = useState<PicksState>({});
  const [savedPicks, setSavedPicks] = useState<PicksState>({});
  const [usedPlayerIds, setUsedPlayerIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weekId, setWeekId] = useState<string>("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("fantasyPoints");
  const [hideUnavailable, setHideUnavailable] = useState<boolean>(false);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);

  // Use activeLeagueId from context
  const leagueId = activeLeagueId;

  // Count unavailable players for display
  const unavailableCount = useMemo(() => {
    return players.filter(p => p.isLocked || p.isUsed).length;
  }, [players]);

  // Load available weeks (filter out completed weeks)
  useEffect(() => {
    async function loadAvailableWeeks() {
      try {
        // Load all games to determine which weeks are still active
        const gamesRef = collection(db, "games");
        const gamesSnap = await getDocs(gamesRef);

        const now = Date.now();
        const weekGames = new Map<number, { allPast: boolean; hasGames: boolean }>();

        // Initialize all 18 weeks
        for (let w = 1; w <= 18; w++) {
          weekGames.set(w, { allPast: true, hasGames: false });
        }

        gamesSnap.forEach((doc) => {
          const game = doc.data();
          const weekNum = game.weekNumber;
          if (!weekNum || weekNum < 1 || weekNum > 18) return;

          const kickoffTime = parseKickoffTime(game.kickoffTime);

          // Skip games that are before the season start (e.g., playoff games from previous season)
          if (kickoffTime < SEASON_START) return;

          const weekData = weekGames.get(weekNum)!;
          weekData.hasGames = true;

          // If any game in this week hasn't finished yet (kickoff + 4 hours buffer for game completion)
          const gameEndEstimate = kickoffTime.getTime() + (4 * 60 * 60 * 1000);
          if (gameEndEstimate > now) {
            weekData.allPast = false;
          }
        });

        // Filter to weeks that either have no games yet or have games not all in the past
        const available = Array.from(weekGames.entries())
          .filter(([, data]) => !data.hasGames || !data.allPast)
          .map(([weekNum]) => weekNum)
          .sort((a, b) => a - b);

        setAvailableWeeks(available.length > 0 ? available : [1]);
      } catch {
        // Fallback to all weeks if there's an error
        setAvailableWeeks(Array.from({ length: 18 }, (_, i) => i + 1));
      }
    }
    loadAvailableWeeks();
  }, []);

  // Determine current week from Firestore config (synced from ESPN)
  useEffect(() => {
    async function loadCurrentWeek() {
      try {
        const configRef = doc(db, "config", "season");
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          const data = configSnap.data();
          const currentWeek = data.currentWeek || 1;
          setWeekId(`week-${currentWeek}`);
        } else {
          setWeekId("week-1");
        }
      } catch {
        // Fallback to week 1 if config not available
        setWeekId("week-1");
      }
    }
    loadCurrentWeek();
  }, []);

  // Load players, games, and user's existing picks
  useEffect(() => {
    // Wait for auth and league context to finish loading
    if (authLoading || leagueLoading) {
      return;
    }

    // Don't run until we have weekId set (not empty string)
    if (!weekId) {
      return;
    }

    // If missing user or league, show not loading
    if (!currentUser || !leagueId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Capture values for use in async function (TypeScript narrowing)
    const userId = currentUser.uid;
    const currentLeagueId = leagueId;
    const currentWeekId = weekId;

    // Reset state synchronously before async load
    setLoading(true);
    setPlayers([]);
    setUsedPlayerIds(new Set());
    setPicks({});
    setSavedPicks({});

    async function loadData() {

      try {
        const weekNumber = parseInt(currentWeekId.replace("week-", ""));

        // Load games for this week
        const gamesRef = collection(db, "games");
        const gamesQuery = query(gamesRef, where("weekNumber", "==", weekNumber));
        const gamesSnap = await getDocs(gamesQuery);

        const gamesMap = new Map<string, GameWithId>();
        gamesSnap.forEach((gameDoc) => {
          const game = mapGame(gameDoc);
          if (!game) return;

          // Filter out games that are before the season start (e.g., playoff games from previous season)
          const kickoff = toDate(game.kickoffTime) || new Date();
          if (kickoff >= SEASON_START) {
            gamesMap.set(gameDoc.id, game);
          }
        });

        // Load all players
        const playersRef = collection(db, "players");
        const playersSnap = await getDocs(playersRef);

        // Load user's player usage for this season AND league
        const usageRef = collection(db, "users", userId, "playerUsage");
        const usageQuery = query(
          usageRef,
          where("season", "==", SEASON),
          where("leagueId", "==", currentLeagueId)
        );
        const usageSnap = await getDocs(usageQuery);

        const usedIds = new Set<string>();
        const usageByPlayer = new Map<string, PlayerUsage>();
        usageSnap.forEach((usageDoc) => {
          const usage = mapPlayerUsage(usageDoc);
          if (!usage) return;
          usedIds.add(usage.playerId);
          usageByPlayer.set(usage.playerId, usage);
        });
        setUsedPlayerIds(usedIds);

        // Load existing picks for this week
        const pickDocRef = doc(db, "leagues", currentLeagueId, "weeks", currentWeekId, "picks", userId);
        const pickSnap = await getDoc(pickDocRef);
        const existingPicks = mapUserPicks(pickSnap);
        if (existingPicks) {
          const picksState: PicksState = {
            qbPlayerId: existingPicks.qbPlayerId,
            qbGameId: existingPicks.qbGameId,
            qbLocked: existingPicks.qbLocked,
            rbPlayerId: existingPicks.rbPlayerId,
            rbGameId: existingPicks.rbGameId,
            rbLocked: existingPicks.rbLocked,
            wrPlayerId: existingPicks.wrPlayerId,
            wrGameId: existingPicks.wrGameId,
            wrLocked: existingPicks.wrLocked,
          };
          setPicks(picksState);
          setSavedPicks(picksState);
        } else {
          setPicks({});
          setSavedPicks({});
        }

        // Build player options with game info
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        const playerOptions: PlayerOption[] = [];

        playersSnap.forEach((pDoc) => {
          const player = mapPlayer(pDoc);
          if (!player) return;

          // Find games for this player's team this week
          gamesMap.forEach((game) => {
            const isHome = game.homeTeamId === player.teamId;
            const isAway = game.awayTeamId === player.teamId;
            if (!isHome && !isAway) return;

            // Ensure kickoffTime is a valid Date - defensive check
            const kickoffTime = game.kickoffTime instanceof Date
              ? game.kickoffTime
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Far future = unlocked
            const kickoffMs = kickoffTime.getTime();
            // If kickoffMs is NaN (invalid date), treat as unlocked
            const isLocked = !isNaN(kickoffMs) && now > kickoffMs - oneHour;
            const opponent = isHome ? `vs ${game.awayTeamName}` : `@ ${game.homeTeamName}`;

            // Check if player was used in a different week
            const usage = usageByPlayer.get(pDoc.id);
            const isUsedInDifferentWeek = usage && usage.firstUsedWeek !== currentWeekId;

            playerOptions.push({
              id: pDoc.id,
              name: player.name,
              team: player.teamName || player.teamId,
              position: player.position,
              gameId: game.id || game.gameId,
              gameLabel: `${game.awayTeamName} @ ${game.homeTeamName}`,
              kickoff: kickoffTime,
              kickoffFormatted: kickoffTime.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }),
              isLocked,
              isUsed: isUsedInDifferentWeek || false,
              opponent,
              seasonStats: player.seasonStats,
            });
          });
        });

        // Sort by kickoff time
        playerOptions.sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());

        // Only update state if the effect hasn't been cancelled
        if (!cancelled) {
          setPlayers(playerOptions);
        }
      } catch {
        if (!cancelled) {
          setMessage({ type: "error", text: "Failed to load players and games" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    // Cleanup function to prevent state updates if component unmounts or deps change
    return () => {
      cancelled = true;
    };
  }, [weekId, leagueId, currentUser, authLoading, leagueLoading]);

  const handlePick = useCallback((pos: PositionKey, option: PlayerOption) => {
    if (option.isLocked || option.isUsed) return;

    setPicks((prev) => {
      if (prev[`${pos}Locked` as keyof PicksState]) return prev;
      return {
        ...prev,
        [`${pos}PlayerId`]: option.id,
        [`${pos}GameId`]: option.gameId,
      };
    });
  }, []);

  // Filter players by search query (name or team) and availability
  const filteredPlayers = useMemo(() => {
    let result = players;

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.team.toLowerCase().includes(q)
      );
    }

    // Apply availability filter
    if (hideUnavailable) {
      result = result.filter((p) => !p.isLocked && !p.isUsed);
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "fantasyPoints":
          // Sort by fantasy points descending (higher is better)
          return (b.seasonStats?.fantasyPoints || 0) - (a.seasonStats?.fantasyPoints || 0);
        case "kickoff":
          // Sort by kickoff time ascending (earlier first)
          return a.kickoff.getTime() - b.kickoff.getTime();
        case "name":
          // Sort alphabetically
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [players, searchQuery, sortBy, hideUnavailable]);

  const groupedByPos = useMemo(() => ({
    qb: filteredPlayers.filter((p) => p.position === "QB"),
    rb: filteredPlayers.filter((p) => p.position === "RB"),
    wr: filteredPlayers.filter((p) => p.position === "WR"),
  }), [filteredPlayers]);

  const savePicks = useCallback(async () => {
    if (!currentUser || !leagueId) return;

    setSaving(true);
    setMessage(null);

    try {
      const data = await submitPicksApi(currentUser, {
        leagueId,
        weekId,
        picks: {
          qbPlayerId: picks.qbPlayerId,
          qbGameId: picks.qbGameId,
          rbPlayerId: picks.rbPlayerId,
          rbGameId: picks.rbGameId,
          wrPlayerId: picks.wrPlayerId,
          wrGameId: picks.wrGameId,
        },
      });

      if (data.ok) {
        setSavedPicks(picks);
        const accepted = data.accepted?.join(", ") || "none";
        const skipped = data.skipped?.length > 0 ? ` (skipped: ${data.skipped.join("; ")})` : "";
        setMessage({ type: "success", text: `Picks saved! Accepted: ${accepted}${skipped}` });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save picks" });
      }
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }, [currentUser, leagueId, weekId, picks]);

  const getTimeUntilLock = useCallback((kickoff: Date): string => {
    const now = Date.now();
    const lockTime = kickoff.getTime() - 60 * 60 * 1000;
    const diff = lockTime - now;

    if (diff <= 0) return "LOCKED";

    const hours = Math.floor(diff / (60 * 60 * 1000));
    const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${mins}m`;
  }, []);

  const renderColumn = (pos: PositionKey) => {
    const posPlayers = groupedByPos[pos];
    const selectedId = picks[`${pos}PlayerId` as keyof PicksState];
    const isLocked = picks[`${pos}Locked` as keyof PicksState];
    const selectedPlayer = posPlayers.find(p => p.id === selectedId);
    const config = positionConfig[pos];

    return (
      <Card padding="none" className="flex flex-col overflow-hidden">
        {/* Position header */}
        <div className={`px-2.5 py-2 border-b ${config.borderColor} ${config.bgColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`text-body-sm font-semibold ${config.color}`}>{config.shortLabel}</span>
              <span className="text-tiny text-text-muted">{config.label}</span>
            </div>
            {isLocked && <Badge variant="error" size="sm" icon={<LuLock className="w-2.5 h-2.5" />}>Locked</Badge>}
          </div>
        </div>

        {/* Current selection */}
        <div className="px-2.5 py-2 bg-subtle/40 border-b border-border/30">
          {selectedPlayer ? (
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center text-tiny font-bold ${config.bgColor} ${config.color}`}>
                {config.shortLabel}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-text-primary truncate">{selectedPlayer.name}</p>
                <p className="text-tiny text-text-muted">{selectedPlayer.team} {selectedPlayer.opponent}</p>
              </div>
              {!isLocked && (
                <button
                  onClick={() => setPicks(prev => ({ ...prev, [`${pos}PlayerId`]: undefined, [`${pos}GameId`]: undefined }))}
                  className="text-text-muted hover:text-error p-0.5 rounded hover:bg-error-soft transition-colors"
                >
                  <LuX className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md border border-dashed border-border/80 flex items-center justify-center text-text-muted">
                <LuPlus className="w-3.5 h-3.5" />
              </div>
              <p className="text-tiny text-text-muted">Select a {config.label.toLowerCase()}</p>
            </div>
          )}
        </div>

        {/* Player list */}
        <div className="flex-1 overflow-y-auto max-h-64">
          {loading ? (
            <div className="p-2.5"><PlayerListSkeleton count={4} /></div>
          ) : posPlayers.length === 0 ? (
            <div className="p-5 text-center">
              <p className="text-tiny text-text-muted">{searchQuery ? "No players match" : "No players available"}</p>
            </div>
          ) : (
            posPlayers.map((p) => {
              const selected = selectedId === p.id;
              const isDisabled = p.isLocked || p.isUsed || Boolean(isLocked);
              const timeUntilLock = getTimeUntilLock(p.kickoff);
              const fantasyPts = p.seasonStats?.fantasyPoints;

              return (
                <button
                  key={`${p.id}-${p.gameId}`}
                  onClick={() => handlePick(pos, p)}
                  disabled={isDisabled}
                  className={`w-full text-left px-2.5 py-2 transition-colors border-b border-border/20 last:border-0 ${
                    selected ? "bg-primary-soft/80 border-l-2 border-l-primary" : isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-subtle/60"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-body-sm font-medium text-text-primary truncate">{p.name}</span>
                        {selected && <LuCheck className="w-3 h-3 text-primary" />}
                        {fantasyPts !== undefined && fantasyPts > 0 && <Badge variant="info" size="sm">{fantasyPts.toFixed(1)}</Badge>}
                        {p.isUsed && <Badge variant="warning" size="sm">Used</Badge>}
                        {p.isLocked && <Badge variant="error" size="sm">Locked</Badge>}
                      </div>
                      <p className="text-tiny text-text-muted">{p.team} {p.opponent}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-tiny ${p.isLocked ? "text-error" : "text-text-subtle"}`}>
                        {timeUntilLock === "LOCKED" ? "Locked" : timeUntilLock}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Card>
    );
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(picks) !== JSON.stringify(savedPicks);
  }, [picks, savedPicks]);

  // Generate week options from available weeks only
  const weekOptions = availableWeeks.map((weekNum) => ({
    value: `week-${weekNum}`,
    label: `Week ${weekNum}`,
  }));

  const sortOptions = [
    { value: "fantasyPoints", label: "Season Pts" },
    { value: "kickoff", label: "Kickoff Time" },
    { value: "name", label: "Player Name" },
  ];

  if (!authLoading && !leagueLoading && !leagueId) {
    return (
      <div className="text-center py-10">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-soft rounded-lg mb-3">
          <LuUsers className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-card-title text-text-primary mb-1">No League Selected</h2>
        <p className="text-body-sm text-text-secondary mb-4 max-w-xs mx-auto">
          Join or create a league to start making picks.
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="primary" size="sm" onClick={() => navigate("/create-league")}>Create League</Button>
          <Button variant="secondary" size="sm" onClick={() => navigate("/join")}>Join League</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-section-title text-text-primary">Weekly Picks</h1>
          <p className="text-body-sm text-text-muted mt-0.5">
            Select one player per position. Locks 1 hour before kickoff.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Badge variant="neutral" size="sm">QB</Badge>
            <Badge variant="neutral" size="sm">RB</Badge>
            <Badge variant="neutral" size="sm">WR</Badge>
          </div>
          <Select value={weekId} onChange={(e) => setWeekId(e.target.value)} options={weekOptions} className="w-28" />
        </div>
      </div>

      {message && <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<LuSearch className="w-3.5 h-3.5" />}
            rightIcon={searchQuery ? <button onClick={() => setSearchQuery("")} className="hover:text-text-primary"><LuX className="w-3 h-3" /></button> : undefined}
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={hideUnavailable}
              onChange={(e) => setHideUnavailable(e.target.checked)}
              className="w-3 h-3 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
            />
            <span className="text-tiny text-text-secondary">Hide unavailable ({unavailableCount})</span>
          </label>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} options={sortOptions} className="w-24" />
        </div>
      </div>

      {usedPlayerIds.size > 0 && (
        <div className="flex items-center gap-1.5 text-tiny text-text-muted bg-warning-soft/50 px-2.5 py-1.5 rounded-md">
          <LuTriangleAlert className="w-3 h-3 text-warning shrink-0" />
          <span>Used <strong className="font-medium text-warning-text">{usedPlayerIds.size}</strong> player{usedPlayerIds.size !== 1 ? 's' : ''} this season</span>
        </div>
      )}

      {/* Position columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {renderColumn("qb")}
        {renderColumn("rb")}
        {renderColumn("wr")}
      </div>

      {/* Save bar */}
      <Card padding="sm" className="sticky bottom-2 flex items-center justify-between gap-2 shadow-card-hover">
        <div className="flex items-center gap-1.5">
          {hasChanges ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
              <span className="text-tiny text-warning-text font-medium">Unsaved changes</span>
            </>
          ) : (
            <>
              <LuCheck className="w-3 h-3 text-success" />
              <span className="text-tiny text-text-muted">Saved</span>
            </>
          )}
        </div>
        <Button onClick={savePicks} disabled={saving || !hasChanges} loading={saving} size="sm">
          {saving ? "Saving..." : "Save Picks"}
        </Button>
      </Card>
    </div>
  );
};

