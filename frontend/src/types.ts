/**
 * Firestore schema types for three-man-league frontend
 */

import type { Timestamp } from "firebase/firestore";

// ===== Users =====
export interface User {
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface PlayerUsage {
  season: string;
  playerId: string;
  firstUsedWeek: string;
}

// ===== Leagues =====
export interface League {
  name: string;
  season: string;
  entryFee: number;
  payouts: Record<string, number>;
}

export interface LeagueMember {
  joinedAt: Date | Timestamp;
  role: "owner" | "player";
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
  id?: string; // Firestore doc id
  name: string;
  position: Position;
  teamId: string;
  teamName?: string;
  externalId: string;
  eligiblePositions: EligiblePosition[];
  seasonStats?: SeasonStats;
}

// ===== Games =====
export interface Game {
  id?: string; // Firestore doc id
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

// ===== Player with game info for picks UI =====
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

