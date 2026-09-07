# ATP App — Contexto del Proyecto

## Quién soy
Enrique Zapata — Ingeniero en automatización, coach de rendimiento humano,
Guinness World Record en pull-ups. Co-fundo ATP con Mariana Zapata
(Co-Founder & Chief Science Officer, PhD en Ciencias Biomédicas).

## Quién prueba la app (y cómo se llaman en Sentry)
- **Enrique** — Android. El build que trae actualizado es el suyo.
- **Mariana Zapata** — iPhone. Co-founder y CSO.
- **Pato = Paty = Patricia Aguilar** — iPhone. Es UNA sola persona con tres
  nombres. En Sentry aparece como `d.i.patriciaaguilar@gmail.com`. Anotado
  porque ya la trate como dos personas distintas una vez.

## Visión
ATP es el sistema operativo de rendimiento humano: integra fitness,
nutrición, mente, salud funcional, ciclo menstrual y gamificación con
IA personalizada (ARGOS) bajo modelo de medicina funcional.

## Stack
- React Native + Expo SDK 54 + TypeScript + Supabase
- Sentry + PostHog (observabilidad) — validados en runtime real
- Edge Function "anthropic-proxy" para Anthropic Claude
- Próximo: argos-proxy con fallback OpenAI + logging custom (CC_PROMPT_002b)

## Versión actual
v2.2.0 (142 pantallas reales + 59 redirects, 236K líneas, 1,929 commits, 0 errores TS)
Medido el 18-ago-2026. Estos números estuvieron dos meses desactualizados
(decían 89 pantallas y 430 commits) y es el primer archivo que lee cualquiera
que llega: si vuelven a envejecer, mienten desde la primera página.
Roadmap → v2.0.0 (julio-agosto 2026 — publicación a stores)

## Reglas técnicas no negociables
1. NUNCA reescribir archivos completos → solo str_replace quirúrgico
2. NUNCA usar crypto.randomUUID → usar generateUUID helper
3. SIEMPRE getLocalToday() / parseLocalDate() para date queries
4. CADA CREATE TABLE → ALTER TABLE ENABLE ROW LEVEL SECURITY + policy
5. Después de electrones: DeviceEventEmitter.emit('electrons_changed')
6. Después de nutrición/ayuno: DeviceEventEmitter.emit('day_changed')
7. Constants.expoConfig.extra (no process.env directo en cliente)
8. TypeScript antes de push: npx tsc --noEmit
9. OTA para JS/TS: eas update --branch preview
   - SIEMPRE preview, nunca production. El binario que traen Enrique y los testers
     sale del perfil beta/preview de eas.json, y ese binario solo escucha el canal
     preview. Un update publicado a production se publica bien y no le llega a nadie
     (pasado el 7-sep-2026: se perdio una manana asi). production es el canal del
     build de Play, cuando exista.
   - El runtime del update sale de version en app.json (policy appVersion): hoy 2.2.0,
     del build de 15-ago-2026. Que el update diga 2.2.0 es correcto aunque el producto
     se llame ATP 3.0. Subir esa version deja al binario instalado SIN OTA (ver regla 11).
   - Publicar con npm run sourcemaps:ota -- --branch preview (necesita SENTRY_AUTH_TOKEN
     en la sesion, sale de 1Password). eas update suelto deja los stacktraces ofuscados.
10. Native builds solo para cambios nativos o nueva versión
11. NUNCA cambiar versión en app.json sin hacer build inmediato
12. Migraciones SQL:
    - Idempotentes obligatorias (IF NOT EXISTS / ON CONFLICT DO NOTHING)
    - Cowork audita branch antes del merge
    - Después del merge: `npx supabase db push` aplica al remoto (Supabase CLI linkeado al proyecto)
    - SQL Editor solo para queries puntuales / debug, no para migraciones rutinarias

13. Comandos para Enrique: terminal PowerShell en Windows.
    - UN solo bloque: el `cd` arriba y los comandos debajo, uno por línea.
      No repetir el `cd` en cada comando ni partirlo en bloques sueltos.
      ```
      cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
      npx tsc --noEmit
      npm test
      ```
    - NUNCA `&&`.
    - Decir en qué RAMA se corre, verificándolo antes con
      `git branch --show-current`, no de memoria.
    - Si el bloque cambia de rama a medias, decirlo en una línea antes,
      no dejarlo escondido entre comandos.

## Documentos clave
- docs/DESIGN_SYSTEM.md — criterio UI/UX, tokens, reglas de diseño (LEER antes de tocar pantallas)
- ATP_MASTER_DOC_MAY2026.md — estado completo
- R and D/AUDIT_REPORT_2026_05_07.md — auditoría externa Cowork
- R and D/PATY_CRASH_TEST_5_RAW.md — bugs reales reportados por usuario
- R and D/CC_PROMPT_*.md — prompts quirúrgicos por tema
- Business development/Legal/04_Disclaimers_Medicos_por_Pantalla.md — copy Mariana
- Business development/ATP_App_Modelo_Financiero_v4.xlsx — modelo financiero

## Filosofía de medicina funcional (no negociable)
- No recomendamos bloqueadores químicos como primera opción
- Priorizamos causas raíz sobre síntomas
- No promovemos soluciones alópatas como default
- PERO: el lenguaje en UI consumer respeta guidelines de Apple/Google
  (ver MedicalDisclaimer.tsx + ROADMAP_COMPLIANCE_STORES.md)

## Pilares
1. HOY (ATP Score + electrones + agenda + ARGOS)
2. FITNESS (rutinas, métodos propietarios, ejecución, biblioteca)
3. NUTRICIÓN (texto/foto, suplementos, ayuno, hidratación, recetas)
4. MENTE (journal, respiración, meditación, check-in)
5. SALUD (ATP SOL, glucosa, mi salud, biomarcadores, protocolos)
6. CICLO (calendario, síntomas, predicción, compañero)
7. TESTS (Braverman 313Q + 5 quizzes funcionales)

## ARGOS
- Modelo: claude-sonnet-5 vía argos-proxy (PRIMARY_MODEL en src/constants/llm-config.ts y supabase/functions/argos-proxy/index.ts), fallback gemini-2.5-flash. Corregido 31-ago-2026: decía claude-sonnet-4-20250514.
- Edge Function: anthropic-proxy (TODO: argos-proxy + fallback OpenAI)
- Contexto: Braverman + quizzes + glucosa + UV + ejercicio + ayuno + protocolo + cronotipo
- Rate limits per tier — pendiente PROMPT_004

## Observabilidad activa
- Sentry: errors + sessions, project atp-mobile en atp-v5 org
- PostHog: events + lifecycle, project ATP en us.posthog.com

## PIVOTE ATP 3.0 (4 de septiembre de 2026): leer antes que nada

**Fuente de verdad del pivote:** `R and D/PIVOTE_ATP_3.0_2026-09-04.md` (decisiones, add-on
Elite, matriz de gating Free/Pro/Elite, customer journey) y `R and D/RUTA_A_ATP_3.0.md` (los pasos en orden,
con dueno y criterio de terminado; se trabaja en ese orden). Hermanos: `R and D/ORNAMENT_MEXICO_Y_MARCO_LEGAL_ATP.md`
(marco legal y copy seguro), `R and D/COSTOS_ATP_PRO_449_VS_399.md` + `.xlsx` (economia por suscriptor).
Resumen: una sola app; Free / Pro (lista 499, lanzamiento 349 congelado, anual 3,990) / Founders 8,900
(5 anios de Pro, solo web) / Elite ~40k (codigo + evaluacion cargada); vender por web; Mariana fuera de
la operacion, su cuenta y sus datos no se tocan; palabras rojas: diagnostico, tratamiento, previene, cura.
`R and D/embudo/DECISIONES_PREVENTA.md` ya esta reescrito a 3.0 (6-sep-2026; mismo contenido que
`ATP/comercial/00_DECISIONES.md`, nombre historico). Si ese resumen y el pivote se contradicen, gana el pivote y se avisa. El pivote fue APROBADO el 4 de septiembre; la noche del 4 al 5
se construyo 3.0 completa en codigo (ver `R and D/ENTREGA_NOCHE_2026-09-04.md`).

Herramientas 3.0: `node scripts/verifica.js <archivos>` (parser TS, em dashes, sinDatos, registros) antes de dar
por terminado cualquier archivo; `node scripts/run-tests-sin-vitest.js <test>` para cores; `scripts/elite/` para
cargar evaluaciones Elite (guia en `R and D/diagnostico/CARGAR_ELITE.md`). Niveles: `free | premium | elite`
(`src/services/subscription/tier-logic.ts`); gating por `minTier` en `app-registry.ts`; lo bloqueado se ve con
candado y lleva al paywall con `contexto`; a un miembro nunca se le cierra nada (fail-open si el nivel no se
pudo leer). Elite entra solo por codigo (`tier_grants`), nunca por UPDATE a profiles; Mi evaluacion, Genetica,
contexto de ARGOS y Suplementos (solo lectura) se abren por existencia de `functional_dx.sources_snapshot.elite_v3`.
REGLA DURA: ninguna sesion de Cowork escribe en produccion con `execute_sql` ni `apply_migration`; toda migracion
es un archivo en `supabase/migrations/` que Enrique aplica con `npx supabase db push` (las tres `2026090...`
de Levantamiento DX se reconstruyeron desde produccion por haberse saltado esto).

## Lanzamiento y cobros (leer antes de tocar pagos, precios o legal)

**Fuente única comercial:** `R and D/embudo/DECISIONES_PREVENTA.md` (version 3.0 desde el 6-sep-2026;
resume el pivote para la linea comercial). Plan de trabajo de esa linea: `R and D/embudo/RUTA_COMERCIAL_3.0.md`.
Ahi viven los niveles y precios (Free / Pro 499 lista, 349 lanzamiento con fecha, 3,990 anual / Founders 8,900
solo web / Elite por codigo), el contrato de metadata con Stripe, que ya existe y no hay que volver a construir,
y que esta fuera de alcance. Antes de proponer construir cualquier pieza de cobro, buscarla ahi y en
`supabase/functions/`.

Datos que se han vuelto a preguntar mas de una vez:
- La cuenta de Stripe **esta viva** desde antes de agosto. No hay activacion pendiente.
- `supabase/functions/payment-webhook` **ya existe**, desplegado y en vivo. Exige `metadata.tier`;
  `tier=pro` sigue siendo el valor correcto (el arbitro lo resuelve como `premium`).
- Los pagos en `needs_review` sin `metadata.tier` son **consultas de Mariana**, no suscripciones.
- Los tres Payment Links de la preventa (449, 620, 890) estan superados y se desactivan; los precios 3.0
  se crean desde la sesion comercial con Enrique. La sesion del repo no toca Stripe.
- **No hay comunidad** en la oferta. Nada nuevo menciona comunidad, mentorias, Skool ni a Mariana.

## Calibración al proponer planes

Regla de Enrique, 23 de agosto de 2026: el exceso de cautela ha costado
semanas. Ver sección 10 de `DECISIONES_PREVENTA.md`. En corto:

- Verificar en repo, base y panel **antes** de proponer.
- Supuesto por omisión: ya existe y ya está resuelto.
- Tiempos solo con fuente. Sin fuente, decir "no sé".
- Riesgos legales o fiscales solo si bloquean algo **esta semana**, y siempre
  diciendo qué evidencia los tumba.
- Costos con números de documentación, sin colchón.
- Una decisión tomada no se reabre sin evidencia nueva.

## Migraciones: el CLI NO abre transaccion

`npx supabase db push` (CLI 2.102) corre cada sentencia en autocommit. Se
descubrio el 1-sep-2026 cuando un `LOCK TABLE` trono en la sentencia 1 de la
311. Consecuencia: una migracion con varias sentencias que dependan unas de
otras, o con un bloque final que valide y lance excepcion, debe traer su
propio `BEGIN;` al principio y `COMMIT;` al final. Sin eso, la excepcion no
revierte lo anterior. Las migraciones de una sola sentencia o de puros
`ADD COLUMN IF NOT EXISTS` no lo necesitan.

## Antes de escribir copy

Palabras rojas (prohibidas en copy de usuario): diagnostico, diagnosticar, tratamiento, terapeutico,
previene, cura, receta medica, medico de IA, clinicamente validado, chequeo (en app y tiendas), ilimitado
(se dice "sin tope"). Elite es "evaluacion personalizada", nunca "diagnostico personalizado". Dentro de la
app nunca "web", "Stripe", "mas barato afuera" ni precios de la web. Tabla completa: seccion 4 de
`R and D/ORNAMENT_MEXICO_Y_MARCO_LEGAL_ATP.md`. Posicionamiento: "Entiende tus laboratorios y que hacer
con ellos". Frase de marca: "Tus habitos hacen tu salud".

`R and D/embudo/narrativa/MANUAL_DE_COMUNICACION.md` salio de una conversacion del 27-ago-2026 en la que
Mariana habla el 90% del tiempo; esta marcado PENDIENTE DE DECISION (conservar, anonimizar o reescribir).
Su idea central sigue siendo el porque del producto: **se monitorea porque se perdio la intuicion, y se
monitorea para volver a necesitar menos.** Mientras Enrique decide, se lee como contexto y no se cita a
Mariana en material nuevo.
