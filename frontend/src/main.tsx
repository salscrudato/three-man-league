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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthGate>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/picks" replace />} />
            <Route path="/picks" element={<WeeklyPicksPage />} />
            <Route path="/standings" element={<StandingsPage />} />
            <Route path="/assistant" element={<ChatPage />} />
            <Route path="/rules" element={<RulesPage />} />
          </Routes>
        </AppShell>
      </AuthGate>
    </BrowserRouter>
  </React.StrictMode>
);
