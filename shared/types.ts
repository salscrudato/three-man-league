/**
 * Shared domain types for three-man-league
 *
 * This is the canonical source of truth for all domain types.
 * Both frontend and backend import from this file.
 *
 * DATA MODEL OVERVIEW:
 *
 * /users/{userId}                    - User profile (displayName, email, photoURL, activeLeagueId)
 * /users/{userId}/playerUsage/{id}   - Player usage tracking (season, playerId, firstUsedWeek, leagueId)
 *
 * /leagues/{leagueId}                - League configuration and settings
 * /leagues/{leagueId}/members/{uid}  - League membership (role, joinedAt, invitedBy)
 * /leagues/{leagueId}/weeks/{weekId} - Week status
 * /leagues/{leagueId}/weeks/{weekId}/picks/{userId}  - User picks for week
 * /leagues/{leagueId}/weeks/{weekId}/scores/{userId} - User scores for week
 * /leagues/{leagueId}/seasonStandings/{userId}       - Season standings
 *
 * /players/{playerId}                - NFL player data
 * /games/{gameId}                    - NFL game schedule
 * /config/season                     - Global season config
 */

// ===== Timestamp abstraction =====
// Both firebase-admin and firebase client have compatible Timestamp types
// We use a minimal interface that works with both
export interface TimestampLike {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}

// Type alias for fields that can be Date or Timestamp
export type DateOrTimestamp = Date | TimestampLike;

// ===== Users =====
export interface User {
  displayName: string;
  email: string;
  photoURL?: string;
  activeLeagueId?: string;
  createdAt?: DateOrTimestamp;
  updatedAt?: DateOrTimestamp;
}

export interface PlayerUsage {
  season: string;
  playerId: string;
  firstUsedWeek: string;
  leagueId: string;
}

// ===== Leagues =====
export type LeagueStatus = "preseason" | "active" | "completed" | "archived";
export type MemberRole = "owner" | "coOwner" | "member";

/**
 * Payout entry for a specific rank.
 * This is the canonical format for payout structures.
 */
export interface PayoutEntry {
  rank: number;
  amount: number;
}

/**
 * League document stored in Firestore.
 *
 * PAYOUT REPRESENTATION:
 * - `payoutStructure` (PayoutEntry[]) is the canonical format for new leagues
 * - `payouts` (Record<string, number>) is the legacy format for backwards compatibility
 * - Both are kept in sync by the backend when creating/updating leagues
 * - Frontend should prefer `payoutStructure` when available
 */
export interface League {
  name: string;
  ownerId: string;
  season: string;
  entryFee: number;
  /** @deprecated Use payoutStructure instead. Kept for backwards compatibility. */
  payouts: Record<string, number>;
  /** Canonical payout structure - array of {rank, amount} entries */
  payoutStructure?: PayoutEntry[];
  /** Computed total of all payouts */
  payoutTotal?: number;
  maxPlayers?: number;
  joinCode: string;
  joinLink?: string;
  joinCodeExpiresAt?: DateOrTimestamp;
  status: LeagueStatus;
  membershipLocked?: boolean;
  isPublic: boolean;
  passcode?: string;
  createdAt: DateOrTimestamp;
  updatedAt?: DateOrTimestamp;
}

// Extended type for client-side use with document ID
export interface LeagueWithId extends League {
  id: string;
}

export interface LeagueMember {
  userId: string;
  displayName: string;
  email: string;
  role: MemberRole;
  joinedAt: DateOrTimestamp;
  invitedBy?: string;
  isActive: boolean;
}

// ===== League API Types =====
export interface CreateLeagueRequest {
  name: string;
  entryFee?: number;
  maxPlayers?: number;
  payoutStructure?: PayoutEntry[];
  season?: string;
}

export interface CreateLeagueResponse {
  ok: boolean;
  leagueId: string;
  joinCode: string;
  joinLink: string;
  error?: string;
}

export interface JoinLeagueRequest {
  joinCode?: string;
  leagueId?: string;
  passcode?: string;
}

export interface JoinLeagueResponse {
  ok: boolean;
  leagueId: string;
  leagueName: string;
  error?: string;
}

export interface LeagueSummary {
  id: string;
  name: string;
  season: string;
  memberCount: number;
  role: MemberRole;
  status: LeagueStatus;
  entryFee: number;
  isPublic: boolean;
}

export interface PublicLeagueSummary {
  id: string;
  name: string;
  season: string;
  memberCount: number;
  maxPlayers?: number;
  status: LeagueStatus;
  entryFee: number;
  isPublic: boolean;
}

// ===== Weeks =====
export type WeekStatus = "pending" | "scoring" | "final";

export interface Week {
  weekNumber: number;
  startDate: DateOrTimestamp;
  endDate: DateOrTimestamp;
  status: WeekStatus;
}

// ===== Picks =====
export interface UserPicks {
  qbPlayerId?: string;
  qbGameId?: string;
  qbLocked: boolean;
  rbPlayerId?: string;
  rbGameId?: string;
  rbLocked: boolean;
  wrPlayerId?: string;
  wrGameId?: string;
  wrLocked: boolean;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// ===== Scores =====
export interface UserScore {
  qbPoints: number;
  rbPoints: number;
  wrPoints: number;
  totalPoints: number;
  doublePickPositions: string[];
  updatedAt: DateOrTimestamp;
}

// ===== Season Standings =====
export interface SeasonStanding {
  userId: string;
  displayName: string;
  seasonTotalPoints: number;
  weeksPlayed: number;
  bestWeekPoints: number;
  bestWeek: string;
  updatedAt: DateOrTimestamp;
}

// ===== Players =====
export type Position = "QB" | "RB" | "WR" | "TE";
export type EligiblePosition = "QB" | "RB" | "WR";

export interface SeasonStats {
  passingYards: number;
  passingTD: number;
  interceptions: number;
  rushingYards: number;
  rushingTD: number;
  receivingYards: number;
  receivingTD: number;
  receptions: number;
  fumblesLost: number;
  gamesPlayed: number;
  fantasyPoints: number;
}

export interface Player {
  name: string;
  position: Position;
  teamId: string;
  teamName?: string;
  externalId: string;
  eligiblePositions: EligiblePosition[];
  seasonStats?: SeasonStats;
  statsUpdatedAt?: DateOrTimestamp;
}

// Extended type for client-side use with document ID
export interface PlayerWithId extends Player {
  id: string;
}

// ===== Games =====
export interface Game {
  gameId: string;
  externalEventId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName?: string;
  awayTeamName?: string;
  weekNumber: number;
  kickoffTime: DateOrTimestamp;
  status?: "scheduled" | "in_progress" | "final";
}

// Extended type for client-side use with document ID
export interface GameWithId extends Game {
  id: string;
}

// ===== Scoring =====
export interface PlayerGameStats {
  passingYards: number;
  passingTD: number;
  interceptions: number;
  rushingYards: number;
  rushingTD: number;
  receivingYards: number;
  receivingTD: number;
  receptions: number;
  fumblesLost: number;
  twoPtConversions: number;
  offensiveFumbleRecoveryTD: number;
}

// ===== API Request/Response Types =====
export interface SubmitPicksRequest {
  leagueId: string;
  weekId: string;
  picks: {
    qbPlayerId?: string;
    qbGameId?: string;
    rbPlayerId?: string;
    rbGameId?: string;
    wrPlayerId?: string;
    wrGameId?: string;
  };
}

// ===== Backfill Types =====
export type BackfillStatus = "not_started" | "in_progress" | "completed" | "error";

export interface LeagueBackfillConfig {
  backfillEnabled?: boolean;
  backfillFromWeek?: number;
  backfillToWeek?: number;
  backfillStatus?: BackfillStatus;
  backfillCompletedAt?: DateOrTimestamp;
  backfillCompletedBy?: string;
}

export interface WeekBackfillInfo {
  backfillStatus?: "not_backfilled" | "backfilled" | "error";
  backfilledAt?: DateOrTimestamp;
  backfilledBy?: string;
  isBackfilled?: boolean;
}

export interface BackfillMemberPick {
  userId: string;
  qbPlayerId?: string;
  rbPlayerId?: string;
  wrPlayerId?: string;
  qbPointsOverride?: number;
  rbPointsOverride?: number;
  wrPointsOverride?: number;
}

export interface BackfillWeekRequest {
  leagueId: string;
  weekNumber: number;
  memberPicks: BackfillMemberPick[];
}

export interface BackfillMemberResult {
  userId: string;
  displayName?: string;
  qbPlayerId?: string;
  rbPlayerId?: string;
  wrPlayerId?: string;
  qbPoints: number;
  rbPoints: number;
  wrPoints: number;
  totalPoints: number;
  qbPlayerName?: string;
  rbPlayerName?: string;
  wrPlayerName?: string;
  errors?: string[];
  warnings?: string[];
  isBackfilled?: boolean;
}

export interface BackfillWeekResponse {
  ok: boolean;
  weekNumber: number;
  results: BackfillMemberResult[];
  error?: string;
}

export interface BackfillWeekStatus {
  weekNumber: number;
  weekId: string;
  status: "not_backfilled" | "backfilled" | "error";
  memberCount: number;
  scores?: BackfillMemberResult[];
  backfilledAt?: string;
  backfilledBy?: string;
}

export interface BackfillStatusResponse {
  ok: boolean;
  leagueId: string;
  backfillEnabled: boolean;
  backfillFromWeek?: number;
  backfillToWeek?: number;
  overallStatus: BackfillStatus;
  weeks: BackfillWeekStatus[];
}

export interface BackfilledUserScore extends UserScore {
  isBackfilled?: boolean;
  computedTotalPoints?: number;
  adjustedTotalPoints?: number;
  adjustmentReason?: string;
  backfilledAt?: DateOrTimestamp;
  backfilledBy?: string;
}

// ===== Frontend-specific UI Types =====
// Player with game info for picks UI
export interface PlayerOption {
  id: string;
  name: string;
  team: string;
  position: Position;
  gameId: string;
  gameLabel: string;
  kickoff: Date;
  kickoffFormatted: string;
  isLocked: boolean;
  isUsed: boolean;
  opponent: string;
  seasonStats?: SeasonStats;
}

// ===== Constants =====
// Default payout structure for new leagues (canonical array format)
export const DEFAULT_PAYOUT_ENTRIES: PayoutEntry[] = [
  { rank: 1, amount: 1200 },
  { rank: 2, amount: 750 },
  { rank: 3, amount: 500 },
  { rank: 4, amount: 415 },
  { rank: 5, amount: 270 },
  { rank: 6, amount: 195 },
  { rank: 7, amount: 120 },
];

/** @deprecated Use DEFAULT_PAYOUT_ENTRIES instead */
export const PAYOUT_STRUCTURE: Record<number, number> = {
  1: 1200,
  2: 750,
  3: 500,
  4: 415,
  5: 270,
  6: 195,
  7: 120,
};

export const TOTAL_POT = 3450;
export const ENTRY_FEE = 50;

// ===== Payout Conversion Helpers =====

/**
 * Convert PayoutEntry array to Record format (for legacy compatibility)
 */
export function payoutEntriesToRecord(entries: PayoutEntry[]): Record<string, number> {
  const record: Record<string, number> = {};
  for (const entry of entries) {
    record[String(entry.rank)] = entry.amount;
  }
  return record;
}

/**
 * Convert Record format to PayoutEntry array (canonical format)
 */
export function recordToPayoutEntries(record: Record<string, number>): PayoutEntry[] {
  return Object.entries(record)
    .map(([rank, amount]) => ({ rank: parseInt(rank, 10), amount }))
    .sort((a, b) => a.rank - b.rank);
}

/**
 * Calculate total payout from entries
 */
export function calculatePayoutTotal(entries: PayoutEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

/**
 * Get payout amount for a specific rank from a league
 * Prefers payoutStructure (canonical) over payouts (legacy)
 */
export function getPayoutForRank(
  league: { payoutStructure?: PayoutEntry[]; payouts?: Record<string, number> },
  rank: number
): number {
  if (league.payoutStructure && league.payoutStructure.length > 0) {
    const entry = league.payoutStructure.find(p => p.rank === rank);
    return entry?.amount ?? 0;
  }
  if (league.payouts) {
    return league.payouts[String(rank)] ?? 0;
  }
  return 0;
}

// ===== Season Configuration =====
// Canonical source for season-related constants

/** Current NFL season year */
export const SEASON = "2025";

/** Season start date - games before this are preseason */
export const SEASON_START_ISO = "2025-09-01T00:00:00Z";

/** Number of weeks in the NFL regular season */
export const REGULAR_SEASON_WEEKS = 18;

/** Positions allowed for picks */
export const PICK_POSITIONS = ["QB", "RB", "WR"] as const;
export type PickPosition = (typeof PICK_POSITIONS)[number];
