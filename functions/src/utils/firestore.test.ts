/**
 * Tests for Firestore document mappers
 */

import {
  mapDocWithId,
  mapUser,
  mapPlayerUsage,
  mapLeague,
  mapUserPicks,
  mapPlayer,
} from "./firestore.js";
import type { DocumentSnapshot } from "firebase-admin/firestore";

// Helper to create mock DocumentSnapshot
function createMockDoc(exists: boolean, id: string, data?: Record<string, unknown>): DocumentSnapshot {
  return {
    exists,
    id,
    data: () => data,
  } as unknown as DocumentSnapshot;
}

describe("mapDocWithId", () => {
  it("returns null for non-existent document", () => {
    const doc = createMockDoc(false, "test-id");
    expect(mapDocWithId(doc)).toBeNull();
  });

  it("returns data with id for existing document", () => {
    const doc = createMockDoc(true, "test-id", { name: "Test" });
    const result = mapDocWithId<{ name: string }>(doc);
    expect(result).toEqual({ id: "test-id", name: "Test" });
  });
});

describe("mapUser", () => {
  it("returns null for non-existent document", () => {
    const doc = createMockDoc(false, "user-id");
    expect(mapUser(doc)).toBeNull();
  });

  it("maps user with all fields", () => {
    const doc = createMockDoc(true, "user-id", {
      displayName: "John Doe",
      email: "john@example.com",
      photoURL: "https://example.com/photo.jpg",
      activeLeagueId: "league-123",
    });
    const result = mapUser(doc);
    expect(result).toEqual({
      displayName: "John Doe",
      email: "john@example.com",
      photoURL: "https://example.com/photo.jpg",
      activeLeagueId: "league-123",
      createdAt: undefined,
      updatedAt: undefined,
    });
  });

  it("provides defaults for missing fields", () => {
    const doc = createMockDoc(true, "user-id", {});
    const result = mapUser(doc);
    expect(result?.displayName).toBe("");
    expect(result?.email).toBe("");
  });
});

describe("mapPlayerUsage", () => {
  it("returns null for non-existent document", () => {
    const doc = createMockDoc(false, "usage-id");
    expect(mapPlayerUsage(doc)).toBeNull();
  });

  it("maps player usage correctly", () => {
    const doc = createMockDoc(true, "usage-id", {
      season: "2025",
      playerId: "player-123",
      firstUsedWeek: "week-5",
      leagueId: "league-456",
    });
    const result = mapPlayerUsage(doc);
    expect(result).toEqual({
      season: "2025",
      playerId: "player-123",
      firstUsedWeek: "week-5",
      leagueId: "league-456",
    });
  });
});

describe("mapLeague", () => {
  it("returns null for non-existent document", () => {
    const doc = createMockDoc(false, "league-id");
    expect(mapLeague(doc)).toBeNull();
  });

  it("maps league with all fields", () => {
    const createdAt = new Date();
    const doc = createMockDoc(true, "league-id", {
      name: "Test League",
      ownerId: "owner-123",
      season: "2025",
      entryFee: 50,
      payouts: { "1": 100 },
      joinCode: "ABC123",
      status: "active",
      createdAt,
    });
    const result = mapLeague(doc);
    expect(result?.id).toBe("league-id");
    expect(result?.name).toBe("Test League");
    expect(result?.ownerId).toBe("owner-123");
    expect(result?.entryFee).toBe(50);
    expect(result?.status).toBe("active");
  });
});

describe("mapUserPicks", () => {
  it("returns null for non-existent document", () => {
    const doc = createMockDoc(false, "picks-id");
    expect(mapUserPicks(doc)).toBeNull();
  });

  it("maps picks with locked status", () => {
    const doc = createMockDoc(true, "picks-id", {
      qbPlayerId: "qb-123",
      qbGameId: "game-1",
      qbLocked: true,
      rbPlayerId: "rb-456",
      rbGameId: "game-2",
      rbLocked: false,
    });
    const result = mapUserPicks(doc);
    expect(result?.qbPlayerId).toBe("qb-123");
    expect(result?.qbLocked).toBe(true);
    expect(result?.rbLocked).toBe(false);
    expect(result?.wrLocked).toBe(false); // default
  });
});

describe("mapPlayer", () => {
  it("returns null for non-existent document", () => {
    const doc = createMockDoc(false, "player-id");
    expect(mapPlayer(doc)).toBeNull();
  });

  it("maps player with season stats", () => {
    const doc = createMockDoc(true, "player-id", {
      name: "Patrick Mahomes",
      position: "QB",
      teamId: "team-kc",
      teamName: "Kansas City Chiefs",
      eligiblePositions: ["QB"],
      seasonStats: { fantasyPoints: 250.5 },
    });
    const result = mapPlayer(doc);
    expect(result?.id).toBe("player-id");
    expect(result?.name).toBe("Patrick Mahomes");
    expect(result?.position).toBe("QB");
    expect(result?.seasonStats?.fantasyPoints).toBe(250.5);
  });
});

