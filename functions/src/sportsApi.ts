import fetch from "node-fetch";
import { SEASON, ESPN_SITE_API, ESPN_CORE_API } from "./config.js";

/**
 * ESPN NFL API Integration
 *
 * ESPN provides a free, undocumented API with comprehensive NFL data.
 * No API key required. Endpoints used:
 * - Scoreboard: Schedule and game status
 * - Teams: All 32 NFL teams with rosters
 * - Athletes: Player info and game stats
 * - Summary: Detailed game box scores
 */

// Retry configuration for robustness
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function espnFetch<T>(url: string, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "three-man-league/1.0",
        },
      });
      if (!res.ok) {
        throw new Error(`ESPN API error ${res.status} for ${url}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`ESPN API attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }
  throw new Error("ESPN API fetch failed after retries");
}

// ===== ESPN Response Types =====

export interface ESPNTeam {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  logo?: string;
}

export interface ESPNAthlete {
  id: string;
  fullName: string;
  displayName: string;
  position: {
    abbreviation: string;
    name: string;
  };
  team?: {
    id: string;
    abbreviation: string;
    displayName: string;
  };
}

export interface ESPNEvent {
  id: string;
  name: string;
  date: string; // ISO date string
  week?: { number: number };
  season?: { year: number; type: number };
  status: {
    type: {
      name: string; // "STATUS_SCHEDULED", "STATUS_IN_PROGRESS", "STATUS_FINAL"
      completed: boolean;
    };
  };
  competitions: Array<{
    id: string;
    date: string;
    competitors: Array<{
      id: string;
      homeAway: "home" | "away";
      team: ESPNTeam;
      score?: string;
    }>;
  }>;
}

export interface ESPNScoreboardResponse {
  events: ESPNEvent[];
  week?: { number: number };
  season?: { year: number; type: number };
}

export interface ESPNTeamsResponse {
  sports: Array<{
    leagues: Array<{
      teams: Array<{ team: ESPNTeam }>;
    }>;
  }>;
}

export interface ESPNRosterAthlete {
  id: string;
  fullName: string;
  displayName: string;
  position: {
    abbreviation: string;
    name: string;
  };
  jersey?: string;
  status?: { type: { name: string } };
}

export interface ESPNRosterResponse {
  athletes: Array<{
    position: string;
    items: ESPNRosterAthlete[];
  }>;
}

// Player game statistics from box score
export interface ESPNPlayerStatistics {
  athlete: {
    id: string;
    displayName: string;
  };
  stats: string[]; // Array of stat values as strings
}

export interface ESPNBoxScoreCategory {
  name: string;
  labels: string[];
  athletes: ESPNPlayerStatistics[];
}

// ===== Normalized Types (for internal use) =====

export interface SportsEvent {
  idEvent: string;
  strEvent: string;
  dateEvent: string;
  strTime: string;
  idHomeTeam: string;
  idAwayTeam: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intRound?: string;
  strStatus?: string;
}

export interface SportsTeam {
  idTeam: string;
  strTeam: string;
  strTeamShort?: string;
}

export interface SportsPlayer {
  idPlayer: string;
  strPlayer: string;
  strPosition: string;
  idTeam: string;
  strTeam?: string;
}

export interface SportsPlayerStats {
  idPlayer: string;
  strPlayer: string;
  passingYards: number;
  passingTouchdowns: number;
  interceptions: number;
  rushingYards: number;
  rushingTouchdowns: number;
  receivingYards: number;
  receivingTouchdowns: number;
  receptions: number;
  fumblesLost: number;
  twoPtConversions: number;
}


// ===== Schedule =====

/**
 * Fetch NFL season schedule from ESPN
 * Returns all games for the specified season
 */
export async function fetchSeasonSchedule(): Promise<SportsEvent[]> {
  const events: SportsEvent[] = [];

  // Fetch regular season (type 2) and postseason (type 3)
  for (const seasonType of [2, 3]) {
    try {
      const url = `${ESPN_SITE_API}/scoreboard?limit=1000&dates=${SEASON}&seasontype=${seasonType}`;
      const data = await espnFetch<ESPNScoreboardResponse>(url);

      for (const event of data.events || []) {
        const competition = event.competitions[0];
        if (!competition) continue;

        const homeTeam = competition.competitors.find((c) => c.homeAway === "home");
        const awayTeam = competition.competitors.find((c) => c.homeAway === "away");

        if (!homeTeam || !awayTeam) continue;

        const kickoffDate = new Date(event.date);

        events.push({
          idEvent: event.id,
          strEvent: event.name,
          dateEvent: kickoffDate.toISOString().split("T")[0],
          strTime: kickoffDate.toISOString().split("T")[1]?.replace("Z", "") || "00:00:00",
          idHomeTeam: homeTeam.team.id,
          idAwayTeam: awayTeam.team.id,
          strHomeTeam: homeTeam.team.displayName,
          strAwayTeam: awayTeam.team.displayName,
          intRound: event.week?.number?.toString(),
          strStatus: event.status.type.name,
        });
      }
    } catch (err) {
      console.error(`Failed to fetch season ${SEASON} type ${seasonType}:`, err);
    }
  }

  return events;
}

/**
 * Fetch games for a specific week
 */
export async function fetchWeekSchedule(weekNumber: number, seasonType = 2): Promise<SportsEvent[]> {
  const url = `${ESPN_SITE_API}/scoreboard?dates=${SEASON}&seasontype=${seasonType}&week=${weekNumber}`;
  const data = await espnFetch<ESPNScoreboardResponse>(url);

  const events: SportsEvent[] = [];

  for (const event of data.events || []) {
    const competition = event.competitions[0];
    if (!competition) continue;

    const homeTeam = competition.competitors.find((c) => c.homeAway === "home");
    const awayTeam = competition.competitors.find((c) => c.homeAway === "away");

    if (!homeTeam || !awayTeam) continue;

    const kickoffDate = new Date(event.date);

    events.push({
      idEvent: event.id,
      strEvent: event.name,
      dateEvent: kickoffDate.toISOString().split("T")[0],
      strTime: kickoffDate.toISOString().split("T")[1]?.replace("Z", "") || "00:00:00",
      idHomeTeam: homeTeam.team.id,
      idAwayTeam: awayTeam.team.id,
      strHomeTeam: homeTeam.team.displayName,
      strAwayTeam: awayTeam.team.displayName,
      intRound: weekNumber.toString(),
      strStatus: event.status.type.name,
    });
  }

  return events;
}

// ===== Teams =====

/**
 * Fetch all 32 NFL teams
 */
export async function fetchLeagueTeams(): Promise<SportsTeam[]> {
  const url = `${ESPN_SITE_API}/teams`;
  const data = await espnFetch<ESPNTeamsResponse>(url);

  const teams: SportsTeam[] = [];

  for (const sport of data.sports || []) {
    for (const league of sport.leagues || []) {
      for (const { team } of league.teams || []) {
        teams.push({
          idTeam: team.id,
          strTeam: team.displayName,
          strTeamShort: team.abbreviation,
        });
      }
    }
  }

  return teams;
}

// ===== Players =====

/**
 * Fetch roster for a specific team
 */
export async function fetchTeamPlayers(teamId: string): Promise<SportsPlayer[]> {
  const url = `${ESPN_SITE_API}/teams/${teamId}/roster`;

  interface RosterResponse {
    athletes?: Array<{
      position?: string;
      items?: ESPNRosterAthlete[];
    }>;
  }

  const data = await espnFetch<RosterResponse>(url);
  const players: SportsPlayer[] = [];

  for (const group of data.athletes || []) {
    for (const athlete of group.items || []) {
      // Only include offensive skill positions we care about
      const pos = athlete.position?.abbreviation || "";
      if (["QB", "RB", "WR", "TE", "FB"].includes(pos)) {
        players.push({
          idPlayer: athlete.id,
          strPlayer: athlete.fullName || athlete.displayName,
          strPosition: pos,
          idTeam: teamId,
        });
      }
    }
  }

  return players;
}

/**
 * Fetch all NFL players (skill positions only)
 */
export async function fetchAllNflPlayers(): Promise<SportsPlayer[]> {
  const teams = await fetchLeagueTeams();
  const allPlayers: SportsPlayer[] = [];

  for (const team of teams) {
    try {
      const players = await fetchTeamPlayers(team.idTeam);
      for (const p of players) {
        allPlayers.push({ ...p, strTeam: team.strTeam });
      }
    } catch (err) {
      console.error(`Failed to fetch players for team ${team.idTeam}:`, err);
    }
  }

  return allPlayers;
}


// ===== Game Stats =====

/**
 * Fetch detailed game summary with box score stats
 * This is the key endpoint for getting player game statistics
 */
export async function fetchGameSummary(eventId: string): Promise<{
  boxScore: Map<string, SportsPlayerStats>;
  gameStatus: string;
}> {
  const url = `${ESPN_SITE_API}/summary?event=${eventId}`;

  interface SummaryResponse {
    boxscore?: {
      players?: Array<{
        team: { id: string };
        statistics: ESPNBoxScoreCategory[];
      }>;
    };
    header?: {
      competitions?: Array<{
        status?: { type?: { name?: string } };
      }>;
    };
  }

  const data = await espnFetch<SummaryResponse>(url);
  const boxScore = new Map<string, SportsPlayerStats>();

  const gameStatus = data.header?.competitions?.[0]?.status?.type?.name || "STATUS_SCHEDULED";

  // Parse box score statistics
  for (const teamStats of data.boxscore?.players || []) {
    for (const category of teamStats.statistics || []) {
      const labels = category.labels || [];

      for (const athlete of category.athletes || []) {
        const playerId = athlete.athlete.id;
        const playerName = athlete.athlete.displayName;
        const stats = athlete.stats || [];

        // Get or create player stats
        let playerStats = boxScore.get(playerId);
        if (!playerStats) {
          playerStats = {
            idPlayer: playerId,
            strPlayer: playerName,
            passingYards: 0,
            passingTouchdowns: 0,
            interceptions: 0,
            rushingYards: 0,
            rushingTouchdowns: 0,
            receivingYards: 0,
            receivingTouchdowns: 0,
            receptions: 0,
            fumblesLost: 0,
            twoPtConversions: 0,
          };
          boxScore.set(playerId, playerStats);
        }

        // Map stats based on category and labels
        if (category.name === "passing") {
          parsePassingStats(playerStats, labels, stats);
        } else if (category.name === "rushing") {
          parseRushingStats(playerStats, labels, stats);
        } else if (category.name === "receiving") {
          parseReceivingStats(playerStats, labels, stats);
        } else if (category.name === "fumbles") {
          parseFumbleStats(playerStats, labels, stats);
        }
      }
    }
  }

  return { boxScore, gameStatus };
}

function parsePassingStats(stats: SportsPlayerStats, labels: string[], values: string[]): void {
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]?.toUpperCase();
    const value = parseFloat(values[i]) || 0;

    if (label === "YDS") stats.passingYards = value;
    else if (label === "TD") stats.passingTouchdowns = value;
    else if (label === "INT") stats.interceptions = value;
  }
}

function parseRushingStats(stats: SportsPlayerStats, labels: string[], values: string[]): void {
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]?.toUpperCase();
    const value = parseFloat(values[i]) || 0;

    if (label === "YDS") stats.rushingYards = value;
    else if (label === "TD") stats.rushingTouchdowns = value;
    else if (label === "FUM") stats.fumblesLost += value;
  }
}

function parseReceivingStats(stats: SportsPlayerStats, labels: string[], values: string[]): void {
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]?.toUpperCase();
    const value = parseFloat(values[i]) || 0;

    if (label === "YDS") stats.receivingYards = value;
    else if (label === "TD") stats.receivingTouchdowns = value;
    else if (label === "REC") stats.receptions = value;
    else if (label === "FUM") stats.fumblesLost += value;
  }
}

function parseFumbleStats(stats: SportsPlayerStats, labels: string[], values: string[]): void {
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]?.toUpperCase();
    const value = parseFloat(values[i]) || 0;

    if (label === "LOST" || label === "FUM") stats.fumblesLost = value;
  }
}

/**
 * Fetch player stats for a specific event
 * Returns array of player stats for all players in the game
 */
export async function fetchEventStats(eventId: string): Promise<SportsPlayerStats[]> {
  const { boxScore } = await fetchGameSummary(eventId);
  return Array.from(boxScore.values());
}

/**
 * Fetch player's game log (all games in season)
 */
export async function fetchPlayerGameLog(playerId: string): Promise<Array<{
  eventId: string;
  stats: SportsPlayerStats;
}>> {
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${playerId}/gamelog`;

  interface GameLogResponse {
    events?: Record<string, { id: string }>;
    seasonTypes?: Array<{
      categories?: Array<{
        events?: Array<{
          eventId: string;
          stats: string[];
        }>;
      }>;
    }>;
  }

  const data = await espnFetch<GameLogResponse>(url);
  const games: Array<{ eventId: string; stats: SportsPlayerStats }> = [];

  // Parse game log - structure varies by player position
  for (const seasonType of data.seasonTypes || []) {
    for (const category of seasonType.categories || []) {
      for (const event of category.events || []) {
        games.push({
          eventId: event.eventId,
          stats: {
            idPlayer: playerId,
            strPlayer: "",
            passingYards: 0,
            passingTouchdowns: 0,
            interceptions: 0,
            rushingYards: 0,
            rushingTouchdowns: 0,
            receivingYards: 0,
            receivingTouchdowns: 0,
            receptions: 0,
            fumblesLost: 0,
            twoPtConversions: 0,
          },
        });
      }
    }
  }

  return games;
}

/**
 * Check if a game has started (for pick locking)
 */
export async function hasGameStarted(eventId: string): Promise<boolean> {
  const { gameStatus } = await fetchGameSummary(eventId);
  return gameStatus !== "STATUS_SCHEDULED";
}

/**
 * Get current NFL week number
 */
export async function getCurrentWeek(): Promise<number> {
  const url = `${ESPN_SITE_API}/scoreboard`;
  const data = await espnFetch<ESPNScoreboardResponse>(url);
  return data.week?.number || 1;
}

// ===== Season Statistics =====

export interface SeasonStatistics {
  passingYards: number;
  passingTouchdowns: number;
  interceptions: number;
  rushingYards: number;
  rushingTouchdowns: number;
  receivingYards: number;
  receivingTouchdowns: number;
  receptions: number;
  fumblesLost: number;
  gamesPlayed: number;
}

interface ESPNCoreStatResponse {
  splits?: {
    categories?: Array<{
      name: string;
      stats?: Array<{
        name: string;
        value: number;
      }>;
    }>;
  };
}

/**
 * Fetch a player's season statistics from ESPN Core API
 * Returns aggregated stats for the entire season
 */
export async function fetchPlayerSeasonStats(
  playerId: string,
  season: number = parseInt(SEASON),
  seasonType: number = 2 // Regular season
): Promise<SeasonStatistics | null> {
  const url = `${ESPN_CORE_API}/seasons/${season}/types/${seasonType}/athletes/${playerId}/statistics`;

  try {
    const data = await espnFetch<ESPNCoreStatResponse>(url);

    const stats: SeasonStatistics = {
      passingYards: 0,
      passingTouchdowns: 0,
      interceptions: 0,
      rushingYards: 0,
      rushingTouchdowns: 0,
      receivingYards: 0,
      receivingTouchdowns: 0,
      receptions: 0,
      fumblesLost: 0,
      gamesPlayed: 0,
    };

    for (const category of data.splits?.categories || []) {
      const statMap = new Map(
        (category.stats || []).map((s) => [s.name, s.value])
      );

      if (category.name === "general") {
        stats.gamesPlayed = statMap.get("gamesPlayed") || 0;
        stats.fumblesLost = statMap.get("fumblesLost") || 0;
      } else if (category.name === "passing") {
        stats.passingYards = statMap.get("passingYards") || 0;
        stats.passingTouchdowns = statMap.get("passingTouchdowns") || 0;
        stats.interceptions = statMap.get("interceptions") || 0;
      } else if (category.name === "rushing") {
        stats.rushingYards = statMap.get("rushingYards") || 0;
        stats.rushingTouchdowns = statMap.get("rushingTouchdowns") || 0;
      } else if (category.name === "receiving") {
        stats.receivingYards = statMap.get("receivingYards") || 0;
        stats.receivingTouchdowns = statMap.get("receivingTouchdowns") || 0;
        stats.receptions = statMap.get("receptions") || 0;
      }
    }

    return stats;
  } catch (err) {
    // Player might not have stats (rookie, injured, etc.)
    console.warn(`Failed to fetch season stats for player ${playerId}:`, err);
    return null;
  }
}

/**
 * Calculate DraftKings fantasy points from season stats
 * Uses DraftKings PPR scoring
 */
export function calculateFantasyPoints(stats: SeasonStatistics): number {
  // DraftKings PPR Scoring
  const points =
    stats.passingYards * 0.04 +       // 1 point per 25 passing yards
    stats.passingTouchdowns * 4 +      // 4 points per passing TD
    stats.interceptions * -1 +         // -1 per interception
    stats.rushingYards * 0.1 +         // 1 point per 10 rushing yards
    stats.rushingTouchdowns * 6 +      // 6 points per rushing TD
    stats.receivingYards * 0.1 +       // 1 point per 10 receiving yards
    stats.receivingTouchdowns * 6 +    // 6 points per receiving TD
    stats.receptions * 1 +             // 1 point per reception (PPR)
    stats.fumblesLost * -1;            // -1 per fumble lost

  return Math.round(points * 10) / 10; // Round to 1 decimal
}
