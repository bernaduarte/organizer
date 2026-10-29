import { useLiveQuery } from 'dexie-react-hooks';
import type { RoutineConfig } from '@/config/schema';
import { db, type DayLog } from '@/shared/db/db';
import type { ISODate } from '@/shared/lib/dates';
import { buildDayTasks, type DayTask } from './tasks';

/**
 * Leitura/escrita do checklist diário (tabela dayLogs).
 * Outras features usam markTaskDone para marcar a tarefa ao concluir
 * (ex.: terminar o treino marca "workout" no dia).
 */

const emptyLog = (date: ISODate): DayLog => ({ date, done: {}, minimum: false, recovery: false });

/** Tarefas físicas que são dispensadas num Dia de Recuperação */
export function isPhysicalTask(task: Pick<DayTask, 'type'>): boolean {
  return task.type === 'workout' || task.type === 'run';
}

/** Hook reativo: re-renderiza quando o registro do dia muda */
export function useDayLog(date: ISODate): DayLog {
  return useLiveQuery(() => db.dayLogs.get(date), [date]) ?? emptyLog(date);
}

async function updateDayLog(date: ISODate, change: (log: DayLog) => void) {
  await db.transaction('rw', db.dayLogs, async () => {
    const log = (await db.dayLogs.get(date)) ?? emptyLog(date);
    change(log);
    await db.dayLogs.put(log);
  });
}

export function markTaskDone(date: ISODate, taskId: string, done = true) {
  return updateDayLog(date, (log) => {
    log.done[taskId] = done;
  });
}

export function setMinimum(date: ISODate, minimum: boolean) {
  return updateDayLog(date, (log) => {
    log.minimum = minimum;
  });
}

export function setRecovery(date: ISODate, recovery: boolean) {
  return updateDayLog(date, (log) => {
    log.recovery = recovery;
  });
}

/**
 * Status do dia:
 * - done: todas as tarefas que contam foram feitas
 * - recovery: dia de recuperação ativo e demais tarefas (ex.: leitura) concluídas
 * - minimum: marcou "versão mínima" (também conta para a sequência)
 * - partial: fez algumas
 * - missed: não fez nenhuma
 * - neutral: o dia não tinha tarefas que contam
 */
export type DayStatus = 'done' | 'recovery' | 'minimum' | 'partial' | 'missed' | 'neutral';

export function dayStatus(config: RoutineConfig, date: ISODate, log: DayLog | undefined): DayStatus {
  if (log?.recovery) return 'recovery';
  const allCounting = buildDayTasks(config, date).filter((t) => t.countsForStreak);
  if (allCounting.length === 0) return 'neutral';

  const doneCount = allCounting.filter((t) => log?.done[t.id]).length;

  if (doneCount === allCounting.length) return 'done';
  if (log?.minimum) return 'minimum';
  return doneCount > 0 ? 'partial' : 'missed';
}

/** O dia conta para a sequência? */
export const isDayComplete = (s: DayStatus) => s === 'done' || s === 'minimum' || s === 'recovery';
