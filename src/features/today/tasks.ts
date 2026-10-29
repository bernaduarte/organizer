import type { Period, RoutineConfig, TaskType } from '@/config/schema';
import { dayKeyOf, type ISODate } from '@/shared/lib/dates';
import { planForDate, readingGoalFor, runPlanFor } from '@/shared/lib/dayPlan';
import { workoutForDate } from '@/shared/lib/rotation';

/**
 * Monta a lista de tarefas de um dia (o checklist da tela Hoje)
 * juntando a agenda fixa (aulas) e o plano semanal da config.
 */

export interface DayTask {
  /** Chave usada em DayLog.done. Tarefas do plano usam o tipo ("workout", "run"...). */
  id: string;
  kind: 'schedule' | 'plan';
  type: TaskType | string;
  title: string;
  description?: string;
  minimumDescription?: string; // o que conta como "versão mínima"
  period?: Period;
  time?: string; // "07:00–13:00" para itens da agenda
  link?: string; // tela relacionada
  /** Se conta para saber se o dia foi cumprido (aulas e descanso não contam) */
  countsForStreak: boolean;
}

export function buildDayTasks(config: RoutineConfig, date: ISODate): DayTask[] {
  const day = dayKeyOf(date);
  const tasks: DayTask[] = [];

  // 1) Agenda fixa (aulas etc.)
  config.schedule
    .filter((s) => s.day === day)
    .sort((a, b) => a.start.localeCompare(b.start))
    .forEach((s) => {
      tasks.push({
        id: `schedule-${s.start}-${s.title}`,
        kind: 'schedule',
        type: s.type,
        title: s.title,
        time: `${s.start}–${s.end}`,
        countsForStreak: false,
      });
    });

  // 2) Plano semanal. Se o mesmo tipo aparecer 2x no dia, o id ganha sufixo.
  const seen: Record<string, number> = {};
  const { minimumVersion } = config;
  for (const t of planForDate(config, date)) {
    const n = seen[t.type] ?? 0;
    seen[t.type] = n + 1;
    const id = n === 0 ? t.type : `${t.type}-${n}`;
    const base = { id, kind: 'plan' as const, type: t.type, period: t.period };

    switch (t.type) {
      case 'workout': {
        const w = workoutForDate(config, date);
        const count = w ? (config.workouts[w]?.length ?? 0) : 0;
        tasks.push({
          ...base,
          title: w ? `Treino ${w}` : 'Treino',
          description: w ? `${count} exercícios` : 'Fora da rotação',
          minimumDescription: `${minimumVersion.setsPerExercise} série por exercício`,
          link: '/treino',
          countsForStreak: true,
        });
        break;
      }
      case 'run': {
        const plan = runPlanFor(config, date);
        tasks.push({
          ...base,
          title: plan.variantLabel ? `Corrida · ${plan.variantLabel}` : 'Corridinha',
          description: `${plan.totalMinutes} min`,
          minimumDescription: `${minimumVersion.runMinutes} min`,
          countsForStreak: true,
        });
        break;
      }
      case 'reading':
        tasks.push({
          ...base,
          title: 'Leitura',
          description: `${readingGoalFor(config, date)} páginas`,
          minimumDescription: `${minimumVersion.pages} páginas`,
          link: '/leitura',
          countsForStreak: true,
        });
        break;
      case 'rest':
        tasks.push({ ...base, title: 'Descanso', description: 'Dia livre de treino', countsForStreak: false });
        break;
      case 'weeklyPlanning':
        tasks.push({ ...base, title: 'Planejar a semana', countsForStreak: true });
        break;
      default:
        tasks.push({ ...base, title: t.title ?? 'Tarefa', countsForStreak: true });
    }
  }

  // 3) Lembrete diário fixo e opcional de alongamento
  tasks.push({
    id: 'daily-hip-flexor-stretch',
    kind: 'plan',
    type: 'stretch',
    title: 'Alongar flexor do quadril (30s cada lado)',
    description: 'Lembrete diário · opcional',
    countsForStreak: false,
  });

  return tasks;
}
