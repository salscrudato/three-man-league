import React, { useId } from "react";

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
  ariaLabel?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  size = "md",
  className = "",
  ariaLabel = "Tabs",
}) => {
  const tablistId = useId();
  const sizeStyles = { sm: "text-tiny px-2 py-1", md: "text-body-sm px-2.5 py-1.5" };

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      newIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      newIndex = tabs.length - 1;
    }
    if (newIndex !== currentIndex) onChange(tabs[newIndex].id);
  };

  const TabButton = ({ tab, index }: { tab: Tab; index: number }) => {
    const isActive = activeTab === tab.id;
    const baseClass = `${sizeStyles[size]} font-medium transition-all duration-100`;

    const variantClass = {
      underline: `relative ${isActive ? "text-primary" : "text-text-muted hover:text-text-primary"}`,
      pills: `rounded-button ${isActive ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-primary hover:bg-subtle"}`,
      segmented: `rounded-button ${isActive ? "bg-white text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary"}`,
    }[variant];

    return (
      <button
        role="tab"
        id={`${tablistId}-tab-${tab.id}`}
        aria-selected={isActive}
        aria-controls={`${tablistId}-panel-${tab.id}`}
        tabIndex={isActive ? 0 : -1}
        onClick={() => onChange(tab.id)}
        onKeyDown={(e) => handleKeyDown(e, index)}
        className={`${baseClass} ${variantClass}`}
      >
        <div className="flex items-center gap-1">
          {tab.icon && <span>{tab.icon}</span>}
          <span>{tab.label}</span>
        </div>
        {variant === "underline" && isActive && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
        )}
      </button>
    );
  };

  const containerClass = {
    underline: `flex border-b border-border/40 ${className}`,
    pills: `flex gap-0.5 ${className}`,
    segmented: `inline-flex bg-subtle rounded-md p-0.5 ${className}`,
  }[variant];

  return (
    <div role="tablist" aria-label={ariaLabel} className={containerClass}>
      {tabs.map((tab, index) => (
        <TabButton key={tab.id} tab={tab} index={index} />
      ))}
    </div>
  );
};

export default Tabs;

