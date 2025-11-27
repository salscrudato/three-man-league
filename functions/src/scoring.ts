import type { SportsPlayerStats } from "./sportsApi.js";

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

/**
 * Calculate DraftKings NFL scoring
 *
 * Scoring rules:
 * - Passing TD: 4 pts
 * - 25 Passing Yards: 1 pt (= 0.04 per yard)
 * - 300+ Pass Yards game: +3 pts bonus
 * - Interception: -1 pt
 * - Rushing TD: 6 pts
 * - 10 Rushing Yards: 1 pt (= 0.1 per yard)
 * - 100+ Rush Yards game: +3 pts bonus
 * - Receiving TD: 6 pts
 * - 10 Receiving Yards: 1 pt (= 0.1 per yard)
 * - 100+ Rec Yards game: +3 pts bonus
 * - Reception: 1 pt (PPR)
 * - Fumble Lost: -1 pt
 * - 2-pt Conversion: 2 pts
 * - Offensive Fumble Recovery TD: 6 pts
 */
export function calculateDraftKingsPoints(stats: PlayerGameStats): number {
  let pts = 0;

  // Passing
  pts += 4 * stats.passingTD;
  pts += 0.04 * stats.passingYards;
  if (stats.passingYards >= 300) pts += 3;

  // Rushing
  pts += 6 * stats.rushingTD;
  pts += 0.1 * stats.rushingYards;
  if (stats.rushingYards >= 100) pts += 3;

  // Receiving
  pts += 6 * stats.receivingTD;
  pts += 0.1 * stats.receivingYards;
  if (stats.receivingYards >= 100) pts += 3;

  // PPR
  pts += stats.receptions;

  // Turnovers
  pts -= stats.interceptions;
  pts -= stats.fumblesLost;

  // Bonuses
  pts += 2 * stats.twoPtConversions;
  pts += 6 * stats.offensiveFumbleRecoveryTD;

  // Round to 2 decimal places
  return Math.round(pts * 100) / 100;
}

/**
 * Map ESPN API player stats to our PlayerGameStats interface
 * ESPN API returns stats with proper field names already
 */
export function mapSportsDbToStats(rawStats: SportsPlayerStats): PlayerGameStats {
  return {
    passingYards: rawStats.passingYards || 0,
    passingTD: rawStats.passingTouchdowns || 0,
    interceptions: rawStats.interceptions || 0,
    rushingYards: rawStats.rushingYards || 0,
    rushingTD: rawStats.rushingTouchdowns || 0,
    receivingYards: rawStats.receivingYards || 0,
    receivingTD: rawStats.receivingTouchdowns || 0,
    receptions: rawStats.receptions || 0,
    fumblesLost: rawStats.fumblesLost || 0,
    twoPtConversions: rawStats.twoPtConversions || 0,
    offensiveFumbleRecoveryTD: 0, // Rarely available in free APIs
  };
}

/**
 * Create empty stats (for testing or when no data available)
 */
export function emptyStats(): PlayerGameStats {
  return {
    passingYards: 0,
    passingTD: 0,
    interceptions: 0,
    rushingYards: 0,
    rushingTD: 0,
    receivingYards: 0,
    receivingTD: 0,
    receptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
    offensiveFumbleRecoveryTD: 0,
  };
}

