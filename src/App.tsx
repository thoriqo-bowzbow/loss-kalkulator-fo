import { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, History as HistoryIcon, Languages, Moon, Save, Settings, Sun } from 'lucide-react';
import { I18nProvider, useI18n, type Lang } from './i18n/I18nContext';
import { useTheme } from './hooks/useTheme';
import { useLocalStorage } from './hooks/useLocalStorage';
import { calculate } from './lib/calculator';
import { DEFAULT_CONSTANTS } from './lib/constants';
import { readTopologyFromUrl } from './lib/share';
import type { LossConstants, Topology } from './lib/types';
import { PowerInput } from './components/PowerInput';
import { TopologyBuilder } from './components/TopologyBuilder';
import { ResultPanel } from './components/ResultPanel';
import { ExportButtons } from './components/ExportButtons';
import { ConstantsPanel } from './components/ConstantsPanel';
import { HistoryList, type HistoryEntry } from './components/HistoryList';
import { Badge, Button } from './components/ui/primitives';
import { ToastProvider, useToast } from './components/ui/Toast';

type Tab = 'calculator' | 'history' | 'settings';

const DEFAULT_TOPOLOGY: Topology = {
  txPower: 7,
  rxSensitivity: -27,
  opticalClassId: 'custom',
  wavelength: 1310,
  fiberTypeId: 'g652d',
  segments: [
    {
      id: 'seg-1',
      name: 'FEEDER',
      distanceKm: 0,
      spliceCount: 0,
      connectorCount: 0,
      splitterId: 'none',
      parentId: null,
    },
  ],
};

function mergeConstants(stored: Partial<LossConstants> | null): LossConstants {
  if (!stored) return DEFAULT_CONSTANTS;
  return {
    spliceLoss: typeof stored.spliceLoss === 'number' ? stored.spliceLoss : DEFAULT_CONSTANTS.spliceLoss,
    connectorLoss: typeof stored.connectorLoss === 'number' ? stored.connectorLoss : DEFAULT_CONSTANTS.connectorLoss,
    fiberTypes: stored.fiberTypes ?? DEFAULT_CONSTANTS.fiberTypes,
    splitters: stored.splitters ?? DEFAULT_CONSTANTS.splitters,
  };
}

function AppShell() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('calculator');
  const resultRef = useRef<HTMLDivElement>(null);
  const [topology, setTopology] = useLocalStorage<Topology>('lk2.topology', DEFAULT_TOPOLOGY);
  const [storedConstants, setStoredConstants] = useLocalStorage<Partial<LossConstants>>('lk2.constants', {});
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>('lk2.history', []);

  const constants = useMemo(() => mergeConstants(storedConstants), [storedConstants]);

  // Load a shared topology from the URL once on mount.
  useEffect(() => {
    const shared = readTopologyFromUrl();
    if (shared) setTopology(shared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const result = useMemo(() => calculate(topology, constants), [topology, constants]);

  const patchTopology = (patch: Partial<Topology>) => setTopology({ ...topology, ...patch });
  const txInvalid = topology.txPower < -10 || topology.txPower > 30;
  const rxInvalid = topology.rxSensitivity < -60 || topology.rxSensitivity > 0;

  const saveToHistory = () => {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      savedAt: Date.now(),
      topology,
      verdict: result.verdict,
      powerReceived: result.powerReceived,
    };
    setHistory([entry, ...history].slice(0, 30));
    toast(t('history.saved'), 'success');
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'calculator', label: t('tab.calculator'), icon: <Calculator className="h-4 w-4" /> },
    { id: 'history', label: t('tab.history'), icon: <HistoryIcon className="h-4 w-4" /> },
    { id: 'settings', label: t('tab.settings'), icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#f2efe9] text-zinc-900 transition-colors dark:bg-zinc-900 dark:text-zinc-100 lg:h-screen lg:overflow-hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-3 sm:p-4 lg:min-h-0">
        {/* Header */}
        <header className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-none border-2 border-zinc-900 bg-white p-3 shadow-[4px_4px_0_0_#18181b] dark:border-zinc-600 dark:bg-zinc-800 dark:shadow-[4px_4px_0_0_#09090b]">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-black uppercase tracking-tight sm:text-lg">
              <span className="text-cyan-500">📡</span>
              {t('app.title')}
              <Badge className="border-zinc-900 bg-yellow-300 text-zinc-900 dark:border-zinc-500 dark:bg-yellow-400 dark:text-zinc-900">v2.0</Badge>
            </h1>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('app.subtitle')}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              title="Bahasa / Language"
              aria-label="Bahasa / Language"
              onClick={() => setLang((lang === 'id' ? 'en' : 'id') as Lang)}
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs font-black uppercase">{lang}</span>
            </Button>
            <Button variant="ghost" onClick={toggle} aria-label="Theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Tabs */}
        <nav className="mb-3 grid shrink-0 grid-cols-3 gap-1 rounded-none border-2 border-zinc-900 bg-white p-1 shadow-[4px_4px_0_0_#18181b] dark:border-zinc-600 dark:bg-zinc-800 dark:shadow-[4px_4px_0_0_#09090b]">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center justify-center gap-1.5 rounded-none px-2 py-2 text-xs font-black uppercase tracking-wide transition-all sm:text-sm ${
                tab === item.id
                  ? 'border-2 border-zinc-900 bg-cyan-400 text-zinc-900 shadow-[3px_3px_0_0_#18181b] dark:border-zinc-400 dark:shadow-[3px_3px_0_0_#09090b]'
                  : 'border-2 border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {tab === 'calculator' && (
          <main className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
            <div className="min-w-0 space-y-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
              <PowerInput
                topology={topology}
                fiberTypes={constants.fiberTypes}
                onChange={patchTopology}
                txInvalid={txInvalid}
                rxInvalid={rxInvalid}
              />
              <TopologyBuilder
                segments={topology.segments}
                splitters={constants.splitters}
                onChange={(segments) => patchTopology({ segments })}
              />
            </div>
            <div className="min-w-0 space-y-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
              <ResultPanel ref={resultRef} topology={topology} result={result} />
              {result.segments.length > 0 && (
                <>
                  <Button variant="secondary" className="w-full py-2.5" onClick={saveToHistory}>
                    <Save className="h-4 w-4" /> {t('history.save')}
                  </Button>
                  <ExportButtons topology={topology} result={result} panelRef={resultRef} />
                </>
              )}
            </div>
          </main>
        )}

        {tab === 'history' && (
          <main className="mx-auto w-full max-w-2xl lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <HistoryList
              entries={history}
              onLoad={(topo) => {
                setTopology(topo);
                setTab('calculator');
              }}
              onDelete={(id) => setHistory(history.filter((h) => h.id !== id))}
            />
          </main>
        )}

        {tab === 'settings' && (
          <main className="mx-auto w-full max-w-2xl lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <ConstantsPanel constants={constants} onChange={setStoredConstants} />
          </main>
        )}

        <footer className="shrink-0 pt-3 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-600">
          Link Budget Calculator v2 · Dibuat untuk kebutuhan lapangan Teknisi Fiber Optik
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </I18nProvider>
  );
}
