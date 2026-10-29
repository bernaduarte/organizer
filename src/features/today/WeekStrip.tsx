import { useLiveQuery } from 'dexie-react-hooks';
import { HeartPulse } from 'lucide-react';
import { useConfig } from '@/config/useConfig';
import { db } from '@/shared/db/db';
import { addDays, dayKeyOf, DAY_SHORT, fmt, weekStart } from '@/shared/lib/dates';
import { cn } from '@/shared/ui';
import { dayStatus, type DayStatus } from './dayLog';

export const STATUS_COLORS: Record<DayStatus, string> = {
  done: 'bg-emerald-500 text-white',
  recovery: 'bg-sky-400 text-sky-950 dark:bg-sky-600 dark:text-white',
  minimum: 'bg-emerald-300 text-emerald-950',
  partial: 'bg-amber-300 text-amber-950',
  missed: 'bg-rose-200 text-rose-900 dark:bg-rose-900/60 dark:text-rose-100',
  neutral: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

/** Faixa com os 7 dias da semana coloridos pelo status. Toque para ir ao dia. */
export function WeekStrip({ date, today, onSelect }: { date: string; today: string; onSelect: (d: string) => void }) {
  const { config } = useConfig();
  const start = weekStart(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const logs = useLiveQuery(() => db.dayLogs.where('date').between(days[0], days[6], true, true).toArray(), [start]);
  // Dias antes do primeiro uso do app não aparecem como "não feito"
  const firstLog = useLiveQuery(() => db.dayLogs.orderBy('date').first(), [])?.date ?? today;

  return (
    <div className="mb-4 grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const future = d > today;
        const untracked = d < firstLog;
        const status = dayStatus(config, d, logs?.find((l) => l.date === d));
        return (
          <button
            key={d}
            type="button"
            disabled={future}
            onClick={() => onSelect(d)}
            className={cn(
              'flex flex-col items-center rounded-xl py-1.5 text-xs',
              future || untracked ? 'bg-slate-100 text-slate-400 dark:bg-slate-900' : STATUS_COLORS[status],
              d === date && 'ring-2 ring-emerald-600 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950',
            )}
          >
            <span>{DAY_SHORT[dayKeyOf(d)]}</span>
            <span className="flex items-center gap-0.5 text-sm font-semibold">
              {fmt(d, 'd')}
              {!future && !untracked && status === 'recovery' && <HeartPulse size={11} aria-label="Recuperação" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
