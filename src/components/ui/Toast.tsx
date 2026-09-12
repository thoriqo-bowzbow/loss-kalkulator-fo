import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';

type ToastKind = 'success' | 'info' | 'error';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

const ICONS: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
  error: <XCircle className="h-4 w-4" />,
};

const KIND_STYLES: Record<ToastKind, string> = {
  success: 'bg-lime-300 text-zinc-900',
  info: 'bg-cyan-300 text-zinc-900',
  error: 'bg-red-300 text-zinc-900',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-none border-2 px-3 py-2 text-sm font-bold shadow-[4px_4px_0_0_#18181b] animate-pop-in dark:border-zinc-400 dark:shadow-[4px_4px_0_0_#09090b] ${KIND_STYLES[item.kind]}`}
          >
            {ICONS[item.kind]}
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
