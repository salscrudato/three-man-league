/**
 * League Management Cloud Functions
 *
 * Handles league creation, joining, settings management, and member operations.
 */

import { onRequest } from "firebase-functions/v2/https";
import { db, SEASON } from "./config.js";
import {
  sendError,
  sendSuccess,
  handleAuthenticatedRequest,
} from "./utils/http.js";
import type {
  CreateLeagueRequest,
  CreateLeagueResponse,
  JoinLeagueRequest,
  JoinLeagueResponse,
  LeagueSummary,
  PublicLeagueSummary,
  PayoutEntry,
  LeagueStatus,
  MemberRole,
} from "./types.js";

// Generate a unique join code (6 uppercase alphanumeric characters)
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluded I, O, 0, 1 for clarity
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Check if a join code is already in use
async function isJoinCodeTaken(code: string): Promise<boolean> {
  const snap = await db.collection("leagues")
    .where("joinCode", "==", code)
    .where("status", "in", ["preseason", "active"])
    .limit(1)
    .get();
  return !snap.empty;
}

// Generate a unique join code with collision checking
async function generateUniqueJoinCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const code = generateJoinCode();
    if (!(await isJoinCodeTaken(code))) {
      return code;
    }
    attempts++;
  }
  
  // Fallback to longer code if we can't find a unique short one
  return generateJoinCode() + generateJoinCode().slice(0, 2);
}

/**
 * Create a new league
 */
export const createLeague = onRequest(async (req, res) => {
  const auth = await handleAuthenticatedRequest(req, res, "POST");
  if (!auth) return;

  const userId = auth.userId;
  const { name, entryFee, maxPlayers, payoutStructure, season } = req.body as CreateLeagueRequest;

  // Validation
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    sendError(res, 400, "League name must be at least 2 characters");
    return;
  }

  if (name.length > 50) {
    sendError(res, 400, "League name must be 50 characters or less");
    return;
  }

  if (entryFee !== undefined && (typeof entryFee !== "number" || entryFee < 0)) {
    sendError(res, 400, "Entry fee must be a non-negative number");
    return;
  }

  if (maxPlayers !== undefined && (typeof maxPlayers !== "number" || maxPlayers < 2 || maxPlayers > 100)) {
    sendError(res, 400, "Max players must be between 2 and 100");
    return;
  }

  try {
    // Get user info for denormalization
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data() || {};
    const userDisplayName = userData.displayName || "Unknown";
    const userEmail = userData.email || "";

    // Generate unique join code
    const joinCode = await generateUniqueJoinCode();
    const leagueId = db.collection("leagues").doc().id;
    const baseUrl = req.headers.origin || "https://three-man-league.web.app";
    const joinLink = `${baseUrl}/join?code=${joinCode}`;

    // Normalize payout structure
    let normalizedPayouts: Record<string, number> = {};
    let payoutTotal = 0;

    if (payoutStructure && Array.isArray(payoutStructure)) {
      for (const p of payoutStructure) {
        if (p.rank && p.amount >= 0) {
          normalizedPayouts[String(p.rank)] = p.amount;
          payoutTotal += p.amount;
        }
      }
    } else {
      // Default payout structure
      normalizedPayouts = { "1": 0 };
    }

    const now = new Date();
    const leagueSeason = season || SEASON;

    // Create league document - public by default
    await db.collection("leagues").doc(leagueId).set({
      name: name.trim(),
      ownerId: userId,
      season: leagueSeason,
      entryFee: entryFee || 0,
      payouts: normalizedPayouts,
      payoutStructure: payoutStructure || [{ rank: 1, amount: 0 }],
      payoutTotal,
      maxPlayers: maxPlayers || null,
      joinCode,
      joinLink,
      status: "preseason" as LeagueStatus,
      membershipLocked: false,
      isPublic: true, // Public by default
      createdAt: now,
      updatedAt: now,
    });

    // Add owner as first member
    await db.collection("leagues").doc(leagueId).collection("members").doc(userId).set({
      userId,
      displayName: userDisplayName,
      email: userEmail,
      role: "owner" as MemberRole,
      joinedAt: now,
      isActive: true,
    });

    // Initialize 18 weeks for the league
    const batch = db.batch();
    for (let w = 1; w <= 18; w++) {
      const weekRef = db.collection("leagues").doc(leagueId).collection("weeks").doc(`week-${w}`);
      batch.set(weekRef, {
        weekNumber: w,
        status: "pending",
      });
    }
    await batch.commit();

    const response: CreateLeagueResponse = {
      ok: true,
      leagueId,
      joinCode,
      joinLink,
    };

    sendSuccess(res, response);
  } catch (err: unknown) {
    console.error("Create league error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    sendError(res, 500, errorMessage);
  }
});

/**
 * Join a league - public leagues can be joined directly, private leagues require a passcode
 */
export const joinLeague = onRequest(async (req, res) => {
  const auth = await handleAuthenticatedRequest(req, res, "POST");
  if (!auth) return;

  const userId = auth.userId;
  const { joinCode, leagueId: providedLeagueId, passcode } = req.body as JoinLeagueRequest;

  // Need either a leagueId or a joinCode
  if (!providedLeagueId && !joinCode) {
    sendError(res, 400, "Either leagueId or joinCode required");
    return;
  }

  try {
    let leagueId = providedLeagueId;
    let leagueData: FirebaseFirestore.DocumentData | undefined;

    if (providedLeagueId) {
      // Join by leagueId directly (for public leagues shown in list)
      const leagueDoc = await db.collection("leagues").doc(providedLeagueId).get();
      if (leagueDoc.exists) {
        leagueId = providedLeagueId;
        leagueData = leagueDoc.data();
      }
    }

    if (!leagueData && joinCode) {
      // Search by join code (for private leagues or direct code entry)
      const normalizedCode = joinCode.toUpperCase().trim();
      const snap = await db.collection("leagues")
        .where("joinCode", "==", normalizedCode)
        .where("status", "in", ["preseason", "active"])
        .limit(1)
        .get();

      if (!snap.empty) {
        const doc = snap.docs[0];
        leagueId = doc.id;
        leagueData = doc.data();
      }
    }

    if (!leagueData || !leagueId) {
      sendError(res, 404, "Invalid join code or league not found");
      return;
    }

    // Check if league is accepting members
    if (leagueData.membershipLocked) {
      sendError(res, 403, "This league is no longer accepting new members");
      return;
    }

    if (leagueData.status === "completed" || leagueData.status === "archived") {
      sendError(res, 403, "This league has ended");
      return;
    }

    // For private leagues, verify passcode
    if (!leagueData.isPublic) {
      if (!passcode) {
        sendError(res, 400, "Passcode required for private leagues");
        return;
      }
      if (passcode !== leagueData.passcode) {
        sendError(res, 403, "Invalid passcode");
        return;
      }
    }

    // Check if already a member
    const memberDoc = await db.collection("leagues").doc(leagueId).collection("members").doc(userId).get();
    if (memberDoc.exists && memberDoc.data()?.isActive) {
      sendError(res, 400, "You are already a member of this league");
      return;
    }

    // Check max players limit
    if (leagueData.maxPlayers) {
      const membersSnap = await db.collection("leagues").doc(leagueId)
        .collection("members")
        .where("isActive", "==", true)
        .count()
        .get();

      if (membersSnap.data().count >= leagueData.maxPlayers) {
        sendError(res, 403, "This league is full");
        return;
      }
    }

    // Get user info
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data() || {};

    const now = new Date();

    // Add or reactivate membership
    await db.collection("leagues").doc(leagueId).collection("members").doc(userId).set({
      userId,
      displayName: userData.displayName || "Unknown",
      email: userData.email || "",
      role: "member" as MemberRole,
      joinedAt: now,
      isActive: true,
    }, { merge: true });

    const response: JoinLeagueResponse = {
      ok: true,
      leagueId,
      leagueName: leagueData.name,
    };

    sendSuccess(res, response);
  } catch (err: unknown) {
    console.error("Join league error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    sendError(res, 500, errorMessage);
  }
});

/**
 * Get all leagues for the current user
 */
export const getUserLeagues = onRequest(async (req, res) => {
  const auth = await handleAuthenticatedRequest(req, res);
  if (!auth) return;

  const userId = auth.userId;

  try {
    // Get all leagues where user is a member
    const leaguesSnap = await db.collection("leagues").get();
    const userLeagues: LeagueSummary[] = [];

    for (const leagueDoc of leaguesSnap.docs) {
      const memberDoc = await db.collection("leagues").doc(leagueDoc.id)
        .collection("members")
        .doc(userId)
        .get();

      if (memberDoc.exists && memberDoc.data()?.isActive) {
        const leagueData = leagueDoc.data();
        const memberData = memberDoc.data();

        // Get member count
        const membersSnap = await db.collection("leagues").doc(leagueDoc.id)
          .collection("members")
          .where("isActive", "==", true)
          .count()
          .get();

        userLeagues.push({
          id: leagueDoc.id,
          name: leagueData.name,
          season: leagueData.season,
          memberCount: membersSnap.data().count,
          role: memberData?.role || "member",
          status: leagueData.status,
          entryFee: leagueData.entryFee || 0,
          isPublic: leagueData.isPublic ?? true, // Default to true for backwards compatibility
        });
      }
    }

    // Sort by most recent first (could also sort by name)
    userLeagues.sort((a, b) => a.name.localeCompare(b.name));

    sendSuccess(res, { ok: true, leagues: userLeagues });
  } catch (err: unknown) {
    console.error("Get user leagues error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    sendError(res, 500, errorMessage);
  }
});

/**
 * Get all available leagues (public leagues the user is not a member of)
 */
export const getAvailableLeagues = onRequest(async (req, res) => {
  const auth = await handleAuthenticatedRequest(req, res);
  if (!auth) return;

  const userId = auth.userId;

  try {
    // Get all leagues that are accepting members
    // Note: We query by status first, then filter isPublic in code
    // because existing leagues may not have isPublic field (defaults to true)
    const leaguesSnap = await db.collection("leagues")
      .where("status", "in", ["preseason", "active"])
      .get();

    const availableLeagues: PublicLeagueSummary[] = [];

    for (const leagueDoc of leaguesSnap.docs) {
      const leagueData = leagueDoc.data();

      // Skip private leagues (default is public if isPublic is undefined)
      if (leagueData.isPublic === false) continue;

      // Skip if membership is locked
      if (leagueData.membershipLocked) continue;

      // Check if user is already a member
      const memberDoc = await db.collection("leagues").doc(leagueDoc.id)
        .collection("members")
        .doc(userId)
        .get();

      if (memberDoc.exists && memberDoc.data()?.isActive) {
        // User is already a member, skip
        continue;
      }

      // Get member count
      const membersSnap = await db.collection("leagues").doc(leagueDoc.id)
        .collection("members")
        .where("isActive", "==", true)
        .count()
        .get();

      const memberCount = membersSnap.data().count;

      // Skip if league is full
      if (leagueData.maxPlayers && memberCount >= leagueData.maxPlayers) {
        continue;
      }

      availableLeagues.push({
        id: leagueDoc.id,
        name: leagueData.name,
        season: leagueData.season,
        memberCount,
        maxPlayers: leagueData.maxPlayers || undefined,
        status: leagueData.status,
        entryFee: leagueData.entryFee || 0,
        isPublic: true,
      });
    }

    // Sort by name
    availableLeagues.sort((a, b) => a.name.localeCompare(b.name));

    sendSuccess(res, { ok: true, leagues: availableLeagues });
  } catch (err: unknown) {
    console.error("Get available leagues error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    sendError(res, 500, errorMessage);
  }
});

/**
 * Get league details including members
 */
export const getLeagueDetails = onRequest(async (req, res) => {
  const auth = await handleAuthenticatedRequest(req, res);
  if (!auth) return;

  const userId = auth.userId;
  const leagueId = (req.query.leagueId || req.body?.leagueId) as string;
  if (!leagueId) {
    sendError(res, 400, "leagueId required");
    return;
  }

  try {
    // Verify user is a member
    const memberDoc = await db.collection("leagues").doc(leagueId)
      .collection("members").doc(userId).get();

    if (!memberDoc.exists || !memberDoc.data()?.isActive) {
      sendError(res, 403, "You are not a member of this league");
      return;
    }

    const leagueDoc = await db.collection("leagues").doc(leagueId).get();
    if (!leagueDoc.exists) {
      sendError(res, 404, "League not found");
      return;
    }

    const leagueData = leagueDoc.data()!;
    const isOwner = leagueData.ownerId === userId;

    // Get all active members
    const membersSnap = await db.collection("leagues").doc(leagueId)
      .collection("members")
      .where("isActive", "==", true)
      .get();

    const members = membersSnap.docs.map(doc => ({
      userId: doc.id,
      ...doc.data(),
    }));

    sendSuccess(res, {
      ok: true,
      league: {
        id: leagueDoc.id,
        ...leagueData,
        // Only include sensitive info for owner
        joinCode: isOwner ? leagueData.joinCode : undefined,
        joinLink: isOwner ? leagueData.joinLink : undefined,
      },
      members,
      isOwner,
    });
  } catch (err: unknown) {
    console.error("Get league details error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    sendError(res, 500, errorMessage);
  }
});

/**
 * Update league settings (owner only)
 */
export const updateLeagueSettings = onRequest(async (req, res) => {
  const auth = await handleAuthenticatedRequest(req, res, "POST");
  if (!auth) return;

  const userId = auth.userId;
  const { leagueId, name, entryFee, payoutStructure, maxPlayers, membershipLocked, isPublic, passcode } = req.body as {
    leagueId: string;
    name?: string;
    entryFee?: number;
    payoutStructure?: PayoutEntry[];
    maxPlayers?: number;
    membershipLocked?: boolean;
    isPublic?: boolean;
    passcode?: string;
  };

  if (!leagueId) {
    sendError(res, 400, "leagueId required");
    return;
  }

  try {
    const leagueDoc = await db.collection("leagues").doc(leagueId).get();
    if (!leagueDoc.exists) {
      sendError(res, 404, "League not found");
      return;
    }

    const leagueData = leagueDoc.data()!;

    // Only owner can update
    if (leagueData.ownerId !== userId) {
      sendError(res, 403, "Only the league owner can update settings");
      return;
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    // Name update
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.length > 50) {
        sendError(res, 400, "League name must be 2-50 characters");
        return;
      }
      updates.name = name.trim();
    }

    // Entry fee update (only in preseason)
    if (entryFee !== undefined) {
      if (leagueData.status !== "preseason") {
        sendError(res, 400, "Cannot change entry fee after season starts");
        return;
      }
      if (typeof entryFee !== "number" || entryFee < 0) {
        sendError(res, 400, "Entry fee must be a non-negative number");
        return;
      }
      updates.entryFee = entryFee;
    }

    // Payout structure update (only in preseason)
    if (payoutStructure !== undefined) {
      if (leagueData.status !== "preseason") {
        sendError(res, 400, "Cannot change payouts after season starts");
        return;
      }

      const normalizedPayouts: Record<string, number> = {};
      let payoutTotal = 0;

      for (const p of payoutStructure) {
        if (p.rank && p.amount >= 0) {
          normalizedPayouts[String(p.rank)] = p.amount;
          payoutTotal += p.amount;
        }
      }

      updates.payoutStructure = payoutStructure;
      updates.payouts = normalizedPayouts;
      updates.payoutTotal = payoutTotal;
    }

    // Max players update
    if (maxPlayers !== undefined) {
      if (typeof maxPlayers !== "number" || maxPlayers < 2 || maxPlayers > 100) {
        sendError(res, 400, "Max players must be between 2 and 100");
        return;
      }
      updates.maxPlayers = maxPlayers;
    }

    // Membership lock update
    if (membershipLocked !== undefined) {
      updates.membershipLocked = Boolean(membershipLocked);
    }

    // Public/private update
    if (isPublic !== undefined) {
      updates.isPublic = Boolean(isPublic);
      // If making private, require a passcode to be set (now or previously)
      if (!isPublic && !passcode && !leagueData.passcode) {
        sendError(res, 400, "Passcode required when making league private");
        return;
      }
    }

    // Passcode update (only relevant for private leagues)
    if (passcode !== undefined) {
      if (passcode.length < 4 || passcode.length > 20) {
        sendError(res, 400, "Passcode must be 4-20 characters");
        return;
      }
      updates.passcode = passcode;
    }

    await db.collection("leagues").doc(leagueId).update(updates);

    sendSuccess(res, { ok: true });
  } catch (err: unknown) {
    console.error("Update league settings error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    sendError(res, 500, errorMessage);
  }
});

/**
 * Regenerate join code (owner only)
 */
export const regenerateJoinCode = onRequest(async (req, res) => {
  const auth = await handleAuthenticatedRequest(req, res, "POST");
  if (!auth) return;

  const userId = auth.userId;
  const { leagueId } = req.body as { leagueId: string };

  if (!leagueId) {
    sendError(res, 400, "leagueId required");
    return;
  }

  try {
    const leagueDoc = await db.collection("leagues").doc(leagueId).get();
    if (!leagueDoc.exists) {
      sendError(res, 404, "League not found");
      return;
    }

    const leagueData = leagueDoc.data()!;

    if (leagueData.ownerId !== userId) {
      sendError(res, 403, "Only the league owner can regenerate the join code");
      return;
    }

    const newJoinCode = await generateUniqueJoinCode();
    const baseUrl = req.headers.origin || "https://three-man-league.web.app";
    const joinLink = `${baseUrl}/join?code=${newJoinCode}`;

    await db.collection("leagues").doc(leagueId).update({
      joinCode: newJoinCode,
      joinLink,
      updatedAt: new Date(),
    });

    sendSuccess(res, { ok: true, joinCode: newJoinCode, joinLink });
  } catch (err: unknown) {
    console.error("Regenerate join code error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    sendError(res, 500, errorMessage);
  }
});

/**
 * Remove a member from the league (owner only) or leave league (self)
 */
export const leaveOrRemoveMember = onRequest(async (req, res) => {
  const auth = await handleAuthenticatedRequest(req, res, "POST");
  if (!auth) return;

  const userId = auth.userId;
  const { leagueId, targetUserId } = req.body as { leagueId: string; targetUserId: string };

  if (!leagueId || !targetUserId) {
    sendError(res, 400, "leagueId and targetUserId required");
    return;
  }

  try {
    const leagueDoc = await db.collection("leagues").doc(leagueId).get();
    if (!leagueDoc.exists) {
      sendError(res, 404, "League not found");
      return;
    }

    const leagueData = leagueDoc.data()!;
    const isOwner = leagueData.ownerId === userId;
    const isSelf = userId === targetUserId;

    // Can only remove others if owner, or remove self
    if (!isSelf && !isOwner) {
      sendError(res, 403, "Only the league owner can remove members");
      return;
    }

    // Cannot remove the owner
    if (targetUserId === leagueData.ownerId) {
      sendError(res, 400, "Cannot remove the league owner. Transfer ownership first.");
      return;
    }

    // Soft delete the membership
    await db.collection("leagues").doc(leagueId)
      .collection("members").doc(targetUserId)
      .update({ isActive: false });

    sendSuccess(res, { ok: true });
  } catch (err: unknown) {
    console.error("Leave/remove member error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    sendError(res, 500, errorMessage);
  }
});

/**
 * Set user's active league
 */
export const setActiveLeague = onRequest(async (req, res) => {
  const auth = await handleAuthenticatedRequest(req, res, "POST");
  if (!auth) return;

  const userId = auth.userId;
  const { leagueId } = req.body as { leagueId: string };

  if (!leagueId) {
    sendError(res, 400, "leagueId required");
    return;
  }

  try {
    // Verify user is a member of this league
    const memberDoc = await db.collection("leagues").doc(leagueId)
      .collection("members").doc(userId).get();

    if (!memberDoc.exists || !memberDoc.data()?.isActive) {
      sendError(res, 403, "You are not a member of this league");
      return;
    }

    // Update user's active league
    await db.collection("users").doc(userId).set({
      activeLeagueId: leagueId,
      updatedAt: new Date(),
    }, { merge: true });

    sendSuccess(res, { ok: true });
  } catch (err: unknown) {
    console.error("Set active league error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    sendError(res, 500, errorMessage);
  }
});

