/**
 * League Context - Manages active league state across the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthContext";
import type { League, LeagueSummary, MemberRole } from "../types";

const API_BASE = import.meta.env.VITE_FUNCTIONS_URL || "";

export interface LeagueContextType {
  // Current active league
  activeLeague: League | null;
  activeLeagueId: string | null;
  userRole: MemberRole | null;
  
  // All user's leagues
  userLeagues: LeagueSummary[];
  
  // Loading states
  loading: boolean;
  loadingLeagues: boolean;
  
  // Actions
  setActiveLeague: (leagueId: string) => Promise<void>;
  refreshLeagues: () => Promise<void>;
  refreshActiveLeague: () => Promise<void>;
}

const LeagueContext = createContext<LeagueContextType>({
  activeLeague: null,
  activeLeagueId: null,
  userRole: null,
  userLeagues: [],
  loading: true,
  loadingLeagues: true,
  setActiveLeague: async () => {},
  refreshLeagues: async () => {},
  refreshActiveLeague: async () => {},
});

export const useLeague = () => useContext(LeagueContext);

export const LeagueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeLeague, setActiveLeagueState] = useState<League | null>(null);
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<MemberRole | null>(null);
  const [userLeagues, setUserLeagues] = useState<LeagueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLeagues, setLoadingLeagues] = useState(true);

  // Fetch user's leagues from backend
  const refreshLeagues = useCallback(async () => {
    if (!user) {
      setUserLeagues([]);
      setLoadingLeagues(false);
      return;
    }

    try {
      setLoadingLeagues(true);
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/getUserLeagues`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setUserLeagues(data.leagues || []);
      } else {
        console.error("Failed to fetch leagues:", await res.text());
        setUserLeagues([]);
      }
    } catch (err) {
      console.error("Error fetching leagues:", err);
      setUserLeagues([]);
    } finally {
      setLoadingLeagues(false);
    }
  }, [user]);

  // Fetch active league details
  const refreshActiveLeague = useCallback(async () => {
    if (!user || !activeLeagueId) {
      setActiveLeagueState(null);
      setUserRole(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch league document
      const leagueDoc = await getDoc(doc(db, "leagues", activeLeagueId));
      if (!leagueDoc.exists()) {
        console.error("Active league not found");
        setActiveLeagueState(null);
        setActiveLeagueId(null);
        setLoading(false);
        return;
      }

      const leagueData = { id: leagueDoc.id, ...leagueDoc.data() } as League;
      setActiveLeagueState(leagueData);

      // Fetch user's role in this league
      const memberDoc = await getDoc(doc(db, "leagues", activeLeagueId, "members", user.uid));
      if (memberDoc.exists()) {
        setUserRole(memberDoc.data().role as MemberRole);
      } else {
        setUserRole(null);
      }
    } catch (err) {
      console.error("Error fetching active league:", err);
      setActiveLeagueState(null);
    } finally {
      setLoading(false);
    }
  }, [user, activeLeagueId]);

  // Set active league and persist to user profile
  const setActiveLeague = useCallback(async (leagueId: string) => {
    if (!user) return;

    try {
      // Update local state immediately
      setActiveLeagueId(leagueId);
      
      // Persist to Firestore
      await setDoc(doc(db, "users", user.uid), {
        activeLeagueId: leagueId,
        updatedAt: new Date(),
      }, { merge: true });
    } catch (err) {
      console.error("Error setting active league:", err);
    }
  }, [user]);

  // Load user's active league from profile on mount
  useEffect(() => {
    const loadActiveLeague = async () => {
      if (!user) {
        setActiveLeagueId(null);
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().activeLeagueId) {
          setActiveLeagueId(userDoc.data().activeLeagueId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading active league:", err);
        setLoading(false);
      }
    };

    loadActiveLeague();
  }, [user]);

  // Refresh leagues when user changes
  useEffect(() => {
    refreshLeagues();
  }, [refreshLeagues]);

  // Refresh active league when activeLeagueId changes
  useEffect(() => {
    refreshActiveLeague();
  }, [refreshActiveLeague]);

  // Auto-select first league if user has leagues but no active one
  useEffect(() => {
    if (!loading && !loadingLeagues && !activeLeagueId && userLeagues.length > 0) {
      setActiveLeague(userLeagues[0].id);
    }
  }, [loading, loadingLeagues, activeLeagueId, userLeagues, setActiveLeague]);

  return (
    <LeagueContext.Provider
      value={{
        activeLeague,
        activeLeagueId,
        userRole,
        userLeagues,
        loading,
        loadingLeagues,
        setActiveLeague,
        refreshLeagues,
        refreshActiveLeague,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
};

