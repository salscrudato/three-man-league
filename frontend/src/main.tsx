import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./ui/AppShell";
import { AuthGate } from "./auth/AuthGate";
import { LeagueProvider } from "./league/LeagueContext";

// Lazy load route components for code splitting
const WeeklyPicksPage = lazy(() => import("./features/picks/WeeklyPicksPage").then(m => ({ default: m.WeeklyPicksPage })));
const StandingsPage = lazy(() => import("./features/standings/StandingsPage").then(m => ({ default: m.StandingsPage })));
const ChatPage = lazy(() => import("./features/chat/ChatPage").then(m => ({ default: m.ChatPage })));
const RulesPage = lazy(() => import("./features/rules/RulesPage").then(m => ({ default: m.RulesPage })));
const CreateLeaguePage = lazy(() => import("./features/league/CreateLeaguePage").then(m => ({ default: m.CreateLeaguePage })));
const JoinLeaguePage = lazy(() => import("./features/league/JoinLeaguePage").then(m => ({ default: m.JoinLeaguePage })));
const LeagueSettingsPage = lazy(() => import("./features/league/LeagueSettingsPage").then(m => ({ default: m.LeagueSettingsPage })));
const BackfillPage = lazy(() => import("./features/admin/BackfillPage").then(m => ({ default: m.BackfillPage })));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthGate>
        <LeagueProvider>
          <AppShell>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/picks" replace />} />
                <Route path="/picks" element={<WeeklyPicksPage />} />
                <Route path="/standings" element={<StandingsPage />} />
                <Route path="/assistant" element={<ChatPage />} />
                <Route path="/rules" element={<RulesPage />} />
                <Route path="/create-league" element={<CreateLeaguePage />} />
                <Route path="/join" element={<JoinLeaguePage />} />
                <Route path="/league-settings" element={<LeagueSettingsPage />} />
                <Route path="/admin/backfill" element={<BackfillPage />} />
              </Routes>
            </Suspense>
          </AppShell>
        </LeagueProvider>
      </AuthGate>
    </BrowserRouter>
  </React.StrictMode>
);
