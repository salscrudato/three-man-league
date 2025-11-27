import React from "react";
import { Card, CardHeader } from "../../components";
import { PAYOUT_STRUCTURE, TOTAL_POT, ENTRY_FEE } from "../../types";

interface RuleSection {
  icon: string;
  title: string;
  items: string[];
}

const RULES: RuleSection[] = [
  {
    icon: "🎯",
    title: "Weekly Picks",
    items: [
      "Select 1 QB, 1 RB, and 1 WR each week",
      "Picks lock 1 hour before each player's game kickoff",
      "You can change your picks until they lock",
      "Locked picks cannot be modified",
    ],
  },
  {
    icon: "🔄",
    title: "One-and-Done Rule",
    items: [
      "Each player can only be used ONCE per season",
      "Once you pick a player, they're marked as 'USED'",
      "Used players will score 0 points if picked again",
      "Plan your picks strategically across all 18 weeks",
    ],
  },
  {
    icon: "📊",
    title: "Scoring System",
    items: [
      "DraftKings PPR scoring format",
      "Passing TD: 4 pts | Rushing/Receiving TD: 6 pts",
      "Passing yards: 0.04 pts/yard (1 pt per 25 yards)",
      "Rushing/Receiving yards: 0.1 pts/yard (1 pt per 10 yards)",
      "Reception: 1 pt (PPR)",
      "Interception: -1 pt | Fumble lost: -1 pt",
    ],
  },
  {
    icon: "🏆",
    title: "Season Standings",
    items: [
      "Total points accumulated across all weeks",
      "Weekly scores are added to your season total",
      "Final standings determine prize payouts",
      "Tiebreaker: Most weekly wins, then head-to-head",
    ],
  },
];

export const RulesPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-page-title text-text-primary">Rules & Scoring</h1>
        <p className="text-body text-text-secondary mt-1">
          Everything you need to know about the Three-Man League
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-caption text-text-muted uppercase tracking-wide">Entry Fee</div>
          <div className="text-section-title font-bold text-text-primary mt-1">${ENTRY_FEE}</div>
        </Card>
        <Card className="text-center">
          <div className="text-caption text-text-muted uppercase tracking-wide">Total Pot</div>
          <div className="text-section-title font-bold text-primary mt-1">${TOTAL_POT.toLocaleString()}</div>
        </Card>
        <Card className="text-center">
          <div className="text-caption text-text-muted uppercase tracking-wide">Weeks</div>
          <div className="text-section-title font-bold text-text-primary mt-1">18</div>
        </Card>
        <Card className="text-center">
          <div className="text-caption text-text-muted uppercase tracking-wide">Positions</div>
          <div className="text-section-title font-bold text-text-primary mt-1">QB/RB/WR</div>
        </Card>
      </div>

      {/* Rules sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {RULES.map((section) => (
          <Card key={section.title}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{section.icon}</span>
              <h2 className="text-card-title font-semibold text-text-primary">{section.title}</h2>
            </div>
            <ul className="space-y-2">
              {section.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-body-sm text-text-secondary">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {/* Payout structure */}
      <Card>
        <CardHeader
          title="💰 Prize Payouts"
          subtitle="Top 7 finishers win cash prizes"
        />
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(PAYOUT_STRUCTURE).map(([rank, amount]) => {
            const rankNum = parseInt(rank);
            const ordinal = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"][rankNum - 1];
            const isTop3 = rankNum <= 3;
            return (
              <div
                key={rank}
                className={`rounded-card p-4 text-center border transition-all ${
                  isTop3
                    ? "bg-gradient-to-br from-primary-soft to-emerald-50 border-primary/20 shadow-card"
                    : "bg-subtle border-border"
                }`}
              >
                {isTop3 && (
                  <div className="text-xl mb-1">
                    {["🥇", "🥈", "🥉"][rankNum - 1]}
                  </div>
                )}
                <div className={`text-caption font-medium ${isTop3 ? "text-primary" : "text-text-muted"}`}>
                  {ordinal} Place
                </div>
                <div className={`text-section-title font-bold mt-1 ${isTop3 ? "text-primary" : "text-text-primary"}`}>
                  ${amount.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader title="❓ Frequently Asked Questions" />
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-body-sm font-semibold text-text-primary">What happens if I forget to make picks?</h3>
            <p className="text-body-sm text-text-secondary mt-1">
              If you don't make picks before games lock, you'll receive 0 points for that position for the week.
            </p>
          </div>
          <div>
            <h3 className="text-body-sm font-semibold text-text-primary">Can I change my picks after they lock?</h3>
            <p className="text-body-sm text-text-secondary mt-1">
              No, once a pick locks (1 hour before kickoff), it cannot be changed. Plan ahead!
            </p>
          </div>
          <div>
            <h3 className="text-body-sm font-semibold text-text-primary">What if my player gets injured during the game?</h3>
            <p className="text-body-sm text-text-secondary mt-1">
              You receive whatever points they scored before the injury. There are no substitutions.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

