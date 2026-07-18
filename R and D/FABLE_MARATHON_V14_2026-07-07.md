# FABLE 5 CC — MARATHON OVERNIGHT V1.4

**Kickoff:** 2026-07-07 noche tarde
**Autor:** Cowork
**Working directory:** `D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer-Fable`
**Branch:** `feat/v14-marathon-nightrun` desde main
**Objetivo:** ADELANTAR V1.4 con features high-impact autónomas mientras Google Play aprueba
**Estimación:** 10-14h (marathon, no sprint — completa lo que puedas)

## Filosofía

Enrique se va a dormir. Vas a la distancia sostenida (marathon) — NO sprint. Si algo se pone complejo, pasa al siguiente. Al final, prioriza haber terminado 4-5 features completas vs. 8 a medias.

**Orden estricto (de chico a grande):** F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8.
**Corta línea:** si llevas 8h efectivas, cierra el commit actual y push. NO te agobies.

## Setup

```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer-Fable
git pull origin main   # trae POLISH + RevenueCat + TESTING FIXES + Cowork críticos
npm install
npx tsc --noEmit       # baseline 0 errores
vitest run             # baseline 775/775 esperado
git checkout -b feat/v14-marathon-nightrun
```

## 🚨 REGLAS

1. **NO OTA/build.** Solo merge+push al final.
2. Verifica cwd + branch antes de cada commit.
3. Migraciones range 160-199.
4. Cowork puede estar trabajando en paralelo — coordina si tocas archivos de ARGOS/economy.
5. Push CADA feature terminada individualmente (no acumules 8 antes de push). Si te cansas, lo que ya está pusheado sirve.

---

## 📋 SCOPE — 8 FEATURES

### F1 · Cherry-pick orphans p5b (#67) — 2h

**Contexto:** hay 5 cuestionarios de Historia Clínica huérfanos (TestQuestionScreen + 5 quizzes) mencionados como "orphans p5b M5" en el backlog. Se olvidaron de mergear en un sprint anterior.

**Acción:**
1. Grep en el repo por `TestQuestionScreen`, `cuestionarios HC`, o "M5" para encontrar dónde está el código huérfano
2. Si están en algún branch viejo o commit sin mergear: cherry-pick al branch actual
3. Wire con Historia Clínica (task #77 ya merged) — probablemente cada quiz es un módulo funcional (energía, glucosa, hormonal, etc.)
4. Tests unitarios básicos

**Si no encuentras el código:** documenta en el reporte y skip (no bloquea).

**Deliverable:** cuestionarios integrados en HC o documentación de por qué no.

---

### F2 · Explicar H+ visualmente (#99) — 2h

**Contexto:** Enrique quiere que los users entiendan cómo se ganan Protones H+. Actualmente es opaco.

**Deliverable:**
- Nueva pantalla `/economy/how-to-earn` con visuals editoriales explicando:
  - **Electrones** (⚡) — se ganan cumpliendo hábitos verificados. Sube rank permanente.
  - **Protones H+** (💎) — moneda transable. Se ganan convirtiendo electrones o comprando packs. Se gastan en ARGOS Pro boost / shop / features.
- 3-4 cards con animaciones sutiles (Reanimated) mostrando el flow
- CTA "Empezar a ganar" → HOY

**Wire:**
- Card informativa en HOY (una sola vez, dismissable): "¿Qué son los H+?" → link a la nueva pantalla
- Link desde Wallet screen

**Deliverable:** pantalla + wire + tests.

---

### F3 · Journal screen dedicada (#39) — 3-4h

**Contexto:** actualmente Journal existe pero sin pantalla dedicada de historial/filtros.

**Deliverable:** `app/journal.tsx` o `app/mente/journal.tsx` con:
- Header editorial "Journal"
- Lista cronológica de entradas (últimos 30 días default)
- Filtros:
  - Rango de fechas
  - Tipo de entrada (reflexión, gratitud, meta, sueño)
  - Búsqueda por texto
- Cada entrada expandible con preview + fecha + tags
- Editar entradas existentes
- Eliminar entradas con confirmación
- Nueva entrada FAB (flotante) → modal editor
- Streak counter en header ("14 días escribiendo")
- Export a PDF (opcional, V1.5)

**Backend:**
- Tabla `journal_entries` probablemente ya existe (revisar). Si no, migración nueva con:
  - id, user_id, content, entry_type, tags, created_at, updated_at
- RLS estricta

**UX:** editorial ATP (B/N + acento lima), NO app de terapia clínica.

**Deliverable:** pantalla + filtros + edit/delete + tests.

---

### F4 · Sistema de rangos v2 (#100) — 3h

**Contexto:** actualmente los rangos permanentes son "Partícula → Supernova". Enrique quiere renombrarlos + agregar easter eggs.

**Nombres nuevos (Enrique confirmó — ver [[project_pricing_atp_v13]]):**

Ordenados por electrones ganados históricamente:

1. **Explorer** (0-49)
2. **Biohacker** (50-199)
3. **Optimizer** (200-499)
4. **Longevo** (500-999) — NUEVO
5. **Master** (1,000-2,499)
6. **Legend** (2,500-4,999)
7. **Inmortal** (5,000-9,999) — NUEVO
8. **Brian Johnson** (10,000+) — easter egg
9. **God** (secret, ultra rare, condiciones especiales — 25K+ o similar)

**Cambios:**

1. Actualizar `constants/rankSystem.ts` (o donde vivan) con los nuevos nombres + tiers
2. Cada rango con visual editorial dedicado — para AHORA usa emoji o icono simple, imagen MJ B/N puede venir después
3. Migración 160 para retro-nombrar rangos existentes de users (SI se guarda el nombre en DB — verificar; si es calculado dinámicamente, no migración necesaria)
4. Reveal animation al subir de rango (Reanimated fade+escala)
5. Comparación visual en Wallet: "Eres Longevo · faltan 234 electrones para Master"

**Deliverable:** constants actualizados + visual reveal + wallet update + tests.

---

### F5 · Braverman reporte PREMIUM ARGOS (#90) — 3-4h

**Contexto:** el test Braverman (313 preguntas, 4 naturalezas: dopamina/acetilcolina/GABA/serotonina) actualmente muestra un reporte básico. Enrique quiere reporte PREMIUM generado por ARGOS con análisis profundo.

**Deliverable:**

Nueva sección post-Braverman: "Reporte PREMIUM ARGOS" (visible solo Pro o comprable con H+).

Contenido generado por ARGOS al terminar el test:
- **Perfil dominante** con proporciones específicas ("62% dopamina, 22% acetilcolina, 10% GABA, 6% serotonina")
- **Análisis por naturaleza:**
  - Fortalezas
  - Vulnerabilidades
  - Patrones de comportamiento típicos
- **Recomendaciones específicas por naturaleza:**
  - Nutrientes clave
  - Suplementos target
  - Estilo de ejercicio
  - Prácticas mentales
- **Compatibilidad con perfil ATP** (integración con Edad ATP + habits)

**Backend:**
- Al terminar el test, si tier=pro o tiene boost activo: dispara automáticamente `argos-proxy` con requestType="braverman_premium_report"
- Prompt específico que le pasa las proporciones + user context (edad, sexo, síntomas)
- Cache el reporte en `braverman_premium_reports` table (evitar re-generar)

**Frontend:**
- Botón "Ver reporte PREMIUM" post-quiz
- Loading state con animación (30-60s)
- Reporte editorial (markdown → styled components)
- CTA para users free/base: "Desbloquea con boost H+"

**Deliverable:** flow completo + prompt engineering + cache + gate por tier.

---

### F6 · Shop de Protones H+ editorial (#101) — 4-6h

**Contexto:** el shop actual es "callejón trasero de antro". Enrique quiere editorial premium.

**Guidelines diseño (memoria [[project_economia_protones_h_plus]] + task #101):**
- B/N cinematic con acentos bronce/dorado sutil
- Tipografía editorial premium
- Cards como piezas de galería, NO catálogo genérico
- Espaciado generoso
- Imágenes premium por item

**Estructura del Shop:**

**Categorías (editorial cards horizontales):**
1. **Protocolos** — desbloqueo de protocolos premium individuales
2. **Análisis ARGOS** — reportes profundos custom (Braverman ARGOS analysis, edad ATP report)
3. **Boost Pro 24h** (task #133 ya hecha) — 500 H+
4. **Boost Pro Semanal** — 3,000 H+ (nuevo, 7 días)
5. **Regalar H+** — enviar a otro user (community feature)

**Detalle de item:**
- Hero image editorial
- Descripción poética breve
- Precio en H+ tachado en MXN
- Botón "Canjear"

**Confirmación de compra:**
- Modal editorial que respeta el momento
- Sonido sutil (mismo TU DÍA electrón chime)
- Animación reveal item unlocked

**NO hacer:** sonidos gambling, confetti excesivo, colores neón, "Ofertas relámpago".

**Backend:**
- Tabla `shop_items` con categorías + costos H+ + descripción
- Tabla `shop_purchases` con historial

**Deliverable:** pantalla shop + 5 categorías + flow de compra + tests.

---

### F7 · ARGOS Recipes cross-módulo (#96) — 3h

**Contexto:** ARGOS genera recetas pero sin considerar labs históricos + genética + preferencias.

**Deliverable:**

Actualizar `argos-recipes` generator para incluir en el prompt contextual:

1. **food_preferences** table (si existe): alergias, intolerancias, preferencias
2. **labs históricos**: si el user tiene deficiencia de X biomarcador, priorizar recetas ricas en Y
   - Ej: ferritina baja → recetas con hierro heme (carne roja, hígado)
   - Ej: vit D baja → recetas con salmón/sardinas
   - Ej: glucosa alta → recetas low-carb
3. **Genéticos** (si Circle DNA o ADNTro está conectado, task #82 futura): SNPs relevantes
4. **Objetivos del user**: si busca "perder grasa" → keto priority; "ganar músculo" → alta proteína
5. **Ciclo menstrual** (para mujeres cíclicas): fase folicular → carbs OK; fase lútea → menos carbs

**Frontend:**
- Nueva UI en argos-recipes con toggle "Personalización avanzada"
- Al activar: ARGOS considera cross-módulo. Sino, usa lógica actual (más rápido/barato).

**Deliverable:** enrichment del contexto + toggle UI + tests de prompt engineering.

---

### F8 · ARGOS Routines modo coach exigente (#97) — 3h

**Contexto:** las rutinas actuales de ARGOS son "rancias" (3 lagartijas, típico). Enrique quiere que ARGOS actúe como coach EXIGENTE que reta al user.

**Deliverable:**

Nuevo modo en ARGOS routines: **"Modo Coach Exigente"** (toggle en settings o directamente en pantalla).

Cambios en el prompt de ARGOS routines:

- Instrucción: "Eres un coach EXIGENTE. NO recomiendes '3 lagartijas'. Reta al user con volumen y variedad. Considera su nivel actual (Edad ATP, biomarcadores, tests) para calibrar la intensidad. Sé motivador pero directo. Cuando el user es principiante, empieza fuerte pero progresivo. Cuando es avanzado, no le tires basura fácil."

Ejemplos de rutina "coach exigente":

**Beginner:**
```
LUNES · TREN SUPERIOR
- Push-ups: 5 series × máximo repeticiones (llega al fallo técnico)
- Rows con banda: 4 × 15
- Plank: 3 × 45s
- Dead bug: 3 × 12 c/lado
Notas: si terminas con energía, agrega otra ronda. No termines "cómodo".
```

**Advanced:**
```
LUNES · POWERLIFTING BASE
- Squat: 5 × 5 @ 85% 1RM
- Bench Press: 5 × 5 @ 85% 1RM
- Deadlift: 3 × 3 @ 90% 1RM
- Weighted pull-ups: 4 × máx (agregar peso hasta llegar a 6 reps límite)
Volumen ~65 min. Foco en tension technique y velocidad de barra.
```

**Frontend:**
- Toggle "Modo Coach Exigente" en `/argos-routine`
- Visual editorial cuando está activo (icono llama roja)
- Tag "EXIGENTE" en la rutina generada

**Deliverable:** enrichment prompt + toggle UI + copy tests.

---

## 📦 ENTREGABLES

Al terminar cada feature — PUSH INMEDIATO. No acumules 8 antes de push.

Al final, en branch `feat/v14-marathon-nightrun`:

1. Commits limpios por feature
2. Tabla estándar con estado por feature (completado / parcial / skipped)
3. Migraciones aplicadas al remoto
4. `npx tsc --noEmit` = 0 errores
5. `vitest run` = todos passing
6. Push a origin, listo para audit
7. Reporte marathon: qué cerraste completo, qué quedó a medias, qué skipped y por qué

## 🎯 REALISTIC EXPECTATIONS

Enrique NO espera que cierres las 8. Espera que cierres 4-5 completas y las demás avancen. **Priorizar terminadas > 8 a medias.**

**Si algo se pone caliente:** documenta el bloqueador + skip + siguiente.

**Si te sobra tiempo tras F8:** puedes empezar con features V1.4 bonus:
- #79 Edad ATP → OUTPUT recomendaciones
- #55 Guía LABORATORIOS PDF

Pero NO obligado.

---

## 🚫 FUERA DE SCOPE

- Wearables (#45, #112) — requieren build nativo, mejor en sprint dedicado
- Widgets nativos (#60) — requieren build nativo
- Siri Shortcuts (#113) — requieren build nativo
- Backend clínico Fx (v1.5)
- HUB Fx Consulta
- CX audits (Fitness/Mente) — requieren decisiones de Enrique

## 🏁 KICKOFF

Fable:

1. Setup arriba
2. Arranca F1 (Cherry-pick orphans) — quick win
3. F2 (H+ visual) — chico y editorial
4. F3 (Journal) — medio
5. F4 (Rangos v2) — medio
6. Si vas bien: F5 → F6 → F7 → F8
7. Cierra push por feature

Reporta con tabla estándar al terminar (o al parar).

Descansa cada 2-3 features (30 min break). No agotes contexto quemando muchas horas seguidas.

Rock and roll marathon. 🎸🏃
