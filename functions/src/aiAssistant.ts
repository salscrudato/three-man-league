import OpenAI from "openai";
import { onRequest } from "firebase-functions/v2/https";
import type { Response } from "express";
import { db, SEASON } from "./config.js";

// Lazy initialization of OpenAI client to avoid errors during deployment
let _client: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

// CORS handler
function setCors(res: Response) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export const aiChat = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  if (req.method !== "POST") {
    res.status(405).send({ error: "POST only" });
    return;
  }

  const { userId, message } = req.body as {
    userId: string;
    leagueId?: string;
    message: string;
  };

  if (!message) {
    res.status(400).send({ error: "message required" });
    return;
  }

  try {
    // Fetch playerUsage for the season if userId provided
    let usedPlayerNames: string[] = [];

    if (userId) {
      const usedSnap = await db
        .collection("users")
        .doc(userId)
        .collection("playerUsage")
        .where("season", "==", SEASON)
        .get();

      const usedPlayerIds = usedSnap.docs.map((d) => d.data().playerId);

      // Get player names for better context
      if (usedPlayerIds.length > 0) {
        const playerDocs = await Promise.all(
          usedPlayerIds.slice(0, 20).map(id => db.collection("players").doc(id).get())
        );
        usedPlayerNames = playerDocs
          .filter(d => d.exists)
          .map(d => d.data()?.name || d.id);
      }
    }

    const systemPrompt = `You are a helpful fantasy football assistant for "Three Man League" - a one-and-done fantasy game.

GAME RULES:
• Each week, pick exactly 1 QB, 1 RB, 1 WR (no TEs allowed in WR slot)
• ONE-AND-DONE: Once you use a player, you cannot use them again all season. Repeat = 0 points for that slot.
• Scoring: DraftKings NFL PPR scoring
  - Passing: 4 pts/TD, 0.04 pts/yard, +3 bonus at 300+ yards, -1 per INT
  - Rushing: 6 pts/TD, 0.1 pts/yard, +3 bonus at 100+ yards
  - Receiving: 6 pts/TD, 0.1 pts/yard, +3 bonus at 100+ yards, 1 pt/reception (PPR)
  - Turnovers: -1 per fumble lost
• Picks lock 1 hour before each player's game kickoff
• Season: 18 weeks, payout to top 7 finishers

YOUR ROLE:
• Give strategic advice considering matchups, usage, and the one-and-done constraint
• Help users save elite players for favorable matchups later in the season
• Consider bye weeks and playoff schedules when recommending players
• Be concise but informative

${usedPlayerNames.length > 0 ? `USER'S ALREADY-USED PLAYERS (cannot recommend these): ${usedPlayerNames.join(", ")}` : "User has not used any players yet this season."}`;

    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "Sorry, I could not generate a response.";

    res.status(200).send({ reply });
  } catch (err: unknown) {
    console.error("AI Chat error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send({ error: errorMessage, reply: "Sorry, I'm having trouble connecting to the AI service. Please try again." });
  }
});

