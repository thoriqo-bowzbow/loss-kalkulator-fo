import { ChevronDown, ChevronUp, Network, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import type { Segment, Splitter } from '../lib/types';
import { Button, Card, DecimalInput, Label, SectionTitle, Select, TextInput } from './ui/primitives';

interface SegmentCardProps {
  segment: Segment;
  index: number;
  total: number;
  segments: Segment[];
  splitters: Splitter[];
  invalidDistance: boolean;
  onChange: (patch: Partial<Segment>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}

export function SegmentCard({
  segment,
  index,
  total,
  segments,
  splitters,
  invalidDistance,
  onChange,
  onRemove,
  onMove,
}: SegmentCardProps) {
  const { t } = useI18n();
  const candidateParents = segments.filter((s) => s.id !== segment.id);

  return (
    <Card className="animate-fade-up p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-none border-2 border-zinc-900 bg-yellow-300 text-xs font-black text-zinc-900 dark:border-zinc-500 dark:bg-yellow-400">
            {index + 1}
          </span>
          <TextInput
            value={segment.name}
            placeholder={index === 0 ? 'FEEDER' : index === segments.length - 1 ? 'ONT' : 'ODP'}
            onChange={(e) => onChange({ name: e.target.value })}
            className="font-black uppercase"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            title={t('topo.moveUp')}
            aria-label={t('topo.moveUp')}
            className="px-1.5"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            title={t('topo.moveDown')}
            aria-label={t('topo.moveDown')}
            className="px-1.5"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="danger" onClick={onRemove} title={t('topo.remove')} aria-label={t('topo.remove')}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {index > 0 && (
          <div>
            <Label>{t('segment.from')}</Label>
            <Select
              value={segment.parentId ?? segments[index - 1]?.id ?? ''}
              onChange={(e) => onChange({ parentId: e.target.value })}
            >
              {candidateParents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || `#${segments.indexOf(s) + 1}`}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div>
          <Label>{t('segment.distance')}</Label>
          <DecimalInput
            value={segment.distanceKm}
            onValue={(v) => onChange({ distanceKm: v })}
            invalid={invalidDistance || segment.distanceKm < 0}
            step="0.1"
          />
        </div>
        <div>
          <Label>{t('segment.splice')}</Label>
          <DecimalInput value={segment.spliceCount} onValue={(v) => onChange({ spliceCount: v })} step="1" />
        </div>
        <div>
          <Label>{t('segment.connector')}</Label>
          <DecimalInput value={segment.connectorCount} onValue={(v) => onChange({ connectorCount: v })} step="1" />
        </div>
        <div>
          <Label>{t('segment.splitter')}</Label>
          <Select value={segment.splitterId ?? 'none'} onChange={(e) => onChange({ splitterId: e.target.value === 'none' ? null : e.target.value })}>
            {splitters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id === 'none' ? t('segment.splitterNone') : s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </Card>
  );
}

interface TopologyBuilderProps {
  segments: Segment[];
  splitters: Splitter[];
  onChange: (segments: Segment[]) => void;
}

let nextId = 1;
const newSegment = (parentId: string | null): Segment => ({
  id: `seg-${Date.now()}-${nextId++}`,
  name: '',
  distanceKm: 0,
  spliceCount: 0,
  connectorCount: 0,
  splitterId: 'none',
  parentId,
});

export function TopologyBuilder({ segments, splitters, onChange }: TopologyBuilderProps) {
  const { t } = useI18n();

  const addSegment = () =>
    onChange([...segments, newSegment(segments.length > 0 ? segments[segments.length - 1].id : null)]);

  /** Rejects a parent choice that would create a cycle (candidate is a descendant). */
  const isSafeParent = (segmentId: string, candidateId: string): boolean => {
    let current: Segment | undefined = segments.find((s) => s.id === candidateId);
    const seen = new Set<string>([segmentId]);
    while (current) {
      const node = current;
      if (seen.has(node.id)) return false;
      seen.add(node.id);
      const idx = segments.indexOf(node);
      current = node.parentId != null ? segments.find((s) => s.id === node.parentId) : (segments[idx - 1] ?? undefined);
    }
    return true;
  };

  const updateSegment = (id: string, patch: Partial<Segment>) =>
    onChange(segments.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const patchSegment = (id: string, patch: Partial<Segment>) => {
    if (patch.parentId != null && !isSafeParent(id, patch.parentId)) return;
    updateSegment(id, patch);
  };

  /** Reorders the list only — parent links (and the tree) stay untouched. */
  const moveSegment = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= segments.length) return;
    const next = [...segments];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const removeSegment = (id: string) => {
    const removed = segments.find((s) => s.id === id);
    if (!removed) return;
    const removedIdx = segments.indexOf(removed);
    // Children of the removed segment are re-attached to its own parent.
    const grandparentId = removed.parentId ?? (removedIdx > 0 ? segments[removedIdx - 1].id : null);
    onChange(
      segments
        .filter((s) => s.id !== id)
        .map((s) => (s.parentId === id ? { ...s, parentId: grandparentId } : s)),
    );
  };

  return (
    <div className="space-y-3">
      <SectionTitle icon={<Network className="h-4 w-4" />}>
        {t('topo.title')} ({segments.length})
      </SectionTitle>
      <p className="-mt-1 mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('topo.hint')}</p>

      {segments.map((segment, i) => (
        <SegmentCard
          key={segment.id}
          segment={segment}
          index={i}
          total={segments.length}
          segments={segments}
          splitters={splitters}
          invalidDistance={false}
          onChange={(patch) => patchSegment(segment.id, patch)}
          onRemove={() => removeSegment(segment.id)}
          onMove={(direction) => moveSegment(i, direction)}
        />
      ))}

      <Button variant="secondary" className="w-full py-2.5" onClick={addSegment}>
        <Plus className="h-4 w-4" /> {t('topo.add')}
      </Button>
    </div>
  );
}
