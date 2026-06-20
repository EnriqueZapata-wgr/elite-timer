# ATP App — Contexto del Proyecto

## Quién soy
Enrique Zapata — Ingeniero en automatización, coach de rendimiento humano,
Guinness World Record en pull-ups. Co-fundo ATP con Mariana Zapata
(Co-Founder & Chief Science Officer, PhD en Ciencias Biomédicas).

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
v1.2.x (89 pantallas, 68K líneas, 430+ commits, 0 errores TS)
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
10. Native builds solo para cambios nativos o nueva versión
11. NUNCA cambiar versión en app.json sin hacer build inmediato
12. Migraciones SQL:
    - Idempotentes obligatorias (IF NOT EXISTS / ON CONFLICT DO NOTHING)
    - Cowork audita branch antes del merge
    - Después del merge: `npx supabase db push` aplica al remoto (Supabase CLI linkeado al proyecto)
    - SQL Editor solo para queries puntuales / debug, no para migraciones rutinarias

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
- Modelo: claude-sonnet-4-20250514 (TODO: migrar a 4-6 en PROMPT_004)
- Edge Function: anthropic-proxy (TODO: argos-proxy + fallback OpenAI)
- Contexto: Braverman + quizzes + glucosa + UV + ejercicio + ayuno + protocolo + cronotipo
- Rate limits per tier — pendiente PROMPT_004

## Observabilidad activa
- Sentry: errors + sessions, project atp-mobile en atp-v5 org
- PostHog: events + lifecycle, project ATP en us.posthog.com
