import { useMemo, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { getHolidaysInMonth } from '@/lib/holidays';
import { Button } from '@/components/ui/button';

/**
 * Aviso fixo informando os feriados nacionais do mês atual que serão
 * descontados do prazo de produção. Mostra apenas feriados que caem em
 * dia útil (seg–sex) — feriado em fim de semana não afeta o cálculo.
 */
const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const HolidayNoticeBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  const data = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const list = getHolidaysInMonth(year, month).filter(h => h.dow !== 0 && h.dow !== 6);
    return { list, monthName: MONTH_NAMES[month - 1] };
  }, []);

  if (dismissed || data.list.length === 0) return null;

  return (
    <div className="mb-3 flex items-start gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
      <CalendarDays className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 leading-snug">
        <span className="font-medium text-foreground">
          Feriados de {data.monthName} descontados do prazo:
        </span>{' '}
        <span className="text-muted-foreground">
          {data.list.map((h, i) => {
            const dd = String(h.date.getDate()).padStart(2, '0');
            const mm = String(h.date.getMonth() + 1).padStart(2, '0');
            return (
              <span key={h.iso}>
                {i > 0 && ', '}
                {dd}/{mm} ({h.name})
              </span>
            );
          })}
          .
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => setDismissed(true)}
        aria-label="Fechar aviso"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default HolidayNoticeBanner;
