/**
 * Firestore Document Mappers
 *
 * Type-safe helpers for reading Firestore documents with proper typing.
 * These replace loose casts like `doc.data() as SomeType` with validated mappers.
 */

import type { DocumentSnapshot, QueryDocumentSnapshot } from "firebase-admin/firestore";
import type {
  User,
  PlayerUsage,
  League,
  LeagueMember,
  Week,
  UserPicks,
  UserScore,
  SeasonStanding,
  Player,
  Game,
} from "../types.js";

/**
 * Generic mapper that adds the document ID to the data
 */
export function mapDocWithId<T>(
  doc: DocumentSnapshot | QueryDocumentSnapshot
): (T & { id: string }) | null {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as T & { id: string };
}

/**
 * Map a Firestore document to a User type
 */
export function mapUser(doc: DocumentSnapshot): User | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    displayName: data.displayName ?? "",
    email: data.email ?? "",
    photoURL: data.photoURL,
    activeLeagueId: data.activeLeagueId,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Map a Firestore document to a PlayerUsage type
 */
export function mapPlayerUsage(doc: DocumentSnapshot): PlayerUsage | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    season: data.season ?? "",
    playerId: data.playerId ?? "",
    firstUsedWeek: data.firstUsedWeek ?? "",
    leagueId: data.leagueId ?? "",
  };
}

/**
 * Map a Firestore document to a League type
 */
export function mapLeague(doc: DocumentSnapshot): (League & { id: string }) | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name ?? "",
    ownerId: data.ownerId ?? "",
    season: data.season ?? "",
    entryFee: data.entryFee ?? 0,
    payouts: data.payouts ?? {},
    payoutStructure: data.payoutStructure,
    payoutTotal: data.payoutTotal,
    maxPlayers: data.maxPlayers,
    joinCode: data.joinCode ?? "",
    joinLink: data.joinLink,
    joinCodeExpiresAt: data.joinCodeExpiresAt,
    status: data.status ?? "preseason",
    membershipLocked: data.membershipLocked,
    isPublic: data.isPublic ?? true, // Default to true for backwards compatibility
    passcode: data.passcode,
    createdAt: data.createdAt ?? new Date(),
    updatedAt: data.updatedAt,
  };
}

/**
 * Map a Firestore document to a LeagueMember type
 */
export function mapLeagueMember(doc: DocumentSnapshot): (LeagueMember & { id: string }) | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    userId: data.userId ?? doc.id,
    displayName: data.displayName ?? "",
    email: data.email ?? "",
    role: data.role ?? "member",
    joinedAt: data.joinedAt ?? new Date(),
    invitedBy: data.invitedBy,
    isActive: data.isActive ?? true,
  };
}

/**
 * Map a Firestore document to a Week type
 */
export function mapWeek(doc: DocumentSnapshot): (Week & { id: string }) | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    weekNumber: data.weekNumber ?? 0,
    startDate: data.startDate ?? new Date(),
    endDate: data.endDate ?? new Date(),
    status: data.status ?? "pending",
  };
}

/**
 * Map a Firestore document to a UserPicks type
 */
export function mapUserPicks(doc: DocumentSnapshot): UserPicks | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    qbPlayerId: data.qbPlayerId,
    qbGameId: data.qbGameId,
    qbLocked: data.qbLocked ?? false,
    rbPlayerId: data.rbPlayerId,
    rbGameId: data.rbGameId,
    rbLocked: data.rbLocked ?? false,
    wrPlayerId: data.wrPlayerId,
    wrGameId: data.wrGameId,
    wrLocked: data.wrLocked ?? false,
    createdAt: data.createdAt ?? new Date(),
    updatedAt: data.updatedAt ?? new Date(),
  };
}

/**
 * Map a Firestore document to a UserScore type
 */
export function mapUserScore(doc: DocumentSnapshot): UserScore | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    qbPoints: data.qbPoints ?? 0,
    rbPoints: data.rbPoints ?? 0,
    wrPoints: data.wrPoints ?? 0,
    totalPoints: data.totalPoints ?? 0,
    doublePickPositions: data.doublePickPositions ?? [],
    updatedAt: data.updatedAt ?? new Date(),
  };
}

/**
 * Map a Firestore document to a SeasonStanding type
 */
export function mapSeasonStanding(doc: DocumentSnapshot): SeasonStanding | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    userId: data.userId ?? doc.id,
    displayName: data.displayName ?? "",
    seasonTotalPoints: data.seasonTotalPoints ?? 0,
    weeksPlayed: data.weeksPlayed ?? 0,
    bestWeekPoints: data.bestWeekPoints ?? 0,
    bestWeek: data.bestWeek ?? "",
    updatedAt: data.updatedAt ?? new Date(),
  };
}

/**
 * Map a Firestore document to a Player type
 */
export function mapPlayer(doc: DocumentSnapshot): (Player & { id: string }) | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name ?? "",
    position: data.position ?? "QB",
    teamId: data.teamId ?? "",
    teamName: data.teamName,
    externalId: data.externalId ?? "",
    eligiblePositions: data.eligiblePositions ?? [],
    seasonStats: data.seasonStats,
    statsUpdatedAt: data.statsUpdatedAt,
  };
}

/**
 * Map a Firestore document to a Game type
 */
export function mapGame(doc: DocumentSnapshot): (Game & { id: string }) | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    gameId: data.gameId ?? doc.id,
    externalEventId: data.externalEventId ?? "",
    homeTeamId: data.homeTeamId ?? "",
    awayTeamId: data.awayTeamId ?? "",
    homeTeamName: data.homeTeamName,
    awayTeamName: data.awayTeamName,
    weekNumber: data.weekNumber ?? 0,
    kickoffTime: data.kickoffTime ?? new Date(),
    status: data.status,
  };
}

