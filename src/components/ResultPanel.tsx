import { forwardRef, useState } from 'react';
import { Gauge, Lightbulb, ListTree, Network, Split } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { biggestContributor } from '../lib/calculator';
import type { CalcResult, PathResult, Segment, SegmentResult, Topology } from '../lib/types';
import { Badge, Card, SectionTitle } from './ui/primitives';
import { MarginGauge, VERDICT_STYLES } from './MarginGauge';

const fmt = (v: number, unit: string) => `${v.toFixed(2)} ${unit}`;

interface TreeNodeData {
  segment: Segment;
  result: SegmentResult;
  children: TreeNodeData[];
}

/** Builds the branch tree from topology parent links (legacy segments chain linearly). */
function buildTree(topology: Topology, results: SegmentResult[]): TreeNodeData[] {
  const resultById = new Map(results.map((r) => [r.segmentId, r]));
  const indexById = new Map(topology.segments.map((s, idx) => [s.id, idx]));
  const nodeById = new Map(topology.segments.map((s) => [s.id, s]));

  const nodes = new Map<string, TreeNodeData>();
  topology.segments.forEach((segment) => {
    nodes.set(segment.id, {
      segment,
      result: resultById.get(segment.id)!,
      children: [],
    });
  });

  // Resolve intended parent for every node; segments in a parent cycle become roots.
  const cyclic = new Set<string>();
  topology.segments.forEach((segment) => {
    const seen = new Set<string>([segment.id]);
    let current = segment;
    for (;;) {
      let parent: Segment | undefined;
      if (current.parentId != null) parent = nodeById.get(current.parentId);
      else {
        const idx = indexById.get(current.id) ?? 0;
        parent = idx > 0 ? topology.segments[idx - 1] : undefined;
      }
      if (!parent) break;
      if (seen.has(parent.id)) {
        cyclic.add(segment.id);
        break;
      }
      seen.add(parent.id);
      current = parent;
    }
  });

  const roots: TreeNodeData[] = [];
  topology.segments.forEach((segment, idx) => {
    if (cyclic.has(segment.id)) {
      roots.push(nodes.get(segment.id)!);
      return;
    }
    const node = nodes.get(segment.id)!;
    let parent: TreeNodeData | undefined;
    if (segment.parentId != null) parent = nodes.get(segment.parentId);
    else if (idx > 0) parent = nodes.get(topology.segments[idx - 1].id);
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  });

  return roots;
}

function NodeBox({
  name,
  power,
  splitterLabel,
  variant = 'segment',
  active = false,
  onClick,
}: {
  name: string;
  power: string;
  splitterLabel?: string;
  variant?: 'olt' | 'segment';
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center gap-2 rounded-none border-2 px-2 py-1 text-left transition-colors ${
        active
          ? 'border-red-600 bg-red-100 dark:border-red-400 dark:bg-red-950/60'
          : variant === 'olt'
            ? 'border-zinc-900 bg-cyan-200 dark:border-zinc-400 dark:bg-zinc-700'
            : 'border-zinc-900 bg-yellow-100 dark:border-zinc-500 dark:bg-zinc-900'
      } ${onClick ? 'cursor-pointer hover:border-red-500' : 'cursor-default'}`}
    >
      <span className="text-[10px] font-black uppercase tracking-wide">{name}</span>
      <span className="font-mono text-xs font-black tabular-nums">{power}</span>
      {splitterLabel && (
        <span className="text-[9px] font-bold uppercase text-cyan-700 dark:text-cyan-400">{splitterLabel}</span>
      )}
    </button>
  );
}

function TreeNodeView({
  node,
  selectedId,
  onSelect,
}: {
  node: TreeNodeData;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <NodeBox
        name={node.segment.name || '…'}
        power={fmt(node.result.powerAtEnd, t('common.dbm'))}
        splitterLabel={node.result.splitter && node.result.splitter.id !== 'none' ? node.result.splitter.label : undefined}
        active={node.segment.id === selectedId}
        onClick={() => onSelect(node.segment.id)}
      />
      {node.children.length > 0 && (
        <div className="ml-5 mt-2 space-y-2 border-l-2 border-zinc-900 pl-5 dark:border-zinc-500">
          {node.children.map((child) => (
            <div key={child.segment.id} className="relative">
              <span className="absolute -left-5 top-3.5 h-0.5 w-5 bg-zinc-900 dark:bg-zinc-500" />
              <TreeNodeView node={child} selectedId={selectedId} onSelect={onSelect} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PathCard({ path, weakestLabel }: { path: PathResult; weakestLabel: string }) {
  const { t } = useI18n();
  const power = path.powerReceived;
  const powerColor =
    power > -10
      ? 'text-emerald-600 dark:text-emerald-400'
      : power > -24
        ? 'text-cyan-600 dark:text-cyan-400'
        : power > -27
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-red-600 dark:text-red-400';

  const chain = [t('result.olt'), ...path.segments.map((s) => s.name || '…')].join(' → ');

  return (
    <Card className="animate-pop-in p-2">
      <div className="-mx-2 -mt-2 mb-2 flex items-center justify-between gap-2 border-b-2 border-zinc-900 px-2 py-1.5 dark:border-zinc-600">
        <div className="min-w-0">
          <span className="text-xs font-black uppercase tracking-widest">{path.label}</span>
          <div className="truncate text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">{chain}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {path.isWeakest && (
            <Badge className="border-red-600 bg-red-600 text-white dark:border-red-500 dark:bg-red-500">
              {weakestLabel}
            </Badge>
          )}
          <Badge className="border-zinc-900 bg-zinc-900 text-white dark:border-zinc-400 dark:bg-zinc-700 dark:text-zinc-100">
            {t('result.totalLoss')} {fmt(path.totalLoss, t('common.db'))}
          </Badge>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{t('result.received')}</span>
        <span className={`font-mono text-2xl font-black tabular-nums ${powerColor}`}>{fmt(power, t('common.dbm'))}</span>
      </div>
    </Card>
  );
}

interface Props {
  topology: Topology;
  result: CalcResult | null;
}

export const ResultPanel = forwardRef<HTMLDivElement, Props>(function ResultPanel({ topology, result }, ref) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string | 'total'>('total');

  if (!result || result.segments.length === 0) {
    return (
      <Card ref={ref} className="p-6 text-center text-sm font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {t('result.empty')}
      </Card>
    );
  }

  const totals = result.segments.reduce(
    (acc, s) => {
      acc.cable += s.cableLoss;
      acc.splice += s.spliceLoss;
      acc.connector += s.connectorLoss;
      acc.splitter += s.splitterLoss ?? 0;
      return acc;
    },
    { cable: 0, splice: 0, connector: 0, splitter: 0 },
  );

  const treeRoots = buildTree(topology, result.segments);
  const selected = selectedId !== 'total' ? (result.segments.find((s) => s.segmentId === selectedId) ?? null) : null;

  const style = VERDICT_STYLES[result.verdict];
  const contributor = biggestContributor(result);
  const recommendation =
    result.verdict === 'ok'
      ? t('result.rec.ok')
      : result.verdict === 'marginal'
        ? t('result.rec.marginal')
        : contributor === 'cable'
          ? t('result.rec.fail.cable')
          : contributor === 'splice'
            ? t('result.rec.fail.splice')
            : contributor === 'connector'
              ? t('result.rec.fail.connector')
              : contributor === 'splitter'
                ? t('result.rec.fail.splitter')
                : t('result.rec.fail');

  const breakdownRows = [
    { label: t('result.cable'), value: totals.cable },
    { label: t('result.splice'), value: totals.splice },
    { label: t('result.connector'), value: totals.connector },
    { label: t('result.splitter'), value: totals.splitter },
  ];

  return (
    <div ref={ref} className="space-y-3">
      <Card className="overflow-hidden">
        <div className="border-b-2 border-zinc-900 p-3 dark:border-zinc-600">
          <SectionTitle icon={<ListTree className="h-4 w-4" />}>{t('result.title')}</SectionTitle>

          {/* Scope tabs: aggregate total, or one specific segment */}
          <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedId('total')}
              className={`shrink-0 border-2 px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
                selectedId === 'total'
                  ? 'border-zinc-900 bg-cyan-400 text-zinc-900 dark:border-zinc-400'
                  : 'border-zinc-300 bg-transparent text-zinc-500 hover:border-zinc-900 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-300'
              }`}
            >
              {t('result.tabTotal')}
            </button>
            {result.segments.map((s, i) => (
              <button
                key={s.segmentId}
                type="button"
                onClick={() => setSelectedId(s.segmentId)}
                className={`shrink-0 border-2 px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
                  selectedId === s.segmentId
                    ? 'border-red-600 bg-red-500 text-white dark:border-red-400 dark:bg-red-500'
                    : 'border-zinc-300 bg-transparent text-zinc-500 hover:border-zinc-900 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-300'
                }`}
              >
                {s.name || `#${i + 1}`}
              </button>
            ))}
          </div>

          <div className="space-y-1 font-mono text-xs tabular-nums">
            {selected ? (
              <>
                {(
                  [
                    { label: t('result.cable'), value: selected.cableLoss },
                    { label: t('result.splice'), value: selected.spliceLoss },
                    { label: t('result.connector'), value: selected.connectorLoss },
                    { label: t('result.splitter'), value: selected.splitterLoss ?? 0 },
                  ] as const
                ).map((row) => (
                  <div key={row.label} className="flex justify-between border-b-2 border-dashed border-zinc-300 py-0.5 dark:border-zinc-700">
                    <span className="font-sans font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{row.label}</span>
                    <span className="font-bold text-red-600 dark:text-red-400">-{fmt(row.value, t('common.db'))}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2">
                  <span className="font-sans font-black uppercase tracking-wide">{t('result.segLoss')}</span>
                  <span className="font-black text-red-600 dark:text-red-400">-{fmt(selected.totalLoss, t('common.db'))}</span>
                </div>
                <div className="flex justify-between border-t-2 border-dashed border-zinc-300 pt-1 dark:border-zinc-700">
                  <span className="font-sans font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{t('result.cumLoss')}</span>
                  <span className="font-bold text-red-600 dark:text-red-400">-{fmt(selected.cumulativeLoss, t('common.db'))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{t('result.powerOut')}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(selected.powerAtEnd, t('common.dbm'))}</span>
                </div>
              </>
            ) : (
              <>
                {breakdownRows.map((row) => (
                  <div key={row.label} className="flex justify-between border-b-2 border-dashed border-zinc-300 py-0.5 dark:border-zinc-700">
                    <span className="font-sans font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{row.label}</span>
                    <span className="font-bold text-red-600 dark:text-red-400">-{fmt(row.value, t('common.db'))}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2">
                  <span className="font-sans font-black uppercase tracking-wide">{t('result.totalLoss')}</span>
                  <span className="font-black text-red-600 dark:text-red-400">-{fmt(result.totalLoss, t('common.db'))}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Branch tree with per-node power */}
        <div className="p-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            <Network className="h-3 w-3" /> {t('result.perSegment')}
          </h4>
          <div className="overflow-x-auto pb-1">
            <div className="inline-block min-w-full">
              <NodeBox name={t('result.olt')} power={fmt(result.txPower, t('common.dbm'))} variant="olt" />
              {treeRoots.map((root) => (
                <div key={root.segment.id} className="relative ml-5 mt-2 border-l-2 border-zinc-900 pl-5 dark:border-zinc-500">
                  <span className="absolute -left-2 top-3.5 h-0.5 w-2 bg-zinc-900 dark:bg-zinc-500" />
                  <TreeNodeView
                    node={root}
                    selectedId={selectedId === 'total' ? '' : selectedId}
                    onSelect={setSelectedId}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {result.paths.map((path) => (
        <PathCard key={path.label + path.totalLoss} path={path} weakestLabel={t('result.weakest')} />
      ))}

      {result.taps.length > 0 && (
        <Card className="p-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest">
            <Split className="h-3.5 w-3.5" /> {t('result.taps')}
          </div>
          <div className="space-y-1 font-mono text-xs tabular-nums">
            {result.taps.map((tap, i) => (
              <div key={i} className="flex justify-between border-b-2 border-dashed border-zinc-200 py-0.5 last:border-b-0 dark:border-zinc-800">
                <span className="font-sans font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                  {tap.splitterLabel} @ {tap.segmentName}
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{fmt(tap.power, t('common.dbm'))}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className={`p-2 ${style.bg}`}>
        <SectionTitle icon={<Gauge className="h-4 w-4" />}>{t('result.margin')}</SectionTitle>
        <div className="mb-2 flex items-end justify-between">
          <span className={`font-mono text-3xl font-black tabular-nums ${style.text}`}>
            {result.margin >= 0 ? '+' : ''}
            {fmt(result.margin, t('common.db'))}
          </span>
          <Badge className={`px-3 py-1 text-xs ${style.border} ${style.text}`}>{t(`verdict.${result.verdict}`)}</Badge>
        </div>
        <MarginGauge margin={result.margin} verdict={result.verdict} />
        <div className="mt-2 flex items-start gap-2 border-2 border-zinc-900 bg-white p-2 text-xs font-semibold text-zinc-700 dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-200">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>
            <strong className="mr-1 font-black uppercase">{t('result.recommendation')}:</strong>
            {recommendation}
          </span>
        </div>
      </Card>
    </div>
  );
});
