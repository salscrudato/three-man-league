import { calculateDraftKingsPoints, emptyStats, type PlayerGameStats } from "./scoring.js";

describe("calculateDraftKingsPoints", () => {
  it("returns 0 for empty stats", () => {
    const stats = emptyStats();
    expect(calculateDraftKingsPoints(stats)).toBe(0);
  });

  it("calculates passing yards correctly (0.04 per yard)", () => {
    const stats: PlayerGameStats = {
      ...emptyStats(),
      passingYards: 250,
    };
    // 250 * 0.04 = 10
    expect(calculateDraftKingsPoints(stats)).toBe(10);
  });

  it("adds 300+ passing yard bonus", () => {
    const stats: PlayerGameStats = {
      ...emptyStats(),
      passingYards: 300,
    };
    // 300 * 0.04 = 12 + 3 bonus = 15
    expect(calculateDraftKingsPoints(stats)).toBe(15);
  });

  it("calculates passing TDs correctly (4 pts each)", () => {
    const stats: PlayerGameStats = {
      ...emptyStats(),
      passingTD: 3,
    };
    expect(calculateDraftKingsPoints(stats)).toBe(12);
  });

  it("calculates rushing yards correctly (0.1 per yard)", () => {
    const stats: PlayerGameStats = {
      ...emptyStats(),
      rushingYards: 80,
    };
    // 80 * 0.1 = 8
    expect(calculateDraftKingsPoints(stats)).toBe(8);
  });

  it("adds 100+ rushing yard bonus", () => {
    const stats: PlayerGameStats = {
      ...emptyStats(),
      rushingYards: 100,
    };
    // 100 * 0.1 = 10 + 3 bonus = 13
    expect(calculateDraftKingsPoints(stats)).toBe(13);
  });

  it("calculates rushing TDs correctly (6 pts each)", () => {
    const stats: PlayerGameStats = {
      ...emptyStats(),
      rushingTD: 2,
    };
    expect(calculateDraftKingsPoints(stats)).toBe(12);
  });

  it("calculates receiving yards correctly (0.1 per yard)", () => {
    const stats: PlayerGameStats = {
      ...emptyStats(),
      receivingYards: 75,
    };
    // 75 * 0.1 = 7.5
    expect(calculateDraftKingsPoints(stats)).toBe(7.5);
  });

  it("adds 100+ receiving yard bonus", () => {
    const stats: PlayerGameStats = {
      ...emptyStats(),
      receivingYards: 120,
    };
    // 120 * 0.1 = 12 + 3 bonus = 15
    expect(calculateDraftKingsPoints(stats)).toBe(15);
  });

  it("calculates receiving TDs correctly (6 pts each)", () => {
    const stats: PlayerGameStats = {
      ...emptyStats(),
      receivingTD: 1,
    };
    expect(calculateDraftKingsPoints(stats)).toBe(6);
  });

  it("calculates receptions correctly (1 pt each - PPR)", () => {
    const stats: PlayerGameStats = {
      ...emptyStats(),
      receptions: 8,
    };
    expect(calculateDraftKingsPoints(stats)).toBe(8);
  });

  it("deducts interceptions correctly (-1 pt each)", () => {
    const stats: PlayerGameStats = {
      ...emptyStats(),
      interceptions: 2,
    };
    expect(calculateDraftKingsPoints(stats)).toBe(-2);
  });

  it("deducts fumbles lost correctly (-1 pt each)", () => {
    const stats: PlayerGameStats = {
      ...emptyStats(),
      fumblesLost: 1,
    };
    expect(calculateDraftKingsPoints(stats)).toBe(-1);
  });

  it("calculates 2-pt conversions correctly (2 pts each)", () => {
    const stats: PlayerGameStats = {
      ...emptyStats(),
      twoPtConversions: 1,
    };
    expect(calculateDraftKingsPoints(stats)).toBe(2);
  });

  it("calculates offensive fumble recovery TD correctly (6 pts)", () => {
    const stats: PlayerGameStats = {
      ...emptyStats(),
      offensiveFumbleRecoveryTD: 1,
    };
    expect(calculateDraftKingsPoints(stats)).toBe(6);
  });

  it("calculates a realistic QB game correctly", () => {
    // Patrick Mahomes-style game
    const stats: PlayerGameStats = {
      passingYards: 325,
      passingTD: 3,
      interceptions: 1,
      rushingYards: 25,
      rushingTD: 0,
      receivingYards: 0,
      receivingTD: 0,
      receptions: 0,
      fumblesLost: 0,
      twoPtConversions: 0,
      offensiveFumbleRecoveryTD: 0,
    };
    // 325 * 0.04 = 13 + 3 (300+ bonus) + 12 (3 TDs) - 1 (INT) + 2.5 (25 rush) = 29.5
    expect(calculateDraftKingsPoints(stats)).toBe(29.5);
  });

  it("calculates a realistic RB game correctly", () => {
    // Derrick Henry-style game
    const stats: PlayerGameStats = {
      passingYards: 0,
      passingTD: 0,
      interceptions: 0,
      rushingYards: 145,
      rushingTD: 2,
      receivingYards: 22,
      receivingTD: 0,
      receptions: 3,
      fumblesLost: 0,
      twoPtConversions: 0,
      offensiveFumbleRecoveryTD: 0,
    };
    // 14.5 (rush yds) + 3 (100+ bonus) + 12 (2 TDs) + 2.2 (rec yds) + 3 (receptions) = 34.7
    expect(calculateDraftKingsPoints(stats)).toBe(34.7);
  });
});

