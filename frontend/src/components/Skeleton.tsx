import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular";
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rectangular",
  width,
  height,
  lines = 1,
}) => {
  const baseStyle = "bg-subtle animate-pulse";

  const getVariantStyles = () => {
    switch (variant) {
      case "text":
        return "h-4 rounded";
      case "circular":
        return "rounded-full";
      case "rectangular":
      default:
        return "rounded-card";
    }
  };

  const style: React.CSSProperties = {
    width: width || "100%",
    height: height || (variant === "text" ? undefined : "100%"),
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseStyle} ${getVariantStyles()} ${className}`}
            style={{
              ...style,
              width: i === lines - 1 ? "75%" : "100%",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseStyle} ${getVariantStyles()} ${className}`}
      style={style}
    />
  );
};

// Card skeleton for loading states
export const CardSkeleton: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  return (
    <div className={`bg-surface rounded-card shadow-card border border-border p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton variant="text" width="60%" className="mb-2" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <Skeleton variant="text" lines={3} />
    </div>
  );
};

// Table skeleton for loading states
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className = "" }) => {
  return (
    <div className={`bg-surface rounded-card shadow-card border border-border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="border-b border-border bg-subtle px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${100 / columns}%`} height={16} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className={`px-4 py-3 flex gap-4 ${rowIndex % 2 === 0 ? "bg-surface" : "bg-subtle/50"}`}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              width={`${100 / columns}%`}
              height={14}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// Player list skeleton
export const PlayerListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 bg-surface border border-border rounded-card"
        >
          <Skeleton variant="rectangular" width={48} height={48} className="rounded-lg shrink-0" />
          <div className="flex-1">
            <Skeleton variant="text" width="50%" className="mb-2" />
            <Skeleton variant="text" width="30%" />
          </div>
          <Skeleton variant="rectangular" width={60} height={28} className="rounded-button shrink-0" />
        </div>
      ))}
    </div>
  );
};

export default Skeleton;

