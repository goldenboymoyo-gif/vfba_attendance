'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

interface Toast {
  id: number;
  message: string;
  ok: boolean;
}

const ToastContext = createContext<(message: string, ok?: boolean) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, ok = true) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, ok }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-3 right-3 z-[300] flex flex-col gap-2 sm:bottom-5 sm:right-5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex min-w-[240px] max-w-[90vw] items-start gap-2.5 rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--text)] shadow-lg2"
          >
            <span
              className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: t.ok ? '#1D7A4C' : '#A61E22' }}
            />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
