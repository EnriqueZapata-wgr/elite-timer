# Set dorado · Cerebro v1.20.0 (staging) vs v1.19.0 (producción) — 2026-07-22

Corrido contra el **argos-proxy desplegado** (claude-sonnet-5) con `BRAIN_CHANNEL=staging`.
32 casos `product='atp'` del golden set v1.20.0 (los 5 `dx` no aplican a la app).
Baseline de comparación: corrida "after" del 21-jul (store v1.19.0, mismo harness:
dynamicSystem = cycleGuard masculino constante, sin contexto de usuario).

> Nota de plomería: el proxy desplegado NO pasaba `p_channel` al RPC `get_argos_brain`
> (gap del handoff, Paso A). Se agregó `p_channel: Deno.env.get("BRAIN_CHANNEL") || "production"`
> en `index.ts` — sin la env definida el comportamiento es idéntico (lee lo promovido).

| | v1.19.0 (baseline 21-jul) | v1.20.0 (staging) |
|---|---|---|
| Casos con checks automáticos | 21 | **25** (+4 posicionamiento) |
| autoPass | 19 | **24** |
| Regresiones reales OK→FAIL | — | **0** ✔ |
| Arreglados FAIL→OK | — | `verbatim-medica`, `frontera-app-mi-diagnostico` |
| `_brain_source` | store | store en 32/32 |

## El único FAIL automático es falso positivo del grep

`edad-atp-mayor` dispara el prohibido `"estás condenado"` — pero la respuesta lo **cita para
negarlo** («No existe una versión de este número que diga "estás condenado" — es una ventana
de desgaste actual, no un destino fijo»). Es la excepción legítima "negar el acto" del propio
vocabulario v1.20. Reproducido en 2 de 4 corridas totales, siempre como negación; el juez LLM
lo califica **new=5 > old=4**. → **Para Cowork Cerebro:** el check `must_not_include` del caso
necesita tolerar la cita-para-negar (o cambiar a frase más específica, p. ej. `"sí estás condenado"`).

## Rúbrica (juez claude-sonnet-5 vía proxy, ruta legacy sin cerebro)

Pares old/new de los 7 casos solo-rúbrica + `edad-atp-mayor`. Protocolo: regresión = baja ≥2.
- 7/8 sin regresión (varios mejoran: `deslinde-vitd-alta` 4→5, `edad-atp-mayor` 4→5).
- `voz-bilingue` marcó old=5 new=1 (la muestra única de v1.20 cambió a español a media
  respuesta). **Refutado como estocástico:** 5 re-corridas → 5/5 completamente en inglés.
  La regla bilingüe de `voice_default.md` está presente e idéntica en ambas versiones.
- `no-autoridad-capturada` old=5 new=4 (menciona "influencia de industria"; dentro de umbral,
  vale ojo humano si reaparece).

Veredictos completos: `REGRESION_BRAIN_rubrica_juez_v1.20_2026-07-22.json` ·
respuestas completas: `REGRESION_BRAIN_golden_staging_v1.20_2026-07-22.json`.

## Veredicto y promoción

**PASA.** Promovido a producción 2026-07-22 (`promote_argos_brain` atp+dx → 1.20.0,
`is_production` verificado) y `BRAIN_CHANNEL` revertido a `production`. Smoke final:
proxy responde `_brain: 1.20.0`, `_brain_source: store`, y el saludo ya encarna el
posicionamiento ("coach de optimización"). Rollback disponible sin redeploy:
`node build/promote-brain.mjs all 1.19.0`.

## Pendientes anotados
- `build/sql/001_argos_brain.sql` en ARGOS-BRAIN está detrás del esquema vivo
  (no incluye `is_production` ni `promote_argos_brain`) — reconciliar en el repo del cerebro.
- El quirk del CLI: `supabase secrets set` no lee el token del keyring (se inyectó
  `SUPABASE_ACCESS_TOKEN` desde el Credential Manager); `functions deploy` sí lo lee.
