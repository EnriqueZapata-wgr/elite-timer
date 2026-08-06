# 🏠 AWAY RUN · MB-11 — HOY sólido + Edad ATP al molde editorial

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mb11-hoy-edad` desde `main`. NO merge, **NO tocar la versión**, **NO `db push`**. Cowork audita.
**Origen:** inventario de Cowork sobre HOY y el clúster Edad ATP (2026-07-28). Es el bloque grande que sigue a Emociones en la marcha hacia V2 completa.

---

## 📊 Lo que dice el inventario, en números

| | |
|---|---|
| `app/(tabs)/index.tsx` | **2,123 líneas** |
| Queries a Supabase en HOY | 16 · **solo 2 chequean `error`** |
| `GradientCTA` en todo el ecosistema HOY | **0 usos** |
| Código muerto en HOY | `HoyDayCard.tsx`, 177 líneas, **cero importadores** |
| Fetch duplicado de wearable | **3 lugares** independientes |
| Clúster Edad ATP | 30 archivos · ~3,467 líneas |
| `neonGreen` en Edad ATP | **64 ocurrencias** en 17 pantallas + 13 de 14 componentes |
| `GradientCTA` en Edad ATP | **0 usos — nada migrado** |
| Tratamiento editorial de imagen en Edad ATP | **0 pantallas** |

---

# 🔴 TRACK A · LOS FANTASMAS DE HOY *(P0, va primero)*

**14 de las 16 queries de HOY no verifican el campo `error`.** Es **exactamente el patrón de MB-6** — el que dejó el score de nutrición clavado en 50 y el de protocolo en 0 durante semanas.

**Recordatorio del mecanismo:** `supabase-js` **no lanza excepción en 4xx**. El error viene en `{ error }`. Un `try/catch` alrededor **no lo ve**: el código recibe `data == null` y cae al fallback como si no hubiera datos. Falla en silencio y muestra un número plausible.

**Y esto es HOY**, la pantalla que el usuario abre todos los días.

Las que no chequean (`app/(tabs)/index.tsx`):
`edad_atp_calculations` L262 · `user_supplements` L352 · `supplement_logs` L353 · `journal_entries` L354 · `client_profiles` L449 · `argos_daily_insights` L559 y L576 · `daily_plans` L747 y L762 · `user_day_preferences` L776 · `supplement_logs` L836 y L845 · `daily_electrons` L867 y L874.

**Default:** cada una chequea `error` y **lo loguea** aunque degrade en silencio hacia el usuario. Y aplica la regla de MB-6: **un fallback nunca devuelve un valor que se confunda con un dato real** — "sin datos" y "cero" son estados distintos.
**Además:** cruza cada query contra el esquema real del remoto (columnas que existan, tipos de filtro correctos). Si aparece otra columna fantasma, es del mismo linaje.

---

# 🏠 TRACK B · HOY AL MOLDE EDITORIAL

**B.1 · Cero `GradientCTA` en toda la pantalla principal.** Los CTA usan `backgroundColor: '#a8e02a'` hardcodeado (`nextElectronBtn`, `retryBtn`, entre otros). **Default:** migrar al molde `GradientCTA` como en Fitness y Nutrición post-MB-8.

**B.2 · Código muerto.** `src/components/economy/HoyDayCard.tsx` (177 líneas) **no lo importa nadie** — quedó reemplazado por `HoyDayCardEditorial.tsx`. Verifica y retíralo.

**B.3 · El wearable se pide tres veces.** `getWearableDataForDate()` se llama por separado en `app/(tabs)/index.tsx`, `app/(tabs)/yo.tsx` y `app/sleep.tsx`, cada una con su propio estado. **Default:** una sola fuente compartida. Mismo dato, una llamada.

**B.4 · El doc-comment miente.** El encabezado del archivo describe una estructura de 6 secciones que ya no existe: hay comentarios marcando **6 bloques legacy eliminados** y reemplazados por `HoyEditorialSection`. **Default:** actualizarlo a la realidad. Un archivo de 2,123 líneas cuyo mapa está mal es una trampa para quien llegue después.

**B.5 · Doctrina de menú.** HOY es la pantalla más vista y concentra métricas. Revisa que **un dato viva en un solo lugar**: si el score, los pasos o las calorías ya se ven en su pilar, no se repiten aquí como dato duro. Coaching y síntesis sí; datos crudos duplicados no.

---

# 📊 TRACK C · EL BLOQUE TRANSVERSAL DE ZERO

Ya está analizado y aprobado en `R and D/SPEC_ADOPCIONES_ZERO_A_ATP.md` (sección "adoptar, pero es otro pilar"). **Léelo antes de este track.**

**Default:**
1. **Calendario con puntos de color por métrica** (ayuno · proteína · agua · sueño · actividad). Adherencia densa y legible de un vistazo.
2. **Barras con "meta cumplida / no cumplida"** por color. Se entiende sin leer la leyenda.
3. **Gráficas personalizables:** el usuario reordena y prende o apaga las que quiere. Es *guiado no prisionero* aplicado a los datos.
4. **Stats de identidad** (total de sesiones, racha más larga, marca personal) — alimentan la narrativa de progreso.
5. **Toggle semana / mes / año** en tendencias.

⛔ **NO se adopta** la densidad de upsell de Zero ni ningún medidor de un solo macro. El razonamiento completo está en el SPEC.

---

# 🎨 TRACK D · EDAD ATP AL MOLDE EDITORIAL

**El clúster entero sigue en visual plano legacy**: 64 usos de `neonGreen`, cero `GradientCTA`, cero tratamiento editorial de imagen. Es la deuda visual más grande que queda en la app.

### D.1 · 🔑 Empieza por los dos componentes compartidos — ahí está el apalancamiento
`src/components/edad-atp/StopwatchTestScreen.tsx` (133 líneas) y `QuestionnaireScreen.tsx` (90 líneas) **alimentan 11 de las 30 pantallas**, que son envoltorios de 17 a 25 líneas. **Migrar esos dos cascadea a once pantallas casi gratis.** Hazlo primero.

### D.2 · Después, por volumen de deuda
`index.tsx` (10 usos) · `biomarkers.tsx` (9) · `lab-confirmation.tsx` (7) · `test-recovery-hr.tsx` (5) · `reaction-time.tsx`, `test-old-man.tsx`, `cognitive.tsx` (4 c/u) · y el resto.

### D.3 · El token está anclado en la raíz
`src/components/edad-atp/tokens.ts` define `EDAD_STATUS.good = Colors.neonGreen`. **Mientras eso siga ahí, el verde plano se reproduce solo.** Cámbialo en el token, no pantalla por pantalla.

### D.4 · Falta el tratamiento editorial de imagen
Ninguna pantalla del clúster usa `ImageBackground` ni imagen de header, a diferencia de HOY y de "Mis Datos". **Default:** llevar las pantallas de entrada del módulo al mismo molde editorial. Vara: `docs/DESIGN_SYSTEM.md` y la referencia lograda en Mente V1.5.2, Fitness post-MB-7 y Nutrición post-MB-8.

✅ **Buena noticia:** el antipatrón de opacidad apilada **no existe** en este clúster. No hay que limpiar antes de pintar.

---

# 🧹 TRACK E · CIERRE
1. Barrido de `error` sin chequear en los servicios que alimentan HOY (`day-compiler`, `hero-recommendation-service`, `daily-review-service`), con el mismo criterio del Track A.
2. Retirar cualquier otro componente huérfano que aparezca en el camino, **verificando importadores antes**.
3. **Vacíos que informan** en todo lo que toques: qué le falta para existir, nunca un cero pelón.

---

## 🧾 Protocolo
`feat/mb11-hoy-edad` desde `main`. Commit por track. Migraciones idempotentes si hacen falta. `npx tsc --noEmit` (0) + tests verdes + eslint sin errores nuevos. **NO merge, NO tocar versión, NO `db push`.**

**Orden:** A primero (es el que puede estar corrompiendo datos hoy), luego D.1 (el atajo de los componentes compartidos, máximo resultado por esfuerzo), y de ahí B, C, D.2-D.4, E.

**Delivery con:**
- Las 14 queries de HOY corregidas, **y cuáles estaban fallando de verdad** contra el remoto.
- Confirmación de que `HoyDayCard.tsx` no tenía importadores antes de retirarlo.
- Cuántas pantallas de Edad ATP quedaron migradas y cuántas siguen con `neonGreen`.
- **Dónde paraste** si no llegaste al final, y por qué esa frontera es limpia.
- Checklist de device test por track.
