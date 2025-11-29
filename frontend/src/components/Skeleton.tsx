import React, { memo } from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular";
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = memo(({ className = "", variant = "rectangular", width, height, lines = 1 }) => {
  const baseStyle = "bg-gradient-to-r from-subtle via-border/30 to-subtle bg-[length:200%_100%] animate-shimmer";
  const variantStyles = { text: "h-3 rounded", circular: "rounded-full", rectangular: "rounded-md" };
  const style: React.CSSProperties = { width: width || "100%", height: height || (variant === "text" ? undefined : "100%") };

  if (variant === "text" && lines > 1) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={`${baseStyle} ${variantStyles[variant]} ${className}`} style={{ ...style, width: i === lines - 1 ? "75%" : "100%" }} />
        ))}
      </div>
    );
  }

  return <div className={`${baseStyle} ${variantStyles[variant]} ${className}`} style={style} />;
});

Skeleton.displayName = "Skeleton";

export const CardSkeleton: React.FC<{ className?: string }> = memo(({ className = "" }) => (
  <div className={`bg-white rounded-card border border-border/60 shadow-card p-3 ${className}`}>
    <div className="flex items-center gap-2.5 mb-3">
      <Skeleton variant="circular" width={32} height={32} />
      <div className="flex-1">
        <Skeleton variant="text" width="60%" className="mb-1.5" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
    <Skeleton variant="text" lines={3} />
  </div>
));

CardSkeleton.displayName = "CardSkeleton";

export const TableSkeleton: React.FC<{ rows?: number; columns?: number; className?: string }> = memo(({ rows = 5, columns = 4, className = "" }) => (
  <div className={`bg-white rounded-card border border-border/60 shadow-card overflow-hidden ${className}`}>
    <div className="border-b border-border/40 bg-subtle/50 px-3 py-2 flex gap-3">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} variant="text" width={`${100 / columns}%`} height={12} />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="px-3 py-2 flex gap-3 border-b border-border/30 last:border-0">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} variant="text" width={`${100 / columns}%`} height={10} />
        ))}
      </div>
    ))}
  </div>
));

TableSkeleton.displayName = "TableSkeleton";

export const PlayerListSkeleton: React.FC<{ count?: number }> = memo(({ count = 5 }) => (
  <div className="space-y-1.5">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-2.5 p-2.5 bg-white border border-border/60 rounded-card shadow-card">
        <Skeleton variant="rectangular" width={40} height={40} className="rounded-md shrink-0" />
        <div className="flex-1">
          <Skeleton variant="text" width="50%" className="mb-1.5" />
          <Skeleton variant="text" width="30%" />
        </div>
        <Skeleton variant="rectangular" width={48} height={24} className="rounded shrink-0" />
      </div>
    ))}
  </div>
));

PlayerListSkeleton.displayName = "PlayerListSkeleton";

export default Skeleton;

