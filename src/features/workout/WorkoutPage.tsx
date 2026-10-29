import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatRoutineItem } from '@/config/schema';
import { useConfig } from '@/config/useConfig';
import { markTaskDone, useDayLog } from '@/features/today';
import { alertUser, unlockAudio } from '@/shared/lib/alerts';
import { addDays, dayKeyOf, DAY_LABELS, fmt } from '@/shared/lib/dates';
import { workoutForDate } from '@/shared/lib/rotation';
import { useCountdown } from '@/shared/lib/useCountdown';
import { useToday } from '@/shared/lib/useToday';
import { Button, Card, CardTitle, Checkbox, PageHeader } from '@/shared/ui';
import { ExerciseCard } from './ExerciseCard';
import { RestTimerBar } from './RestTimerBar';
import { lastSetsFor, setFinished, updateSet, useAllSessions, useSession } from './session';

/** Tela "Treino": aquecimento, séries com peso/reps, volta à calma e timer de descanso */
export function WorkoutPage() {
  const { config } = useConfig();
  const today = useToday();
  const dayLog = useDayLog(today);
  const scheduled = workoutForDate(config, today);
  // Se hoje não é dia de treino, dá para escolher um treino mesmo assim
  const [chosen, setChosen] = useState<string | null>(null);
  const workout = chosen ?? scheduled;

  const [warmupDone, setWarmupDone] = useState<Record<string, boolean>>({});
  const [cooldownDone, setCooldownDone] = useState<Record<string, boolean>>({});
  const [restSeconds, setRestSeconds] = useState(config.restSeconds[0]);
  const timer = useCountdown(() => alertUser('end'));

  const session = useSession(today, workout ?? '-');
  const sessions = useAllSessions();

  const workoutNames = Object.keys(config.workouts);

  if (!workout || !config.workouts[workout]) {
    const next = nextWorkoutDay(config, today);
    return (
      <>
        <PageHeader title="Treino" subtitle={fmt(today, "EEEE, d 'de' MMMM")} />
        <Card>
          <p className="mb-1 font-medium">Hoje não é dia de treino.</p>
          {next && (
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Próximo: {DAY_LABELS[dayKeyOf(next.date)]} ({fmt(next.date, 'dd/MM')}) — Treino {next.workout}
            </p>
          )}
          <p className="mb-2 text-sm">Quer treinar mesmo assim?</p>
          <div className="flex gap-2">
            {workoutNames.map((w) => (
              <Button key={w} variant="secondary" onClick={() => setChosen(w)}>
                Treino {w}
              </Button>
            ))}
          </div>
        </Card>
      </>
    );
  }

  const exercises = config.workouts[workout];
  const minimum = dayLog.minimum;
  const finished = session?.finished ?? false;

  const finish = async () => {
    await setFinished(today, workout, !finished);
    if (!finished) await markTaskDone(today, 'workout', true);
  };

  return (
    <>
      <PageHeader
        title={`Treino ${workout}`}
        subtitle={fmt(today, "EEEE, d 'de' MMMM")}
        action={
          workoutNames.length > 1 && (
            <div className="flex gap-1">
              {workoutNames.map((w) => (
                <Button key={w} size="sm" variant={w === workout ? 'primary' : 'secondary'} onClick={() => setChosen(w)}>
                  {w}
                </Button>
              ))}
            </div>
          )
        }
      />

      {minimum && (
        <Card className="mb-3 border-emerald-300 bg-emerald-50 text-sm dark:border-emerald-800 dark:bg-emerald-950">
          Versão mínima ativa: {config.minimumVersion.setsPerExercise} série por exercício.
        </Card>
      )}

      {config.warmup.length > 0 && (
        <Card className="mb-3">
          <CardTitle>Aquecimento</CardTitle>
          {config.warmup.map((w) => (
            <Checkbox
              key={w.id}
              label={w.name}
              description={formatRoutineItem(w)}
              checked={!!warmupDone[w.id]}
              onChange={(v) => setWarmupDone({ ...warmupDone, [w.id]: v })}
            />
          ))}
        </Card>
      )}

      {exercises.map((ex) => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          setCount={minimum ? Math.min(ex.sets, config.minimumVersion.setsPerExercise) : ex.sets}
          sets={session?.exercises[ex.id]}
          last={lastSetsFor(sessions, ex.id, today)}
          onChange={(i, patch) => updateSet(today, workout, ex.id, i, patch)}
          onSetDone={() => {
            unlockAudio();
            timer.start(restSeconds);
          }}
        />
      ))}

      {config.cooldown.length > 0 && (
        <Card className="mb-3">
          <CardTitle
            action={
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Opcional
              </span>
            }
          >
            Volta à calma
          </CardTitle>
          {config.cooldown.map((c) => (
            <Checkbox
              key={c.id}
              label={c.name}
              description={formatRoutineItem(c)}
              checked={!!cooldownDone[c.id]}
              onChange={(v) => setCooldownDone({ ...cooldownDone, [c.id]: v })}
            />
          ))}
        </Card>
      )}

      <Button size="lg" className="mb-20 mt-2 w-full" variant={finished ? 'secondary' : 'primary'} onClick={finish}>
        <CheckCircle2 size={20} />
        {finished ? 'Treino concluído (desfazer)' : 'Concluir treino'}
      </Button>

      <RestTimerBar timer={timer} options={config.restSeconds} selected={restSeconds} onSelect={setRestSeconds} />
    </>
  );
}

/** Procura o próximo dia com treino nas próximas 2 semanas */
function nextWorkoutDay(config: ReturnType<typeof useConfig>['config'], from: string) {
  for (let i = 1; i <= 14; i++) {
    const date = addDays(from, i);
    const workout = workoutForDate(config, date);
    if (workout) return { date, workout };
  }
  return null;
}
