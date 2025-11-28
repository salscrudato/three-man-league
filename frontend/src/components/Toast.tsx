import React, { useEffect } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  type: ToastType;
  message: string;
  onClose?: () => void;
  duration?: number;
  visible: boolean;
}

const typeStyles: Record<ToastType, { bg: string; icon: string; text: string }> = {
  success: {
    bg: "bg-success-soft border-success/30",
    icon: "✓",
    text: "text-success-text",
  },
  error: {
    bg: "bg-error-soft border-error/30",
    icon: "✕",
    text: "text-error-text",
  },
  warning: {
    bg: "bg-warning-soft border-warning/30",
    icon: "⚠",
    text: "text-warning-text",
  },
  info: {
    bg: "bg-info-soft border-info/30",
    icon: "ℹ",
    text: "text-info-text",
  },
};

export const Toast: React.FC<ToastProps> = ({
  type,
  message,
  onClose,
  duration = 5000,
  visible,
}) => {
  const styles = typeStyles[type];

  useEffect(() => {
    if (visible && duration > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50
        flex items-center gap-3 px-4 py-3 rounded-card border shadow-dropdown
        animate-slide-up
        ${styles.bg}
      `}
      role="alert"
    >
      <span className={`text-lg ${styles.text}`}>{styles.icon}</span>
      <p className={`text-body-sm font-medium ${styles.text}`}>{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className={`ml-2 p-1 rounded hover:bg-black/5 transition-colors ${styles.text}`}
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

// Inline alert for in-page feedback
interface AlertProps {
  type: ToastType;
  message: string;
  className?: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  type,
  message,
  className = "",
  onClose,
}) => {
  const styles = typeStyles[type];

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-card border
        ${styles.bg}
        ${className}
      `}
      role="alert"
    >
      <span className={`text-base shrink-0 ${styles.text}`}>{styles.icon}</span>
      <p className={`flex-1 text-body-sm ${styles.text}`}>{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className={`shrink-0 p-1 rounded hover:bg-black/5 transition-colors ${styles.text}`}
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Toast;

