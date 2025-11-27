import React from "react";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "underline" | "pills" | "segmented";
  size?: "sm" | "md";
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  size = "md",
  className = "",
}) => {
  const sizeStyles = {
    sm: "text-caption px-3 py-1.5",
    md: "text-body-sm px-4 py-2",
  };

  if (variant === "underline") {
    return (
      <div className={`flex border-b border-border ${className}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              relative ${sizeStyles[size]} font-medium transition-colors
              ${activeTab === tab.id
                ? "text-primary"
                : "text-text-muted hover:text-text-primary"
              }
            `}
          >
            <div className="flex items-center gap-2">
              {tab.icon}
              <span>{tab.label}</span>
            </div>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>
    );
  }

  if (variant === "pills") {
    return (
      <div className={`flex gap-1 ${className}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              ${sizeStyles[size]} font-medium rounded-button transition-all
              ${activeTab === tab.id
                ? "bg-primary text-white"
                : "text-text-muted hover:text-text-primary hover:bg-subtle"
              }
            `}
          >
            <div className="flex items-center gap-2">
              {tab.icon}
              <span>{tab.label}</span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  // Segmented control style
  return (
    <div className={`inline-flex bg-subtle rounded-button p-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            ${sizeStyles[size]} font-medium rounded-badge transition-all
            ${activeTab === tab.id
              ? "bg-surface text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-primary"
            }
          `}
        >
          <div className="flex items-center gap-2">
            {tab.icon}
            <span>{tab.label}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default Tabs;

