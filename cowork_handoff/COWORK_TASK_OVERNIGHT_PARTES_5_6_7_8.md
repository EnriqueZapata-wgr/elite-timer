# COWORK_TASK — Sprint OVERNIGHT 2: Continuar Partes 5b + 6 + 7 + 8 del backlog 19-jun

**Origen:** sprint anterior (`feat/bugs-p0-backlog-19jun`) completó Partes 1-4 + T1 limpio y paró por tiempo. Este overnight continúa desde donde quedó. Branch anterior YA mergeado a main. Migraciones 077/078 YA aplicadas.

**Branch:** `feat/overnight-partes-5b-6-7-8` desde `main` actual.
**Estimado:** 8-12h CC overnight.
**SQL:** ⚠️ migraciones 079 + 080 esperadas (`historia_clinica`, `pregnancy_status`).
**Deploy:** ❌ NO merge, NO OTA — Enrique valida en la mañana.

**Filosofía:** misma que antes — orden estricto, ante duda flag en COWORK_REPORT.md y continúa, NO bloquearse. Si una parte no cabe limpia, NO la empieces.

---

# SPEC COMPLETA — Lee primero esto:

**El spec detallado de TODAS las partes está en:**
👉 `cowork_handoff/COWORK_TASK_OVERNIGHT_BUGS_P0_BACKLOG_19JUN.md`

Específicamente las secciones:
- **PARTE 5** (Tests + Cuestionarios + Historia Clínica funcional) → 5.2 (T2 Tests UI Braverman) y 5.3 (T3 + HC5 Cuestionarios HC)
- **PARTE 6** (HOY agenda + notificaciones)
- **PARTE 7** (Ciclo máscara embarazo)
- **PARTE 8** (ARGOS al menú inferior)

**T1 ya está hecho** (Test Cronotipos en sección Tests, mergeado). NO lo toques.

---

# ORDEN ESTRICTO

1. **PARTE 5b** — T2 (Tests UI Braverman) + T3+HC5 (Cuestionarios HC funcionales)
2. **PARTE 6** — H3 agenda respeta protocolo + H7 notificaciones ARGOS
3. **PARTE 7** — C3 máscara embarazo
4. **PARTE 8** — N1 ARGOS al menú inferior

**Si en algún momento ves que la parte siguiente tomaría más de 1h y solo te quedan 30 min, NO la empieces.** Commit limpio del estado actual + flag claro en COWORK_REPORT.md.

---

# CONTEXTO ACTUALIZADO (cosas que cambiaron del overnight anterior)

## Migraciones disponibles (ya aplicadas en prod)
- 076 lab_uploads async worker (trigger sin GUCs)
- 077 lab_results columnas faltantes (37 biomarcadores nuevos canónicos)
- 078 ketones_logs

## Tablas/funciones que YA existen post overnight 1
- `lab_uploads` con status enum extendido + trigger `on_lab_upload_pending`
- `ketones_logs` espejo de glucose_logs
- `lab_results` con ~37 columnas nuevas
- `lab-canonical-map.ts` con nuevos keys (ver `cowork_handoff/AUDIT_LABS_BIOMARKERS.md`)

## Componentes/cambios que ya están en main
- Calendario CICLO con `cycle-calendar.ts` helper + 7 días + onLayout
- Mi ATP con 3 cards grandes (Historia Clínica, Hábitos, ATP MI SALUD)
- Historia Clínica con re-ruteo (Biomarcadores → `/health-input`, Laboratorios → ATP LABS, sin Dominios, sin ATP SOL)
- ATP LABS sin título doble
- Nutrición sin Hidratación ni Ayuno
- HOY: chip "🔥 racha" eliminado del header
- Tests sección incluye Cronotipos
- Cetonas `/ketones-log` funcional

## NO TOQUES
- Motor v2, parser AI v2, ARGOS proxy, economía Protones (no construido)
- Lab-parser-worker Edge Function
- Sprints UI Phase 1 (PressableScale, tokens, glow, ELEVATION)
- Nada de lo ya mergeado del overnight anterior — solo extiende

---

# FLAGS PRE-RESUELTOS (no necesitas decidir)

- **Cuestionarios HC**: las preguntas exactas necesitan validación clínica de Mariana. **Propón preguntas estándar de medicina funcional** (basadas en cuestionarios reconocidos como NAQ, MSQ, ION, IFM toolkit) y documenta cuáles usaste. Mariana después afina. Si no caben los 7 cuestionarios, los 3-4 más críticos (padecimientos personales + familiares + tratamientos + salud bucal) son prioritarios.

- **Ciclo máscara embarazo**: scope clínico mínimo. Toggle + due_date + cálculo de trimestre + adaptación visual del calendario. Tracking de síntomas específicos (náuseas/movimientos/etc) puede ser MVP simple, Mariana lo afina después.

- **ARGOS al menú inferior**: si el TabBar tiene 4 tabs hoy, agrega ARGOS como 5to. Si el layout queda mal con 5 columnas, ajusta widths proporcionales. Eliminar el FAB ARGOS actual. NO romper deep links existentes.

---

# ENTREGABLE

## Tests obligatorios
- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos existentes pasan + nuevos
- [ ] Tests nuevos por parte trabajada (helpers puros, reducers, validadores)

## Migraciones esperadas (idempotentes, NO ejecutar — Enrique las corre con `npx supabase db push`)
- **079_historia_clinica.sql** — tabla `historia_clinica` (user_id, jsonb categorías, last_updated) + RLS
- **080_pregnancy_status.sql** — agregar columna o tabla pregnancy_status (decidir según diseño)

## COWORK_REPORT.md — sección "Estado de avance por parte"

| Parte | Items | Estado |
|---|---|---|
| 5b | T2 (Tests Braverman) · T3+HC5 (Cuestionarios HC) | ✅ / 🟡 / ❌ |
| 6 | H3 (agenda protocolo) · H7 (notif ARGOS) | ✅ / 🟡 / ❌ |
| 7 | C3 (máscara embarazo) | ✅ / 🟡 / ❌ |
| 8 | N1 (ARGOS menú inferior) | ✅ / 🟡 / ❌ |

## Push pero NO merge, NO OTA
- Branch pusheado a `origin/feat/overnight-partes-5b-6-7-8`
- Enrique audita + decide merge en la mañana
- Migraciones como archivos .sql, NO ejecutadas

---

# RECORDATORIOS CRÍTICOS

1. NUNCA reescribir archivos completos → solo str_replace quirúrgico
2. NUNCA `crypto.randomUUID` → usar `generateUUID` helper
3. SIEMPRE `getLocalToday()` / `parseLocalDate()` para date queries
4. CADA CREATE TABLE → ENABLE ROW LEVEL SECURITY + policy
5. Después de mutaciones electrones / day: emit DeviceEventEmitter
6. `Constants.expoConfig.extra` (no process.env directo)
7. `npx tsc --noEmit` antes de commit
8. PowerShell 5.1 sin `&&` en comandos sugeridos
9. OTA por default — NO en este sprint
10. Migraciones SQL como archivos .sql, NO ejecutarlas (regla #12)

---

# STACK CONTEXT

- React Native + Expo SDK 54 + TypeScript + Supabase
- Tokens canónicos: BG / BORDER / TEXT / ELEVATION
- Reanimated 4 + gesture-handler + expo-blur + expo-haptics + expo-notifications
- DeviceEventEmitter para `day_changed`, `electrons_changed`
- PressableScale primitive del kit
- Supabase CLI linkeado (db push automático post-merge)

Buena overnight 🌙
