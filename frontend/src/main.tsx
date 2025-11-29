import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./ui/AppShell";
import { AuthGate } from "./auth/AuthGate";
import { LeagueProvider } from "./league/LeagueContext";
import { PageLoader, ErrorBoundary } from "./components";

// Lazy load route components for code splitting
const WeeklyPicksPage = lazy(() => import("./features/picks/WeeklyPicksPage").then(m => ({ default: m.WeeklyPicksPage })));
const StandingsPage = lazy(() => import("./features/standings/StandingsPage").then(m => ({ default: m.StandingsPage })));
const RulesPage = lazy(() => import("./features/rules/RulesPage").then(m => ({ default: m.RulesPage })));
const CreateLeaguePage = lazy(() => import("./features/league/CreateLeaguePage").then(m => ({ default: m.CreateLeaguePage })));
const LeaguesPage = lazy(() => import("./features/league/JoinLeaguePage").then(m => ({ default: m.JoinLeaguePage })));
const LeagueSettingsPage = lazy(() => import("./features/league/LeagueSettingsPage").then(m => ({ default: m.LeagueSettingsPage })));
const ProfilePage = lazy(() => import("./features/profile/ProfilePage").then(m => ({ default: m.ProfilePage })));
const BackfillPage = lazy(() => import("./features/admin/BackfillPage").then(m => ({ default: m.BackfillPage })));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthGate>
          <LeagueProvider>
            <AppShell>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/picks" replace />} />
                  <Route path="/picks" element={<WeeklyPicksPage />} />
                  <Route path="/standings" element={<StandingsPage />} />
                  <Route path="/rules" element={<RulesPage />} />
                  <Route path="/create-league" element={<CreateLeaguePage />} />
                  <Route path="/leagues" element={<LeaguesPage />} />
                  <Route path="/join" element={<Navigate to="/leagues" replace />} />
                  <Route path="/league-settings" element={<LeagueSettingsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/admin/backfill" element={<BackfillPage />} />
                </Routes>
              </Suspense>
            </AppShell>
          </LeagueProvider>
        </AuthGate>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
