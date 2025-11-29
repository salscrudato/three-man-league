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
        <label htmlFor={inputId} className="block text-body-sm font-medium text-text-primary mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-text-muted">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={error ? "true" : undefined}
          className={`
            w-full px-2.5 py-1.5 bg-white border rounded-input text-body-sm text-text-primary
            placeholder:text-text-subtle transition-all duration-100
            focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/60
            disabled:bg-subtle disabled:text-text-muted disabled:cursor-not-allowed
            ${error ? "border-error focus:ring-error/15 focus:border-error" : "border-border/80"}
            ${leftIcon ? "pl-8" : ""}
            ${rightIcon ? "pr-8" : ""}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-tiny text-error" role="alert">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-tiny text-text-muted">{hint}</p>
      )}
    </div>
  );
};

export default Input;

