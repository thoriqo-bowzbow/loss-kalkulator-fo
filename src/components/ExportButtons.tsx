import { useRef } from 'react';
import { ClipboardCopy, FileDown, ImageDown, Link2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useToast } from './ui/Toast';
import { buildShareUrl } from '../lib/share';
import type { CalcResult, Topology } from '../lib/types';
import { Button } from './ui/primitives';

interface Props {
  topology: Topology;
  result: CalcResult;
  panelRef: React.RefObject<HTMLDivElement | null>;
}

export function ExportButtons({ topology, result, panelRef }: Props) {
  const { t } = useI18n();
  const { toast } = useToast();
  const busy = useRef(false);

  const buildSummaryText = () => {
    const lines = [
      '== Link Budget Report ==',
      `TX: ${result.txPower.toFixed(2)} dBm | RX sens: ${result.rxSensitivity.toFixed(2)} dBm`,
      `${result.wavelength} nm | ${result.fiberType.label}`,
      '',
      ...result.paths.map((p) => {
        const chain = ['OLT', ...p.segments.map((s) => s.name || `SEG`)].join(' → ');
        return `${chain}: -${p.totalLoss.toFixed(2)} dB → ${p.powerReceived.toFixed(2)} dBm${p.isWeakest ? ' [weakest]' : ''}`;
      }),
      ...result.taps.map((t) => `TAP ${t.splitterLabel} @ ${t.segmentName}: ${t.power.toFixed(2)} dBm`),
      '',
      `Weakest    : ${result.powerReceived.toFixed(2)} dBm`,
      `Margin     : ${result.margin >= 0 ? '+' : ''}${result.margin.toFixed(2)} dB (${t(`verdict.${result.verdict}`)})`,
    ];
    return lines.join('\n');
  };

  const copyText = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(message, 'success');
    } catch {
      toast(t('export.copied'), 'error');
    }
  };

  const capture = async (): Promise<HTMLCanvasElement | null> => {
    if (!panelRef.current || busy.current) return null;
    busy.current = true;
    try {
      const { toCanvas } = await import('html-to-image');
      return await toCanvas(panelRef.current, { pixelRatio: Math.min(window.devicePixelRatio || 1, 2) });
    } catch (err) {
      console.error('Report capture failed:', err);
      toast(t('export.failed'), 'error');
      return null;
    } finally {
      busy.current = false;
    }
  };

  /** Triggers a real browser download into the user's local storage. */
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const savePng = async () => {
    const canvas = await capture();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return void toast(t('export.failed'), 'error');
      downloadBlob(blob, `link-budget-${new Date().toISOString().slice(0, 10)}.png`);
      toast(t('export.savedPng'), 'success');
    }, 'image/png');
  };

  const savePdf = async () => {
    const canvas = await capture();
    if (!canvas) return;
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height / canvas.width) * imgW;

    pdf.setFontSize(14);
    pdf.text('Link Budget Report', margin, margin + 2);
    pdf.setFontSize(9);
    pdf.setTextColor(110);
    pdf.text(new Date().toLocaleString(), margin, margin + 8);
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin + 13, imgW, Math.min(imgH, pageH - margin * 2 - 14));
    pdf.save(`link-budget-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast(t('export.savedPdf'), 'success');
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Button variant="secondary" onClick={() => copyText(buildSummaryText(), t('export.copied'))}>
        <ClipboardCopy className="h-4 w-4" /> {t('export.copy')}
      </Button>
      <Button variant="secondary" onClick={() => copyText(buildShareUrl(topology), t('export.shareCopied'))}>
        <Link2 className="h-4 w-4" /> {t('export.share')}
      </Button>
      <Button variant="secondary" onClick={savePng}>
        <ImageDown className="h-4 w-4" /> {t('export.png')}
      </Button>
      <Button variant="secondary" onClick={savePdf}>
        <FileDown className="h-4 w-4" /> {t('export.pdf')}
      </Button>
    </div>
  );
}
