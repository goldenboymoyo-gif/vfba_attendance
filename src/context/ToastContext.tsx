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
      <div className="fixed bottom-5 right-5 z-[300] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-lg2"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
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
