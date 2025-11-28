/**
 * League Management Cloud Functions
 *
 * Handles league creation, joining, settings management, and member operations.
 */

import { onRequest } from "firebase-functions/v2/https";
import { db, SEASON } from "./config.js";
import { setCors, verifyAuth } from "./utils/http.js";
import type {
  CreateLeagueRequest,
  CreateLeagueResponse,
  JoinLeagueRequest,
  JoinLeagueResponse,
  LeagueSummary,
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
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).send({ error: "POST only" }); return; }

  const userId = await verifyAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).send({ error: "Authentication required" });
    return;
  }

  const { name, entryFee, maxPlayers, payoutStructure, season } = req.body as CreateLeagueRequest;

  // Validation
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    res.status(400).send({ error: "League name must be at least 2 characters" });
    return;
  }

  if (name.length > 50) {
    res.status(400).send({ error: "League name must be 50 characters or less" });
    return;
  }

  if (entryFee !== undefined && (typeof entryFee !== "number" || entryFee < 0)) {
    res.status(400).send({ error: "Entry fee must be a non-negative number" });
    return;
  }

  if (maxPlayers !== undefined && (typeof maxPlayers !== "number" || maxPlayers < 2 || maxPlayers > 100)) {
    res.status(400).send({ error: "Max players must be between 2 and 100" });
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

    // Create league document
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

    res.status(200).send(response);
  } catch (err: unknown) {
    console.error("Create league error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send({ error: errorMessage });
  }
});

/**
 * Join a league using a join code
 */
export const joinLeague = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).send({ error: "POST only" }); return; }

  const userId = await verifyAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).send({ error: "Authentication required" });
    return;
  }

  const { joinCode, leagueId: providedLeagueId } = req.body as JoinLeagueRequest;

  if (!joinCode || typeof joinCode !== "string") {
    res.status(400).send({ error: "Join code required" });
    return;
  }

  const normalizedCode = joinCode.toUpperCase().trim();

  try {
    // Find league by join code
    let leagueId = providedLeagueId;
    let leagueData: FirebaseFirestore.DocumentData | undefined;

    if (providedLeagueId) {
      // Verify provided leagueId matches join code
      const leagueDoc = await db.collection("leagues").doc(providedLeagueId).get();
      if (leagueDoc.exists && leagueDoc.data()?.joinCode === normalizedCode) {
        leagueId = providedLeagueId;
        leagueData = leagueDoc.data();
      }
    }

    if (!leagueId) {
      // Search by join code
      const snap = await db.collection("leagues")
        .where("joinCode", "==", normalizedCode)
        .where("status", "in", ["preseason", "active"])
        .limit(1)
        .get();

      if (snap.empty) {
        res.status(404).send({ error: "Invalid join code or league not accepting members" });
        return;
      }

      const doc = snap.docs[0];
      leagueId = doc.id;
      leagueData = doc.data();
    }

    if (!leagueData) {
      res.status(404).send({ error: "League not found" });
      return;
    }

    // Check if league is accepting members
    if (leagueData.membershipLocked) {
      res.status(403).send({ error: "This league is no longer accepting new members" });
      return;
    }

    if (leagueData.status === "completed" || leagueData.status === "archived") {
      res.status(403).send({ error: "This league has ended" });
      return;
    }

    // Check if already a member
    const memberDoc = await db.collection("leagues").doc(leagueId).collection("members").doc(userId).get();
    if (memberDoc.exists && memberDoc.data()?.isActive) {
      res.status(400).send({ error: "You are already a member of this league" });
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
        res.status(403).send({ error: "This league is full" });
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

    res.status(200).send(response);
  } catch (err: unknown) {
    console.error("Join league error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send({ error: errorMessage });
  }
});

/**
 * Get all leagues for the current user
 */
export const getUserLeagues = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const userId = await verifyAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).send({ error: "Authentication required" });
    return;
  }

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
        });
      }
    }

    // Sort by most recent first (could also sort by name)
    userLeagues.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).send({ ok: true, leagues: userLeagues });
  } catch (err: unknown) {
    console.error("Get user leagues error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send({ error: errorMessage });
  }
});

/**
 * Get league details including members
 */
export const getLeagueDetails = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const userId = await verifyAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).send({ error: "Authentication required" });
    return;
  }

  const leagueId = (req.query.leagueId || req.body?.leagueId) as string;
  if (!leagueId) {
    res.status(400).send({ error: "leagueId required" });
    return;
  }

  try {
    // Verify user is a member
    const memberDoc = await db.collection("leagues").doc(leagueId)
      .collection("members").doc(userId).get();

    if (!memberDoc.exists || !memberDoc.data()?.isActive) {
      res.status(403).send({ error: "You are not a member of this league" });
      return;
    }

    const leagueDoc = await db.collection("leagues").doc(leagueId).get();
    if (!leagueDoc.exists) {
      res.status(404).send({ error: "League not found" });
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

    res.status(200).send({
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
    res.status(500).send({ error: errorMessage });
  }
});

/**
 * Update league settings (owner only)
 */
export const updateLeagueSettings = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).send({ error: "POST only" }); return; }

  const userId = await verifyAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).send({ error: "Authentication required" });
    return;
  }

  const { leagueId, name, entryFee, payoutStructure, maxPlayers, membershipLocked } = req.body as {
    leagueId: string;
    name?: string;
    entryFee?: number;
    payoutStructure?: PayoutEntry[];
    maxPlayers?: number;
    membershipLocked?: boolean;
  };

  if (!leagueId) {
    res.status(400).send({ error: "leagueId required" });
    return;
  }

  try {
    const leagueDoc = await db.collection("leagues").doc(leagueId).get();
    if (!leagueDoc.exists) {
      res.status(404).send({ error: "League not found" });
      return;
    }

    const leagueData = leagueDoc.data()!;

    // Only owner can update
    if (leagueData.ownerId !== userId) {
      res.status(403).send({ error: "Only the league owner can update settings" });
      return;
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    // Name update
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.length > 50) {
        res.status(400).send({ error: "League name must be 2-50 characters" });
        return;
      }
      updates.name = name.trim();
    }

    // Entry fee update (only in preseason)
    if (entryFee !== undefined) {
      if (leagueData.status !== "preseason") {
        res.status(400).send({ error: "Cannot change entry fee after season starts" });
        return;
      }
      if (typeof entryFee !== "number" || entryFee < 0) {
        res.status(400).send({ error: "Entry fee must be a non-negative number" });
        return;
      }
      updates.entryFee = entryFee;
    }

    // Payout structure update (only in preseason)
    if (payoutStructure !== undefined) {
      if (leagueData.status !== "preseason") {
        res.status(400).send({ error: "Cannot change payouts after season starts" });
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
        res.status(400).send({ error: "Max players must be between 2 and 100" });
        return;
      }
      updates.maxPlayers = maxPlayers;
    }

    // Membership lock update
    if (membershipLocked !== undefined) {
      updates.membershipLocked = Boolean(membershipLocked);
    }

    await db.collection("leagues").doc(leagueId).update(updates);

    res.status(200).send({ ok: true });
  } catch (err: unknown) {
    console.error("Update league settings error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send({ error: errorMessage });
  }
});

/**
 * Regenerate join code (owner only)
 */
export const regenerateJoinCode = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).send({ error: "POST only" }); return; }

  const userId = await verifyAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).send({ error: "Authentication required" });
    return;
  }

  const { leagueId } = req.body as { leagueId: string };

  if (!leagueId) {
    res.status(400).send({ error: "leagueId required" });
    return;
  }

  try {
    const leagueDoc = await db.collection("leagues").doc(leagueId).get();
    if (!leagueDoc.exists) {
      res.status(404).send({ error: "League not found" });
      return;
    }

    const leagueData = leagueDoc.data()!;

    if (leagueData.ownerId !== userId) {
      res.status(403).send({ error: "Only the league owner can regenerate the join code" });
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

    res.status(200).send({ ok: true, joinCode: newJoinCode, joinLink });
  } catch (err: unknown) {
    console.error("Regenerate join code error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send({ error: errorMessage });
  }
});

/**
 * Remove a member from the league (owner only) or leave league (self)
 */
export const leaveOrRemoveMember = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).send({ error: "POST only" }); return; }

  const userId = await verifyAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).send({ error: "Authentication required" });
    return;
  }

  const { leagueId, targetUserId } = req.body as { leagueId: string; targetUserId: string };

  if (!leagueId || !targetUserId) {
    res.status(400).send({ error: "leagueId and targetUserId required" });
    return;
  }

  try {
    const leagueDoc = await db.collection("leagues").doc(leagueId).get();
    if (!leagueDoc.exists) {
      res.status(404).send({ error: "League not found" });
      return;
    }

    const leagueData = leagueDoc.data()!;
    const isOwner = leagueData.ownerId === userId;
    const isSelf = userId === targetUserId;

    // Can only remove others if owner, or remove self
    if (!isSelf && !isOwner) {
      res.status(403).send({ error: "Only the league owner can remove members" });
      return;
    }

    // Cannot remove the owner
    if (targetUserId === leagueData.ownerId) {
      res.status(400).send({ error: "Cannot remove the league owner. Transfer ownership first." });
      return;
    }

    // Soft delete the membership
    await db.collection("leagues").doc(leagueId)
      .collection("members").doc(targetUserId)
      .update({ isActive: false });

    res.status(200).send({ ok: true });
  } catch (err: unknown) {
    console.error("Leave/remove member error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send({ error: errorMessage });
  }
});

/**
 * Set user's active league
 */
export const setActiveLeague = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).send({ error: "POST only" }); return; }

  const userId = await verifyAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).send({ error: "Authentication required" });
    return;
  }

  const { leagueId } = req.body as { leagueId: string };

  if (!leagueId) {
    res.status(400).send({ error: "leagueId required" });
    return;
  }

  try {
    // Verify user is a member of this league
    const memberDoc = await db.collection("leagues").doc(leagueId)
      .collection("members").doc(userId).get();

    if (!memberDoc.exists || !memberDoc.data()?.isActive) {
      res.status(403).send({ error: "You are not a member of this league" });
      return;
    }

    // Update user's active league
    await db.collection("users").doc(userId).set({
      activeLeagueId: leagueId,
      updatedAt: new Date(),
    }, { merge: true });

    res.status(200).send({ ok: true });
  } catch (err: unknown) {
    console.error("Set active league error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send({ error: errorMessage });
  }
});

