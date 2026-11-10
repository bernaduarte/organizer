# Minha Rotina

PWA pessoal para organizar a rotina de saúde, estudos e leitura. Funciona offline, pode ser instalado no celular e guarda tudo no próprio aparelho (IndexedDB). Não tem backend.

## Rodar localmente

```bash
npm install
npm run dev          # abre em http://localhost:5173
```

Para testar no celular na mesma rede Wi-Fi: `npm run dev -- --host` e abra o IP que aparecer.

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run build` | Checa os tipos e gera a versão de produção em `dist/` |
| `npm run preview` | Serve o `dist/` localmente (o service worker/offline só funciona nesse modo) |
| `npm run icons` | Gera os ícones PNG de novo a partir de `public/favicon.svg` |

## Publicar no GitHub Pages (automático)

1. Crie um repositório no GitHub e envie o código para a branch `main`.
2. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. A cada push na `main`, o workflow `.github/workflows/deploy.yml` faz o build e publica.
4. O app fica em `https://<seu-usuario>.github.io/<nome-do-repo>/`.

O workflow define `BASE_PATH=/<nome-do-repo>/` sozinho, então não precisa editar nada se renomear o repositório.

### Alternativa: Vercel

Importe o repositório em vercel.com. Ele detecta o Vite (build `npm run build`, saída `dist`). Não defina `BASE_PATH`: o padrão `/` já é o certo para a Vercel.

## Instalar no celular

- **Android (Chrome):** abra o link → menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial").
- **iPhone (Safari):** abra o link → botão Compartilhar → **Adicionar à Tela de Início**. No iPhone precisa ser pelo Safari.

Depois da primeira abertura, o app funciona sem internet.

> ⚠️ Os dados ficam só no aparelho. Faça backup em **Ajustes → Backup** de vez em quando. No iPhone, um app que fica muitas semanas sem ser aberto pode ter os dados apagados pelo sistema.

## Como editar a rotina

Toda a rotina está em [`src/config/routine.config.json`](src/config/routine.config.json), validada pelo schema Zod em [`src/config/schema.ts`](src/config/schema.ts). Há duas formas de mudar:

1. **No código:** edite o JSON e publique. Isso muda o padrão.
2. **No app:** em **Ajustes**, pelo formulário ou pelo JSON bruto. Fica salvo no aparelho e tem prioridade sobre o padrão. "Restaurar padrão" volta para o JSON do código.

Campos principais:

- `schedule`: compromissos fixos (aulas), por dia (`mon`…`sun`).
- `weeklyPlan`: tarefas de cada dia. Tipos: `workout`, `run`, `reading`, `rest`, `weeklyPlanning`, `custom` (com `title`). Opcionais: `period` (`morning`/`afternoon`/`night`), `pagesGoal` (leitura) e `variant` (corrida).
- `workoutRotation`: em que dias tem treino e qual treino cai em cada um. Cada linha de `pattern` é uma semana; a contagem começa na semana de `startDate`.
- `workouts`: exercícios de cada treino, com `reps` (`"12-15"`, `"max"`) ou `durationSeconds`.
- `run.defaultMinutes`: duração padrão da corridinha (e `run.variants` para acrescentar minutos, ex.: mais longa).
- `minimumVersion`: o que vale como "versão mínima" num dia ruim.

## Arquitetura

```
src/
  app/        App, rotas (HashRouter), layout com barra inferior
  config/     routine.config.json + schema Zod + useConfig (padrão + edição salva)
  features/
    today/    checklist do dia, versão mínima, dia de recuperação, status do dia
    workout/  sessões, séries, "última vez", progressão, timer de descanso e prancha
    reading/  livros e páginas
    progress/ sequência, calendário, gráficos, medidas/fotos, refeições livres
    settings/ formulário, JSON bruto, backup
  shared/
    ui/       componentes genéricos
    db/       Dexie (tabelas do IndexedDB)
    lib/      datas com fuso, rotação A/B, timers, alertas
```

Cada feature só expõe para as outras o que está no seu `index.ts`.

Regras que valem a pena saber:

- **Datas** são strings `AAAA-MM-DD` calculadas no fuso da config (`America/Sao_Paulo`).
- **Dia cumprido:** todas as tarefas do plano feitas (aulas e descanso não contam), ou a versão mínima ativada. Concluir o treino, salvar o trote ou bater a meta de páginas marca a tarefa sozinho.
- **Sequência:** hoje ainda em andamento não quebra a sequência; dias sem tarefas não somam nem quebram.
- **Banco:** se mudar os índices em `shared/db/db.ts`, crie uma `this.version(2)` em vez de editar a versão 1. 
