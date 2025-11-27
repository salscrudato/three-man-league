import React, { useEffect, useState, useMemo } from "react";
import { auth, db } from "../../firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from "firebase/firestore";
import type { Player, Game, UserPicks, PlayerUsage, PlayerOption } from "../../types";
import { Button, Badge, Card, Alert, Input, Select, PlayerListSkeleton } from "../../components";

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

type SortOption = "fantasyPoints" | "kickoff" | "name";

// Position display configuration
const positionConfig = {
  qb: { label: "Quarterback", shortLabel: "QB", color: "text-red-600", bgColor: "bg-red-50" },
  rb: { label: "Running Back", shortLabel: "RB", color: "text-blue-600", bgColor: "bg-blue-50" },
  wr: { label: "Wide Receiver", shortLabel: "WR", color: "text-amber-600", bgColor: "bg-amber-50" },
};

export const WeeklyPicksPage: React.FC = () => {
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [picks, setPicks] = useState<PicksState>({});
  const [savedPicks, setSavedPicks] = useState<PicksState>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_usedPlayerIds, setUsedPlayerIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weekId, setWeekId] = useState<string>("week-1");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("fantasyPoints");

  const leagueId = import.meta.env.VITE_LEAGUE_ID;

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("[WeeklyPicksPage] Auth state changed:", user?.email);
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Determine current week based on date
  useEffect(() => {
    const now = new Date();
    // NFL season typically starts first Thursday of September
    // For 2025, approximate week calculation
    const seasonStart = new Date("2025-09-04");
    if (now >= seasonStart) {
      const weekNum = Math.min(18, Math.max(1, Math.ceil((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))));
      setWeekId(`week-${weekNum}`);
    }
  }, []);

  // Load players, games, and user's existing picks
  useEffect(() => {
    async function loadData() {
      console.log("[WeeklyPicksPage] Loading data, user:", currentUser?.email);
      if (!currentUser) {
        console.log("[WeeklyPicksPage] No user, skipping load");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const weekNumber = parseInt(weekId.replace("week-", ""));
        console.log("[WeeklyPicksPage] Loading week:", weekNumber);

        // Load games for this week
        const gamesRef = collection(db, "games");
        const gamesQuery = query(gamesRef, where("weekNumber", "==", weekNumber));
        const gamesSnap = await getDocs(gamesQuery);
        console.log("[WeeklyPicksPage] Games loaded:", gamesSnap.size);

        const gamesMap = new Map<string, Game>();
        gamesSnap.forEach((doc) => {
          const data = doc.data();
          gamesMap.set(doc.id, { id: doc.id, ...data } as Game);
        });

        // Load all players
        const playersRef = collection(db, "players");
        const playersSnap = await getDocs(playersRef);
        console.log("[WeeklyPicksPage] Players loaded:", playersSnap.size);

        // Load user's player usage for the season
        const usageRef = collection(db, "users", currentUser.uid, "playerUsage");
        const usageQuery = query(usageRef, where("season", "==", SEASON));
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

            const kickoffTime = game.kickoffTime instanceof Timestamp
              ? game.kickoffTime.toDate()
              : new Date(game.kickoffTime as unknown as string);

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
        console.log("[WeeklyPicksPage] Player options built:", playerOptions.length);
        console.log("[WeeklyPicksPage] Sample player:", playerOptions[0]);
        setPlayers(playerOptions);
      } catch (err) {
        console.error("[WeeklyPicksPage] Failed to load data:", err);
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

  // Filter players by search query (name or team)
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
  }, [players, searchQuery, sortBy]);

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
    } catch (err) {
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

  // Generate week options
  const weekOptions = Array.from({ length: 18 }, (_, i) => ({
    value: `week-${i + 1}`,
    label: `Week ${i + 1}`,
  }));

  const sortOptions = [
    { value: "fantasyPoints", label: "Season Pts" },
    { value: "kickoff", label: "Kickoff Time" },
    { value: "name", label: "Player Name" },
  ];

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

      {/* Search and Sort controls */}
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
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-caption text-text-muted">Sort by:</span>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            options={sortOptions}
            className="w-36"
          />
        </div>
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

