# Cuestionario para Fable 5 CC — capacidades y limitaciones

**Preparado por:** Cowork
**Para:** Fable 5 Claude Code
**Instrucciones:** responde cada pregunta con precisión. Si algo no aplica, di "N/A" y explica por qué. Este documento nos ayuda a asignarte trabajo que puedas realmente ejecutar y evitar frustración por asumir capacidades que no tienes (o desperdiciar por no saber que las tienes).

Enrique va a copiar tus respuestas y pasármelas a Cowork.

---

## 1. Identidad y modelo

1.1 ¿Qué modelo eres exactamente? (Sonnet 4.6, Opus, otro)

1.2 ¿Tienes contexto extendido? Si sí, ¿cuánto?

1.3 ¿Cuál es tu fecha de knowledge cutoff?

1.4 ¿Eres Claude Code (CLI) o Claude Code SDK integrado?

---

## 2. Acceso al filesystem del proyecto

2.1 ¿Tienes acceso directo al workspace `D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer`?

2.2 ¿Puedes leer archivos arbitrarios? ¿Editar? ¿Crear? ¿Borrar?

2.3 ¿Tienes acceso a un shell (bash/PowerShell)? Si sí, ¿en qué OS corre?

2.4 ¿Puedes ejecutar `npx tsc --noEmit`, `vitest run`, `npm install`, `git`, `eas`?

2.5 ¿Puedes lanzar sub-agentes/tareas paralelas? (útil para research grande)

---

## 3. Git y commits

3.1 ¿Puedes crear branches, hacer commits y push a origin?

3.2 ¿Puedes leer git log, git diff, git status con precisión?

3.3 ¿Tienes credenciales de push al repo o solo lees? (spec: si solo lees, tienes que pasarle patches a Enrique)

3.4 ¿Puedes hacer merge de branches? (Idealmente NO — Enrique lo hace, pero confirma)

---

## 4. MCPs disponibles

4.1 Lista TODOS los MCPs que tienes conectados (Supabase, Google Drive, Sentry, computer-use, chrome, etc.)

4.2 Para cada uno, dime **para qué es útil en el proyecto ATP**.

4.3 ¿Tienes acceso a MCP Supabase con `execute_sql`? Si sí, ¿puedes leer? ¿escribir? ¿aplicar migraciones DDL?

4.4 ¿Puedes leer Sentry issues del proyecto `atp-mobile`?

4.5 ¿Puedes hacer network fetch a URLs externas (docs, Anthropic API, Supabase API directo)?

---

## 5. Limitaciones y constraints operacionales

5.1 ¿Tienes tiempo de ejecución máximo por turno? (ej. 30 min → auto-timeout)

5.2 ¿Puedes ejecutar tareas overnight sin intervención humana?

5.3 ¿Hay operaciones que específicamente NO puedes hacer? (ej. install packages, run migrations, hit external APIs sin approval)

5.4 ¿Requieres approval humano por cada acción destructiva (delete, rewrite, migration)? Detalla.

---

## 6. Estilo de trabajo

6.1 ¿Prefieres buzones muy detallados (spec exacto) o instrucciones de alto nivel?

6.2 Cuando encuentras conflicto entre spec y realidad del código, ¿tu default es (a) seguir el spec ciegamente, (b) improvisar sin avisar, o (c) hacer la decisión inteligente y reportarla?

6.3 ¿Cómo reportas al finalizar? (chat, PR, ambos, otro)

6.4 ¿Puedes auto-verificar (tsc, vitest, lint) antes de reportar?

---

## 7. Ejecución paralela con el otro Claude Code

7.1 Si el CC actual está trabajando en `feat/agenda-fixes-critical` y tú tomas `feat/onboarding-polish`, ¿hay conflicto? (Deberían ser independientes en distintas carpetas)

7.2 ¿Puedes leer branches remotas del repo para no pisar trabajo del otro CC?

7.3 ¿Cómo prefieres que Cowork particione trabajo entre tú y el otro CC?

---

## 8. Familiaridad con el stack

8.1 ¿Has trabajado con React Native + Expo antes?

8.2 ¿Y con Supabase (Postgres + Edge Functions Deno)?

8.3 ¿Anthropic API + Gemini API para LLMs?

8.4 ¿Push notifications con `expo-notifications`?

8.5 Si algo es nuevo para ti, ¿cómo lo aprendes? (docs internas, web fetch, preguntas)

---

## 9. Preguntas específicas para el sprint inicial

9.1 Si te dan **Fix bugs de agenda** (Task 1 del onboarding):
- ¿Prefieres primero investigar (leer código actual + reproducir bug) o directo a implementar el fix propuesto?
- ¿Puedes acceder al Supabase remoto para query real y validar el bug antes de fixear?

9.2 Si te dan **Deploy push notifications** (Task 2):
- ¿Puedes correr `supabase functions deploy dispatch-agenda-notifications` desde tu entorno?
- ¿O es Enrique quien lo hace y tú solo preparas el código?

9.3 Si te dan **Onboarding polish** (Task 3):
- ¿Puedes trabajar con visual (screenshots) o solo código?

---

## 10. Miscelánea

10.1 ¿Tienes preferencias sobre cómo Cowork te pasa buzones? (archivo `.md` en repo, chat directo, otro)

10.2 ¿Hay algo importante que Cowork no está preguntando pero deberías saber?

10.3 ¿Cuál es tu comfort level con TypeScript strict mode? ¿Con RxJS? ¿Con async iterators?

10.4 ¿Puedes hacer testing manual en algún emulador Android/iOS o solo unit tests?

---

## Formato de respuesta

Preferimos:
- **Bullets concisos** por pregunta, no prosa larga
- Si algo es "sí con matices", explica el matiz en 1-2 líneas
- **Sé honesto con las limitaciones** — es peor asignarte algo que no puedes hacer que saberlo desde el inicio
- Al final, agrega una sección **"Cosas que sugiero que Cowork ajuste en cómo trabajamos"** — feedback constructivo

---

**Cuando termines, guarda tu respuesta como `R and D/FABLE5_CC_CAPACIDADES.md` y avísale a Enrique que la revise para pasársela a Cowork.**

Gracias por el detalle. Vamos.

— Cowork
