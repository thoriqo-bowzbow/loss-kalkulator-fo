import { Download, History, Trash2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import type { Topology } from '../lib/types';
import { useToast } from './ui/Toast';
import { Button, Card } from './ui/primitives';

export interface HistoryEntry {
  id: string;
  savedAt: number;
  topology: Topology;
  verdict: 'ok' | 'marginal' | 'fail';
  powerReceived: number;
}

const VERDICT_DOT: Record<HistoryEntry['verdict'], string> = {
  ok: 'bg-emerald-500',
  marginal: 'bg-amber-500',
  fail: 'bg-red-500',
};

interface Props {
  entries: HistoryEntry[];
  onLoad: (topology: Topology) => void;
  onDelete: (id: string) => void;
}

export function HistoryList({ entries, onLoad, onDelete }: Props) {
  const { t } = useI18n();
  const { toast } = useToast();

  if (entries.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-8 text-center text-sm font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        <History className="h-6 w-6" />
        {t('history.empty')}
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {[...entries]
        .sort((a, b) => b.savedAt - a.savedAt)
        .map((entry) => (
          <Card key={entry.id} className="flex animate-fade-up items-center gap-3 p-3">
            <span className={`h-3 w-3 shrink-0 border-2 border-zinc-900 dark:border-zinc-500 ${VERDICT_DOT[entry.verdict]}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black uppercase tracking-wide">
                {entry.topology.segments.map((s) => s.name || '…').join(' → ') || '—'}
              </div>
              <div className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
                {new Date(entry.savedAt).toLocaleString()} · {entry.powerReceived.toFixed(2)} dBm
              </div>
            </div>
            <Button variant="ghost" title={t('history.load')} aria-label={t('history.load')} onClick={() => onLoad(entry.topology)}>
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="danger"
              title={t('history.delete')}
              aria-label={t('history.delete')}
              onClick={() => {
                onDelete(entry.id);
                toast(t('history.deleted'), 'info');
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
    </div>
  );
}
