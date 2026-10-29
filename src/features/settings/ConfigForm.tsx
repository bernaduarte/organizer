import { useEffect, useState, type ReactNode } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import {
  DAY_KEYS,
  PERIODS,
  TASK_TYPES,
  validateConfig,
  type DayKey,
  type Exercise,
  type RoutineConfig,
  type TaskType,
} from '@/config/schema';
import { useConfig } from '@/config/useConfig';
import { DAY_LABELS } from '@/shared/lib/dates';
import { PERIOD_LABELS } from '@/shared/lib/dayPlan';
import { Button, Card, Field, Input, NumberInput, Select, Textarea } from '@/shared/ui';

/**
 * Edição da config por formulários.
 * Trabalha numa cópia ("rascunho"); só grava ao tocar em Salvar,
 * depois de validar com o mesmo schema Zod do JSON.
 */

const TASK_LABELS: Record<TaskType, string> = {
  workout: 'Treino',
  run: 'Corridinha',
  reading: 'Leitura',
  rest: 'Descanso',
  weeklyPlanning: 'Planejar semana',
  custom: 'Outra tarefa',
};

export function ConfigForm() {
  const { config, saveConfig } = useConfig();
  const [draft, setDraft] = useState<RoutineConfig>(() => structuredClone(config));
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  // Se a config mudar por fora (ex.: aba JSON), recomeça o rascunho
  useEffect(() => setDraft(structuredClone(config)), [config]);

  /** Aplica uma alteração no rascunho (clona para o React perceber a mudança) */
  const update = (change: (d: RoutineConfig) => void) => {
    setSaved(false);
    setDraft((prev) => {
      const next = structuredClone(prev);
      change(next);
      return next;
    });
  };

  const save = async () => {
    const result = validateConfig(draft);
    if (!result.ok) return setErrors(result.errors);
    setErrors([]);
    await saveConfig(result.config);
    setSaved(true);
  };

  return (
    <div className="space-y-3 pb-24">
      <Section title="Metas" open>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Páginas por dia">
            <NumberInput value={draft.reading.dailyPagesGoal} onChange={(v) => update((d) => (d.reading.dailyPagesGoal = v ?? 0))} />
          </Field>
          <Field label="Refeições livres/semana">
            <NumberInput value={draft.freeMeals.weeklyLimit} onChange={(v) => update((d) => (d.freeMeals.weeklyLimit = v ?? 0))} />
          </Field>
          <Field label="Reps para progredir">
            <NumberInput
              value={draft.progressionRule.repsThreshold}
              onChange={(v) => update((d) => (d.progressionRule.repsThreshold = v ?? 0))}
            />
          </Field>
          <Field label="Medir a cada (semanas)">
            <NumberInput
              value={draft.measurements.everyWeeks}
              onChange={(v) => update((d) => (d.measurements.everyWeeks = v ?? 0))}
            />
          </Field>
          <Field label="Corrida padrão (min)">
            <NumberInput
              value={draft.run.defaultMinutes}
              onChange={(v) => update((d) => (d.run.defaultMinutes = v ?? 20))}
            />
          </Field>
          <Field label="Descanso (s)" hint="Separe por vírgula">
            <CsvNumbers value={draft.restSeconds} onChange={(v) => update((d) => (d.restSeconds = v))} />
          </Field>
        </div>
        <p className="mb-2 mt-4 text-sm font-semibold">Versão mínima</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Corrida (min)">
            <NumberInput value={draft.minimumVersion.runMinutes} onChange={(v) => update((d) => (d.minimumVersion.runMinutes = v ?? 0))} />
          </Field>
          <Field label="Séries/exerc.">
            <NumberInput
              value={draft.minimumVersion.setsPerExercise}
              onChange={(v) => update((d) => (d.minimumVersion.setsPerExercise = v ?? 0))}
            />
          </Field>
          <Field label="Páginas">
            <NumberInput value={draft.minimumVersion.pages} onChange={(v) => update((d) => (d.minimumVersion.pages = v ?? 0))} />
          </Field>
        </div>
      </Section>

      <Section title="Datas de início">
        <Field label="Rotação de treinos" hint="Semana 1 do padrão A/B">
          <Input
            type="date"
            value={draft.workoutRotation.startDate}
            onChange={(e) => update((d) => (d.workoutRotation.startDate = e.target.value))}
          />
        </Field>
      </Section>

      <Section title="Agenda fixa (aulas)">
        {draft.schedule.map((s, i) => (
          <div key={i} className="mb-3 grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-950">
            <div className="grid grid-cols-2 gap-2">
              <DaySelect value={s.day} onChange={(v) => update((d) => (d.schedule[i].day = v))} />
              <Input value={s.title} onChange={(e) => update((d) => (d.schedule[i].title = e.target.value))} placeholder="Título" />
              <Input type="time" value={s.start} onChange={(e) => update((d) => (d.schedule[i].start = e.target.value))} />
              <Input type="time" value={s.end} onChange={(e) => update((d) => (d.schedule[i].end = e.target.value))} />
            </div>
            <RemoveButton onClick={() => update((d) => d.schedule.splice(i, 1))} />
          </div>
        ))}
        <AddButton
          onClick={() => update((d) => d.schedule.push({ day: 'mon', title: 'Aula', start: '08:00', end: '10:00', type: 'class' }))}
        >
          Adicionar compromisso
        </AddButton>
      </Section>

      <Section title="Plano semanal">
        {DAY_KEYS.map((day) => (
          <div key={day} className="mb-4">
            <p className="mb-1 text-sm font-semibold">{DAY_LABELS[day]}</p>
            {(draft.weeklyPlan[day] ?? []).map((t, i) => (
              <div key={i} className="mb-2 grid grid-cols-[1fr_auto] gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={t.type} onChange={(e) => update((d) => (d.weeklyPlan[day]![i].type = e.target.value as TaskType))}>
                    {TASK_TYPES.map((tt) => (
                      <option key={tt} value={tt}>
                        {TASK_LABELS[tt]}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={t.period ?? ''}
                    onChange={(e) =>
                      update((d) => (d.weeklyPlan[day]![i].period = (e.target.value || undefined) as typeof t.period))
                    }
                  >
                    <option value="">Qualquer hora</option>
                    {PERIODS.map((p) => (
                      <option key={p} value={p}>
                        {PERIOD_LABELS[p]}
                      </option>
                    ))}
                  </Select>
                  {t.type === 'custom' && (
                    <Input
                      className="col-span-2"
                      placeholder="Nome da tarefa"
                      value={t.title ?? ''}
                      onChange={(e) => update((d) => (d.weeklyPlan[day]![i].title = e.target.value))}
                    />
                  )}
                  {t.type === 'reading' && (
                    <NumberInput
                      className="col-span-2 text-left"
                      placeholder={`Páginas (padrão ${draft.reading.dailyPagesGoal})`}
                      value={t.pagesGoal}
                      onChange={(v) => update((d) => (d.weeklyPlan[day]![i].pagesGoal = v))}
                    />
                  )}
                  {t.type === 'run' && Object.keys(draft.run.variants).length > 0 && (
                    <Select
                      className="col-span-2"
                      value={t.variant ?? ''}
                      onChange={(e) => update((d) => (d.weeklyPlan[day]![i].variant = e.target.value || undefined))}
                    >
                      <option value="">Corrida normal</option>
                      {Object.entries(draft.run.variants).map(([key, v]) => (
                        <option key={key} value={key}>
                          {v.label} (+{v.extraMinutes} min)
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
                <RemoveButton onClick={() => update((d) => d.weeklyPlan[day]!.splice(i, 1))} />
              </div>
            ))}
            <AddButton onClick={() => update((d) => (d.weeklyPlan[day] ??= []).push({ type: 'custom', title: '' }))}>
              Tarefa
            </AddButton>
          </div>
        ))}
      </Section>

      {Object.keys(draft.workouts).map((w) => (
        <Section key={w} title={`Treino ${w}`}>
          {draft.workouts[w].map((ex, i) => (
            <ExerciseEditor
              key={ex.id}
              exercise={ex}
              onChange={(patch) => update((d) => Object.assign(d.workouts[w][i], patch))}
              onRemove={() => update((d) => d.workouts[w].splice(i, 1))}
            />
          ))}
          <AddButton
            onClick={() =>
              update((d) =>
                d.workouts[w].push({ id: `ex-${Date.now().toString(36)}`, name: 'Novo exercício', sets: 3, reps: '10-12' }),
              )
            }
          >
            Adicionar exercício
          </AddButton>
        </Section>
      ))}

      <Section title="Listas (uma por linha)">
        <div className="space-y-3">
          <Field label="Dicas de progressão">
            <LinesTextarea value={draft.progressionRule.tips} onChange={(v) => update((d) => (d.progressionRule.tips = v))} />
          </Field>
          <Field label="Campos das medidas">
            <LinesTextarea value={draft.measurements.fields} onChange={(v) => update((d) => (d.measurements.fields = v))} />
          </Field>
          <Field label="Equipamentos">
            <LinesTextarea value={draft.equipment} onChange={(v) => update((d) => (d.equipment = v))} />
          </Field>
        </div>
      </Section>

      <p className="text-xs text-slate-500">
        Aquecimento, volta à calma, bloco de postura, rotação A/B e variantes de corrida são editados na aba JSON.
      </p>

      {/* Barra de salvar fixa */}
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 px-4">
        <div className="mx-auto max-w-lg">
          {errors.length > 0 && (
            <Card className="mb-2 max-h-40 overflow-auto border-rose-300 bg-rose-50 text-xs dark:border-rose-900 dark:bg-rose-950">
              {errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </Card>
          )}
          <Button size="lg" className="w-full shadow-lg" onClick={save}>
            <Save size={18} /> {saved ? 'Salvo ✔' : 'Salvar alterações'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Componentes auxiliares do formulário ---------- */

function Section({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <summary className="cursor-pointer select-none p-4 font-semibold">{title}</summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function DaySelect({ value, onChange }: { value: DayKey; onChange: (v: DayKey) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as DayKey)}>
      {DAY_KEYS.map((d) => (
        <option key={d} value={d}>
          {DAY_LABELS[d]}
        </option>
      ))}
    </Select>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" aria-label="Remover" onClick={onClick} className="self-start text-rose-500">
      <Trash2 size={16} />
    </Button>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="text-emerald-600">
      <Plus size={16} /> {children}
    </Button>
  );
}

function ExerciseEditor({
  exercise,
  onChange,
  onRemove,
}: {
  exercise: Exercise;
  onChange: (patch: Partial<Exercise>) => void;
  onRemove: () => void;
}) {
  const byTime = exercise.reps === undefined;
  return (
    <div className="mb-3 grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-950">
      <div className="grid grid-cols-2 gap-2">
        <Input className="col-span-2" value={exercise.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Nome" />
        <Input
          className="col-span-2"
          value={exercise.equipment ?? ''}
          onChange={(e) => onChange({ equipment: e.target.value || undefined })}
          placeholder="Equipamento (opcional)"
        />
        <Field label="Séries">
          <NumberInput value={exercise.sets} onChange={(v) => onChange({ sets: v ?? 1 })} />
        </Field>
        <Field label={byTime ? 'Segundos' : 'Reps'}>
          <Input
            value={(byTime ? exercise.durationSeconds : exercise.reps) ?? ''}
            placeholder={byTime ? '30-45' : '10-12 ou max'}
            onChange={(e) => onChange(byTime ? { durationSeconds: e.target.value } : { reps: e.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={byTime}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? { reps: undefined, durationSeconds: exercise.durationSeconds ?? '30' }
                  : { durationSeconds: undefined, reps: exercise.reps ?? '10' },
              )
            }
          />
          Por tempo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!exercise.perSide} onChange={(e) => onChange({ perSide: e.target.checked || undefined })} />
          Cada lado
        </label>
        <Input
          className="col-span-2"
          value={exercise.notes ?? ''}
          onChange={(e) => onChange({ notes: e.target.value || undefined })}
          placeholder="Dicas de técnica (opcional)"
        />
        <Input
          className="col-span-2"
          value={exercise.stopIf ?? ''}
          onChange={(e) => onChange({ stopIf: e.target.value || undefined })}
          placeholder="Critérios de parada (opcional)"
        />
      </div>
      <RemoveButton onClick={onRemove} />
    </div>
  );
}

/** Textarea que edita uma lista de strings (uma por linha) */
function LinesTextarea({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join('\n'));
  useEffect(() => setText(value.join('\n')), [value]);
  return (
    <Textarea
      rows={Math.max(3, value.length + 1)}
      value={text}
      onChange={(e) => setText(e.target.value)}
      // Só converte em lista ao sair do campo, para não atrapalhar a digitação
      onBlur={() => onChange(text.split('\n').map((s) => s.trim()).filter(Boolean))}
    />
  );
}

/** Input "60, 90" <-> [60, 90] */
function CsvNumbers({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const [text, setText] = useState(value.join(', '));
  useEffect(() => setText(value.join(', ')), [value]);
  return (
    <Input
      value={text}
      inputMode="numeric"
      onChange={(e) => setText(e.target.value)}
      onBlur={() =>
        onChange(
          text
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isFinite(n) && n > 0),
        )
      }
    />
  );
}
