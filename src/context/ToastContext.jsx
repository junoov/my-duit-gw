import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

function createToastId() {
  return `toast-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((toastId) => {
    setToasts((current) => current.filter((item) => item.id !== toastId));
    const timer = timersRef.current.get(toastId);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(toastId);
    }
  }, []);

  const showToast = useCallback(
    ({ message, type = "success", duration = 2600 }) => {
      const normalizedMessage = typeof message === "string" ? message.trim() : "";
      if (!normalizedMessage) {
        return;
      }

      const id = createToastId();
      setToasts((current) => [...current, { id, message: normalizedMessage, type }]);

      const timer = window.setTimeout(() => {
        removeToast(id);
      }, duration);
      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  const value = useMemo(
    () => ({
      showToast,
      removeToast
    }),
    [showToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-20 right-4 z-[120] w-[calc(100%-2rem)] max-w-sm space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-surface-container-high border border-outline-variant/30 rounded-2xl p-4 shadow-xl flex items-start gap-3 animate-[slide-up_0.22s_ease-out]"
          >
            <span
              className={`material-symbols-outlined mt-0.5 ${
                toast.type === "error" ? "text-tertiary" : "text-primary"
              }`}
            >
              {toast.type === "error" ? "error" : "check_circle"}
            </span>
            <p className="text-sm font-medium text-on-surface flex-1">{toast.message}</p>
            <button
              type="button"
              className="material-symbols-outlined text-on-surface-variant/80 hover:text-on-surface"
              onClick={() => removeToast(toast.id)}
            >
              close
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast harus dipakai di dalam ToastProvider.");
  }
  return context;
}
