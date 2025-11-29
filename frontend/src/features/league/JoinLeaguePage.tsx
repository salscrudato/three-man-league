/**
 * Join League Page - Browse public leagues or enter a join code for private ones
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useLeague } from "../../league/LeagueContext";
import { apiPost, getErrorMessage, getAvailableLeagues } from "../../lib/api";
import { LuArrowLeft, LuCheck, LuUsers, LuLock, LuGlobe, LuLoader } from "react-icons/lu";
import type { PublicLeagueSummary } from "../../types";

export const JoinLeaguePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { refreshLeagues, setActiveLeague } = useLeague();

  const [joinCode, setJoinCode] = useState(searchParams.get("code") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ leagueName: string; leagueId: string } | null>(null);

  // Available public leagues
  const [availableLeagues, setAvailableLeagues] = useState<PublicLeagueSummary[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);

  // Passcode modal state
  const [selectedLeague, setSelectedLeague] = useState<PublicLeagueSummary | null>(null);
  const [passcode, setPasscode] = useState("");
  const [joiningLeagueId, setJoiningLeagueId] = useState<string | null>(null);

  // Load available leagues
  const loadAvailableLeaguesFn = useCallback(async () => {
    if (!user) return;
    setLoadingLeagues(true);
    try {
      const data = await getAvailableLeagues(user);
      setAvailableLeagues(data.leagues || []);
    } catch (err) {
      console.error("Failed to load available leagues:", err);
    } finally {
      setLoadingLeagues(false);
    }
  }, [user]);

  useEffect(() => {
    loadAvailableLeaguesFn();
  }, [loadAvailableLeaguesFn]);

  // Auto-submit if code is provided in URL
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl && codeFromUrl.length === 6) {
      setJoinCode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  // Join a public league directly
  const handleJoinPublicLeague = async (league: PublicLeagueSummary) => {
    if (!user) return;

    setJoiningLeagueId(league.id);
    setError(null);

    try {
      const data = await apiPost<{
        leagueName: string;
        leagueId: string;
      }>("/joinLeague", { leagueId: league.id }, user);

      setSuccess({ leagueName: data.leagueName, leagueId: data.leagueId });
      await refreshLeagues();
      await setActiveLeague(data.leagueId);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setJoiningLeagueId(null);
    }
  };

  // Join with a passcode (for private leagues via code)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !joinCode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiPost<{
        leagueName: string;
        leagueId: string;
      }>("/joinLeague", {
        joinCode: joinCode.trim().toUpperCase(),
        passcode: passcode || undefined,
      }, user);

      setSuccess({ leagueName: data.leagueName, leagueId: data.leagueId });
      await refreshLeagues();
      await setActiveLeague(data.leagueId);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      // If passcode is required, show passcode input
      if (errorMessage.toLowerCase().includes("passcode required")) {
        setSelectedLeague({
          id: "",
          name: "Private League",
          season: "",
          memberCount: 0,
          status: "active",
          entryFee: 0,
          isPublic: false
        });
      } else {
        setError(errorMessage);
      }
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
      <div className="max-w-xs mx-auto text-center">
        <div className="bg-white rounded-lg border border-border/40 p-4">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-success/10 rounded-lg mb-3">
            <LuCheck className="w-5 h-5 text-success" />
          </div>
          <h1 className="text-body-sm font-semibold text-text-primary mb-0.5">You're In!</h1>
          <p className="text-tiny text-text-secondary mb-3">Joined <span className="font-medium text-text-primary">{success.leagueName}</span></p>
          <button onClick={() => navigate("/picks")} className="w-full px-3 py-1.5 bg-primary text-white rounded-md text-body-sm font-medium hover:bg-primary-hover transition-colors">Start Making Picks</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-tiny text-text-secondary hover:text-text-primary mb-2">
          <LuArrowLeft className="w-3 h-3" /> Back
        </button>
        <h1 className="text-section-title text-text-primary">Join a League</h1>
        <p className="text-tiny text-text-muted mt-0.5">Browse public leagues or enter a join code.</p>
      </div>

      {error && <div className="mb-3 p-2 bg-error-soft border border-error/20 rounded-md text-error text-tiny">{error}</div>}

      <div className="bg-white rounded-lg border border-border/40 p-3 mb-3">
        <h2 className="text-body-sm font-medium text-text-primary mb-2 flex items-center gap-1">
          <LuGlobe className="w-3.5 h-3.5 text-primary" /> Public Leagues
        </h2>
        {loadingLeagues ? (
          <div className="flex items-center justify-center py-5"><LuLoader className="w-4 h-4 text-text-muted animate-spin" /></div>
        ) : availableLeagues.length === 0 ? (
          <p className="text-tiny text-text-muted text-center py-5">No public leagues available.</p>
        ) : (
          <div className="space-y-1.5">
            {availableLeagues.map((league) => (
              <div key={league.id} className="flex items-center justify-between p-2 bg-subtle/60 rounded-md border border-border/20 hover:border-primary/30 transition-colors">
                <div>
                  <h3 className="text-body-sm font-medium text-text-primary">{league.name}</h3>
                  <p className="text-tiny text-text-secondary">{league.season} • {league.memberCount}{league.maxPlayers ? `/${league.maxPlayers}` : ""}{league.entryFee > 0 && ` • $${league.entryFee}`}</p>
                </div>
                <button onClick={() => handleJoinPublicLeague(league)} disabled={joiningLeagueId === league.id}
                  className="px-2 py-1 bg-primary text-white rounded-md text-tiny font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">
                  {joiningLeagueId === league.id ? <LuLoader className="w-3 h-3 animate-spin" /> : "Join"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-border/40 p-3">
        <h2 className="text-body-sm font-medium text-text-primary mb-1.5 flex items-center gap-1">
          <LuLock className="w-3.5 h-3.5 text-text-secondary" /> Have a Code?
        </h2>
        <p className="text-tiny text-text-secondary mb-2">Enter the code from your commissioner.</p>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <label className="block text-tiny font-medium text-text-primary mb-1">Join Code</label>
            <input type="text" value={joinCode} onChange={handleCodeChange} placeholder="ABC123"
              className="w-full px-2.5 py-1.5 bg-white border border-border/40 rounded-md text-center text-body-sm font-mono font-semibold text-text-primary tracking-widest placeholder:text-text-muted placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
              maxLength={8} autoComplete="off" autoCapitalize="characters" />
          </div>
          {selectedLeague && (
            <div>
              <label className="block text-tiny font-medium text-text-primary mb-1">Passcode</label>
              <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Enter passcode"
                className="w-full px-2.5 py-1.5 bg-white border border-border/40 rounded-md text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary" autoFocus />
              <p className="mt-0.5 text-tiny text-text-muted">Private league - passcode required.</p>
            </div>
          )}
          <button type="submit" disabled={joinCode.length < 4 || loading}
            className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-primary text-white rounded-md text-body-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">
            {loading ? <LuLoader className="w-3.5 h-3.5 animate-spin" /> : <><LuUsers className="w-3.5 h-3.5" />Join</>}
          </button>
        </form>
      </div>

      <div className="mt-4 text-center">
        <p className="text-tiny text-text-muted mb-1">Want to start your own?</p>
        <button onClick={() => navigate("/create-league")} className="text-tiny text-primary hover:text-primary-hover font-medium">Create a league →</button>
      </div>
    </div>
  );
};

