import { z } from 'zod';

/**
 * Schema Zod da configuração da rotina.
 * Tudo que o app sabe sobre a rotina vem de um objeto que passa por aqui.
 * Os tipos TypeScript são inferidos do schema (z.infer), então basta
 * mexer aqui para o resto do código "enxergar" um campo novo.
 */

// Dias da semana sempre em inglês abreviado (chaves estáveis)
export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const dayKeySchema = z.enum(DAY_KEYS);
export type DayKey = z.infer<typeof dayKeySchema>;

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Use o formato HH:MM');
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD');

/** Compromisso fixo na agenda (ex.: aula) */
export const scheduleItemSchema = z.object({
  day: dayKeySchema,
  title: z.string().min(1),
  start: timeSchema,
  end: timeSchema,
  type: z.string().default('class'),
});

/** Tipos de tarefa que o app entende. "custom" = tarefa livre com título. */
export const TASK_TYPES = ['workout', 'run', 'reading', 'rest', 'weeklyPlanning', 'custom'] as const;
export const PERIODS = ['morning', 'afternoon', 'night'] as const;

/** Tarefa planejada para um dia da semana */
export const planTaskSchema = z.object({
  type: z.enum(TASK_TYPES),
  period: z.enum(PERIODS).optional(),
  title: z.string().optional(), // obrigatório na prática para "custom"
  variant: z.string().optional(), // ex.: "long" no trote
  pagesGoal: z.number().int().positive().optional(), // sobrescreve a meta de leitura do dia
});

/** Item de aquecimento, volta à calma ou bloco de postura */
export const routineItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    sets: z.number().int().positive().optional(),
    reps: z.string().optional(),
    durationSeconds: z.number().int().positive().optional(),
    perSide: z.boolean().optional(),
  })
  .refine((e) => e.reps !== undefined || e.durationSeconds !== undefined, {
    message: 'Informe "reps" ou "durationSeconds"',
  });

/**
 * Aceita também o formato antigo (só o nome, ex.: "Polichinelo"), para que
 * configs salvas no aparelho ou backups de versões anteriores continuem válidos.
 */
const routineListSchema = z.array(
  z.union([
    routineItemSchema,
    z.string().min(1).transform((name) => ({ id: `legacy-${name}`, name })),
  ]),
);

/** Exercício de um treino. Use "reps" OU "durationSeconds". */
export const exerciseSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    equipment: z.string().optional(),
    sets: z.number().int().positive(),
    reps: z.string().optional(), // "12-15", "10", "max"
    durationSeconds: z.string().optional(), // "30-45"
    perSide: z.boolean().optional(),
    notes: z.string().optional(), // dicas de execução
    stopIf: z.string().optional(), // critérios de parada
  })
  .refine((e) => e.reps !== undefined || e.durationSeconds !== undefined, {
    message: 'Informe "reps" ou "durationSeconds"',
  });

export const configSchema = z.object({
  timezone: z.string().default('America/Sao_Paulo'),
  schedule: z.array(scheduleItemSchema),
  weeklyPlan: z.record(dayKeySchema, z.array(planTaskSchema)),
  workoutRotation: z.object({
    workoutDays: z.array(dayKeySchema).min(1),
    // Cada linha é uma semana; cada item, o treino de cada workoutDay
    pattern: z.array(z.array(z.string().min(1))).min(1),
    startDate: isoDateSchema,
  }),
  warmup: routineListSchema,
  cooldown: routineListSchema.default([]),
  postureBlock: routineListSchema.default([]),
  restSeconds: z.array(z.number().int().positive()).min(1),
  workouts: z.record(z.string(), z.array(exerciseSchema)),
  progressionRule: z.object({
    repsThreshold: z.number().int().positive(),
    tips: z.array(z.string()),
  }),
  run: z
    .object({
      defaultMinutes: z.number().positive().default(20),
      variants: z
        .record(z.string(), z.object({ label: z.string(), extraMinutes: z.number() }))
        .default({}),
    })
    .default({ defaultMinutes: 20, variants: {} }),
  reading: z.object({ dailyPagesGoal: z.number().int().positive() }),
  minimumVersion: z.object({
    runMinutes: z.number().positive(),
    setsPerExercise: z.number().int().positive(),
    pages: z.number().int().positive(),
  }),
  freeMeals: z.object({ weeklyLimit: z.number().int().min(0) }),
  measurements: z.object({
    everyWeeks: z.number().int().positive(),
    fields: z.array(z.string().min(1)),
  }),
  equipment: z.array(z.string()),
});

export type RoutineConfig = z.infer<typeof configSchema>;
export type ScheduleItem = z.infer<typeof scheduleItemSchema>;
export type PlanTask = z.infer<typeof planTaskSchema>;
export type TaskType = PlanTask['type'];
export type Period = NonNullable<PlanTask['period']>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type RoutineItem = z.infer<typeof routineItemSchema>;

/** Formata descrição de um item de aquecimento, volta à calma ou postura */
export function formatRoutineItem(item: RoutineItem): string {
  const parts: string[] = [];
  if (item.sets) parts.push(`${item.sets} ×`);
  if (item.reps !== undefined) {
    const isNumeric = /^\d+(-\d+)?$/.test(item.reps.trim());
    parts.push(isNumeric ? `${item.reps} reps` : item.reps);
  } else if (item.durationSeconds !== undefined) {
    parts.push(`${item.durationSeconds}s`);
  }
  if (item.perSide) parts.push('(cada lado)');
  return parts.join(' ');
}

/** Valida um objeto qualquer e devolve config ou mensagens de erro legíveis. */
export function validateConfig(
  data: unknown,
): { ok: true; config: RoutineConfig } | { ok: false; errors: string[] } {
  const result = configSchema.safeParse(data);
  if (result.success) return { ok: true, config: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((i) => `${i.path.join('.') || '(raiz)'}: ${i.message}`),
  };
}
