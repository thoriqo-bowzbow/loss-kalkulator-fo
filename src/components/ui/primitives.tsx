import { forwardRef, useState, type ReactNode } from 'react';

export const Card = forwardRef<HTMLDivElement, { children: ReactNode; className?: string }>(function Card(
  { children, className = '' },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`rounded-none border-2 border-zinc-900 bg-white shadow-[4px_4px_0_0_#18181b] dark:border-zinc-600 dark:bg-zinc-800 dark:shadow-[4px_4px_0_0_#09090b] ${className}`}
    >
      {children}
    </div>
  );
});

export function SectionTitle({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
      {icon}
      {children}
    </h3>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

const BUTTON_VARIANTS = {
  primary:
    'border-2 border-zinc-900 bg-cyan-400 text-zinc-900 shadow-[3px_3px_0_0_#18181b] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#18181b] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none dark:border-zinc-500 dark:shadow-[3px_3px_0_0_#09090b] dark:hover:shadow-[2px_2px_0_0_#09090b]',
  secondary:
    'border-2 border-zinc-900 bg-yellow-300 text-zinc-900 shadow-[3px_3px_0_0_#18181b] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#18181b] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none dark:border-zinc-500 dark:bg-yellow-400 dark:shadow-[3px_3px_0_0_#09090b] dark:hover:shadow-[2px_2px_0_0_#09090b]',
  ghost:
    'border-2 border-transparent text-zinc-500 hover:border-zinc-900 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-100',
  danger:
    'border-2 border-transparent text-red-500 hover:border-red-500 hover:bg-red-950/40',
} as const;

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-none px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function TextInput({ invalid = false, className = '', ...props }: TextInputProps) {
  return (
    <input
      className={`w-full min-w-0 rounded-none border-2 bg-zinc-50 px-3 py-1.5 text-sm font-semibold text-zinc-900 outline-none transition-shadow placeholder:font-normal placeholder:text-zinc-400 focus:shadow-[3px_3px_0_0_#06b6d4] dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:shadow-[3px_3px_0_0_#0e7490] ${
        invalid
          ? 'border-red-600'
          : 'border-zinc-900 dark:border-zinc-500'
      } ${className}`}
      {...props}
    />
  );
}

/** Text input that accepts both "." and "," as decimal separator, and negative values. */
export function DecimalInput({
  value,
  onValue,
  invalid = false,
  onBlur,
  ...props
}: Omit<TextInputProps, 'value' | 'onChange' | 'type'> & {
  value: number;
  onValue: (v: number) => void;
}) {
  // Raw text being typed; null means "follow the prop" (e.g. after blur or preset change).
  const [raw, setRaw] = useState<string | null>(null);

  return (
    <TextInput
      type="text"
      inputMode="decimal"
      className="num"
      invalid={invalid}
      {...props}
      value={raw ?? (Number.isFinite(value) ? String(value) : '')}
      onChange={(e) => {
        const text = e.target.value;
        setRaw(text);
        const parsed = parseFloat(text.replace(',', '.'));
        if (!Number.isNaN(parsed)) onValue(parsed);
      }}
      onBlur={(e) => {
        setRaw(null);
        const parsed = parseFloat(e.target.value.replace(',', '.'));
        if (Number.isNaN(parsed)) onValue(0);
        onBlur?.(e);
      }}
    />
  );
}

export function Select({
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full min-w-0 cursor-pointer rounded-none border-2 border-zinc-900 bg-zinc-50 px-2 py-1.5 text-[13px] font-semibold text-zinc-900 outline-none transition-shadow focus:shadow-[3px_3px_0_0_#06b6d4] dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:shadow-[3px_3px_0_0_#0e7490] ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block truncate whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
      {children}
    </label>
  );
}

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-none border-2 border-zinc-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider dark:border-zinc-400 ${className}`}
    >
      {children}
    </span>
  );
}
