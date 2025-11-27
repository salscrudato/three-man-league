import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { PAYOUT_STRUCTURE, TOTAL_POT, ENTRY_FEE } from "../../types";
import { Card, CardHeader, Badge, Tabs, Select, TableSkeleton } from "../../components";

interface WeeklyScore {
  userId: string;
  displayName?: string;
  totalPoints: number;
  qbPoints: number;
  rbPoints: number;
  wrPoints: number;
  doublePickPositions?: string[];
}

interface SeasonStanding {
  userId: string;
  displayName: string;
  seasonTotalPoints: number;
  weeksPlayed: number;
  bestWeekPoints: number;
  bestWeek: string;
}

type ViewMode = "weekly" | "season";

// Medal icons for top 3
const MedalIcon: React.FC<{ rank: number }> = ({ rank }) => {
  const colors = {
    1: "from-yellow-400 to-yellow-600",
    2: "from-gray-300 to-gray-500",
    3: "from-amber-500 to-amber-700",
  };
  const color = colors[rank as keyof typeof colors];
  if (!color) return null;

  return (
    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-caption shadow-sm`}>
      {rank}
    </div>
  );
};

export const StandingsPage: React.FC = () => {
  const [weeklyScores, setWeeklyScores] = useState<WeeklyScore[]>([]);
  const [seasonStandings, setSeasonStandings] = useState<SeasonStanding[]>([]);
  const [weekId, setWeekId] = useState("week-1");
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  const leagueId = import.meta.env.VITE_LEAGUE_ID;

  // Determine current week
  useEffect(() => {
    const now = new Date();
    const seasonStart = new Date("2025-09-04");
    if (now >= seasonStart) {
      const weekNum = Math.min(18, Math.max(1, Math.ceil((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))));
      setWeekId(`week-${weekNum}`);
    }
  }, []);

  // Load weekly scores
  useEffect(() => {
    if (viewMode !== "weekly") return;

    async function loadWeekly() {
      if (!leagueId) return;
      setLoading(true);

      try {
        const scoresRef = collection(db, "leagues", leagueId, "weeks", weekId, "scores");
        const snap = await getDocs(query(scoresRef, orderBy("totalPoints", "desc")));

        const rows: WeeklyScore[] = [];
        const userIds: string[] = [];

        snap.forEach((doc) => {
          const d = doc.data();
          rows.push({
            userId: doc.id,
            totalPoints: d.totalPoints ?? 0,
            qbPoints: d.qbPoints ?? 0,
            rbPoints: d.rbPoints ?? 0,
            wrPoints: d.wrPoints ?? 0,
            doublePickPositions: d.doublePickPositions ?? [],
          });
          userIds.push(doc.id);
        });

        // Fetch user display names
        const names: Record<string, string> = { ...userNames };
        for (const uid of userIds) {
          if (!names[uid]) {
            try {
              const userDoc = await getDoc(doc(db, "users", uid));
              if (userDoc.exists()) {
                names[uid] = userDoc.data().displayName || uid.slice(0, 8);
              } else {
                names[uid] = uid.slice(0, 8);
              }
            } catch {
              names[uid] = uid.slice(0, 8);
            }
          }
        }
        setUserNames(names);

        setWeeklyScores(rows.map(r => ({ ...r, displayName: names[r.userId] })));
      } catch (err) {
        console.error("Failed to load weekly scores:", err);
      } finally {
        setLoading(false);
      }
    }
    loadWeekly();
  }, [weekId, viewMode, leagueId]);

  // Load season standings
  useEffect(() => {
    if (viewMode !== "season") return;

    async function loadSeason() {
      if (!leagueId) return;
      setLoading(true);

      try {
        const standingsRef = collection(db, "leagues", leagueId, "seasonStandings");
        const snap = await getDocs(query(standingsRef, orderBy("seasonTotalPoints", "desc")));

        const rows: SeasonStanding[] = [];
        snap.forEach((doc) => {
          const d = doc.data();
          rows.push({
            userId: doc.id,
            displayName: d.displayName || doc.id.slice(0, 8),
            seasonTotalPoints: d.seasonTotalPoints ?? 0,
            weeksPlayed: d.weeksPlayed ?? 0,
            bestWeekPoints: d.bestWeekPoints ?? 0,
            bestWeek: d.bestWeek ?? "",
          });
        });

        setSeasonStandings(rows);
      } catch (err) {
        console.error("Failed to load season standings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSeason();
  }, [viewMode, leagueId]);

  const getPayout = (rank: number): number => {
    return PAYOUT_STRUCTURE[rank] || 0;
  };

  // Week options for select
  const weekOptions = Array.from({ length: 18 }, (_, i) => ({
    value: `week-${i + 1}`,
    label: `Week ${i + 1}`,
  }));

  // Tabs configuration
  const tabs = [
    { id: "weekly", label: "Weekly Results" },
    { id: "season", label: "Season Standings" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-page-title text-text-primary">Standings</h1>
          <p className="text-body text-text-secondary mt-1">
            Track weekly results and season-long performance
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Tabs
            tabs={tabs}
            activeTab={viewMode}
            onChange={(id) => setViewMode(id as ViewMode)}
            variant="segmented"
            size="sm"
          />
          {viewMode === "weekly" && (
            <Select
              value={weekId}
              onChange={(e) => setWeekId(e.target.value)}
              options={weekOptions}
              className="w-32"
            />
          )}
        </div>
      </div>

      {/* Weekly Standings Table */}
      {viewMode === "weekly" && (
        <Card padding="none" className="overflow-hidden">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={8} columns={6} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-subtle border-b border-border">
                    <th className="px-4 py-3 text-left text-caption font-semibold text-text-muted uppercase tracking-wide w-16">Rank</th>
                    <th className="px-4 py-3 text-left text-caption font-semibold text-text-muted uppercase tracking-wide">Player</th>
                    <th className="px-4 py-3 text-right text-caption font-semibold text-text-muted uppercase tracking-wide">QB</th>
                    <th className="px-4 py-3 text-right text-caption font-semibold text-text-muted uppercase tracking-wide">RB</th>
                    <th className="px-4 py-3 text-right text-caption font-semibold text-text-muted uppercase tracking-wide">WR</th>
                    <th className="px-4 py-3 text-right text-caption font-semibold text-text-muted uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {weeklyScores.map((s, idx) => (
                    <tr
                      key={s.userId}
                      className={`transition-colors hover:bg-subtle/50 ${idx < 3 ? "bg-primary-soft/30" : ""}`}
                    >
                      <td className="px-4 py-3">
                        {idx < 3 ? (
                          <MedalIcon rank={idx + 1} />
                        ) : (
                          <span className="text-body-sm text-text-muted font-medium">{idx + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-body-sm font-medium text-text-primary">
                          {s.displayName}
                        </span>
                        {s.doublePickPositions && s.doublePickPositions.length > 0 && (
                          <Badge variant="error" size="sm" className="ml-2">
                            ⚠ {s.doublePickPositions.join(", ")}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-body-sm text-text-secondary tabular-nums">
                        {s.qbPoints.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-body-sm text-text-secondary tabular-nums">
                        {s.rbPoints.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-body-sm text-text-secondary tabular-nums">
                        {s.wrPoints.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-body-sm font-semibold text-text-primary tabular-nums">
                          {s.totalPoints.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {weeklyScores.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <div className="text-text-muted">
                          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <p className="text-body-sm">No scores yet for {weekId.replace("-", " ")}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Season Standings Table */}
      {viewMode === "season" && (
        <Card padding="none" className="overflow-hidden">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={8} columns={6} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-subtle border-b border-border">
                    <th className="px-4 py-3 text-left text-caption font-semibold text-text-muted uppercase tracking-wide w-16">Rank</th>
                    <th className="px-4 py-3 text-left text-caption font-semibold text-text-muted uppercase tracking-wide">Player</th>
                    <th className="px-4 py-3 text-right text-caption font-semibold text-text-muted uppercase tracking-wide">Weeks</th>
                    <th className="px-4 py-3 text-right text-caption font-semibold text-text-muted uppercase tracking-wide">Best Week</th>
                    <th className="px-4 py-3 text-right text-caption font-semibold text-text-muted uppercase tracking-wide">Total Pts</th>
                    <th className="px-4 py-3 text-right text-caption font-semibold text-text-muted uppercase tracking-wide">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {seasonStandings.map((s, idx) => {
                    const payout = getPayout(idx + 1);
                    return (
                      <tr
                        key={s.userId}
                        className={`transition-colors hover:bg-subtle/50 ${idx < 3 ? "bg-primary-soft/30" : ""}`}
                      >
                        <td className="px-4 py-3">
                          {idx < 3 ? (
                            <MedalIcon rank={idx + 1} />
                          ) : (
                            <span className="text-body-sm text-text-muted font-medium">{idx + 1}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-body-sm font-medium text-text-primary">
                            {s.displayName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-body-sm text-text-secondary tabular-nums">
                          {s.weeksPlayed}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-body-sm text-text-primary font-medium tabular-nums">
                            {s.bestWeekPoints.toFixed(2)}
                          </span>
                          <span className="text-caption text-text-muted ml-1">
                            ({s.bestWeek.replace("week-", "W")})
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-body-sm font-semibold text-text-primary tabular-nums">
                            {s.seasonTotalPoints.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {payout > 0 ? (
                            <Badge variant="success" size="md">${payout}</Badge>
                          ) : (
                            <span className="text-text-subtle">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {seasonStandings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <div className="text-text-muted">
                          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <p className="text-body-sm">No season standings yet</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Payout Structure Card */}
      <Card>
        <CardHeader
          title="Prize Pool Distribution"
          subtitle={`$${TOTAL_POT.toLocaleString()} total pot • $${ENTRY_FEE} entry fee`}
        />
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(PAYOUT_STRUCTURE).map(([rank, amount]) => {
            const rankNum = parseInt(rank);
            const ordinal = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"][rankNum - 1];
            return (
              <div
                key={rank}
                className={`rounded-card p-3 text-center border ${
                  rankNum <= 3
                    ? "bg-primary-soft/50 border-primary/20"
                    : "bg-subtle border-border"
                }`}
              >
                <div className="text-caption text-text-muted font-medium">{ordinal}</div>
                <div className="text-section-title font-bold text-primary mt-1">
                  ${amount.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

