/**
 * Backend types for three-man-league Cloud Functions
 *
 * Re-exports all shared types from @shared/types.
 * The shared types use a TimestampLike interface that works with both firebase-admin
 * and firebase client Timestamp types.
 */

// Re-export all shared types
export type {
  // Timestamp abstraction
  TimestampLike,
  DateOrTimestamp,
  // Users
  User,
  PlayerUsage,
  // Leagues
  LeagueStatus,
  MemberRole,
  PayoutEntry,
  League,
  LeagueWithId,
  LeagueMember,
  // League API
  CreateLeagueRequest,
  CreateLeagueResponse,
  JoinLeagueRequest,
  JoinLeagueResponse,
  LeagueSummary,
  PublicLeagueSummary,
  // Weeks
  WeekStatus,
  Week,
  // Picks
  UserPicks,
  // Scores
  UserScore,
  // Season Standings
  SeasonStanding,
  // Players
  Position,
  EligiblePosition,
  SeasonStats,
  Player,
  PlayerWithId,
  // Games
  Game,
  GameWithId,
  // Scoring
  PlayerGameStats,
  // API
  SubmitPicksRequest,
  // Backfill
  BackfillStatus,
  LeagueBackfillConfig,
  WeekBackfillInfo,
  BackfillMemberPick,
  BackfillWeekRequest,
  BackfillMemberResult,
  BackfillWeekResponse,
  BackfillWeekStatus,
  BackfillStatusResponse,
  BackfilledUserScore,
  // UI Types (may be used in API responses)
  PlayerOption,
} from "../../shared/types.js";

// Re-export constants
export {
  // Payout constants
  DEFAULT_PAYOUT_ENTRIES,
  PAYOUT_STRUCTURE,
  TOTAL_POT,
  ENTRY_FEE,
  // Payout helpers
  payoutEntriesToRecord,
  recordToPayoutEntries,
  calculatePayoutTotal,
  getPayoutForRank,
  // Season configuration
  SEASON,
  SEASON_START_ISO,
  REGULAR_SEASON_WEEKS,
  PICK_POSITIONS,
} from "../../shared/types.js";

// Re-export season types
export type { PickPosition } from "../../shared/types.js";
