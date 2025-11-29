import React from "react";
import { LuLoader } from "react-icons/lu";

/**
 * Loading fallback component for lazy-loaded pages
 */
export const PageLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
    <div className="relative">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-soft to-primary-muted flex items-center justify-center">
        <LuLoader className="w-6 h-6 text-primary animate-spin" />
      </div>
    </div>
    <p className="text-body-sm text-text-muted font-medium animate-pulse">Loading...</p>
  </div>
);

