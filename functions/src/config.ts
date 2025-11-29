import * as admin from "firebase-admin";
import {
  SEASON as SHARED_SEASON,
  SEASON_START_ISO,
  REGULAR_SEASON_WEEKS as SHARED_REGULAR_SEASON_WEEKS,
  PICK_POSITIONS as SHARED_PICK_POSITIONS,
} from "./types.js";
export type { PickPosition } from "./types.js";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();

// ============================================================================
// Season Configuration (from shared types)
// ============================================================================

/** Current NFL season year */
export const SEASON = SHARED_SEASON;

/** Season start date - games before this are preseason */
export const SEASON_START = new Date(SEASON_START_ISO);

/** Number of weeks in the NFL regular season */
export const REGULAR_SEASON_WEEKS = SHARED_REGULAR_SEASON_WEEKS;

/** Positions allowed for picks */
export const PICK_POSITIONS = SHARED_PICK_POSITIONS;

// ============================================================================
// External API Configuration
// ============================================================================

/** ESPN API endpoints (no API key required - free and public) */
export const ESPN_SITE_API = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";
export const ESPN_CORE_API = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

