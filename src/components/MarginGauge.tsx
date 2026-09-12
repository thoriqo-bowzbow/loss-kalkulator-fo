import { useI18n } from '../i18n/I18nContext';
import { MARGIN_OK_THRESHOLD } from '../lib/constants';
import type { Verdict } from '../lib/types';

const GAUGE_MIN = -6;
const GAUGE_MAX = 12;

export const VERDICT_STYLES: Record<Verdict, { text: string; bg: string; border: string; bar: string }> = {
  ok: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-lime-200 dark:bg-emerald-950/60',
    border: 'border-emerald-600 dark:border-emerald-400',
    bar: 'bg-emerald-600',
  },
  marginal: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-yellow-200 dark:bg-amber-950/60',
    border: 'border-amber-600 dark:border-amber-400',
    bar: 'bg-amber-500',
  },
  fail: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-200 dark:bg-red-950/60',
    border: 'border-red-600 dark:border-red-400',
    bar: 'bg-red-600',
  },
};

export function MarginGauge({ margin, verdict }: { margin: number; verdict: Verdict }) {
  const { t } = useI18n();
  const style = VERDICT_STYLES[verdict];

  const clamped = Math.min(Math.max(margin, GAUGE_MIN), GAUGE_MAX);
  const posPercent = ((clamped - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100;
  const thresholdPercent = ((MARGIN_OK_THRESHOLD - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        <span>{t('gauge.fail')}</span>
        <span>{t('gauge.marginal')}</span>
        <span>{t('gauge.ok')}</span>
      </div>
      <div className="relative h-4 border-2 border-zinc-900 bg-gradient-to-r from-red-300 via-yellow-300 to-lime-400 dark:border-zinc-500 dark:from-red-800 dark:via-amber-600 dark:to-lime-600">
        <div
          className={`absolute -top-[3px] h-[18px] w-2 border-2 border-zinc-900 ${style.bar} transition-all duration-500 dark:border-zinc-300`}
          style={{ left: `calc(${posPercent}% - 4px)` }}
        />
        <div
          className="absolute -top-[2px] h-4 w-0.5 bg-zinc-900/70 dark:bg-zinc-300/70"
          style={{ left: `${thresholdPercent}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
        <span>-6 dB</span>
        <span>+3 dB</span>
        <span>+12 dB</span>
      </div>
    </div>
  );
}
