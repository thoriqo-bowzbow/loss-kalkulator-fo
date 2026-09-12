import { Waves, Zap } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { getOpticalClass } from '../lib/calculator';
import { OPTICAL_CLASSES, WAVELENGTHS } from '../lib/constants';
import type { FiberType, Topology, Wavelength } from '../lib/types';
import { Card, DecimalInput, Label, SectionTitle, Select } from './ui/primitives';

interface Props {
  topology: Topology;
  fiberTypes: FiberType[];
  onChange: (patch: Partial<Topology>) => void;
  txInvalid: boolean;
  rxInvalid: boolean;
}

export function PowerInput({ topology, fiberTypes, onChange, txInvalid, rxInvalid }: Props) {
  const { t } = useI18n();
  const activeClass = getOpticalClass(topology.opticalClassId);

  const handleClass = (id: string) => {
    const cls = getOpticalClass(id);
    if (cls.id === 'custom') {
      onChange({ opticalClassId: 'custom' });
      return;
    }
    onChange({ opticalClassId: cls.id, txPower: cls.txPower, rxSensitivity: cls.rxSensitivity });
  };

  return (
    <Card className="space-y-3 p-3">
      <SectionTitle icon={<Zap className="h-4 w-4" />}>{t('power.title')}</SectionTitle>

      <div>
        <Label>{t('power.class')}</Label>
        <Select value={activeClass.id} onChange={(e) => handleClass(e.target.value)}>
          {OPTICAL_CLASSES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id === 'custom' ? t('power.class') + ' — Custom' : c.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t('power.tx')}</Label>
          <DecimalInput value={topology.txPower} onValue={(v) => onChange({ txPower: v, opticalClassId: 'custom' })} invalid={txInvalid} />
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t('power.txHint')}</p>
        </div>
        <div>
          <Label>{t('power.rx')}</Label>
          <DecimalInput
            value={topology.rxSensitivity}
            onValue={(v) => onChange({ rxSensitivity: v, opticalClassId: 'custom' })}
            invalid={rxInvalid}
          />
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t('power.rxHint')}</p>
        </div>
      </div>

      <div className="border-t-2 border-zinc-900 pt-3 dark:border-zinc-100">
        <SectionTitle icon={<Waves className="h-4 w-4" />}>{t('medium.title')}</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t('medium.wavelength')}</Label>
            <Select
              value={topology.wavelength}
              onChange={(e) => onChange({ wavelength: Number(e.target.value) as Wavelength })}
            >
              {WAVELENGTHS.map((wl) => (
                <option key={wl} value={wl}>
                  {wl} nm
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t('medium.fiber')}</Label>
            <Select value={topology.fiberTypeId} onChange={(e) => onChange({ fiberTypeId: e.target.value })}>
              {fiberTypes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>
    </Card>
  );
}
