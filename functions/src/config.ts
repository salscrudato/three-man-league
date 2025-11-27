import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();

// Current NFL season
export const SEASON = "2025";

// OpenAI model for AI assistant
export const OPENAI_MODEL = "gpt-4.1-mini";

// ESPN API endpoints (no API key required - free and public)
export const ESPN_SITE_API = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";
export const ESPN_CORE_API = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

