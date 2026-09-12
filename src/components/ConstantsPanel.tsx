import { RotateCcw, Settings2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { DEFAULT_CONSTANTS, WAVELENGTHS } from '../lib/constants';
import type { LossConstants, Wavelength } from '../lib/types';
import { useToast } from './ui/Toast';
import { Button, Card, DecimalInput, Label, SectionTitle } from './ui/primitives';

interface Props {
  constants: LossConstants;
  onChange: (next: LossConstants) => void;
}

export function ConstantsPanel({ constants, onChange }: Props) {
  const { t } = useI18n();
  const { toast } = useToast();

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <SectionTitle icon={<Settings2 className="h-4 w-4" />}>{t('settings.title')}</SectionTitle>
        <p className="-mt-1 mb-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('settings.hint')}</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t('settings.splice')}</Label>
            <DecimalInput
              value={constants.spliceLoss}
              onValue={(v) => onChange({ ...constants, spliceLoss: v })}
              step="0.05"
            />
          </div>
          <div>
            <Label>{t('settings.connector')}</Label>
            <DecimalInput
              value={constants.connectorLoss}
              onValue={(v) => onChange({ ...constants, connectorLoss: v })}
              step="0.05"
            />
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <SectionTitle>{t('settings.fiber')}</SectionTitle>
        <div className="space-y-3">
          {constants.fiberTypes.map((fiber, fiberIdx) => (
            <div key={fiber.id}>
              <Label>{fiber.label}</Label>
              <div className="grid grid-cols-3 gap-2">
                {WAVELENGTHS.map((wl: Wavelength) => (
                  <div key={wl}>
                    <span className="mb-1 block text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{wl} nm</span>
                    <DecimalInput
                      value={fiber.attenuation[wl]}
                      onValue={(v) => {
                        const fiberTypes = constants.fiberTypes.map((f, i) =>
                          i === fiberIdx ? { ...f, attenuation: { ...f.attenuation, [wl]: v } } : f,
                        );
                        onChange({ ...constants, fiberTypes });
                      }}
                      step="0.01"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-3">
        <SectionTitle>{t('settings.splitters')}</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {constants.splitters
            .filter((s) => s.id !== 'none')
            .map((splitter, idx) => {
              const editable = constants.splitters.filter((s) => s.id !== 'none');
              const update = (patch: Partial<typeof splitter>) => {
                const all = constants.splitters.map((s) => {
                  const pos = editable.indexOf(s);
                  return pos >= 0 && pos === idx ? { ...s, ...patch } : s;
                });
                onChange({ ...constants, splitters: all });
              };
              return (
                <div key={splitter.id} className="rounded-none border-2 border-zinc-900 p-2 dark:border-zinc-500">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide">{splitter.label}</span>
                  {splitter.kind === 'uniform' ? (
                    <DecimalInput value={splitter.loss ?? 0} onValue={(v) => update({ loss: v })} step="0.1" />
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('settings.fbtMain')}</span>
                        <DecimalInput value={splitter.loss1 ?? 0} onValue={(v) => update({ loss1: v })} step="0.1" />
                      </div>
                      <div className="flex-1">
                        <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('settings.fbtTap')}</span>
                        <DecimalInput value={splitter.loss2 ?? 0} onValue={(v) => update({ loss2: v })} step="0.1" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </Card>

      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          onChange({ ...DEFAULT_CONSTANTS, fiberTypes: DEFAULT_CONSTANTS.fiberTypes.map((f) => ({ ...f })), splitters: DEFAULT_CONSTANTS.splitters.map((s) => ({ ...s })) });
          toast(t('settings.resetDone'), 'success');
        }}
      >
        <RotateCcw className="h-4 w-4" /> {t('settings.reset')}
      </Button>
    </div>
  );
}
