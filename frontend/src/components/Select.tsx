import React, { useId } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  hint,
  options,
  placeholder,
  className = "",
  id,
  ...props
}) => {
  const generatedId = useId();
  const selectId = id || props.name || generatedId;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-body-sm font-medium text-text-primary mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`
            w-full px-3.5 py-2.5 bg-surface border rounded-input text-body-sm text-text-primary
            appearance-none cursor-pointer pr-10
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            disabled:bg-subtle disabled:text-text-muted disabled:cursor-not-allowed
            ${error ? "border-error focus:ring-error/20 focus:border-error" : "border-border"}
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-text-muted">
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {error && <p className="mt-1.5 text-caption text-error">{error}</p>}
      {hint && !error && (
        <p className="mt-1.5 text-caption text-text-muted">{hint}</p>
      )}
    </div>
  );
};

export default Select;

