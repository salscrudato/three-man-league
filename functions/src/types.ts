/**
 * Firestore schema types for three-man-league
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

import type { Timestamp } from "firebase-admin/firestore";

// ===== Users =====
export interface User {
  displayName: string;
  email: string;
  photoURL?: string;
  activeLeagueId?: string; // Currently selected league
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface PlayerUsage {
  season: string;
  playerId: string;
  firstUsedWeek: string;
  leagueId: string; // Player usage is now scoped per league
}

// ===== Leagues =====
export type LeagueStatus = "preseason" | "active" | "completed" | "archived";
export type MemberRole = "owner" | "coOwner" | "member";

export interface PayoutEntry {
  rank: number;
  amount: number;
}

export interface League {
  name: string;
  ownerId: string;
  season: string;
  entryFee: number;
  payouts: Record<string, number>; // Legacy format: rank -> amount e.g. {"1": 1200}
  payoutStructure?: PayoutEntry[]; // New format: ordered array [{rank: 1, amount: 1200}, ...]
  payoutTotal?: number; // Computed total of all payouts
  maxPlayers?: number; // Optional limit on league size
  joinCode: string; // Short unique code for joining (e.g., "ABC123")
  joinLink?: string; // Full URL with join code
  joinCodeExpiresAt?: Date | Timestamp; // Optional expiration
  status: LeagueStatus;
  membershipLocked?: boolean; // Prevent new members after season starts
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface LeagueMember {
  userId: string;
  displayName: string;
  email: string;
  role: MemberRole;
  joinedAt: Date | Timestamp;
  invitedBy?: string; // userId who invited this member
  isActive: boolean; // For soft-delete / leaving league
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
  joinCode: string;
  leagueId?: string; // Optional for explicit join
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
}

// ===== Weeks =====
export type WeekStatus = "pending" | "scoring" | "final";

export interface Week {
  weekNumber: number;
  startDate: Date | Timestamp;
  endDate: Date | Timestamp;
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
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

// ===== Scores =====
export interface UserScore {
  qbPoints: number;
  rbPoints: number;
  wrPoints: number;
  totalPoints: number;
  doublePickPositions: string[];
  updatedAt: Date | Timestamp;
}

// ===== Season Standings =====
export interface SeasonStanding {
  userId: string;
  displayName: string;
  seasonTotalPoints: number;
  weeksPlayed: number;
  bestWeekPoints: number;
  bestWeek: string;
  updatedAt: Date | Timestamp;
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
  fantasyPoints: number; // Calculated DraftKings PPR points
}

export interface Player {
  name: string;
  position: Position;
  teamId: string;
  teamName?: string;
  externalId: string;
  eligiblePositions: EligiblePosition[];
  seasonStats?: SeasonStats;
  statsUpdatedAt?: Date | Timestamp;
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
  kickoffTime: Date | Timestamp;
  status?: "scheduled" | "in_progress" | "final";
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

export interface AiChatRequest {
  leagueId: string;
  message: string;
  weekId?: string;
}

// ===== Payout Structure =====
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

// ===== Backfill Types =====
export type BackfillStatus = "not_started" | "in_progress" | "completed" | "error";

/**
 * Extended League interface with backfill fields
 */
export interface LeagueBackfillConfig {
  backfillEnabled?: boolean;
  backfillFromWeek?: number; // First week to backfill (e.g., 1)
  backfillToWeek?: number;   // Last week to backfill (e.g., 12)
  backfillStatus?: BackfillStatus;
  backfillCompletedAt?: Date | Timestamp;
  backfillCompletedBy?: string; // userId who completed backfill
}

/**
 * Extended Week interface with backfill tracking
 */
export interface WeekBackfillInfo {
  backfillStatus?: "not_backfilled" | "backfilled" | "error";
  backfilledAt?: Date | Timestamp;
  backfilledBy?: string; // userId who backfilled
  isBackfilled?: boolean;
}

/**
 * Member pick for backfill - one member's picks for a week
 */
export interface BackfillMemberPick {
  userId: string;
  qbPlayerId?: string;
  rbPlayerId?: string;
  wrPlayerId?: string;
  // Optional score overrides (if admin needs to manually adjust)
  qbPointsOverride?: number;
  rbPointsOverride?: number;
  wrPointsOverride?: number;
}

/**
 * Request payload for backfilling a single week
 */
export interface BackfillWeekRequest {
  leagueId: string;
  weekNumber: number;
  memberPicks: BackfillMemberPick[];
}

/**
 * Response from backfill operation
 */
export interface BackfillWeekResponse {
  ok: boolean;
  weekNumber: number;
  results: {
    userId: string;
    displayName?: string;
    qbPoints: number;
    rbPoints: number;
    wrPoints: number;
    totalPoints: number;
    qbPlayerName?: string;
    rbPlayerName?: string;
    wrPlayerName?: string;
    errors?: string[];
    warnings?: string[];
  }[];
  error?: string;
}

/**
 * Status request for getting backfill progress
 */
export interface BackfillStatusResponse {
  ok: boolean;
  leagueId: string;
  backfillEnabled: boolean;
  backfillFromWeek?: number;
  backfillToWeek?: number;
  overallStatus: BackfillStatus;
  weeks: {
    weekNumber: number;
    weekId: string;
    status: "not_backfilled" | "backfilled" | "error";
    memberCount: number;
    backfilledAt?: string;
    backfilledBy?: string;
  }[];
}

/**
 * Extended UserScore with backfill metadata
 */
export interface BackfilledUserScore extends UserScore {
  isBackfilled?: boolean;
  computedTotalPoints?: number;      // Original computed score
  adjustedTotalPoints?: number;       // Final score after override
  adjustmentReason?: string;          // Reason for manual adjustment
  backfilledAt?: Date | Timestamp;
  backfilledBy?: string;
}

