import React, { memo } from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const paddingStyles = {
  none: "",
  sm: "p-2.5",
  md: "p-3",
  lg: "p-4",
};

export const Card: React.FC<CardProps> = memo(({
  children,
  className = "",
  padding = "md",
  hover = false,
}) => {
  return (
    <div
      className={`
        bg-white rounded-card border border-border/60 shadow-card
        ${hover ? "hover:border-border hover:shadow-card-hover transition-all duration-100" : ""}
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
});

Card.displayName = "Card";

export const CardHeader: React.FC<CardHeaderProps> = memo(({
  title,
  subtitle,
  action,
  className = "",
  icon,
}) => {
  return (
    <div className={`flex items-start justify-between gap-2 ${className}`}>
      <div className="flex items-start gap-2">
        {icon && (
          <div className="shrink-0 w-7 h-7 rounded-md bg-primary-soft flex items-center justify-center text-primary">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-card-title text-text-primary">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-tiny text-text-muted">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
});

CardHeader.displayName = "CardHeader";

export const CardBody: React.FC<CardBodyProps> = memo(({ children, className = "" }) => (
  <div className={className}>{children}</div>
));

CardBody.displayName = "CardBody";

export const CardFooter: React.FC<CardFooterProps> = memo(({ children, className = "" }) => (
  <div className={`border-t border-border/40 pt-2.5 mt-2.5 flex items-center justify-end gap-2 ${className}`}>
    {children}
  </div>
));

CardFooter.displayName = "CardFooter";

export default Card;

