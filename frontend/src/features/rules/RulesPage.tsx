import React, { useMemo, useState } from "react";
import { Card } from "../../components";
import { PAYOUT_STRUCTURE, TOTAL_POT, ENTRY_FEE, payoutEntriesToRecord } from "../../types";
import {
  LuCalendarDays,
  LuTrophy,
  LuTarget,
  LuTimer,
  LuBan,
  LuZap,
  LuDollarSign,
  LuChevronRight,
  LuCheck,
  LuStar
} from "react-icons/lu";
import { useLeague } from "../../league/LeagueContext";

const StepNumber: React.FC<{ num: number }> = ({ num }) => (
  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-tiny font-semibold">{num}</div>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div className={`rounded-md p-2.5 ${accent ? "bg-primary text-white" : "bg-white border border-border/40"}`}>
    <div className={`text-tiny uppercase tracking-wide mb-0.5 ${accent ? "text-white/70" : "text-text-muted"}`}>{label}</div>
    <div className={`text-body-sm font-semibold ${accent ? "text-white" : "text-text-primary"}`}>{value}</div>
  </div>
);

const ScoringItem: React.FC<{ label: string; points: string; highlight?: boolean }> = ({ label, points, highlight }) => (
  <div className={`flex items-center justify-between px-2 py-1.5 rounded ${highlight ? "bg-primary-soft/80" : "bg-subtle/60"}`}>
    <span className={`text-tiny ${highlight ? "text-primary font-medium" : "text-text-secondary"}`}>{label}</span>
    <span className={`text-tiny font-semibold ${highlight ? "text-primary" : "text-text-primary"}`}>{points}</span>
  </div>
);

const ExpandableSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <Card padding="none" className="overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-subtle/40 transition-colors">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-primary-soft text-primary flex items-center justify-center">{icon}</div>
          <span className="text-body-sm font-medium text-text-primary">{title}</span>
        </div>
        <LuChevronRight className={`w-3.5 h-3.5 text-text-muted transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-[500px]" : "max-h-0"}`}>
        <div className="px-2.5 pb-2.5 border-t border-border/30">{children}</div>
      </div>
    </Card>
  );
};

export const RulesPage: React.FC = () => {
  const { activeLeague } = useLeague();

  const entryFee = activeLeague?.entryFee ?? ENTRY_FEE;
  const totalPot = activeLeague?.payoutTotal ?? TOTAL_POT;

  const leaguePayoutStructure = activeLeague?.payoutStructure;
  const payoutStructure = useMemo(() => {
    if (leaguePayoutStructure && leaguePayoutStructure.length > 0) {
      return payoutEntriesToRecord(leaguePayoutStructure);
    }
    return PAYOUT_STRUCTURE;
  }, [leaguePayoutStructure]);

  const payingPlaces = Object.keys(payoutStructure).length;

  return (
    <div className="space-y-3 max-w-xl mx-auto">
      <div className="text-center py-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-white mb-2">
          <LuTarget className="w-5 h-5" />
        </div>
        <h1 className="text-section-title text-text-primary mb-0.5">How to Play</h1>
        <p className="text-body-sm text-text-muted">Master Three-Man League in 3 steps</p>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="bg-primary px-2.5 py-1.5">
          <h2 className="text-body-sm font-medium text-white flex items-center gap-1">
            <LuZap className="w-3.5 h-3.5" /> The Game
          </h2>
        </div>
        <div className="p-2.5 space-y-2.5">
          <div className="flex gap-2 items-start">
            <StepNumber num={1} />
            <div className="flex-1">
              <h4 className="text-body-sm font-medium text-text-primary">Pick Your Squad</h4>
              <p className="text-tiny text-text-secondary">Select 3 players each week: 1 QB, 1 RB, 1 WR</p>
              <div className="flex gap-1 mt-1">
                <span className="px-1 py-0.5 bg-rose-50/80 text-rose-600 rounded text-tiny font-medium">QB</span>
                <span className="px-1 py-0.5 bg-blue-50/80 text-blue-600 rounded text-tiny font-medium">RB</span>
                <span className="px-1 py-0.5 bg-amber-50/80 text-amber-600 rounded text-tiny font-medium">WR</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <StepNumber num={2} />
            <div className="flex-1">
              <h4 className="text-body-sm font-medium text-text-primary flex items-center gap-1">One-and-Done <LuBan className="w-3 h-3 text-error" /></h4>
              <p className="text-tiny text-text-secondary">Each player can only be used once per season</p>
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <StepNumber num={3} />
            <div className="flex-1">
              <h4 className="text-body-sm font-medium text-text-primary flex items-center gap-1">Beat the Clock <LuTimer className="w-3 h-3 text-primary" /></h4>
              <p className="text-tiny text-text-secondary">Picks lock 1 hour before kickoff</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-1.5">
        <StatCard icon={<LuDollarSign />} label="Entry" value={`$${entryFee}`} />
        <StatCard icon={<LuTrophy />} label="Pool" value={`$${totalPot.toLocaleString()}`} accent />
        <StatCard icon={<LuCalendarDays />} label="Weeks" value="18" />
      </div>

      <div className="space-y-1.5">
        <ExpandableSection title="Scoring" icon={<LuStar className="w-3.5 h-3.5" />} defaultOpen>
          <p className="text-tiny text-text-secondary mb-1.5 mt-1.5">DraftKings PPR format</p>
          <div className="grid grid-cols-2 gap-1">
            <ScoringItem label="Passing TD" points="4 pts" />
            <ScoringItem label="Rush/Rec TD" points="6 pts" highlight />
            <ScoringItem label="Reception" points="1 pt" />
            <ScoringItem label="Pass Yards" points="0.04/yd" />
            <ScoringItem label="Rush/Rec Yards" points="0.1/yd" />
            <ScoringItem label="100+ Bonus" points="3 pts" highlight />
            <ScoringItem label="Interception" points="-1 pt" />
            <ScoringItem label="Fumble Lost" points="-1 pt" />
          </div>
        </ExpandableSection>

        <ExpandableSection title="Payouts" icon={<LuTrophy className="w-3.5 h-3.5" />}>
          <p className="text-tiny text-text-secondary mb-1.5 mt-1.5">Top {payingPlaces} finishers win</p>
          <div className="space-y-1">
            {Object.entries(payoutStructure).slice(0, 7).map(([rank, amount]) => {
              const rankNum = parseInt(rank);
              const isTop3 = rankNum <= 3;
              const medalColors: Record<number, string> = { 1: "bg-amber-400", 2: "bg-slate-400", 3: "bg-amber-600" };
              return (
                <div key={rank} className={`flex items-center justify-between px-2 py-1.5 rounded ${isTop3 ? "bg-primary-soft/60" : "bg-subtle/60"}`}>
                  <div className="flex items-center gap-1.5">
                    {isTop3 ? (
                      <div className={`w-4 h-4 rounded ${medalColors[rankNum]} flex items-center justify-center text-white text-tiny font-semibold`}>{rankNum}</div>
                    ) : (
                      <div className="w-4 h-4 rounded bg-gray-200 flex items-center justify-center text-text-muted text-tiny">{rankNum}</div>
                    )}
                    <span className={`text-tiny ${isTop3 ? "text-text-primary font-medium" : "text-text-secondary"}`}>
                      {rankNum === 1 ? "Champion" : rankNum === 2 ? "Runner-up" : rankNum === 3 ? "3rd" : `${rankNum}th`}
                    </span>
                  </div>
                  <span className={`text-body-sm font-semibold ${isTop3 ? "text-primary" : "text-text-primary"}`}>${amount.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </ExpandableSection>
      </div>

      <Card padding="sm" className="bg-amber-50/60 border-amber-100/60">
        <h3 className="text-body-sm font-medium text-amber-800 mb-1.5 flex items-center gap-1">
          <LuZap className="w-3.5 h-3.5" /> Pro Tips
        </h3>
        <div className="space-y-1">
          {["Save elite players for favorable matchups", "Monitor injury reports before kickoff", "Diversify picks across teams"].map((tip, i) => (
            <div key={i} className="flex items-start gap-1 text-tiny text-amber-900">
              <LuCheck className="w-3 h-3 mt-0.5 text-amber-600 shrink-0" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
