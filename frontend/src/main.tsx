import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./ui/AppShell";
import { WeeklyPicksPage } from "./features/picks/WeeklyPicksPage";
import { StandingsPage } from "./features/standings/StandingsPage";
import { ChatPage } from "./features/chat/ChatPage";
import { RulesPage } from "./features/rules/RulesPage";
import { AuthGate } from "./auth/AuthGate";
import { LeagueProvider } from "./league/LeagueContext";
import { CreateLeaguePage } from "./features/league/CreateLeaguePage";
import { JoinLeaguePage } from "./features/league/JoinLeaguePage";
import { LeagueSettingsPage } from "./features/league/LeagueSettingsPage";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthGate>
        <LeagueProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<Navigate to="/picks" replace />} />
              <Route path="/picks" element={<WeeklyPicksPage />} />
              <Route path="/standings" element={<StandingsPage />} />
              <Route path="/assistant" element={<ChatPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/create-league" element={<CreateLeaguePage />} />
              <Route path="/join" element={<JoinLeaguePage />} />
              <Route path="/league-settings" element={<LeagueSettingsPage />} />
            </Routes>
          </AppShell>
        </LeagueProvider>
      </AuthGate>
    </BrowserRouter>
  </React.StrictMode>
);
