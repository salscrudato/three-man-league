import React, { useMemo } from "react";
import { Card, CardHeader, Badge } from "../../components";
import { PAYOUT_STRUCTURE, TOTAL_POT, ENTRY_FEE } from "../../types";
import { FiTarget, FiRefreshCw } from "react-icons/fi";
import { LuChartBar, LuTrophy, LuRocket, LuDollarSign, LuMedal } from "react-icons/lu";
import type { IconType } from "react-icons";
import { useLeague } from "../../league/LeagueContext";

interface RuleSection {
  icon: IconType;
  title: string;
  items: string[];
}

const RULES: RuleSection[] = [
  {
    icon: FiTarget,
    title: "Weekly Picks",
    items: [
      "Select 1 QB, 1 RB, and 1 WR each week",
      "Picks lock 1 hour before each player's game kickoff",
      "You can change your picks until they lock",
      "Locked picks cannot be modified",
    ],
  },
  {
    icon: FiRefreshCw,
    title: "One-and-Done Rule",
    items: [
      "Each player can only be used ONCE per season",
      "Once you pick a player, they're marked as 'USED'",
      "Used players will score 0 points if picked again",
      "Plan your picks strategically across all 18 weeks",
    ],
  },
  {
    icon: LuChartBar,
    title: "Scoring System",
    items: [
      "DraftKings PPR scoring format",
      "Passing TD: 4 pts | Rushing/Receiving TD: 6 pts",
      "Passing yards: 0.04 pts/yard (1 pt per 25 yards)",
      "Rushing/Receiving yards: 0.1 pts/yard (1 pt per 10 yards)",
      "Reception: 1 pt (PPR) | 2-pt Conversion: 2 pts",
      "Interception: -1 pt | Fumble lost: -1 pt",
      "Bonus: 300+ pass yds, 100+ rush/rec yds: +3 pts each",
    ],
  },
  {
    icon: LuTrophy,
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
  const { activeLeague } = useLeague();

  // Use league-specific values if available, otherwise defaults
  const entryFee = activeLeague?.entryFee ?? ENTRY_FEE;
  const totalPot = activeLeague?.payoutTotal ?? TOTAL_POT;

  // Build payout structure from league data or use defaults
  const payoutStructure = useMemo(() => {
    if (activeLeague?.payoutStructure && activeLeague.payoutStructure.length > 0) {
      const structure: Record<number, number> = {};
      activeLeague.payoutStructure.forEach(p => {
        structure[p.rank] = p.amount;
      });
      return structure;
    }
    return PAYOUT_STRUCTURE;
  }, [activeLeague?.payoutStructure]);

  const payingPlaces = Object.keys(payoutStructure).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-page-title text-text-primary">Rules & Scoring</h1>
        <p className="text-body text-text-secondary mt-1">
          Everything you need to know about the Three-Man League
        </p>
      </div>

      {/* Quick Start Guide */}
      <Card className="bg-gradient-to-br from-primary-soft to-emerald-50 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <LuRocket className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-card-title font-semibold text-text-primary mb-2">Quick Start Guide</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-start gap-2">
                <Badge variant="primary" size="sm">1</Badge>
                <div>
                  <p className="text-body-sm font-medium text-text-primary">Make Your Picks</p>
                  <p className="text-caption text-text-secondary">Choose 1 QB, 1 RB, 1 WR each week</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="primary" size="sm">2</Badge>
                <div>
                  <p className="text-body-sm font-medium text-text-primary">Watch Games</p>
                  <p className="text-caption text-text-secondary">Picks lock 1 hour before kickoff</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="primary" size="sm">3</Badge>
                <div>
                  <p className="text-body-sm font-medium text-text-primary">Climb the Standings</p>
                  <p className="text-caption text-text-secondary">Top 7 finishers win cash prizes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-caption text-text-muted uppercase tracking-wide">Entry Fee</div>
          <div className="text-section-title font-bold text-text-primary mt-1">${entryFee}</div>
        </Card>
        <Card className="text-center">
          <div className="text-caption text-text-muted uppercase tracking-wide">Total Pot</div>
          <div className="text-section-title font-bold text-primary mt-1">${totalPot.toLocaleString()}</div>
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
        {RULES.map((section) => {
          const IconComponent = section.icon;
          return (
            <Card key={section.title}>
              <div className="flex items-center gap-3 mb-4">
                <IconComponent className="w-6 h-6 text-primary" />
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
          );
        })}
      </div>

      {/* Payout structure */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <LuDollarSign className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-card-title font-semibold text-text-primary">Prize Payouts</h3>
            <p className="text-body-sm text-text-secondary">Top {payingPlaces} finishers win cash prizes</p>
          </div>
        </div>
        <div className={`grid grid-cols-2 sm:grid-cols-4 ${payingPlaces <= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-7'} gap-3`}>
          {Object.entries(payoutStructure).map(([rank, amount]) => {
            const rankNum = parseInt(rank);
            const ordinalSuffix = (n: number) => {
              const s = ["th", "st", "nd", "rd"];
              const v = n % 100;
              return n + (s[(v - 20) % 10] || s[v] || s[0]);
            };
            const ordinal = ordinalSuffix(rankNum);
            const isTop3 = rankNum <= 3;
            const medalColors = [
              "text-yellow-500",
              "text-gray-400",
              "text-amber-600",
            ];
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
                  <div className="flex justify-center mb-1">
                    <LuMedal className={`w-5 h-5 ${medalColors[rankNum - 1]}`} />
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

