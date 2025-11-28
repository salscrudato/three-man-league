import React, { useId } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className = "",
  id,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || props.name || generatedId;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-body-sm font-medium text-text-primary mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`
            w-full px-3.5 py-2.5 bg-surface border rounded-input text-body-sm text-text-primary
            placeholder:text-text-subtle
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            disabled:bg-subtle disabled:text-text-muted disabled:cursor-not-allowed
            ${error ? "border-error focus:ring-error/20 focus:border-error" : "border-border"}
            ${leftIcon ? "pl-10" : ""}
            ${rightIcon ? "pr-10" : ""}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-caption text-error">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-caption text-text-muted">{hint}</p>
      )}
    </div>
  );
};

export default Input;

