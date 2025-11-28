/**
 * Join League Page - Enter a join code to join an existing league
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useLeague } from "../../league/LeagueContext";
import { LuArrowLeft, LuCheck, LuUsers } from "react-icons/lu";

const API_BASE = import.meta.env.VITE_FUNCTIONS_URL || "";

export const JoinLeaguePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { refreshLeagues, setActiveLeague } = useLeague();
  
  const [joinCode, setJoinCode] = useState(searchParams.get("code") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ leagueName: string; leagueId: string } | null>(null);

  // Auto-submit if code is provided in URL
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl && codeFromUrl.length === 6) {
      setJoinCode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !joinCode.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/joinLeague`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase() }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to join league");
      }
      
      setSuccess({ leagueName: data.leagueName, leagueId: data.leagueId });
      
      // Refresh leagues and set as active
      await refreshLeagues();
      await setActiveLeague(data.leagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join league");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphanumeric, uppercase, max 8 chars
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    setJoinCode(value);
    setError(null);
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-surface rounded-card border border-border p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full mb-6">
            <LuCheck className="w-8 h-8 text-success" />
          </div>
          
          <h1 className="text-section-title font-bold text-text-primary mb-2">
            You're In!
          </h1>
          <p className="text-body text-text-secondary mb-6">
            You've successfully joined <span className="font-medium text-text-primary">{success.leagueName}</span>
          </p>
          
          <button
            onClick={() => navigate("/picks")}
            className="w-full px-6 py-3 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-colors"
          >
            Start Making Picks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-body-sm text-text-secondary hover:text-text-primary mb-4"
        >
          <LuArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-page-title font-bold text-text-primary">Join a League</h1>
        <p className="text-body text-text-secondary mt-2">
          Enter the join code shared by your league commissioner.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-card text-danger text-body-sm">
          {error}
        </div>
      )}

      {/* Join form */}
      <div className="bg-surface rounded-card border border-border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-body-sm font-medium text-text-primary mb-2">
              Join Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={handleCodeChange}
              placeholder="ABC123"
              className="w-full px-4 py-4 bg-surface border border-border rounded-button text-center text-page-title font-mono font-bold text-text-primary tracking-widest placeholder:text-text-muted placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              maxLength={8}
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
            />
            <p className="mt-2 text-caption text-text-muted text-center">
              The code is usually 6 characters
            </p>
          </div>
          
          <button
            type="submit"
            disabled={joinCode.length < 4 || loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LuUsers className="w-5 h-5" />
                Join League
              </>
            )}
          </button>
        </form>
      </div>

      {/* Alternative */}
      <div className="mt-8 text-center">
        <p className="text-body-sm text-text-muted mb-3">Don't have a code?</p>
        <button
          onClick={() => navigate("/create-league")}
          className="text-body-sm text-primary hover:text-primary-hover font-medium"
        >
          Create your own league →
        </button>
      </div>
    </div>
  );
};

