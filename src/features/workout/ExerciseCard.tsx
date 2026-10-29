import { useState } from 'react';
import { Check, Play, Sparkles, Square } from 'lucide-react';
import type { Exercise } from '@/config/schema';
import { useConfig } from '@/config/useConfig';
import type { SetEntry } from '@/shared/db/db';
import { alertUser, unlockAudio } from '@/shared/lib/alerts';
import { shortDate } from '@/shared/lib/dates';
import { useCountdown } from '@/shared/lib/useCountdown';
import { Card, NumberInput, cn } from '@/shared/ui';
import { reachedThreshold, targetLabel } from './progression';

interface Props {
  exercise: Exercise;
  setCount: number;
  sets: SetEntry[] | undefined;
  last: { date: string; sets: SetEntry[] } | null;
  onChange: (setIndex: number, patch: Partial<SetEntry>) => void;
  onSetDone: () => void; // dispara o timer de descanso
}

/** Extrai o número base de segundos (ex.: "30-45" -> 30) */
function parseDefaultSeconds(durationSeconds?: string): number {
  const m = durationSeconds?.match(/\d+/);
  return m ? Number(m[0]) : 30;
}

/** Um exercício: alvo, "última vez", linhas de séries e aviso de progressão */
export function ExerciseCard({ exercise, setCount, sets, last, onChange, onSetDone }: Props) {
  const { config } = useConfig();
  const isDuration = !exercise.reps;
  const unit = isDuration ? 's' : 'reps';
  const levelUp = reachedThreshold(exercise, sets, config.progressionRule.repsThreshold, setCount);
  const defaultSec = parseDefaultSeconds(exercise.durationSeconds);

  // Série que está com o cronômetro de execução rodando (para exercícios por tempo)
  const [activeSet, setActiveSet] = useState<{ index: number; targetSeconds: number } | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const hasInfo = !!(exercise.notes || exercise.stopIf);
  const setTimer = useCountdown(() => {
    alertUser('end');
    if (activeSet !== null) {
      onChange(activeSet.index, { reps: activeSet.targetSeconds, done: true });
      setActiveSet(null);
      onSetDone();
    }
  });

  const formatSet = (s: SetEntry) =>
    `${s.weight !== undefined ? `${s.weight}kg×` : ''}${s.reps ?? '–'}${isDuration ? 's' : ''}`;

  return (
    <Card className="mb-3">
      <div className="mb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{exercise.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {targetLabel(exercise, setCount)}
              {exercise.equipment && ` · ${exercise.equipment}`}
            </p>
          </div>
          {hasInfo && (
            <button
              type="button"
              aria-label={`Dicas de ${exercise.name}`}
              aria-expanded={showInfo}
              onClick={() => setShowInfo((v) => !v)}
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                showInfo
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-300 text-slate-600 hover:border-emerald-500 dark:border-slate-600 dark:text-slate-300',
              )}
            >
              ⓘ
            </button>
          )}
        </div>
        {showInfo && hasInfo && (
          <div className="mt-2 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
            {exercise.notes && (
              <p>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Dicas: </span>
                {exercise.notes}
              </p>
            )}
            {exercise.stopIf && (
              <p className="text-amber-800 dark:text-amber-300">
                <span className="font-semibold">Quando parar: </span>
                {exercise.stopIf}
              </p>
            )}
          </div>
        )}
        {last && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Última vez ({shortDate(last.date)}): {last.sets.map(formatSet).join(', ')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {Array.from({ length: setCount }, (_, i) => {
          const s = sets?.[i] ?? {};
          const prev = last?.sets[i];
          const isThisRunning = setTimer.running && activeSet?.index === i;
          const targetSeconds = s.reps ?? prev?.reps ?? defaultSec;

          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 text-sm text-slate-500">{i + 1}</span>
              <NumberInput
                aria-label={`Peso série ${i + 1}`}
                placeholder={prev?.weight !== undefined ? String(prev.weight) : 'kg'}
                value={s.weight}
                onChange={(v) => onChange(i, { weight: v })}
              />
              <span className="text-xs text-slate-400">kg</span>
              <NumberInput
                aria-label={`${unit} série ${i + 1}`}
                placeholder={prev?.reps !== undefined ? String(prev.reps) : isDuration ? String(defaultSec) : unit}
                value={s.reps}
                onChange={(v) => onChange(i, { reps: v })}
              />
              <span className="w-6 text-xs text-slate-400">{unit}</span>

              {isDuration && (
                <button
                  type="button"
                  aria-label={isThisRunning ? `Parar cronômetro série ${i + 1}` : `Iniciar ${targetSeconds}s série ${i + 1}`}
                  onClick={() => {
                    unlockAudio();
                    if (isThisRunning) {
                      setTimer.stop();
                      setActiveSet(null);
                    } else {
                      setActiveSet({ index: i, targetSeconds });
                      setTimer.start(targetSeconds);
                    }
                  }}
                  className={cn(
                    'flex h-10 min-w-12 shrink-0 items-center justify-center gap-1 rounded-xl border-2 px-2 text-xs font-semibold transition-colors',
                    isThisRunning
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-slate-300 text-slate-600 hover:border-emerald-500 dark:border-slate-600 dark:text-slate-300',
                  )}
                >
                  {isThisRunning ? (
                    <>
                      <Square size={12} fill="currentColor" />
                      <span className="font-mono">{setTimer.remainingSeconds}s</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} fill="currentColor" />
                      <span>{targetSeconds}s</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                aria-label={`Concluir série ${i + 1}`}
                onClick={() => {
                  if (isThisRunning) {
                    setTimer.stop();
                    setActiveSet(null);
                  }
                  // Se deixou em branco, usa os valores da última vez (ou o padrão de segundos)
                  const patch: Partial<SetEntry> = { done: !s.done };
                  if (!s.done) {
                    if (s.weight === undefined && prev?.weight !== undefined) patch.weight = prev.weight;
                    if (s.reps === undefined) {
                      if (prev?.reps !== undefined) patch.reps = prev.reps;
                      else if (isDuration) patch.reps = defaultSec;
                    }
                  }
                  onChange(i, patch);
                  if (!s.done) onSetDone();
                }}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2',
                  s.done
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 text-slate-400 dark:border-slate-600',
                )}
              >
                <Check size={20} strokeWidth={3} />
              </button>
            </div>
          );
        })}
      </div>

      {levelUp && (
        <div className="mt-3 rounded-xl bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
          <p className="flex items-center gap-1 font-semibold">
            <Sparkles size={16} /> Hora de deixar mais difícil!
          </p>
          <p className="mt-1">Você fez {config.progressionRule.repsThreshold}+ reps em todas as séries. Ideias:</p>
          <ul className="mt-1 list-inside list-disc">
            {config.progressionRule.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
