import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, HeartPulse } from 'lucide-react';
import { useConfig } from '@/config/useConfig';
import { dayStatus, STATUS_COLORS } from '@/features/today';
import { db } from '@/shared/db/db';
import { addDays, fmt, weekStart } from '@/shared/lib/dates';
import { useToday } from '@/shared/lib/useToday';
import { Button, Card, cn } from '@/shared/ui';

const WEEK_HEADER = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/** Calendário mensal com a cor de cada dia conforme o status */
export function CalendarCard() {
  const { config } = useConfig();
  const today = useToday();
  const [monthOffset, setMonthOffset] = useState(0);

  const monthDate = addMonths(parseISO(today), monthOffset);
  const first = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const last = format(endOfMonth(monthDate), 'yyyy-MM-dd');
  const logs = useLiveQuery(() => db.dayLogs.where('date').between(first, last, true, true).toArray(), [first]) ?? [];
  // Antes do primeiro registro não pintamos de vermelho
  const firstLog = useLiveQuery(() => db.dayLogs.orderBy('date').first(), [])?.date;

  // Grade começando na segunda-feira da semana do dia 1
  const cells: string[] = [];
  for (let d = weekStart(first); d <= last || cells.length % 7 !== 0; d = addDays(d, 1)) cells.push(d);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" aria-label="Mês anterior" onClick={() => setMonthOffset(monthOffset - 1)}>
          <ChevronLeft size={18} />
        </Button>
        <h2 className="font-semibold first-letter:uppercase">{fmt(first, 'MMMM yyyy')}</h2>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Próximo mês"
          disabled={monthOffset >= 0}
          onClick={() => setMonthOffset(monthOffset + 1)}
        >
          <ChevronRight size={18} />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEK_HEADER.map((d, i) => (
          <div key={i} className="py-1 font-medium text-slate-500">
            {d}
          </div>
        ))}
        {cells.map((d) => {
          const inMonth = d >= first && d <= last;
          const tracked = !!firstLog && d >= firstLog && d <= today;
          const status = dayStatus(config, d, logs.find((l) => l.date === d));
          const isRecovery = tracked && status === 'recovery';
          return (
            <div
              key={d}
              className={cn(
                'flex aspect-square flex-col items-center justify-center rounded-lg leading-none',
                !inMonth && 'opacity-0',
                tracked ? STATUS_COLORS[status] : 'bg-slate-100 text-slate-400 dark:bg-slate-900',
                d === today && 'ring-2 ring-emerald-600',
              )}
            >
              <span>{fmt(d, 'd')}</span>
              {isRecovery && <HeartPulse size={10} className="mt-0.5" aria-label="Dia de recuperação" />}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
        <Legend className={STATUS_COLORS.done} label="Cumprido" />
        <Legend className={STATUS_COLORS.recovery} label="Recuperação" icon={<HeartPulse size={9} />} />
        <Legend className={STATUS_COLORS.minimum} label="Mínimo" />
        <Legend className={STATUS_COLORS.partial} label="Parcial" />
        <Legend className={STATUS_COLORS.missed} label="Não feito" />
      </div>
    </Card>
  );
}

function Legend({ className, label, icon }: { className: string; label: string; icon?: ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn('inline-flex h-3.5 w-3.5 items-center justify-center rounded', className)}>{icon}</span>{' '}
      {label}
    </span>
  );
}
