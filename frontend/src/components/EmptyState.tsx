import React from "react";
import { LuInbox, LuClipboardList, LuUsers, LuTriangleAlert } from "react-icons/lu";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className = "" }) => (
  <div className={`flex flex-col items-center justify-center py-8 px-3 text-center ${className}`}>
    {icon && (
      <div className="w-10 h-10 rounded-lg bg-subtle flex items-center justify-center mb-3 text-text-muted">
        {icon}
      </div>
    )}
    <h3 className="text-body-sm font-medium text-text-primary mb-0.5">{title}</h3>
    {description && <p className="text-body-sm text-text-muted max-w-xs">{description}</p>}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-3 px-3 py-1.5 bg-primary text-white rounded-button text-body-sm font-medium hover:bg-primary-hover active:scale-[0.98] transition-all duration-100 shadow-sm"
      >
        {action.label}
      </button>
    )}
  </div>
);

export const NoDataEmptyState: React.FC<{ message?: string }> = ({ message = "No data available" }) => (
  <EmptyState icon={<LuInbox className="w-4 h-4" />} title={message} />
);

export const NoPicksEmptyState: React.FC<{ onMakePicks?: () => void }> = ({ onMakePicks }) => (
  <EmptyState
    icon={<LuClipboardList className="w-4 h-4" />}
    title="No picks yet"
    description="Select your QB, RB, and WR for this week"
    action={onMakePicks ? { label: "Make Picks", onClick: onMakePicks } : undefined}
  />
);

export const NoPlayersEmptyState: React.FC = () => (
  <EmptyState icon={<LuUsers className="w-4 h-4" />} title="No players found" description="Try adjusting your search or filters" />
);

export const ErrorEmptyState: React.FC<{ message?: string; onRetry?: () => void }> = ({ message = "Something went wrong", onRetry }) => (
  <EmptyState
    icon={<LuTriangleAlert className="w-4 h-4 text-error" />}
    title="Error"
    description={message}
    action={onRetry ? { label: "Try Again", onClick: onRetry } : undefined}
  />
);

export default EmptyState;

