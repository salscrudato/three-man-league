import React from "react";
import { LuLoader } from "react-icons/lu";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow active:scale-[0.98]",
  secondary: "bg-white text-text-primary border border-border/80 hover:bg-subtle hover:border-border active:scale-[0.98]",
  ghost: "text-text-muted hover:bg-subtle hover:text-text-primary",
  danger: "bg-error text-white hover:bg-error/90 shadow-sm active:scale-[0.98]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-2 py-1 text-body-sm gap-1",
  md: "px-3 py-1.5 text-body-sm gap-1.5",
  lg: "px-4 py-2 text-body gap-2",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  icon,
  children,
  className = "",
  ...props
}) => {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium rounded-button
        transition-all duration-100
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <LuLoader className="w-3.5 h-3.5 animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};

export default Button;

