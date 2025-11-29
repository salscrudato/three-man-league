/**
 * Backfill Cloud Functions
 *
 * Handles mid-season league setup by allowing admins to backfill
 * historical weeks with picks and scores from spreadsheet data.
 */

import { onRequest } from "firebase-functions/v2/https";
import { db, SEASON } from "./config.js";
import { fetchEventStats, fetchWeekSchedule } from "./sportsApi.js";
import { calculateDraftKingsPoints, mapSportsDbToStats } from "./scoring.js";
import { sendError, sendSuccess, handleAuthenticatedRequest } from "./utils/http.js";
import type {
  BackfillWeekRequest,
  BackfillWeekResponse,
  BackfillStatusResponse,
  BackfillMemberPick,
  MemberRole,
} from "./types.js";

// Check if user is league owner or co-owner
async function isLeagueAdmin(leagueId: string, userId: string): Promise<boolean> {
  try {
    const leagueDoc = await db.collection("leagues").doc(leagueId).get();
    if (!leagueDoc.exists) return false;
    
    const leagueData = leagueDoc.data()!;
    if (leagueData.ownerId === userId) return true;

    // Check for co-owner role
    const memberDoc = await db.collection("leagues").doc(leagueId)
      .collection("members").doc(userId).get();
    
    if (memberDoc.exists) {
      const role = memberDoc.data()?.role as MemberRole;
      return role === "owner" || role === "coOwner";
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Enable backfill mode for a league
 */
export const enableBackfill = onRequest(async (req, res) => {
  const auth = await handleAuthenticatedRequest(req, res, "POST");
  if (!auth) return;

  const userId = auth.userId;
  const { leagueId, fromWeek, toWeek } = req.body as {
    leagueId: string;
    fromWeek: number;
    toWeek: number;
  };

  if (!leagueId || !fromWeek || !toWeek) {
    sendError(res, 400, "leagueId, fromWeek, and toWeek required");
    return;
  }

  if (fromWeek < 1 || toWeek > 18 || fromWeek > toWeek) {
    sendError(res, 400, "Invalid week range. Must be 1-18 and fromWeek <= toWeek");
    return;
  }

  const isAdmin = await isLeagueAdmin(leagueId, userId);
  if (!isAdmin) {
    sendError(res, 403, "Only league owner or co-owner can enable backfill");
    return;
  }

  try {
    const batch = db.batch();

    // Update league with backfill settings
    batch.update(db.collection("leagues").doc(leagueId), {
      backfillEnabled: true,
      backfillFromWeek: fromWeek,
      backfillToWeek: toWeek,
      backfillStatus: "in_progress",
      updatedAt: new Date(),
    });

    // Create week documents for each week in range if they don't exist
    for (let week = fromWeek; week <= toWeek; week++) {
      const weekId = `week-${week}`;
      const weekRef = db.collection("leagues").doc(leagueId).collection("weeks").doc(weekId);

      // Use set with merge to create if not exists
      batch.set(weekRef, {
        weekNumber: week,
        weekId,
        status: "pending_backfill",
        isBackfilled: false,
        createdAt: new Date(),
      }, { merge: true });
    }

    await batch.commit();

    sendSuccess(res, { ok: true });
  } catch (err: unknown) {
    console.error("Enable backfill error:", err);
    sendError(res, 500, err instanceof Error ? err.message : "Unknown error");
  }
});

/**
 * Get backfill status for a league
 */
export const getBackfillStatus = onRequest(async (req, res) => {
  const auth = await handleAuthenticatedRequest(req, res);
  if (!auth) return;

  const userId = auth.userId;
  const leagueId = (req.query.leagueId || req.body?.leagueId) as string;
  if (!leagueId) {
    sendError(res, 400, "leagueId required");
    return;
  }

  const isAdmin = await isLeagueAdmin(leagueId, userId);
  if (!isAdmin) {
    sendError(res, 403, "Only league admin can view backfill status");
    return;
  }

  try {
    const leagueDoc = await db.collection("leagues").doc(leagueId).get();
    if (!leagueDoc.exists) {
      sendError(res, 404, "League not found");
      return;
    }

    const leagueData = leagueDoc.data()!;
    const fromWeek = leagueData.backfillFromWeek || 1;
    const toWeek = leagueData.backfillToWeek || 1;

    // Get week statuses
    const weeksSnap = await db.collection("leagues").doc(leagueId)
      .collection("weeks").get();

    const weeks: BackfillStatusResponse["weeks"] = [];

    for (const weekDoc of weeksSnap.docs) {
      const weekData = weekDoc.data();
      const weekNumber = weekData.weekNumber;

      if (weekNumber >= fromWeek && weekNumber <= toWeek) {
        // Get scores for this week if backfilled
        const scoresSnap = await db.collection("leagues").doc(leagueId)
          .collection("weeks").doc(weekDoc.id)
          .collection("scores").get();

        weeks.push({
          weekNumber,
          weekId: weekDoc.id,
          status: weekData.isBackfilled ? "backfilled" : "not_backfilled",
          memberCount: scoresSnap.size,
          backfilledAt: weekData.backfilledAt?.toDate?.()?.toISOString?.(),
          backfilledBy: weekData.backfilledBy,
        });
      }
    }

    weeks.sort((a, b) => a.weekNumber - b.weekNumber);

    const response: BackfillStatusResponse = {
      ok: true,
      leagueId,
      backfillEnabled: leagueData.backfillEnabled || false,
      backfillFromWeek: fromWeek,
      backfillToWeek: toWeek,
      overallStatus: leagueData.backfillStatus || "not_started",
      weeks,
    };

    sendSuccess(res, response);
  } catch (err: unknown) {
    console.error("Get backfill status error:", err);
    sendError(res, 500, err instanceof Error ? err.message : "Unknown error");
  }
});

/**
 * Backfill a single week for a league
 * This is the main function that processes picks and computes scores
 */
export const backfillWeekForLeague = onRequest(async (req, res) => {
  const auth = await handleAuthenticatedRequest(req, res, "POST");
  if (!auth) return;

  const userId = auth.userId;
  const { leagueId, weekNumber, memberPicks } = req.body as BackfillWeekRequest;

  if (!leagueId || !weekNumber || !memberPicks || !Array.isArray(memberPicks)) {
    sendError(res, 400, "leagueId, weekNumber, and memberPicks array required");
    return;
  }

  if (weekNumber < 1 || weekNumber > 18) {
    sendError(res, 400, "weekNumber must be between 1 and 18");
    return;
  }

  const isAdmin = await isLeagueAdmin(leagueId, userId);
  if (!isAdmin) {
    sendError(res, 403, "Only league admin can backfill weeks");
    return;
  }

  try {
    // Verify league exists and backfill is enabled
    const leagueDoc = await db.collection("leagues").doc(leagueId).get();
    if (!leagueDoc.exists) {
      sendError(res, 404, "League not found");
      return;
    }

    const leagueData = leagueDoc.data()!;
    if (!leagueData.backfillEnabled) {
      sendError(res, 400, "Backfill not enabled for this league");
      return;
    }

    const weekId = `week-${weekNumber}`;

    // Build gameId lookup: fetch games for this week to find player games
    const scheduleEvents = await fetchWeekSchedule(weekNumber);
    const gameIdByTeam = new Map<string, string>();

    for (const ev of scheduleEvents) {
      gameIdByTeam.set(ev.idHomeTeam, ev.idEvent);
      gameIdByTeam.set(ev.idAwayTeam, ev.idEvent);
    }

    // Process each member's picks
    const results: BackfillWeekResponse["results"] = [];
    const batch = db.batch();

    for (const memberPick of memberPicks) {
      const result = await processBackfillMember(
        leagueId,
        weekId,
        weekNumber,
        memberPick,
        gameIdByTeam,
        userId,
        batch
      );
      results.push(result);
    }

    // Mark week as backfilled
    const weekRef = db.collection("leagues").doc(leagueId).collection("weeks").doc(weekId);
    batch.update(weekRef, {
      status: "final",
      isBackfilled: true,
      backfilledAt: new Date(),
      backfilledBy: userId,
    });

    // Commit all changes
    await batch.commit();

    // Update season standings after backfill
    await updateSeasonStandings(leagueId);

    const response: BackfillWeekResponse = {
      ok: true,
      weekNumber,
      results,
    };

    sendSuccess(res, response);
  } catch (err: unknown) {
    console.error("Backfill week error:", err);
    sendError(res, 500, err instanceof Error ? err.message : "Unknown error");
  }
});

/**
 * Process a single member's backfill picks
 */
async function processBackfillMember(
  leagueId: string,
  weekId: string,
  weekNumber: number,
  memberPick: BackfillMemberPick,
  gameIdByTeam: Map<string, string>,
  backfilledBy: string,
  batch: FirebaseFirestore.WriteBatch
): Promise<BackfillWeekResponse["results"][0]> {
  const { userId, qbPlayerId, rbPlayerId, wrPlayerId } = memberPick;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get member display name
  const memberDoc = await db.collection("leagues").doc(leagueId)
    .collection("members").doc(userId).get();
  const displayName = memberDoc.data()?.displayName || userId;

  const positions = ["qb", "rb", "wr"] as const;
  const playerIds = { qb: qbPlayerId, rb: rbPlayerId, wr: wrPlayerId };
  const points: Record<string, number> = { qb: 0, rb: 0, wr: 0 };
  const playerNames: Record<string, string> = { qb: "", rb: "", wr: "" };
  const gameIds: Record<string, string | undefined> = { qb: undefined, rb: undefined, wr: undefined };

  for (const pos of positions) {
    const playerId = playerIds[pos];
    if (!playerId) continue;

    try {
      // Get player info
      const playerDoc = await db.collection("players").doc(playerId).get();
      if (!playerDoc.exists) {
        errors.push(`${pos.toUpperCase()}: Player ${playerId} not found`);
        continue;
      }

      const playerData = playerDoc.data()!;
      playerNames[pos] = playerData.name;
      const teamId = playerData.teamId;

      // Find game for this player's team
      const gameId = gameIdByTeam.get(teamId);
      if (!gameId) {
        warnings.push(`${pos.toUpperCase()}: No game found for ${playerData.name} (${playerData.teamName}) in week ${weekNumber}`);
        // Check for override
        const override = memberPick[`${pos}PointsOverride` as keyof BackfillMemberPick] as number | undefined;
        if (override !== undefined) {
          points[pos] = override;
        }
        continue;
      }

      gameIds[pos] = gameId;

      // Check for override first
      const override = memberPick[`${pos}PointsOverride` as keyof BackfillMemberPick] as number | undefined;
      if (override !== undefined) {
        points[pos] = override;
        continue;
      }

      // Fetch game stats
      const statsArray = await fetchEventStats(gameId);
      const playerStat = statsArray.find(s => s.idPlayer === playerId);

      if (!playerStat) {
        warnings.push(`${pos.toUpperCase()}: No stats for ${playerData.name} in game ${gameId}`);
        continue;
      }

      // Calculate points using same logic as live scoring
      const dkStats = mapSportsDbToStats(playerStat);
      points[pos] = calculateDraftKingsPoints(dkStats);

    } catch (err) {
      errors.push(`${pos.toUpperCase()}: Error processing - ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }

  const totalPoints = points.qb + points.rb + points.wr;

  // Write picks document
  const picksRef = db.collection("leagues").doc(leagueId)
    .collection("weeks").doc(weekId)
    .collection("picks").doc(userId);

  batch.set(picksRef, {
    qbPlayerId: playerIds.qb || null,
    qbGameId: gameIds.qb || null,
    qbLocked: true,
    rbPlayerId: playerIds.rb || null,
    rbGameId: gameIds.rb || null,
    rbLocked: true,
    wrPlayerId: playerIds.wr || null,
    wrGameId: gameIds.wr || null,
    wrLocked: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    isBackfilled: true,
    backfilledBy,
  }, { merge: true });

  // Write scores document
  const scoresRef = db.collection("leagues").doc(leagueId)
    .collection("weeks").doc(weekId)
    .collection("scores").doc(userId);

  batch.set(scoresRef, {
    qbPoints: points.qb,
    rbPoints: points.rb,
    wrPoints: points.wr,
    totalPoints,
    doublePickPositions: [],
    updatedAt: new Date(),
    isBackfilled: true,
    backfilledBy,
  }, { merge: true });

  // Write player usage for each position
  for (const pos of positions) {
    const playerId = playerIds[pos];
    if (!playerId) continue;

    const usageRef = db.collection("users").doc(userId)
      .collection("playerUsage").doc(`${SEASON}_${playerId}_${leagueId}`);

    // Check if already used in a different week
    const existingUsage = await usageRef.get();
    if (!existingUsage.exists) {
      batch.set(usageRef, {
        season: SEASON,
        playerId,
        firstUsedWeek: weekId,
        leagueId,
        isBackfilled: true,
      });
    } else if (existingUsage.data()?.firstUsedWeek !== weekId) {
      // Already used in different week - note this but don't fail
      warnings.push(`${pos.toUpperCase()}: ${playerNames[pos]} already used in ${existingUsage.data()?.firstUsedWeek}`);
    }
  }

  return {
    userId,
    displayName,
    qbPoints: points.qb,
    rbPoints: points.rb,
    wrPoints: points.wr,
    totalPoints,
    qbPlayerName: playerNames.qb,
    rbPlayerName: playerNames.rb,
    wrPlayerName: playerNames.wr,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Update season standings after backfill
 */
async function updateSeasonStandings(leagueId: string): Promise<void> {
  const weeksSnap = await db.collection("leagues").doc(leagueId)
    .collection("weeks").get();

  const userTotals: Record<string, {
    total: number;
    weeks: number;
    bestWeekPoints: number;
    bestWeek: string;
  }> = {};

  for (const weekDoc of weeksSnap.docs) {
    const weekId = weekDoc.id;
    const scoresSnap = await db.collection("leagues").doc(leagueId)
      .collection("weeks").doc(weekId)
      .collection("scores").get();

    for (const scoreDoc of scoresSnap.docs) {
      const scoreUserId = scoreDoc.id;
      const score = scoreDoc.data();
      const totalPoints = score.totalPoints || 0;

      if (!userTotals[scoreUserId]) {
        userTotals[scoreUserId] = { total: 0, weeks: 0, bestWeekPoints: 0, bestWeek: "" };
      }

      userTotals[scoreUserId].total += totalPoints;
      userTotals[scoreUserId].weeks += 1;

      if (totalPoints > userTotals[scoreUserId].bestWeekPoints) {
        userTotals[scoreUserId].bestWeekPoints = totalPoints;
        userTotals[scoreUserId].bestWeek = weekId;
      }
    }
  }

  // Get member display names
  const membersSnap = await db.collection("leagues").doc(leagueId)
    .collection("members").where("isActive", "==", true).get();

  const displayNames: Record<string, string> = {};
  for (const memberDoc of membersSnap.docs) {
    displayNames[memberDoc.id] = memberDoc.data().displayName || memberDoc.id;
  }

  // Write standings
  const batch = db.batch();
  for (const [standingUserId, data] of Object.entries(userTotals)) {
    const standingRef = db.collection("leagues").doc(leagueId)
      .collection("seasonStandings").doc(standingUserId);

    batch.set(standingRef, {
      userId: standingUserId,
      displayName: displayNames[standingUserId] || standingUserId,
      seasonTotalPoints: Math.round(data.total * 100) / 100,
      weeksPlayed: data.weeks,
      bestWeekPoints: Math.round(data.bestWeekPoints * 100) / 100,
      bestWeek: data.bestWeek,
      updatedAt: new Date(),
    });
  }

  await batch.commit();
}

/**
 * Complete backfill and mark league as ready
 */
export const completeBackfill = onRequest(async (req, res) => {
  const auth = await handleAuthenticatedRequest(req, res, "POST");
  if (!auth) return;

  const userId = auth.userId;
  const { leagueId } = req.body as { leagueId: string };
  if (!leagueId) {
    sendError(res, 400, "leagueId required");
    return;
  }

  const isAdmin = await isLeagueAdmin(leagueId, userId);
  if (!isAdmin) {
    sendError(res, 403, "Only league admin can complete backfill");
    return;
  }

  try {
    await db.collection("leagues").doc(leagueId).update({
      backfillStatus: "completed",
      backfillCompletedAt: new Date(),
      backfillCompletedBy: userId,
      status: "active", // Transition league to active
      updatedAt: new Date(),
    });

    // Final standings update
    await updateSeasonStandings(leagueId);

    sendSuccess(res, { ok: true });
  } catch (err: unknown) {
    console.error("Complete backfill error:", err);
    sendError(res, 500, err instanceof Error ? err.message : "Unknown error");
  }
});

/**
 * Get detailed week scores for review
 */
export const getBackfillWeekScores = onRequest(async (req, res) => {
  const auth = await handleAuthenticatedRequest(req, res);
  if (!auth) return;

  const userId = auth.userId;
  const leagueId = (req.query.leagueId || req.body?.leagueId) as string;
  const weekNumber = parseInt((req.query.weekNumber || req.body?.weekNumber) as string);

  if (!leagueId || !weekNumber) {
    sendError(res, 400, "leagueId and weekNumber required");
    return;
  }

  const isAdmin = await isLeagueAdmin(leagueId, userId);
  if (!isAdmin) {
    sendError(res, 403, "Only league admin can view backfill scores");
    return;
  }

  try {
    const weekId = `week-${weekNumber}`;

    // Get all picks for this week
    const picksSnap = await db.collection("leagues").doc(leagueId)
      .collection("weeks").doc(weekId)
      .collection("picks").get();

    // Get all scores for this week
    const scoresSnap = await db.collection("leagues").doc(leagueId)
      .collection("weeks").doc(weekId)
      .collection("scores").get();

    const scoresMap = new Map<string, FirebaseFirestore.DocumentData>();
    for (const scoreDoc of scoresSnap.docs) {
      scoresMap.set(scoreDoc.id, scoreDoc.data());
    }

    // Get member info
    const membersSnap = await db.collection("leagues").doc(leagueId)
      .collection("members").where("isActive", "==", true).get();

    const memberNames = new Map<string, string>();
    for (const memberDoc of membersSnap.docs) {
      memberNames.set(memberDoc.id, memberDoc.data().displayName || memberDoc.id);
    }

    const results = [];
    for (const pickDoc of picksSnap.docs) {
      const pickUserId = pickDoc.id;
      const pickData = pickDoc.data();
      const scoreData = scoresMap.get(pickUserId) || {};

      // Get player names
      const playerNames: Record<string, string> = { qb: "", rb: "", wr: "" };
      for (const pos of ["qb", "rb", "wr"]) {
        const playerId = pickData[`${pos}PlayerId`];
        if (playerId) {
          const playerDoc = await db.collection("players").doc(playerId).get();
          playerNames[pos] = playerDoc.data()?.name || playerId;
        }
      }

      results.push({
        userId: pickUserId,
        displayName: memberNames.get(pickUserId) || pickUserId,
        qbPlayerId: pickData.qbPlayerId,
        qbPlayerName: playerNames.qb,
        qbPoints: scoreData.qbPoints || 0,
        rbPlayerId: pickData.rbPlayerId,
        rbPlayerName: playerNames.rb,
        rbPoints: scoreData.rbPoints || 0,
        wrPlayerId: pickData.wrPlayerId,
        wrPlayerName: playerNames.wr,
        wrPoints: scoreData.wrPoints || 0,
        totalPoints: scoreData.totalPoints || 0,
        isBackfilled: pickData.isBackfilled || false,
      });
    }

    results.sort((a, b) => b.totalPoints - a.totalPoints);

    sendSuccess(res, {
      ok: true,
      weekNumber,
      weekId,
      scores: results,
    });
  } catch (err: unknown) {
    console.error("Get backfill week scores error:", err);
    sendError(res, 500, err instanceof Error ? err.message : "Unknown error");
  }
});

