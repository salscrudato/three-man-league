import React, { useEffect } from "react";
import { LuCheck, LuX, LuTriangleAlert, LuInfo } from "react-icons/lu";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  type: ToastType;
  message: string;
  onClose?: () => void;
  duration?: number;
  visible: boolean;
}

const typeStyles: Record<ToastType, { bg: string; icon: React.ReactNode; text: string; iconBg: string }> = {
  success: {
    bg: "bg-white border-success/20",
    icon: <LuCheck className="w-4 h-4" />,
    text: "text-success-text",
    iconBg: "bg-success-soft text-success",
  },
  error: {
    bg: "bg-white border-error/20",
    icon: <LuX className="w-4 h-4" />,
    text: "text-error-text",
    iconBg: "bg-error-soft text-error",
  },
  warning: {
    bg: "bg-white border-warning/20",
    icon: <LuTriangleAlert className="w-4 h-4" />,
    text: "text-warning-text",
    iconBg: "bg-warning-soft text-warning",
  },
  info: {
    bg: "bg-white border-info/20",
    icon: <LuInfo className="w-4 h-4" />,
    text: "text-info-text",
    iconBg: "bg-info-soft text-info",
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
        flex items-center gap-3 px-4 py-3 rounded-xl border shadow-dropdown
        animate-slide-up backdrop-blur-sm
        ${styles.bg}
      `}
      role="alert"
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${styles.iconBg}`}>
        {styles.icon}
      </div>
      <p className="text-body-sm font-medium text-text-primary">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-1 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-all duration-200"
          aria-label="Close"
        >
          <LuX className="w-4 h-4" />
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
        flex items-center gap-3 px-4 py-3 rounded-xl border
        ${styles.bg}
        ${className}
      `}
      role="alert"
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${styles.iconBg}`}>
        {styles.icon}
      </div>
      <p className="flex-1 text-body-sm text-text-primary">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-all duration-200"
          aria-label="Close"
        >
          <LuX className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Toast;

