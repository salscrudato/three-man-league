import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, SEASON } from "./config.js";
import {
  fetchSeasonSchedule,
  fetchEventStats,
  fetchAllNflPlayers,
  fetchLeagueTeams,
  fetchPlayerSeasonStats,
  calculateFantasyPoints,
  getCurrentWeek,
  type SportsPlayer
} from "./sportsApi.js";
import { calculateDraftKingsPoints, mapSportsDbToStats } from "./scoring.js";
import { setCors } from "./utils/http.js";
import * as admin from "firebase-admin";
import type { EligiblePosition, Position, SeasonStats } from "./types.js";

// Re-export AI chat function
export { aiChat } from "./aiAssistant.js";

// Re-export league management functions
export {
  createLeague,
  joinLeague,
  getUserLeagues,
  getLeagueDetails,
  updateLeagueSettings,
  regenerateJoinCode,
  leaveOrRemoveMember,
  setActiveLeague,
} from "./leagueManagement.js";

// Re-export backfill functions for mid-season setup
export {
  enableBackfill,
  getBackfillStatus,
  backfillWeekForLeague,
  completeBackfill,
  getBackfillWeekScores,
} from "./backfill.js";

// ===== Helper: Map position string to our Position type =====
function normalizePosition(pos: string): Position | null {
  const p = pos?.toUpperCase().trim();
  if (p === "QUARTERBACK" || p === "QB") return "QB";
  if (p === "RUNNING BACK" || p === "RB") return "RB";
  if (p === "WIDE RECEIVER" || p === "WR") return "WR";
  if (p === "TIGHT END" || p === "TE") return "TE";
  return null;
}

function getEligiblePositions(pos: Position): EligiblePosition[] {
  if (pos === "QB") return ["QB"];
  if (pos === "RB") return ["RB"];
  if (pos === "WR") return ["WR"];
  // TEs are NOT eligible for WR slot per rules
  return [];
}



/**
 * Sync NFL schedule into Firestore.
 */
export const syncSchedule = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  try {
    // First fetch teams to get team names
    const teams = await fetchLeagueTeams();
    const teamMap = new Map(teams.map(t => [t.idTeam, t.strTeam]));

    const events = await fetchSeasonSchedule();

    // Batch writes in chunks of 400 (Firestore limit is 500)
    const BATCH_SIZE = 400;
    let count = 0;

    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const chunk = events.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const ev of chunk) {
        const gameId = ev.idEvent;
        // Handle time parsing
        const timeStr = ev.strTime || "00:00:00";
        const kickoff = new Date(`${ev.dateEvent}T${timeStr}Z`);

        const docRef = db.collection("games").doc(gameId);
        batch.set(docRef, {
          gameId,
          externalEventId: ev.idEvent,
          homeTeamId: ev.idHomeTeam,
          awayTeamId: ev.idAwayTeam,
          homeTeamName: ev.strHomeTeam || teamMap.get(ev.idHomeTeam) || "Unknown",
          awayTeamName: ev.strAwayTeam || teamMap.get(ev.idAwayTeam) || "Unknown",
          kickoffTime: kickoff,
          weekNumber: ev.intRound ? Number(ev.intRound) : null,
          status: ev.strStatus === "STATUS_FINAL" ? "final" : "scheduled",
        }, { merge: true });
        count++;
      }

      await batch.commit();
    }

    // Update current week in config document
    const currentWeek = await getCurrentWeek();
    await db.collection("config").doc("season").set({
      season: SEASON,
      currentWeek,
      lastUpdated: new Date(),
    }, { merge: true });

    res.status(200).send({ ok: true, count, currentWeek });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send({ error: errorMessage });
  }
});

/**
 * Sync NFL players into Firestore.
 */
export const syncPlayers = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  try {
    const players = await fetchAllNflPlayers();
    let count = 0;

    // Batch writes in chunks of 500 (Firestore limit)
    const chunks: SportsPlayer[][] = [];
    for (let i = 0; i < players.length; i += 400) {
      chunks.push(players.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const batch = db.batch();
      for (const p of chunk) {
        const pos = normalizePosition(p.strPosition);
        if (!pos) continue; // Skip non-skill positions

        const eligiblePositions = getEligiblePositions(pos);
        if (eligiblePositions.length === 0) continue; // Skip TEs and others

        const docRef = db.collection("players").doc(p.idPlayer);
        batch.set(docRef, {
          name: p.strPlayer,
          position: pos,
          teamId: p.idTeam,
          teamName: p.strTeam || "Unknown",
          externalId: p.idPlayer,
          eligiblePositions,
        }, { merge: true });
        count++;
      }
      await batch.commit();
    }

    res.status(200).send({ ok: true, count });
  } catch (err: unknown) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send({ error: errorMessage });
  }
});

// Weekly schedule refresh - runs Tuesday at 6am UTC
export const syncScheduleWeekly = onSchedule("0 6 * * 2", async () => {
  const teams = await fetchLeagueTeams();
  const teamMap = new Map(teams.map(t => [t.idTeam, t.strTeam]));

  const events = await fetchSeasonSchedule();
  const BATCH_SIZE = 400;
  let count = 0;

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const chunk = events.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const ev of chunk) {
      const gameId = ev.idEvent;
      const timeStr = ev.strTime || "00:00:00";
      const kickoff = new Date(`${ev.dateEvent}T${timeStr}Z`);

      const docRef = db.collection("games").doc(gameId);
      batch.set(docRef, {
        gameId,
        externalEventId: ev.idEvent,
        homeTeamId: ev.idHomeTeam,
        awayTeamId: ev.idAwayTeam,
        homeTeamName: ev.strHomeTeam || teamMap.get(ev.idHomeTeam) || "Unknown",
        awayTeamName: ev.strAwayTeam || teamMap.get(ev.idAwayTeam) || "Unknown",
        kickoffTime: kickoff,
        weekNumber: ev.intRound ? Number(ev.intRound) : null,
        status: ev.strStatus === "STATUS_FINAL" ? "final" : "scheduled",
      }, { merge: true });
      count++;
    }

    await batch.commit();
  }

  console.log(`Synced ${count} games`);
});

/**
 * Sync player season statistics from ESPN.
 * Updates each player with their YTD stats and calculated fantasy points.
 * Rate-limited to avoid overwhelming the ESPN API.
 */
export const syncPlayerStats = onRequest(
  { timeoutSeconds: 540 }, // 9 minutes
  async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }

    try {
      // Get all players from Firestore
      const playersSnap = await db.collection("players").get();
      console.log(`Syncing stats for ${playersSnap.size} players...`);

      let updated = 0;
      let failed = 0;
      const batchSize = 20; // Process 20 players at a time to avoid rate limits
      const players = playersSnap.docs;

      for (let i = 0; i < players.length; i += batchSize) {
        const chunk = players.slice(i, i + batchSize);

        // Fetch stats in parallel for this chunk
        const statsPromises = chunk.map(async (doc) => {
          const playerId = doc.id;
          try {
            const espnStats = await fetchPlayerSeasonStats(playerId);
            if (espnStats) {
              const fantasyPoints = calculateFantasyPoints(espnStats);
              const seasonStats: SeasonStats = {
                passingYards: espnStats.passingYards,
                passingTD: espnStats.passingTouchdowns,
                interceptions: espnStats.interceptions,
                rushingYards: espnStats.rushingYards,
                rushingTD: espnStats.rushingTouchdowns,
                receivingYards: espnStats.receivingYards,
                receivingTD: espnStats.receivingTouchdowns,
                receptions: espnStats.receptions,
                fumblesLost: espnStats.fumblesLost,
                gamesPlayed: espnStats.gamesPlayed,
                fantasyPoints,
              };
              return { playerId, seasonStats, success: true };
            }
            return { playerId, success: false };
          } catch {
            return { playerId, success: false };
          }
        });

        const results = await Promise.all(statsPromises);

        // Batch write successful updates
        const batch = db.batch();
        for (const result of results) {
          if (result.success && result.seasonStats) {
            const docRef = db.collection("players").doc(result.playerId);
            batch.update(docRef, {
              seasonStats: result.seasonStats,
              statsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            updated++;
          } else {
            failed++;
          }
        }
        await batch.commit();

        console.log(`Processed ${i + chunk.length}/${players.length} players (${updated} updated, ${failed} failed)`);

        // Small delay between chunks to avoid rate limiting
        if (i + batchSize < players.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      res.status(200).send({ ok: true, updated, failed, total: players.length });
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      res.status(500).send({ error: errorMessage });
    }
  }
);

// Schedule player stats sync - runs daily at 5am UTC
export const syncPlayerStatsDaily = onSchedule("0 5 * * *", async () => {
  const playersSnap = await db.collection("players").get();
  console.log(`Daily stats sync for ${playersSnap.size} players...`);

  let updated = 0;
  const batchSize = 20;
  const players = playersSnap.docs;

  for (let i = 0; i < players.length; i += batchSize) {
    const chunk = players.slice(i, i + batchSize);

    const statsPromises = chunk.map(async (doc) => {
      const playerId = doc.id;
      try {
        const espnStats = await fetchPlayerSeasonStats(playerId);
        if (espnStats) {
          const fantasyPoints = calculateFantasyPoints(espnStats);
          const seasonStats: SeasonStats = {
            passingYards: espnStats.passingYards,
            passingTD: espnStats.passingTouchdowns,
            interceptions: espnStats.interceptions,
            rushingYards: espnStats.rushingYards,
            rushingTD: espnStats.rushingTouchdowns,
            receivingYards: espnStats.receivingYards,
            receivingTD: espnStats.receivingTouchdowns,
            receptions: espnStats.receptions,
            fumblesLost: espnStats.fumblesLost,
            gamesPlayed: espnStats.gamesPlayed,
            fantasyPoints,
          };
          return { playerId, seasonStats, success: true };
        }
        return { playerId, success: false };
      } catch {
        return { playerId, success: false };
      }
    });

    const results = await Promise.all(statsPromises);

    const batch = db.batch();
    for (const result of results) {
      if (result.success && result.seasonStats) {
        const docRef = db.collection("players").doc(result.playerId);
        batch.update(docRef, {
          seasonStats: result.seasonStats,
          statsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        updated++;
      }
    }
    await batch.commit();

    if (i + batchSize < players.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`Daily sync complete: ${updated} players updated`);
});

/**
 * Score a week's picks for a league
 */
export const scoreWeek = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const leagueId = (req.query.leagueId || req.body?.leagueId) as string;
  const weekId = (req.query.weekId || req.body?.weekId) as string;
  if (!leagueId || !weekId) {
    res.status(400).send({ error: "leagueId and weekId required" });
    return;
  }

  try {
    // Mark week as scoring
    const weekRef = db.collection("leagues").doc(leagueId).collection("weeks").doc(weekId);
    await weekRef.set({ status: "scoring" }, { merge: true });

    const picksSnap = await db
      .collection("leagues")
      .doc(leagueId)
      .collection("weeks")
      .doc(weekId)
      .collection("picks")
      .get();

    for (const pickDoc of picksSnap.docs) {
      const userId = pickDoc.id;
      const pick = pickDoc.data();
      const batch = db.batch();

      const positions: ("qb" | "rb" | "wr")[] = ["qb", "rb", "wr"];
      const points: Record<string, number> = {};
      const doublePickPositions: string[] = [];

      for (const pos of positions) {
        const playerId = pick[`${pos}PlayerId`];
        const gameId = pick[`${pos}GameId`];
        if (!playerId || !gameId) {
          points[pos] = 0;
          continue;
        }

        // Check for double pick (one-and-done rule)
        const usageRef = db
          .collection("users")
          .doc(userId)
          .collection("playerUsage")
          .doc(`${SEASON}_${playerId}`);

        const usageSnap = await usageRef.get();
        const usageData = usageSnap.data();
        const isDoublePick = usageSnap.exists && usageData?.firstUsedWeek !== weekId;

        if (isDoublePick) {
          points[pos] = 0;
          doublePickPositions.push(pos.toUpperCase());
          continue;
        }

        // Fetch stats for this player's game
        const statsArray = await fetchEventStats(gameId);
        // Find this player's stats in the array
        const playerStat = statsArray.find(s => s.idPlayer === playerId);

        if (!playerStat) {
          // Game might not be finished yet or no stats
          points[pos] = 0;
          continue;
        }

        const dkStats = mapSportsDbToStats(playerStat);
        points[pos] = calculateDraftKingsPoints(dkStats);

        // Write usage if first time using this player
        if (!usageSnap.exists) {
          batch.set(usageRef, {
            season: SEASON,
            playerId,
            firstUsedWeek: weekId,
          });
        }
      }

      const totalPoints = (points.qb ?? 0) + (points.rb ?? 0) + (points.wr ?? 0);

      const scoreRef = db
        .collection("leagues")
        .doc(leagueId)
        .collection("weeks")
        .doc(weekId)
        .collection("scores")
        .doc(userId);

      batch.set(scoreRef, {
        qbPoints: points.qb ?? 0,
        rbPoints: points.rb ?? 0,
        wrPoints: points.wr ?? 0,
        totalPoints,
        doublePickPositions,
        updatedAt: new Date(),
      });

      await batch.commit();
    }

    // Mark week as final
    await weekRef.set({ status: "final" }, { merge: true });

    res.status(200).send({ ok: true, scored: picksSnap.size });
  } catch (err: unknown) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send({ error: errorMessage });
  }
});

/**
 * Submit picks for a user (with auth verification and position validation)
 */
export const submitPicks = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  if (req.method !== "POST") {
    res.status(405).send({ error: "POST only" });
    return;
  }

  // Verify Firebase Auth token
  const authHeader = req.headers.authorization;
  let authUserId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const decoded = await admin.auth().verifyIdToken(token);
      authUserId = decoded.uid;
    } catch {
      // Token verification failed - continue but compare with userId
    }
  }

  const { leagueId, weekId, userId, picks } = req.body as {
    leagueId: string;
    weekId: string;
    userId: string;
    picks: {
      qbPlayerId?: string;
      qbGameId?: string;
      rbPlayerId?: string;
      rbGameId?: string;
      wrPlayerId?: string;
      wrGameId?: string;
    };
  };

  if (!leagueId || !weekId || !userId) {
    res.status(400).send({ error: "leagueId, weekId, userId required" });
    return;
  }

  // If we have an auth token, verify it matches the userId
  if (authUserId && authUserId !== userId) {
    res.status(403).send({ error: "User ID mismatch with auth token" });
    return;
  }

  const positions: ("qb" | "rb" | "wr")[] = ["qb", "rb", "wr"];
  const positionMap: Record<string, EligiblePosition> = { qb: "QB", rb: "RB", wr: "WR" };
  const skipped: string[] = [];
  const accepted: string[] = [];

  try {
    const pickRef = db
      .collection("leagues")
      .doc(leagueId)
      .collection("weeks")
      .doc(weekId)
      .collection("picks")
      .doc(userId);

    const existing = await pickRef.get();
    const existingData = existing.data() || {};

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    for (const pos of positions) {
      const playerIdKey = `${pos}PlayerId` as const;
      const gameIdKey = `${pos}GameId` as const;
      const lockedKey = `${pos}Locked` as const;

      const newPlayerId = (picks as Record<string, string>)[playerIdKey];
      const newGameId = (picks as Record<string, string>)[gameIdKey];

      // If no new pick given for this position, skip
      if (!newPlayerId || !newGameId) continue;

      // Check if already locked
      if (existingData[lockedKey]) {
        skipped.push(`${pos.toUpperCase()}: already locked`);
        continue;
      }

      // Validate player exists and has correct eligibility
      const playerDoc = await db.collection("players").doc(newPlayerId).get();
      const player = playerDoc.data();

      if (!player) {
        skipped.push(`${pos.toUpperCase()}: unknown player`);
        continue;
      }

      const eligiblePositions = player.eligiblePositions as string[] || [];
      if (!eligiblePositions.includes(positionMap[pos])) {
        skipped.push(`${pos.toUpperCase()}: player not eligible for this position`);
        continue;
      }

      // Check if player was already used in a different week (one-and-done rule)
      const usageRef = db
        .collection("users")
        .doc(userId)
        .collection("playerUsage")
        .doc(`${SEASON}_${newPlayerId}`);
      const usageSnap = await usageRef.get();

      if (usageSnap.exists) {
        const usageData = usageSnap.data();
        if (usageData?.firstUsedWeek !== weekId) {
          skipped.push(`${pos.toUpperCase()}: player already used in ${usageData?.firstUsedWeek}`);
          continue;
        }
      }

      // Enforce kickoff - 1 hour rule
      const gameDoc = await db.collection("games").doc(newGameId).get();
      const game = gameDoc.data();
      if (!game) {
        skipped.push(`${pos.toUpperCase()}: unknown game`);
        continue;
      }

      const kickoffTime = (game.kickoffTime as admin.firestore.Timestamp).toDate().getTime();
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      if (now > kickoffTime - oneHour) {
        skipped.push(`${pos.toUpperCase()}: game locks in < 1 hour`);
        continue;
      }

      updates[playerIdKey] = newPlayerId;
      updates[gameIdKey] = newGameId;
      accepted.push(pos.toUpperCase());

      // Write player usage immediately when pick is saved (if not already recorded for this week)
      if (!usageSnap.exists) {
        await usageRef.set({
          season: SEASON,
          playerId: newPlayerId,
          firstUsedWeek: weekId,
        });
      }
    }

    await pickRef.set(
      {
        ...existingData,
        ...updates,
        qbLocked: existingData.qbLocked || false,
        rbLocked: existingData.rbLocked || false,
        wrLocked: existingData.wrLocked || false,
        createdAt: existing.exists ? existingData.createdAt : new Date()
      },
      { merge: true }
    );

    res.status(200).send({ ok: true, accepted, skipped });
  } catch (err: unknown) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send({ error: errorMessage });
  }
});

/**
 * Lock picks for games starting within 1 hour
 * Runs every 5 minutes
 */
export const lockPicks = onSchedule("*/5 * * * *", async () => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const lockThreshold = now + oneHour;

  // Find games that are about to start (within 1 hour)
  const gamesSnap = await db
    .collection("games")
    .where("kickoffTime", "<=", new Date(lockThreshold))
    .where("kickoffTime", ">", new Date(now - oneHour)) // Not too old
    .get();

  const gameIdsToLock = new Set(gamesSnap.docs.map(d => d.id));
  if (gameIdsToLock.size === 0) {
    console.log("No games to lock");
    return;
  }

  console.log(`Locking picks for ${gameIdsToLock.size} games`);

  // Get all leagues
  const leaguesSnap = await db.collection("leagues").get();

  for (const leagueDoc of leaguesSnap.docs) {
    const leagueId = leagueDoc.id;

    // Get all weeks
    const weeksSnap = await db
      .collection("leagues")
      .doc(leagueId)
      .collection("weeks")
      .where("status", "==", "pending")
      .get();

    for (const weekDoc of weeksSnap.docs) {
      const weekId = weekDoc.id;

      // Get all picks for this week
      const picksSnap = await db
        .collection("leagues")
        .doc(leagueId)
        .collection("weeks")
        .doc(weekId)
        .collection("picks")
        .get();

      for (const pickDoc of picksSnap.docs) {
        const pick = pickDoc.data();
        const updates: Record<string, boolean> = {};

        if (pick.qbGameId && gameIdsToLock.has(pick.qbGameId) && !pick.qbLocked) {
          updates.qbLocked = true;
        }
        if (pick.rbGameId && gameIdsToLock.has(pick.rbGameId) && !pick.rbLocked) {
          updates.rbLocked = true;
        }
        if (pick.wrGameId && gameIdsToLock.has(pick.wrGameId) && !pick.wrLocked) {
          updates.wrLocked = true;
        }

        if (Object.keys(updates).length > 0) {
          await pickDoc.ref.update(updates);
          console.log(`Locked ${Object.keys(updates).join(", ")} for user ${pickDoc.id}`);
        }
      }
    }
  }
});

/**
 * Compute season standings for a league
 */
export const computeSeasonStandings = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const leagueId = (req.query.leagueId || req.body?.leagueId) as string;
  if (!leagueId) {
    res.status(400).send({ error: "leagueId required" });
    return;
  }

  try {
    // Get all weeks
    const weeksSnap = await db
      .collection("leagues")
      .doc(leagueId)
      .collection("weeks")
      .get();

    // Aggregate scores per user
    const userTotals: Record<string, {
      total: number;
      weeks: number;
      bestWeekPoints: number;
      bestWeek: string;
    }> = {};

    for (const weekDoc of weeksSnap.docs) {
      const weekId = weekDoc.id;
      const scoresSnap = await db
        .collection("leagues")
        .doc(leagueId)
        .collection("weeks")
        .doc(weekId)
        .collection("scores")
        .get();

      for (const scoreDoc of scoresSnap.docs) {
        const userId = scoreDoc.id;
        const score = scoreDoc.data();
        const totalPoints = score.totalPoints || 0;

        if (!userTotals[userId]) {
          userTotals[userId] = { total: 0, weeks: 0, bestWeekPoints: 0, bestWeek: "" };
        }

        userTotals[userId].total += totalPoints;
        userTotals[userId].weeks += 1;

        if (totalPoints > userTotals[userId].bestWeekPoints) {
          userTotals[userId].bestWeekPoints = totalPoints;
          userTotals[userId].bestWeek = weekId;
        }
      }
    }

    // Get user display names
    const userIds = Object.keys(userTotals);
    const userDocs = await Promise.all(
      userIds.map(uid => db.collection("users").doc(uid).get())
    );
    const userNames: Record<string, string> = {};
    userDocs.forEach(doc => {
      if (doc.exists) {
        userNames[doc.id] = doc.data()?.displayName || doc.id;
      }
    });

    // Write season standings
    const batch = db.batch();
    for (const [userId, data] of Object.entries(userTotals)) {
      const standingRef = db
        .collection("leagues")
        .doc(leagueId)
        .collection("seasonStandings")
        .doc(userId);

      batch.set(standingRef, {
        userId,
        displayName: userNames[userId] || userId,
        seasonTotalPoints: data.total,
        weeksPlayed: data.weeks,
        bestWeekPoints: data.bestWeekPoints,
        bestWeek: data.bestWeek,
        updatedAt: new Date(),
      });
    }

    await batch.commit();
    res.status(200).send({ ok: true, users: userIds.length });
  } catch (err: unknown) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send({ error: errorMessage });
  }
});

/**
 * Initialize a league with weeks for the NFL season
 */
export const initializeLeague = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const leagueId = (req.query.leagueId || req.body?.leagueId) as string;
  if (!leagueId) {
    res.status(400).send({ error: "leagueId required" });
    return;
  }

  try {
    const leagueRef = db.collection("leagues").doc(leagueId);
    const leagueDoc = await leagueRef.get();

    if (!leagueDoc.exists) {
      // Create the league
      await leagueRef.set({
        name: "Three Man League",
        season: SEASON,
        entryFee: 50,
        payouts: { "1": 1200, "2": 750, "3": 500, "4": 415, "5": 270, "6": 195, "7": 120 },
        createdAt: new Date(),
      });
    }

    // Create weeks 1-18
    const batch = db.batch();
    for (let w = 1; w <= 18; w++) {
      const weekRef = leagueRef.collection("weeks").doc(`week-${w}`);
      batch.set(weekRef, {
        weekNumber: w,
        status: "pending",
      }, { merge: true });
    }

    await batch.commit();
    res.status(200).send({ ok: true, leagueId });
  } catch (err: unknown) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send({ error: errorMessage });
  }
});
