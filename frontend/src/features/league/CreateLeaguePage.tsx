/**
 * Create League Page - Multi-step wizard for creating a new league
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useLeague } from "../../league/LeagueContext";
import { apiPost, getErrorMessage } from "../../lib/api";
import { LuArrowLeft, LuArrowRight, LuCheck, LuCopy, LuUsers, LuDollarSign, LuTrophy } from "react-icons/lu";
import { DEFAULT_PAYOUT_ENTRIES } from "../../types";
import type { PayoutEntry } from "../../types";

type Step = "name" | "payouts" | "review" | "success";

export const CreateLeaguePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshLeagues, setActiveLeague } = useLeague();

  const [step, setStep] = useState<Step>("name");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [entryFee, setEntryFee] = useState(50);
  const [maxPlayers, setMaxPlayers] = useState<number | undefined>(undefined);
  const [payouts, setPayouts] = useState<PayoutEntry[]>([...DEFAULT_PAYOUT_ENTRIES]);
  
  // Success state
  const [, setCreatedLeagueId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [joinLink, setJoinLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const totalPayout = payouts.reduce((sum, p) => sum + p.amount, 0);

  const handleAddPayout = () => {
    const nextRank = payouts.length + 1;
    setPayouts([...payouts, { rank: nextRank, amount: 0 }]);
  };

  const handleRemovePayout = (index: number) => {
    const newPayouts = payouts.filter((_, i) => i !== index);
    // Re-number ranks
    setPayouts(newPayouts.map((p, i) => ({ ...p, rank: i + 1 })));
  };

  const handlePayoutChange = (index: number, amount: number) => {
    const newPayouts = [...payouts];
    newPayouts[index] = { ...newPayouts[index], amount };
    setPayouts(newPayouts);
  };

  const handleCreate = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiPost<{
        leagueId: string;
        joinCode: string;
        joinLink: string;
      }>("/createLeague", {
        name: name.trim(),
        entryFee,
        maxPlayers: maxPlayers || undefined,
        payoutStructure: payouts,
      }, user);

      setCreatedLeagueId(data.leagueId);
      setJoinCode(data.joinCode);
      setJoinLink(data.joinLink);
      setStep("success");

      // Refresh leagues and set as active
      await refreshLeagues();
      await setActiveLeague(data.leagueId);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (joinCode) {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    if (joinLink) {
      await navigator.clipboard.writeText(joinLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canProceed = () => {
    if (step === "name") return name.trim().length >= 2;
    if (step === "payouts") return payouts.length > 0;
    return true;
  };

  const renderStep = () => {
    switch (step) {
      case "name":
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-tiny font-medium text-text-primary mb-1">League Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., The Gridiron Gang"
                className="w-full px-2.5 py-1.5 bg-white border border-border/40 rounded-md text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
                maxLength={50} autoFocus />
              <p className="mt-0.5 text-tiny text-text-muted">{name.length}/50</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-tiny font-medium text-text-primary mb-1">Entry Fee ($)</label>
                <input type="number" value={entryFee} onChange={(e) => setEntryFee(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 bg-white border border-border/40 rounded-md text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary" min={0} />
              </div>
              <div>
                <label className="block text-tiny font-medium text-text-primary mb-1">Max Players</label>
                <input type="number" value={maxPlayers || ""} onChange={(e) => setMaxPlayers(e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Unlimited"
                  className="w-full px-2.5 py-1.5 bg-white border border-border/40 rounded-md text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary" min={2} max={100} />
              </div>
            </div>
          </div>
        );
      case "payouts":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body-sm font-medium text-text-primary">Payout Structure</span>
              <button onClick={handleAddPayout} className="text-tiny text-primary hover:text-primary-hover font-medium">+ Add</button>
            </div>
            <div className="space-y-1.5">
              {payouts.map((payout, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <span className="w-8 text-tiny font-medium text-text-secondary text-center">{payout.rank === 1 ? "1st" : payout.rank === 2 ? "2nd" : payout.rank === 3 ? "3rd" : `${payout.rank}th`}</span>
                  <div className="flex-1 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-tiny text-text-muted">$</span>
                    <input type="number" value={payout.amount} onChange={(e) => handlePayoutChange(index, Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-5 pr-2 py-1 bg-white border border-border/40 rounded-md text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary" min={0} />
                  </div>
                  {payouts.length > 1 && <button onClick={() => handleRemovePayout(index)} className="p-0.5 text-text-muted hover:text-error text-sm">×</button>}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <span className="text-body-sm font-medium text-text-primary">Total</span>
              <span className="text-body-sm font-semibold text-primary">${totalPayout.toLocaleString()}</span>
            </div>
          </div>
        );
      case "review":
        return (
          <div className="space-y-3">
            <div className="bg-subtle/60 rounded-md p-2.5 space-y-2">
              <div className="flex items-center gap-1.5"><LuUsers className="w-3.5 h-3.5 text-primary" /><div><p className="text-tiny text-text-muted">Name</p><p className="text-body-sm font-medium text-text-primary">{name}</p></div></div>
              <div className="flex items-center gap-1.5"><LuDollarSign className="w-3.5 h-3.5 text-primary" /><div><p className="text-tiny text-text-muted">Entry</p><p className="text-body-sm font-medium text-text-primary">${entryFee}</p></div></div>
              <div className="flex items-center gap-1.5"><LuTrophy className="w-3.5 h-3.5 text-primary" /><div><p className="text-tiny text-text-muted">Pot</p><p className="text-body-sm font-medium text-text-primary">${totalPayout.toLocaleString()}</p></div></div>
              {maxPlayers && <div className="flex items-center gap-1.5"><LuUsers className="w-3.5 h-3.5 text-primary" /><div><p className="text-tiny text-text-muted">Max</p><p className="text-body-sm font-medium text-text-primary">{maxPlayers}</p></div></div>}
            </div>
            <div>
              <p className="text-tiny font-medium text-text-primary mb-1">Payouts</p>
              <div className="bg-subtle/60 rounded-md p-2 space-y-0.5">
                {payouts.map((p) => (
                  <div key={p.rank} className="flex justify-between text-tiny">
                    <span className="text-text-secondary">{p.rank === 1 ? "1st" : p.rank === 2 ? "2nd" : p.rank === 3 ? "3rd" : `${p.rank}th`}</span>
                    <span className="font-medium text-text-primary">${p.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case "success":
        return (
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-success/10 rounded-lg"><LuCheck className="w-5 h-5 text-success" /></div>
            <div>
              <h2 className="text-body-sm font-semibold text-text-primary mb-0.5">League Created!</h2>
              <p className="text-tiny text-text-secondary">Share the code to invite friends.</p>
            </div>
            <div className="bg-subtle/60 rounded-md p-2.5 space-y-2">
              <div>
                <p className="text-tiny text-text-muted mb-0.5">Join Code</p>
                <div className="flex items-center gap-1.5">
                  <code className="flex-1 px-2.5 py-1.5 bg-white border border-border/40 rounded-md text-center text-body-sm font-mono font-semibold text-primary tracking-widest">{joinCode}</code>
                  <button onClick={handleCopyCode} className="p-1.5 bg-white border border-border/40 rounded-md hover:bg-subtle transition-colors">
                    {copied ? <LuCheck className="w-3.5 h-3.5 text-success" /> : <LuCopy className="w-3.5 h-3.5 text-text-secondary" />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-tiny text-text-muted mb-0.5">Or share link</p>
                <div className="flex items-center gap-1.5">
                  <input type="text" value={joinLink || ""} readOnly className="flex-1 px-2 py-1 bg-white border border-border/40 rounded-md text-tiny text-text-secondary truncate" />
                  <button onClick={handleCopyLink} className="p-1 bg-white border border-border/40 rounded-md hover:bg-subtle transition-colors"><LuCopy className="w-3 h-3 text-text-secondary" /></button>
                </div>
              </div>
            </div>
            <button onClick={() => navigate("/picks")} className="w-full px-3 py-1.5 bg-primary text-white rounded-md text-body-sm font-medium hover:bg-primary-hover transition-colors">Go to Picks</button>
          </div>
        );
    }
  };

  const stepTitles: Record<Step, string> = { name: "Create League", payouts: "Payouts", review: "Review", success: "Done" };

  return (
    <div className="max-w-sm mx-auto">
      {step !== "success" && (
        <div className="mb-4">
          <button onClick={() => step === "name" ? navigate(-1) : setStep(step === "payouts" ? "name" : "payouts")} className="flex items-center gap-1 text-tiny text-text-secondary hover:text-text-primary mb-2">
            <LuArrowLeft className="w-3 h-3" /> Back
          </button>
          <h1 className="text-section-title text-text-primary">{stepTitles[step]}</h1>
          <div className="flex items-center gap-1 mt-2">
            {["name", "payouts", "review"].map((s, i) => (
              <div key={s} className={`h-0.5 flex-1 rounded-full ${s === step ? "bg-primary" : ["name", "payouts", "review"].indexOf(step) > i ? "bg-primary/50" : "bg-border/60"}`} />
            ))}
          </div>
        </div>
      )}
      {error && <div className="mb-3 p-2 bg-error-soft border border-error/20 rounded-md text-error text-tiny">{error}</div>}
      <div className="bg-white rounded-lg border border-border/40 p-3">{renderStep()}</div>
      {step !== "success" && (
        <div className="flex gap-1.5 mt-3">
          {step !== "name" && <button onClick={() => setStep(step === "payouts" ? "name" : "payouts")} className="flex-1 px-3 py-1.5 bg-subtle text-text-secondary rounded-md text-body-sm font-medium hover:bg-border transition-colors">Back</button>}
          <button onClick={() => { if (step === "name") setStep("payouts"); else if (step === "payouts") setStep("review"); else handleCreate(); }} disabled={!canProceed() || loading}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-primary text-white rounded-md text-body-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">
            {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : step === "review" ? <><LuCheck className="w-3.5 h-3.5" />Create</> : <>Continue<LuArrowRight className="w-3.5 h-3.5" /></>}
          </button>
        </div>
      )}
    </div>
  );
};

