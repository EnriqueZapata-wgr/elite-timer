# 🏋️ MEGA BRIEF · MB-3 FITNESS (away run nocturno, para CC)

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mb3-fitness` desde `main`. NO merge, tsc + tests verdes, Cowork audita.
**Tamaño:** XL — corrida dedicada. **Encadena los tracks EN ORDEN.**

## ⚠️ REGLA DE ORO DE ESTA CORRIDA
Si no alcanza el tiempo, **termina TRACKS COMPLETOS, nunca tracks a medias.** Un track completo es mergeable y coherente; medio track es deuda. Al entregar, di explícitamente qué tracks quedaron 100% y cuáles no se tocaron. **NO dejes stubs ni TODOs a medio cablear** (doctrina Enrique: sin parches).

## 📚 FUENTES (leer antes de codear)
- `R and D/JOURNEY_FITNESS_MB3.md` — customer journey, los 5 momentos, los 4 huecos.
- `R and D/MATRIZ_FITNESS_DIMENSIONES.md` — los 11 ejes + modos de enfoque + reglas.
- `R and D/METODOS_ATP_AUTOAJUSTABLES.md` — reglas EXACTAS de EMOM y Myo-reps.
- `R and D/RESEARCH_BENCHMARKS_EDAD_BIOLOGICA.md` — Tier A/B y sus fuentes.
- **Datos:** `C:\Users\ezapa\OneDrive\EZ online\ATP\R and D\Matriz_Fitness_ATP_206_revisado.xlsx` (212 filas: 206 MoveKit + 6 lastre ATP).

## 🚧 DEPENDENCIA EXTERNA (no bloquea esta corrida)
Los **clips de video** de MoveKit aún NO están en storage (Enrique los descarga después). **Usa los `Poster URL`** de la matriz (imágenes públicas, ya en el xlsx) como visual de cada ejercicio. El swap poster→clip es un follow-up de una línea si el modelo guarda `media_url` genérico. **NO intentes descargar clips ni tocar el bucket.**

---

## TRACK A · DATOS (fundación — primero)
1. Migración idempotente `exercise_matrix` (+ `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + policy de lectura para autenticados; es catálogo, no dato de usuario).
   Columnas desde el xlsx: `slug (PK)`, `nombre`, `equipo`, `cargable`, `tipo`, `patron`, `dinamica`, `lateralidad`, `musculo_principal`, `secundarios`, `cualidades[]`, `nivel`, `senior_apto`, `metodos[]`, `emom_apto`, `benchmark_edad`, `contraindicaciones[]`, `familia`, `media_url`, `origen` (movekit|atp).
2. **Seed de las 212 filas** desde el xlsx (script de generación reproducible en `scripts/`, y el SQL resultante como migración idempotente `ON CONFLICT DO NOTHING`).
3. Enums/constantes en TS espejo de los valores canónicos (una fuente única, sin strings sueltos).
**Gate A:** las 212 filas consultables desde la app, tsc verde.

## TRACK B · MOTOR GENERADOR (el corazón — determinista, SIN LLM)
Core puro testeable (`src/services/fitness/routine-generator-core.ts`), patrón `*-core` del repo:
- **Filtros (Akinator):** objetivo → enfoque (patrón **o músculo/bro-split**) → equipo disponible (duro) → contraindicaciones (excluye/sustituye) → nivel (regresa/progresa dentro de `familia`) → `senior` (meta-tag: solo `senior_apto`, techo −20%).
- **Enfoques:** Full body · Tren superior · **Pierna empuje** (patrón sentadilla/zancada) · **Pierna tracción** (patrón bisagra) · Empuje · Tracción · **por músculo (bro-split, multiselect)**.
- **Escalera de slots** (orden de colocación): multiarticular pesado → multiarticular metabólico → específico fuerza → específico metabólico → multiarticular sarcomérico → específico sarcomérico → unilateral fuerza → unilateral metabólico → unilateral sarcomérico → **+1-2 recovery/prehab**.
  ⚠️ Un ejercicio entra al slot **solo si sus `cualidades` lo declaran**; "multiarticular pesado" exige además `cargable = Sí` (flexiones NO son fuerza pesada).
- **Techo de capacidad:** principiante ~35 min · intermedio ~55 · avanzado ~78 · atleta ~110; senior ×0.8. `tiempo_efectivo = min(tiempo_usuario, techo)`. Si el usuario tiene más tiempo que su techo → **decirlo honestamente** y mandar el excedente a movilidad/recovery (nunca rellenar con volumen basura).
- **Máx. multiarticulares pesados:** principiante 1 · intermedio 2 · avanzado 3 · atleta 4.
- **Tiempo:** `Σ series × (trabajo + descanso_entre_series)` + `mini-series × micro-descanso`. Descanso por objetivo: **fuerza 2-4 min · metabólico 15-45 s**; micro-descanso intra-cluster (rest-pause/myo) **1-9 s**.
- **Rotación:** seed determinista por día+usuario; anti-repetición (rota el primario dentro de su `familia`); si ayer fue pesado, sesga a metabólico/sarcomérico.
- **Honestidad:** sin equipo cargable y objetivo=fuerza → sesga a resistencia/hipertrofia **y lo dice**.
**Tests obligatorios:** filtros, techo, escalera, cálculo de tiempo, rotación, caso "sin barra", caso senior.
**Gate B:** core con tests verdes, sin dependencias de RN.

## TRACK C · PUENTE FITNESS → EDAD ATP *(el hueco #1 del journey)*
**ADITIVO — no reescribir el motor congelado** (`edad-atp/*`, 5 áreas validadas por Mariana).
- **Primarias (Tier A):** al registrar un PR/medición de `push_ups`, `grip`, `sit-rise (old_man)`, `vo2max` → alimenta el input del scorer con **peso sólido** (verdad medida). Estos 4 YA existen en el motor; el trabajo es **cablear el log de Fitness como fuente**, no crear área nueva.
- **Secundarias (Tier B):** `dead hang · deadlift ×BW · pull-ups max · farmer carry · wall-sit · broad jump` → **nudge MÍNIMO acotado** en una capa de proyección ("vas en camino a bajar X, confírmalo con tu benchmark"). **Cap duro: ninguna secundaria puede dominar a una primaria.**
- **Relativo, nunca absoluto:** deadlift ×peso corporal, pull-ups/push-ups en reps máximas.
- ⚠️ **push-ups: el umbral (40) se derivó en HOMBRES.** No extrapolar a mujeres con descuento — si no hay banda femenina disponible, **flaguéalo y no apliques** la primaria en mujeres (mejor omitir que mentir).
**Gate C:** un PR de benchmark mueve la Edad ATP de forma verificable en test; motor congelado intacto.

## TRACK D · SESIÓN DE FUERZA + DESCANSO
- **Entidad "sesión"** (migración idempotente + RLS): hoy fuerza son filas sueltas en `exercise_logs` sin agrupar (cardio sí tiene sesiones). Agrupa ejercicios/series/duración de un entrenamiento.
- **Timer de descanso entre series** con cuenta hablada (el motor de voz ya existe en `src/utils/speech` + `use-routine-engine`).
- **Registro inline durante la sesión** (peso/reps por serie), no captura aparte al final.
**Gate D:** puedo entrenar y queda una sesión completa persistida.

## TRACK E · EJECUCIÓN UNIFICADA
- Hoy hay **dos caminos divorciados**: los 3 métodos (`Method35`, `EMOMAuto`, `MyoReps` — háptico, dentro de `log-exercise`) y el runner con **voz/sonido/keep-awake** (`use-routine-engine` → `app/execution.tsx`). **Unificar:** que los métodos corran POR el runner y hereden voz + háptico + keep-awake.
- **Fix P3 en `MyoReps.tsx` línea ~51:** si el fallo ocurre en el set 10+, hoy dice "Peso OK"; debe decir **"Peso bajo. Sube la próxima sesión."** (regla en METODOS_ATP_AUTOAJUSTABLES.md).
- **NO cambiar** la lógica de EMOM ni de Myo — Cowork las verificó y son correctas.
**Gate E:** una rutina generada corre completa en el runner, con métodos y voz.

## TRACK F · UI + LIMPIEZA
- **Biblioteca matriceada:** buscador + filtros por los ejes (equipo, músculo, patrón, cualidad, nivel), card con poster, pantalla de detalle. Editorial ATP (`docs/DESIGN_SYSTEM.md`, molde "Mis Datos", degradados — **cero lime brutalist**).
- **Generador, 2 puertas** (doctrina guiado-no-prisionero): **Auto** (objetivo + equipo + tiempo → genera) como default; **Explorar/Akinator** (filtra paso a paso, ve el pool encogerse, "Generar") opt-in.
- **Cierre de sesión:** resumen (ejercicios, kg movidos, min, PRs) + celebración en brincos >15% + señal de "esto movió tu Edad ATP".
- **Limpieza:** matar los coming-soons muertos de Fitness, linkear o retirar `fitness-hiit` (huérfano), y `fitness-mobility` (placeholder).
**Gate F:** navegable de punta a punta sin huecos negros.

---

## Protocolo
`feat/mb3-fitness` desde `main`. Migraciones **idempotentes + RLS + policy**. `npx tsc --noEmit` y tests verdes antes de entregar. NO merge. Delivery con: **qué tracks quedaron 100%**, checklist de device-test por track, y flags de lo que no alcanzaste. Cowork audita track por track.
