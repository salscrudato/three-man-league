import React, { useId } from "react";
import { LuChevronDown } from "react-icons/lu";

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
        <label htmlFor={selectId} className="block text-body-sm font-medium text-text-primary mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? "true" : undefined}
          className={`
            w-full px-2.5 py-1.5 bg-white border rounded-input text-body-sm text-text-primary
            appearance-none cursor-pointer pr-8 transition-all duration-100
            focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/60
            disabled:bg-subtle disabled:text-text-muted disabled:cursor-not-allowed
            ${error ? "border-error focus:ring-error/15 focus:border-error" : "border-border/80"}
            ${className}
          `}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-text-muted">
          <LuChevronDown className="w-3.5 h-3.5" />
        </div>
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

export default Select;

