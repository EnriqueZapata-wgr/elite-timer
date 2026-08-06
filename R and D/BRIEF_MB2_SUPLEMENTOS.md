# 🔧 BRIEF · MB-2 Suplementos — cerrar costuras (para CC)

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mb2-suplementos` desde `main`. NO merge, tests verdes, Cowork audita.
**Contexto (auditoría Cowork):** el módulo YA está ~80% construido (multi-toma AM+PM, scan→plan, Functional Score, agenda, HOY — todo implementado en un sprint previo). **Esquema verificado vivo en remoto** (`dose_index`, `dose_times`, `functional_score`). Esto NO es build; es **polish + unificar 2 costuras**. Todo OTA-able (sin migración esperada).

## 🟡 VENTANA DE VETO (defaults de Cowork — Enrique vetea si algo no cuadra)
Las decisiones van bakeadas abajo. Si Enrique no veta, se procede así.

## Alcance (en orden)

### 1 · Unificar las 2 puertas de scan *(P1 — la costura principal)*
Hoy hay dos flujos inconsistentes:
- **`BhaScanSheet` (scanner del header de `/supplements`)** → evalúa y da Functional Score, pero en modo standalone (`supplement: null`) **NO crea ficha** (`BhaScanSheet.tsx:98-101`).
- **`food-scan` modo suplemento** (`app/food-scan.tsx:435-461`) → **crea ficha pero SIN score** (timing morning, 1 toma).
- **Default bakeado:** que el scanner del header pueda **"Agregar al plan"** creando la ficha **CON su functional_score** de una (evalúa + agrega en un solo flujo). **Dedupe por nombre** (no crear duplicado si ya existe la ficha; ofrecer actualizar el score). El flujo de food-scan puede quedar como está o redirigir a este — CC elige lo más limpio.

### 2 · Adherencia por TOMA, no por día *(P1)*
`takenDaysBySupplement` (`supplements-adherence-core.ts:59-79`, comentado "v1") cuenta el día completo aunque solo se haya tomado 1 de 2 tomas. **Default:** medir adherencia por toma real (Σ tomas tomadas / Σ tomas esperadas), consistente con `supplementsTodayProgress`. Ajustar los tests.

### 3 · Pulido UX del alta *(P2)*
- Los 4 selectores (Tomas al día / Frecuencia / Cuándo / Forma) son **ScrollViews horizontales de chips** (`app/supplements.tsx:544,565,582,605`) que se salen de pantalla sin aviso. **Default:** que los chips hagan wrap (flex-wrap) o un picker compacto — que se vea todo sin scroll horizontal.
- **Autocomplete sobre el historial del PROPIO usuario** al escribir el nombre (respeta la doctrina de "sin catálogo grande" — NO metas una base de suplementos; solo sugiere lo que el user ya ha tecleado antes). Ayuda a re-agregar sin re-teclear.

### 4 · Picker de hora `HH:MM` para las tomas *(P2 — completa la feature)*
El esquema y la agenda ya aceptan `HH:MM` (`agenda-service.ts:213`), pero la UI solo ofrece las 4 etiquetas fijas (mañana/comida/tarde/noche). **Default:** agregar opción de hora custom en el multiselect de "Tomas al día".

## Fuera de alcance (NO tocar)
- El `action_key`/`requestType` sigue siendo `'bha_scan'` — es acoplamiento server-side de cobro H+, **no lo renombres** (romperías la 189). El rename cosmético Bha→FunctionalScore de archivos queda para nunca / cuando estorbe.
- Catálogo/biblioteca de suplementos: NO (doctrina = librería vacía, free-type).

## Protocolo
`feat/mb2-suplementos`, NO merge, `tsc` + tests verdes, delivery con checklist device-test. Cowork audita → merge → OTA (sin migración). Si algo sí pide migración, idempotente + RLS.
