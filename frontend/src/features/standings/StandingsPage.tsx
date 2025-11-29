import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { PAYOUT_STRUCTURE, TOTAL_POT, ENTRY_FEE, getPayoutForRank } from "../../types";
import { Card, Badge, Tabs, Select, TableSkeleton, Button } from "../../components";
import { useLeague } from "../../league/LeagueContext";
import { LuTrophy, LuChartBar, LuUsers } from "react-icons/lu";

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

const MedalIcon: React.FC<{ rank: number }> = ({ rank }) => {
  const colors = { 1: "bg-amber-400", 2: "bg-slate-400", 3: "bg-amber-600" };
  const color = colors[rank as keyof typeof colors];
  if (!color) return null;
  return <div className={`w-5 h-5 rounded ${color} flex items-center justify-center text-white font-semibold text-tiny`}>{rank}</div>;
};

export const StandingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeLeagueId, activeLeague, loading: leagueLoading } = useLeague();
  const [weeklyScores, setWeeklyScores] = useState<WeeklyScore[]>([]);
  const [seasonStandings, setSeasonStandings] = useState<SeasonStanding[]>([]);
  const [weekId, setWeekId] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [loading, setLoading] = useState(true);

  // Use activeLeagueId from context
  const leagueId = activeLeagueId;

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
          // No config document - fallback to week 1
          setWeekId("week-1");
        }
      } catch {
        // Fallback to week 1 if config not available
        setWeekId("week-1");
      }
    }
    loadCurrentWeek();
  }, []);

  // Load weekly scores
  useEffect(() => {
    if (viewMode !== "weekly" || !weekId) return;

    async function loadWeekly() {
      if (!leagueId) return;
      setLoading(true);

      try {
        // First, fetch league members to get display names
        const membersRef = collection(db, "leagues", leagueId, "members");
        const membersSnap = await getDocs(membersRef);
        const memberNames: Record<string, string> = {};
        membersSnap.forEach((memberDoc) => {
          const data = memberDoc.data();
          memberNames[memberDoc.id] = data.displayName || memberDoc.id.slice(0, 8);
        });

        // Then fetch scores
        const scoresRef = collection(db, "leagues", leagueId, "weeks", weekId, "scores");
        const snap = await getDocs(query(scoresRef, orderBy("totalPoints", "desc")));

        const rows: WeeklyScore[] = [];

        snap.forEach((scoreDoc) => {
          const d = scoreDoc.data();
          rows.push({
            userId: scoreDoc.id,
            displayName: memberNames[scoreDoc.id] || scoreDoc.id.slice(0, 8),
            totalPoints: d.totalPoints ?? 0,
            qbPoints: d.qbPoints ?? 0,
            rbPoints: d.rbPoints ?? 0,
            wrPoints: d.wrPoints ?? 0,
            doublePickPositions: d.doublePickPositions ?? [],
          });
        });

        setWeeklyScores(rows);
      } catch {
        // Error loading weekly scores - silently fail
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
      } catch {
        // Error loading season standings - silently fail
      } finally {
        setLoading(false);
      }
    }
    loadSeason();
  }, [viewMode, leagueId]);

  const getPayout = useCallback((rank: number): number => {
    // Use shared helper that prefers payoutStructure over legacy payouts
    if (activeLeague) {
      return getPayoutForRank(activeLeague, rank);
    }
    return PAYOUT_STRUCTURE[rank] || 0;
  }, [activeLeague]);

  // Calculate points behind leader for season standings
  const leaderPoints = useMemo(() => {
    if (seasonStandings.length === 0) return 0;
    return seasonStandings[0].seasonTotalPoints;
  }, [seasonStandings]);

  const getPointsBehind = useCallback((points: number): string => {
    const diff = leaderPoints - points;
    if (diff === 0) return "—";
    return `-${diff.toFixed(1)}`;
  }, [leaderPoints]);

  // Week options for select - memoized since it's static
  const weekOptions = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    value: `week-${i + 1}`,
    label: `Week ${i + 1}`,
  })), []);

  // Tabs configuration - memoized since it's static
  const tabs = useMemo(() => [
    { id: "weekly", label: "Weekly Results" },
    { id: "season", label: "Season Standings" },
  ], []);

  if (!leagueLoading && !leagueId) {
    return (
      <div className="text-center py-10">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-soft rounded-lg mb-3">
          <LuUsers className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-card-title text-text-primary mb-1">No League Selected</h2>
        <p className="text-body-sm text-text-secondary mb-4 max-w-xs mx-auto">Join or create a league to view standings.</p>
        <div className="flex justify-center gap-2">
          <Button variant="primary" size="sm" onClick={() => navigate("/create-league")}>Create League</Button>
          <Button variant="secondary" size="sm" onClick={() => navigate("/join")}>Join League</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-section-title text-text-primary">Standings</h1>
          <p className="text-body-sm text-text-muted mt-0.5">Weekly results and season performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs tabs={tabs} activeTab={viewMode} onChange={(id) => setViewMode(id as ViewMode)} variant="segmented" size="sm" />
          {viewMode === "weekly" && <Select value={weekId} onChange={(e) => setWeekId(e.target.value)} options={weekOptions} className="w-24" />}
        </div>
      </div>

      {viewMode === "weekly" && (
        <Card padding="none" className="overflow-hidden">
          {loading ? (
            <div className="p-3"><TableSkeleton rows={6} columns={6} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-subtle/60 border-b border-border/40">
                    <th className="px-2.5 py-2 text-left text-tiny font-medium text-text-muted uppercase tracking-wide w-10">#</th>
                    <th className="px-2.5 py-2 text-left text-tiny font-medium text-text-muted uppercase tracking-wide">Player</th>
                    <th className="px-2.5 py-2 text-right text-tiny font-medium text-text-muted uppercase tracking-wide">QB</th>
                    <th className="px-2.5 py-2 text-right text-tiny font-medium text-text-muted uppercase tracking-wide">RB</th>
                    <th className="px-2.5 py-2 text-right text-tiny font-medium text-text-muted uppercase tracking-wide">WR</th>
                    <th className="px-2.5 py-2 text-right text-tiny font-medium text-text-muted uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyScores.map((s, idx) => (
                    <tr key={s.userId} className={`border-b border-border/20 last:border-0 hover:bg-subtle/40 transition-colors ${idx < 3 ? "bg-primary-soft/30" : ""}`}>
                      <td className="px-2.5 py-2">{idx < 3 ? <MedalIcon rank={idx + 1} /> : <span className="text-tiny text-text-muted">{idx + 1}</span>}</td>
                      <td className="px-2.5 py-2">
                        <span className="text-body-sm font-medium text-text-primary">{s.displayName}</span>
                        {s.doublePickPositions && s.doublePickPositions.length > 0 && (
                          <Badge variant="error" size="sm" className="ml-1">{s.doublePickPositions.join(", ")}</Badge>
                        )}
                      </td>
                      <td className="px-2.5 py-2 text-right text-tiny text-text-secondary tabular-nums">{s.qbPoints.toFixed(1)}</td>
                      <td className="px-2.5 py-2 text-right text-tiny text-text-secondary tabular-nums">{s.rbPoints.toFixed(1)}</td>
                      <td className="px-2.5 py-2 text-right text-tiny text-text-secondary tabular-nums">{s.wrPoints.toFixed(1)}</td>
                      <td className="px-2.5 py-2 text-right text-body-sm font-semibold text-text-primary tabular-nums">{s.totalPoints.toFixed(1)}</td>
                    </tr>
                  ))}
                  {weeklyScores.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-2.5 py-8 text-center">
                        <LuChartBar className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-40" />
                        <p className="text-body-sm text-text-muted">No scores for {weekId.replace("-", " ")}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {viewMode === "season" && (
        <Card padding="none" className="overflow-hidden">
          {loading ? (
            <div className="p-3"><TableSkeleton rows={6} columns={7} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-subtle/60 border-b border-border/40">
                    <th className="px-2.5 py-2 text-left text-tiny font-medium text-text-muted uppercase tracking-wide w-10">#</th>
                    <th className="px-2.5 py-2 text-left text-tiny font-medium text-text-muted uppercase tracking-wide">Player</th>
                    <th className="px-2.5 py-2 text-right text-tiny font-medium text-text-muted uppercase tracking-wide">Wks</th>
                    <th className="px-2.5 py-2 text-right text-tiny font-medium text-text-muted uppercase tracking-wide">Best</th>
                    <th className="px-2.5 py-2 text-right text-tiny font-medium text-text-muted uppercase tracking-wide">Total</th>
                    <th className="px-2.5 py-2 text-right text-tiny font-medium text-text-muted uppercase tracking-wide">GB</th>
                    <th className="px-2.5 py-2 text-right text-tiny font-medium text-text-muted uppercase tracking-wide">$</th>
                  </tr>
                </thead>
                <tbody>
                  {seasonStandings.map((s, idx) => {
                    const payout = getPayout(idx + 1);
                    const pointsBehind = getPointsBehind(s.seasonTotalPoints);
                    return (
                      <tr key={s.userId} className={`border-b border-border/20 last:border-0 hover:bg-subtle/40 transition-colors ${idx < 3 ? "bg-primary-soft/30" : ""}`}>
                        <td className="px-2.5 py-2">{idx < 3 ? <MedalIcon rank={idx + 1} /> : <span className="text-tiny text-text-muted">{idx + 1}</span>}</td>
                        <td className="px-2.5 py-2 text-body-sm font-medium text-text-primary">{s.displayName}</td>
                        <td className="px-2.5 py-2 text-right text-tiny text-text-secondary tabular-nums">{s.weeksPlayed}</td>
                        <td className="px-2.5 py-2 text-right">
                          <span className="text-tiny text-text-primary tabular-nums">{s.bestWeekPoints.toFixed(1)}</span>
                          <span className="text-tiny text-text-subtle ml-0.5">({s.bestWeek.replace("week-", "W")})</span>
                        </td>
                        <td className="px-2.5 py-2 text-right text-body-sm font-semibold text-text-primary tabular-nums">{s.seasonTotalPoints.toFixed(1)}</td>
                        <td className="px-2.5 py-2 text-right text-tiny tabular-nums ${idx === 0 ? 'text-text-subtle' : 'text-error'}">{pointsBehind}</td>
                        <td className="px-2.5 py-2 text-right">{payout > 0 ? <Badge variant="success" size="sm">${payout}</Badge> : <span className="text-text-subtle">—</span>}</td>
                      </tr>
                    );
                  })}
                  {seasonStandings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-2.5 py-8 text-center">
                        <LuTrophy className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-40" />
                        <p className="text-body-sm text-text-muted">No season standings yet</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card padding="sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-body-sm font-medium text-text-primary">Prize Pool</span>
          <span className="text-tiny text-text-muted">${TOTAL_POT.toLocaleString()} total • ${ENTRY_FEE} entry</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          {Object.entries(PAYOUT_STRUCTURE).map(([rank, amount]) => {
            const rankNum = parseInt(rank);
            return (
              <div key={rank} className={`rounded-md p-1.5 text-center ${rankNum <= 3 ? "bg-primary-soft/80" : "bg-subtle"}`}>
                <div className="text-tiny text-text-muted">{rankNum}</div>
                <div className="text-body-sm font-semibold text-primary">${amount}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

