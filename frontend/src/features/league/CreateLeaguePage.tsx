/**
 * Create League Page - Multi-step wizard for creating a new league
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useLeague } from "../../league/LeagueContext";
import { LuArrowLeft, LuArrowRight, LuCheck, LuCopy, LuUsers, LuDollarSign, LuTrophy } from "react-icons/lu";
import type { PayoutEntry } from "../../types";

const API_BASE = import.meta.env.VITE_FUNCTIONS_URL || "";

type Step = "name" | "payouts" | "review" | "success";

const DEFAULT_PAYOUTS: PayoutEntry[] = [
  { rank: 1, amount: 1200 },
  { rank: 2, amount: 750 },
  { rank: 3, amount: 500 },
  { rank: 4, amount: 415 },
  { rank: 5, amount: 270 },
  { rank: 6, amount: 195 },
  { rank: 7, amount: 120 },
];

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
  const [payouts, setPayouts] = useState<PayoutEntry[]>(DEFAULT_PAYOUTS);
  
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
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/createLeague`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          entryFee,
          maxPlayers: maxPlayers || undefined,
          payoutStructure: payouts,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to create league");
      }
      
      setCreatedLeagueId(data.leagueId);
      setJoinCode(data.joinCode);
      setJoinLink(data.joinLink);
      setStep("success");
      
      // Refresh leagues and set as active
      await refreshLeagues();
      await setActiveLeague(data.leagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create league");
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
          <div className="space-y-6">
            <div>
              <label className="block text-body-sm font-medium text-text-primary mb-2">
                League Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., The Gridiron Gang"
                className="w-full px-4 py-3 bg-surface border border-border rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                maxLength={50}
                autoFocus
              />
              <p className="mt-2 text-caption text-text-muted">{name.length}/50 characters</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-body-sm font-medium text-text-primary mb-2">
                  Entry Fee ($)
                </label>
                <input
                  type="number"
                  value={entryFee}
                  onChange={(e) => setEntryFee(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-body-sm font-medium text-text-primary mb-2">
                  Max Players (optional)
                </label>
                <input
                  type="number"
                  value={maxPlayers || ""}
                  onChange={(e) => setMaxPlayers(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Unlimited"
                  className="w-full px-4 py-3 bg-surface border border-border rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  min={2}
                  max={100}
                />
              </div>
            </div>
          </div>
        );

      case "payouts":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-body font-medium text-text-primary">Payout Structure</h3>
              <button
                onClick={handleAddPayout}
                className="text-body-sm text-primary hover:text-primary-hover font-medium"
              >
                + Add Place
              </button>
            </div>

            <div className="space-y-3">
              {payouts.map((payout, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-16 flex items-center justify-center">
                    <span className="text-body-sm font-medium text-text-secondary">
                      {payout.rank === 1 ? "1st" : payout.rank === 2 ? "2nd" : payout.rank === 3 ? "3rd" : `${payout.rank}th`}
                    </span>
                  </div>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                    <input
                      type="number"
                      value={payout.amount}
                      onChange={(e) => handlePayoutChange(index, Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-8 pr-4 py-2 bg-surface border border-border rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      min={0}
                    />
                  </div>
                  {payouts.length > 1 && (
                    <button
                      onClick={() => handleRemovePayout(index)}
                      className="p-2 text-text-muted hover:text-danger transition-colors"
                      aria-label="Remove payout"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-body font-medium text-text-primary">Total Pot</span>
              <span className="text-section-title font-bold text-primary">${totalPayout.toLocaleString()}</span>
            </div>
          </div>
        );

      case "review":
        return (
          <div className="space-y-6">
            <div className="bg-subtle rounded-card p-4 space-y-4">
              <div className="flex items-center gap-3">
                <LuUsers className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-caption text-text-muted">League Name</p>
                  <p className="text-body font-medium text-text-primary">{name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <LuDollarSign className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-caption text-text-muted">Entry Fee</p>
                  <p className="text-body font-medium text-text-primary">${entryFee}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <LuTrophy className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-caption text-text-muted">Total Pot</p>
                  <p className="text-body font-medium text-text-primary">${totalPayout.toLocaleString()}</p>
                </div>
              </div>

              {maxPlayers && (
                <div className="flex items-center gap-3">
                  <LuUsers className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-caption text-text-muted">Max Players</p>
                    <p className="text-body font-medium text-text-primary">{maxPlayers}</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <p className="text-body-sm font-medium text-text-primary mb-2">Payout Breakdown</p>
              <div className="bg-subtle rounded-card p-3 space-y-2">
                {payouts.map((p) => (
                  <div key={p.rank} className="flex justify-between text-body-sm">
                    <span className="text-text-secondary">
                      {p.rank === 1 ? "1st Place" : p.rank === 2 ? "2nd Place" : p.rank === 3 ? "3rd Place" : `${p.rank}th Place`}
                    </span>
                    <span className="font-medium text-text-primary">${p.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "success":
        return (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full">
              <LuCheck className="w-8 h-8 text-success" />
            </div>

            <div>
              <h2 className="text-section-title font-bold text-text-primary mb-2">League Created!</h2>
              <p className="text-body text-text-secondary">
                Share the join code with your friends to invite them.
              </p>
            </div>

            <div className="bg-subtle rounded-card p-4 space-y-4">
              <div>
                <p className="text-caption text-text-muted mb-2">Join Code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-3 bg-surface border border-border rounded-button text-center text-page-title font-mono font-bold text-primary tracking-widest">
                    {joinCode}
                  </code>
                  <button
                    onClick={handleCopyCode}
                    className="p-3 bg-surface border border-border rounded-button hover:bg-border transition-colors"
                    aria-label="Copy code"
                  >
                    {copied ? <LuCheck className="w-5 h-5 text-success" /> : <LuCopy className="w-5 h-5 text-text-secondary" />}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-caption text-text-muted mb-2">Or share this link</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={joinLink || ""}
                    readOnly
                    className="flex-1 px-4 py-2 bg-surface border border-border rounded-button text-body-sm text-text-secondary truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="p-2 bg-surface border border-border rounded-button hover:bg-border transition-colors"
                    aria-label="Copy link"
                  >
                    <LuCopy className="w-4 h-4 text-text-secondary" />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/picks")}
              className="w-full px-6 py-3 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-colors"
            >
              Go to Picks
            </button>
          </div>
        );
    }
  };

  const stepTitles: Record<Step, string> = {
    name: "Create Your League",
    payouts: "Set Up Payouts",
    review: "Review & Create",
    success: "Success!",
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      {step !== "success" && (
        <div className="mb-8">
          <button
            onClick={() => step === "name" ? navigate(-1) : setStep(step === "payouts" ? "name" : "payouts")}
            className="flex items-center gap-2 text-body-sm text-text-secondary hover:text-text-primary mb-4"
          >
            <LuArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-page-title font-bold text-text-primary">{stepTitles[step]}</h1>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            {["name", "payouts", "review"].map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s === step ? "bg-primary" :
                  ["name", "payouts", "review"].indexOf(step) > i ? "bg-primary/50" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-card text-danger text-body-sm">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="bg-surface rounded-card border border-border p-6">
        {renderStep()}
      </div>

      {/* Navigation buttons */}
      {step !== "success" && (
        <div className="flex gap-3 mt-6">
          {step !== "name" && (
            <button
              onClick={() => setStep(step === "payouts" ? "name" : "payouts")}
              className="flex-1 px-6 py-3 bg-subtle text-text-secondary rounded-button font-medium hover:bg-border transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (step === "name") setStep("payouts");
              else if (step === "payouts") setStep("review");
              else handleCreate();
            }}
            disabled={!canProceed() || loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : step === "review" ? (
              <>
                <LuCheck className="w-5 h-5" />
                Create League
              </>
            ) : (
              <>
                Continue
                <LuArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

