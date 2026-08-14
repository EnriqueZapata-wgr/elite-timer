# Economía ATP · Diagnóstico del caso Pato y plan de cierre

**Fecha:** 12-ago-2026. Evidencia: ledger real de proton_transactions + argos_logs + rastreo de código completo (agente).

## 1 · Qué le pasó a Pato, minuto a minuto (del ledger real)

1. Desde el 11-ago, sus insights fallaban con `insufficient_protons` (7 intentos fallidos registrados). Su problema era SALDO.
2. 12-ago 18:22:00 — convirtió electrones → +600 H+.
3. 18:22:46 — 46 segundos después, gastó 500 H+ en `pro_boost_24h`. **El boost sube el tope diario de acciones; no regala H+. Y ella es tier PRO: el boost no le servía de NADA.** La UI se lo vendió igual.
4. Quedó con ~100 H+. Un insight (45) le pasó. El chat cuesta 280: **sigue bloqueada, ahora con 90 H+.**

**Pagó dos veces (conversión + boost) y quedó peor.** No es un bug de transacciones (el ledger está íntegro, idempotente y cuadra): es la UI vendiendo el remedio equivocado. El bloqueo por saldo y el bloqueo por límite diario son dos cosas distintas y la app ofrece el boost para ambas.

Tu caso es la misma familia: tier pro, 1,030 H+; el Braverman premium cuesta 1,000 y cualquier racha de acciones te deja bajo el costo del chat (280). Además la pill del header no pinta H+ si no existe fila en electron_balance (bug del join).

## 2 · Correcciones YA aplicadas en el worktree

- `ttl: "1h"` en el bloque del cerebro (argos-proxy). La línea de $364K/año del doc de caché.
- PRICING a tarifa de introducción: la telemetría deja de mentir +33%.
- Paywall: "sin límites" → "150 consultas al día (6x más que Base)".

## 3 · Refund de Pato — REQUIERE TU APROBACIÓN

Ella gastó 500 H+ en un boost inútil para su tier. Propongo devolverlos (y el ledger queda documentado):

```sql
-- APROBAR ANTES DE CORRER · devuelve el boost inútil de Pato
INSERT INTO proton_transactions (user_id, amount, type, action_key, idempotency_key, metadata)
SELECT id, 500, 'refund', 'pro_boost_24h', 'refund_boost_pato_2026-08-12',
       '{"motivo":"boost vendido a tier pro; no aplicaba"}'::jsonb
FROM profiles WHERE email='d.i.patriciaaguilar@gmail.com';
UPDATE proton_balance SET current_protons = current_protons + 500
WHERE user_id = (SELECT id FROM profiles WHERE email='d.i.patriciaaguilar@gmail.com');
```

## 4 · Fixes de producto (briefs ECO para CC, todos OTA salvo el proxy)

**ECO-1 · El upsell correcto por tipo de bloqueo.** `insufficient_protons` → CTA "Recargar H+" (tienda), NUNCA boost. `rate_limited` → boost solo si tier ≠ pro. ProBoostCard jamás se muestra a tier pro. RateLimitCard corrige "24h sin límite" → "150/día".
**ECO-2 · Contador envenenado.** `increment_argos_usage` incrementa TAMBIÉN cuando bloquea: un usuario que insistió 200 veces compra boost y sigue bloqueado (200>150). El incremento solo debe contar acciones servidas.
**ECO-3 · tierCache sin invalidar.** Al activar boost, el proxy tarda hasta 30s+ en enterarse. Invalidar por userId tras activate_pro_boost.
**ECO-4 · Boost sin refund.** Si el INSERT en pro_boosts falla después de spend_protons, el débito queda sin compensación. Envolver con refund.
**ECO-5 · La pill del header.** No pinta H+ si falta fila de electrones (`if (!e || !p) return`). Aislar los dos saldos.
**ECO-6 · Dos árbitros de tier.** El cliente usa get_my_effective_tier (tier_grants); el proxy lee profiles.tier crudo e ignora tier_expires_at. Unificar en el proxy.
**ECO-7 · Catálogo 10x.** proton_packages vende 100,000 H+ por $99 cuando la doctrina es 10,000 ($0.01/H+). Corregir el seed antes de que alguien compre.

## 5 · Costos reales por interacción (post-caché y post-router) y precios propuestos

Base: Sonnet intro $2/M in · $10/M out · lectura caché $0.20/M · cerebro 26.3K tibio · FIX 17.14. Gemini Flash $0.30/$2.50.

| Interacción | Costo real estimado (MXN) | Cobro hoy (H+ = centavos) | Margen hoy | Propuesta |
|---|---|---|---|---|
| Chat salud (cerebro tibio) | ~$0.25 | 280 = $2.80 | ~11x | Mantener 280 al launch; hay espacio para bajar después |
| Navegar/configurar la app (ARGOS tool, sin cerebro, Gemini) | ~$0.01 | no existe | — | **GRATIS con tope antiabuso (50/día).** Cobrar por aprender a usar la app mata la adopción |
| Insight diario (batcheado) | ~$0.19 | 45 = $0.45 | ~2.4x | Mantener 45 |
| Foto de comida (Gemini) | ~$0.17 | 245 = $2.45 | ~14x | **Liberar sin tope en Base** (Audit-5): es el hábito ancla y cuesta centavos |
| DX funcional | ~$1.10 | 1000 = $10 | ~9x | Mantener |
| Braverman premium | ~$0.50 | 1000 = $10 | ~20x | Mantener (es reporte premium, no costo) |

La regla que pediste queda así: **consulta de salud = premium (cerebro completo), configurar/navegar = gratis (es adopción), extracción = casi gratis (Gemini).** Los números finos se recalibran con 2 semanas de telemetría ya corregida (PRICING intro + routed_model).

## 5b · DECISIONES DE ENRIQUE (12-ago, cierre) — ✅ APLICADAS EN PRODUCCIÓN

| action_key | Antes | Ahora | Regla |
|---|---|---|---|
| chat | 280 | **250** | ~10x |
| food_estimate_photo | 245 | **150** | ~8x |
| supplement_scan | 240 | **150** | ~8x (mismo trato que foto) |
| insight | 45 | **50** | y pasa a ser SOLO pro/boosteados → ECO-8 |
| braverman_premium_report | 1000 | **500** | |
| dx_generation | 1000 | 1000 | sin cambio |
| Navegar/configurar (futuro ARGOS navigator) | — | **GRATIS, tope 50/día** | se implementa con IMPL-05 |

Sin decidir aún (recalibrar con telemetría limpia en 2 semanas): food_estimate_text (155), lab_interpretation (165), voice_turn (400), intervention_rationale (280), bha_scan (500), weekly_insight (40).

**Refund de Pato: APLICADO.** +500 H+ con idempotency_key `refund_boost_pato_2026-08-12`. Saldo verificado: 590 H+.

**Catálogo de packs: FALSA ALARMA en producción.** La DB real vende 10,000/$99 (doctrina exacta), 50,000/$399 y 200,000/$1,199 con bonus por volumen. Solo el archivo seed 087 está mal → corregirlo para ambientes nuevos (ECO-7 se reduce a eso).

**ECO-8 (nuevo) · Insight solo pro/boosteados.** Gate server-side en argos-proxy: requestType 'insight' con tier free/base sin boost → respuesta amable con CTA, sin cobrar. El cliente deja de disparar el insight para esos tiers (ahorro doble).

## 6 · Orden de ejecución

1. HOY: deploy de argos-proxy (ttl + pricing + router apagado) · refund de Pato (con tu OK) · ECO-1 y ECO-5 (OTA).
2. Esta semana: ECO-2, 3, 4, 6, 7 · encender router en foto de comida · verificación con la query de acierto de caché (meta ≥90%).
3. Después: batch del insight en ventana (tarea 9) y recalibración de precios con telemetría limpia.
