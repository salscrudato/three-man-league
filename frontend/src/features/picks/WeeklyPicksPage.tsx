import React, { useEffect, useState, useMemo } from "react";
import { auth, db } from "../../firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from "firebase/firestore";
import type { Player, Game, UserPicks, PlayerUsage, PlayerOption } from "../../types";
import { Button, Badge, Card, Alert, Input, Select, PlayerListSkeleton } from "../../components";
import { useLeague } from "../../league/LeagueContext";

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

const SEASON = "2025";

// Regular season typically starts first week of September
// This helps filter out playoff games from previous seasons that have overlapping week numbers
const SEASON_START = new Date("2025-09-01T00:00:00Z");

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

// Position display configuration
const positionConfig = {
  qb: { label: "Quarterback", shortLabel: "QB", color: "text-red-600", bgColor: "bg-red-50" },
  rb: { label: "Running Back", shortLabel: "RB", color: "text-blue-600", bgColor: "bg-blue-50" },
  wr: { label: "Wide Receiver", shortLabel: "WR", color: "text-amber-600", bgColor: "bg-amber-50" },
};

export const WeeklyPicksPage: React.FC = () => {
  const { activeLeagueId, loading: leagueLoading } = useLeague();
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [picks, setPicks] = useState<PicksState>({});
  const [savedPicks, setSavedPicks] = useState<PicksState>({});
  const [usedPlayerIds, setUsedPlayerIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weekId, setWeekId] = useState<string>("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

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
        }
      } catch {
        // Fallback to week 1 if config not available
        setWeekId("week-1");
      }
    }
    loadCurrentWeek();
  }, []);

  // Reset players when week or league changes to prevent stale data
  useEffect(() => {
    setPlayers([]);
    setUsedPlayerIds(new Set());
    setPicks({});
    setSavedPicks({});
  }, [weekId, leagueId]);

  // Load players, games, and user's existing picks
  useEffect(() => {
    async function loadData() {
      if (!currentUser || !weekId || !leagueId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const weekNumber = parseInt(weekId.replace("week-", ""));

        // Load games for this week
        const gamesRef = collection(db, "games");
        const gamesQuery = query(gamesRef, where("weekNumber", "==", weekNumber));
        const gamesSnap = await getDocs(gamesQuery);

        const gamesMap = new Map<string, Game>();
        gamesSnap.forEach((doc) => {
          const data = doc.data();
          const game = { id: doc.id, ...data } as Game;

          // Filter out games that are before the season start (e.g., playoff games from previous season)
          const kickoff = parseKickoffTime(game.kickoffTime);
          if (kickoff >= SEASON_START) {
            gamesMap.set(doc.id, game);
          }
        });

        // Load all players
        const playersRef = collection(db, "players");
        const playersSnap = await getDocs(playersRef);

        // Load user's player usage for this season AND league
        const usageRef = collection(db, "users", currentUser.uid, "playerUsage");
        const usageQuery = query(
          usageRef,
          where("season", "==", SEASON),
          where("leagueId", "==", leagueId)
        );
        const usageSnap = await getDocs(usageQuery);

        const usedIds = new Set<string>();
        const usageByPlayer = new Map<string, PlayerUsage>();
        usageSnap.forEach((doc) => {
          const data = doc.data() as PlayerUsage;
          usedIds.add(data.playerId);
          usageByPlayer.set(data.playerId, data);
        });
        setUsedPlayerIds(usedIds);

        // Load existing picks for this week
        const pickDocRef = doc(db, "leagues", leagueId, "weeks", weekId, "picks", currentUser.uid);
        const pickSnap = await getDoc(pickDocRef);
        if (pickSnap.exists()) {
          const existingPicks = pickSnap.data() as UserPicks;
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
          const player = pDoc.data() as Player;

          // Find games for this player's team this week
          gamesMap.forEach((game) => {
            const isHome = game.homeTeamId === player.teamId;
            const isAway = game.awayTeamId === player.teamId;
            if (!isHome && !isAway) return;

            const kickoffTime = parseKickoffTime(game.kickoffTime);
            const isLocked = now > kickoffTime.getTime() - oneHour;
            const opponent = isHome ? `vs ${game.awayTeamName}` : `@ ${game.homeTeamName}`;

            // Check if player was used in a different week
            const usage = usageByPlayer.get(pDoc.id);
            const isUsedInDifferentWeek = usage && usage.firstUsedWeek !== weekId;

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
        setPlayers(playerOptions);
      } catch {
        setMessage({ type: "error", text: "Failed to load players and games" });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [weekId, leagueId, currentUser]);

  const handlePick = (pos: PositionKey, option: PlayerOption) => {
    if (option.isLocked || option.isUsed) return;
    if (picks[`${pos}Locked` as keyof PicksState]) return;

    setPicks((prev) => ({
      ...prev,
      [`${pos}PlayerId`]: option.id,
      [`${pos}GameId`]: option.gameId,
    }));
  };

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

  const savePicks = async () => {
    if (!currentUser) return;

    setSaving(true);
    setMessage(null);

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/submitPicks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          leagueId,
          weekId,
          userId: currentUser.uid,
          picks: {
            qbPlayerId: picks.qbPlayerId,
            qbGameId: picks.qbGameId,
            rbPlayerId: picks.rbPlayerId,
            rbGameId: picks.rbGameId,
            wrPlayerId: picks.wrPlayerId,
            wrGameId: picks.wrGameId,
          },
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setSavedPicks(picks);
        const accepted = data.accepted?.join(", ") || "none";
        const skipped = data.skipped?.length > 0 ? ` (skipped: ${data.skipped.join("; ")})` : "";
        setMessage({ type: "success", text: `Picks saved! Accepted: ${accepted}${skipped}` });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save picks" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error saving picks" });
    } finally {
      setSaving(false);
    }
  };

  const getTimeUntilLock = (kickoff: Date): string => {
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
  };

  const renderColumn = (pos: PositionKey) => {
    const posPlayers = groupedByPos[pos];
    const selectedId = picks[`${pos}PlayerId` as keyof PicksState];
    const isLocked = picks[`${pos}Locked` as keyof PicksState];
    const selectedPlayer = posPlayers.find(p => p.id === selectedId);
    const config = positionConfig[pos];

    return (
      <Card padding="none" className="flex flex-col overflow-hidden">
        {/* Position header */}
        <div className={`px-4 py-3 border-b border-border ${config.bgColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-card-title font-semibold ${config.color}`}>
                {config.label}
              </span>
              <Badge variant="neutral" size="sm">{config.shortLabel}</Badge>
            </div>
            {isLocked && <Badge variant="error">LOCKED</Badge>}
          </div>
        </div>

        {/* Current selection */}
        <div className="p-3 bg-subtle/50 border-b border-border">
          {selectedPlayer ? (
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-body font-bold ${config.bgColor} ${config.color}`}>
                {config.shortLabel}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-semibold text-text-primary truncate">
                  {selectedPlayer.name}
                </p>
                <p className="text-caption text-text-secondary">
                  {selectedPlayer.team} {selectedPlayer.opponent}
                </p>
                <p className="text-tiny text-text-muted">
                  {selectedPlayer.kickoffFormatted}
                </p>
              </div>
              {!isLocked && (
                <button
                  onClick={() => setPicks(prev => ({
                    ...prev,
                    [`${pos}PlayerId`]: undefined,
                    [`${pos}GameId`]: undefined,
                  }))}
                  className="text-text-muted hover:text-text-primary p-1"
                  aria-label="Clear selection"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 py-1">
              <div className="w-10 h-10 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-text-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-body-sm text-text-muted">Select a {config.label.toLowerCase()}</p>
            </div>
          )}
        </div>

        {/* Player list */}
        <div className="flex-1 overflow-y-auto max-h-80 divide-y divide-border">
          {loading ? (
            <div className="p-3">
              <PlayerListSkeleton count={4} />
            </div>
          ) : posPlayers.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-body-sm text-text-muted">
                {searchQuery ? "No players match your search" : "No players available"}
              </p>
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
                  className={`w-full text-left px-4 py-3 transition-all duration-150 focus:outline-none focus:bg-subtle ${
                    selected
                      ? "bg-primary-soft border-l-4 border-l-primary"
                      : isDisabled
                      ? "opacity-50 cursor-not-allowed bg-surface"
                      : "hover:bg-subtle bg-surface"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-body-sm font-medium text-text-primary truncate">
                          {p.name}
                        </span>
                        {fantasyPts !== undefined && fantasyPts > 0 && (
                          <Badge variant="info" size="sm">
                            {fantasyPts.toFixed(1)} pts
                          </Badge>
                        )}
                        {p.isUsed && (
                          <Badge variant="warning" size="sm">USED</Badge>
                        )}
                        {p.isLocked && (
                          <Badge variant="error" size="sm">LOCKED</Badge>
                        )}
                      </div>
                      <p className="text-caption text-text-secondary mt-0.5">
                        {p.team} {p.opponent}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-caption font-medium ${
                        p.isLocked ? "text-error" : "text-text-muted"
                      }`}>
                        {timeUntilLock === "LOCKED" ? "Locked" : timeUntilLock}
                      </p>
                      <p className="text-tiny text-text-subtle">
                        {p.kickoff.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
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

  const hasChanges = JSON.stringify(picks) !== JSON.stringify(savedPicks);

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

  // Show message if no league selected
  if (!leagueLoading && !leagueId) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-soft rounded-full mb-4">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-section-title font-bold text-text-primary mb-2">No League Selected</h2>
        <p className="text-body text-text-secondary mb-6">
          Join or create a league to start making picks.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="primary" onClick={() => window.location.href = "/create-league"}>
            Create League
          </Button>
          <Button variant="secondary" onClick={() => window.location.href = "/join"}>
            Join League
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-page-title text-text-primary">Weekly Picks</h1>
          <p className="text-body text-text-secondary mt-1">
            Select one player from each position. Picks lock 1 hour before kickoff.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="neutral" size="md">1 QB</Badge>
            <Badge variant="neutral" size="md">1 RB</Badge>
            <Badge variant="neutral" size="md">1 WR</Badge>
            <Badge variant="warning" size="md">One-and-done rule</Badge>
          </div>
        </div>

        {/* Week selector */}
        <div className="shrink-0">
          <Select
            value={weekId}
            onChange={(e) => setWeekId(e.target.value)}
            options={weekOptions}
            className="w-40"
          />
        </div>
      </div>

      {/* Alert messages */}
      {message && (
        <Alert
          type={message.type}
          message={message.text}
          onClose={() => setMessage(null)}
        />
      )}

      {/* Search, Filter, and Sort controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by player name or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
              rightIcon={
                searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="hover:text-text-primary transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : undefined
              }
            />
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideUnavailable}
                onChange={(e) => setHideUnavailable(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-body-sm text-text-secondary">
                Hide locked/used ({unavailableCount})
              </span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-caption text-text-muted">Sort:</span>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                options={sortOptions}
                className="w-32"
              />
            </div>
          </div>
        </div>

        {/* Used players summary */}
        {usedPlayerIds.size > 0 && (
          <div className="flex items-center gap-2 text-caption text-text-muted">
            <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>You've used {usedPlayerIds.size} player{usedPlayerIds.size !== 1 ? 's' : ''} this season (one-and-done rule)</span>
          </div>
        )}
      </div>

      {/* Position columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {renderColumn("qb")}
        {renderColumn("rb")}
        {renderColumn("wr")}
      </div>

      {/* Save bar */}
      <Card className="sticky bottom-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {hasChanges ? (
            <>
              <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              <span className="text-body-sm text-warning-text font-medium">
                You have unsaved changes
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-body-sm text-text-muted">
                All changes saved
              </span>
            </>
          )}
        </div>
        <Button
          onClick={savePicks}
          disabled={saving || !hasChanges}
          loading={saving}
          size="md"
        >
          {saving ? "Saving..." : "Save Picks"}
        </Button>
      </Card>
    </div>
  );
};

