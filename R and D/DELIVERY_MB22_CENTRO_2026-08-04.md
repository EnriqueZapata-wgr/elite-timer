# 📦 DELIVERY MB-22 · El Centro ATP — 2026-08-04

**Rama:** `feat/mb22-centro` (worktree `../ATP-MB22`, desde `main` ceb6c45). Pusheada.
**4 commits, uno por pieza.** Migración: **249** (idempotente, RLS). `npx tsc --noEmit` = 0 ·
vitest 2647/2647 · `npm run censo` en verde.

Este run NO entró a TAREAS ni tocó el comportamiento de HOY. El único roce con
day-compiler es un **cinturón de seguridad** (period_log jamás palomea con un ciclo de
acompañante) que no cambia nada para nadie que hoy exista.

---

## 1 · ⚠️ SET INICIAL PARA USUARIO NUEVO — decisión de Enrique

**No se sembró nada nuevo: el set inicial EMERGE de los defaults que el HOY ya tiene
aprobados.** Un usuario nuevo ve estas **9 apps** (cero cambio en sus TAREAS, cero
migración, cero handle_new_user):

| Sección | Apps | Por qué están |
|---|---|---|
| Mente | Meditar · Emociones · Journal | meditation en defaults; emociones y journal son fijas (MANDATORY) |
| Cuerpo | Cardio | fija (MANDATORY) |
| Hábitos diarios | Comida · Hidratación · Suplementos | protein/water/supplements en defaults |
| Salud | Sol | sunlight en defaults |
| Sistema | Ajustes | **fija nueva (FIXED_APPS)**: la puerta a tu cuenta no se desinstala |

Hay un test que fija exactamente esta lista (`install-core.test.ts`): si cambian los
defaults del HOY, el test lo hace visible.

**Candidatos que quedaron FUERA y Enrique puede querer dentro:** `entrenar` (peso 3.0,
pero meterlo al default crea fila de Fuerza en TAREAS a todo usuario nuevo = tocar HOY),
`respirar` y `ayuno`. Si se aprueba alguno, es un cambio de una línea + decidir si
también entra a TAREAS.

## 2 · ⚠️ APPS SIN DESCRIPCIÓN: **CERO — pero las 25 son borrador para approve**

Escribí las 25 descripciones. Regla que seguí: **describen lo que la pantalla HACE,
verificado en su código** (p. ej. Sueño dice "tu ventana según tu cronotipo y el estado
honesto de tus fuentes" porque eso es lo que muestra; Suplementos dice "ATP no te
sugiere qué tomar" porque esa es la doctrina) — **cero beneficios, cero promesas
médicas**. Viven en `app-registry.ts` (campo `description`), con ratchet en test: una
app nueva no compila sin descripción. **Son copy borrador: Enrique/Mariana las validan
antes de stores.**

## 3 · Ajustes MOVIDOS contra inventados — **cero inventados**

| Ajuste | De dónde | Cómo quedó |
|---|---|---|
| Meta de agua | /hydration | Editable en ficha vía `hydration-service` (misma fuente) |
| Meta de ayuno | picker de /fasting | Editable en ficha; lector/writer únicos nuevos en `fasting-service`, y **fasting.tsx ahora delega en ese mismo writer**. El gate de seguridad de ayunos largos corre al INICIAR, nunca se brinca |
| Recordatorio journal | inline en /journal | Extraído a `journal-reminder-service` (mismas llaves AsyncStorage, mismo identifier #28); journal.tsx lo consume y relee al enfocar |
| Horarios suplementos | /supplements | Enlace directo desde la ficha: los horarios son POR suplemento (`dose_times`), su editor se queda en su pantalla |

Hallazgo colateral: `goals.protein_goal_g` se quedó **sin writer** cuando murió
protocol-config (day-compiler y adherencia lo leen). No inventé editor — se decide aparte.

## 4 · Las piezas

- **P1** — La cuadrícula lista solo instaladas+fijas (`gridApps`, fail-soft: prefs
  ilegibles → todas, jamás sala vacía). Murió la palomita. Entrada al Centro arriba de
  todo, sin scroll. Buscador solo entre instaladas; sin resultado ofrece "Buscarla en el
  Centro" (lleva el término). El deep link `kit?agregar=1` de "+ agregar" redirige al
  Centro sin tocar TAREAS. "Mi orden" también ordena solo lo instalado.
- **P2** — `/centro`: las 25 agrupadas por sección, estilo Ajustes iOS, con estado
  (En tu cuadrícula / Fija) y buscador propio.
- **P3** — `/centro/[appKey]`: descripción, instalar/desinstalar con el copy de
  `installCreatesRow()` (las cuatro sin fila — sueño, ayuno, glucosa, cetonas — no la
  prometen), "Abrir", y la configuración movida.
- **P4** — Ciclo con modo (abajo).

## 5 · ⚠️ Modo acompañante — el blindaje, capa por capa

**Modelo:** mig 249 crea `user_app_modes(user_id, app_key, mode)` con RLS owner-only y
CHECK `('propio','acompanante')`. Backfill: toda female queda `('ciclo','propio')` —
nadie pierde nada. **NO existe conexión entre cuentas: el acompañante lleva un
calendario con lo que él sabe.**

1. **`canAccessCycle(sex, mode)` sigue siendo LA fuente única de lo propio**, extendida,
   no duplicada: `acompanante` JAMÁS es propio (ni siendo female); `male` sigue sin ser
   propio aunque diga 'propio'. Test de regresión explícito.
2. **`getCycleInfo` (la raíz)** devuelve `null` en acompañante. Por ahí pasan TODOS los
   consumidores de salud: **ARGOS** (context.cycleInfo), **day-compiler** (cross-pillar),
   recetas, prescripción, emoción-historia. **Edad ATP verificado: hoy no consume ciclo
   por ninguna vía** (cero referencias en `src/services/edad-atp/`), y si algún día lo
   hace, pasará por esta misma raíz.
3. **Cinturones extra:** day-compiler no ofrece ni palomea `period_log` en acompañante
   (un registro del ciclo de otra persona no puede dar e- de "registré mi ciclo"); la
   puerta "Tu ciclo hoy" de SALUD solo aparece con ciclo **propio**; instalar en
   acompañante es **grid-only** (cero electrones, cero fila).
4. **Pantallas:** banner permanente en /cycle ("este calendario es de otra persona…
   nada entra a tu Edad ATP ni a ARGOS"), sin máscara embarazo, sin modalidad de ciclo
   en settings, sin copy de fase dirigido al cuerpo del usuario.
5. **Cambio de modo:** nunca borra datos. → acompañante apaga el hábito y avisa;
   → propio (solo usuarias) confirma explícito: "todo este calendario contará como TU
   ciclo". El calendario es UNO — el modo define su interpretación.
6. **Fail-soft:** sin la tabla en remoto (db push pendiente), modo = null y TODO se
   comporta exactamente como hoy (gate por biological_sex).

Nota: el modo-compañero viejo (E-5, `COMPANION_MODE_ENABLED=false`, tabla
`cycle_companions` de cuentas conectadas) sigue muerto y NO se tocó — es otro proyecto.

## 6 · Pendientes (fuera del run)

1. **Audit Cowork** de la rama.
2. **`npx supabase db push` (mig 249) ANTES del OTA** — el cliente degrada, pero el
   backfill es lo que deja a las usuarias en propio explícito.
3. Merge + OTA + device test.
4. Approve de Enrique: set inicial (§1) y copy de descripciones (§2).

## 7 · Verificación en dispositivo (los 8 del brief)

1. La sala ATP muestra solo lo instalado, sin ninguna palomita.
2. La entrada al Centro se ve sin hacer scroll.
3. Centro → instalar algo → aparece en la cuadrícula; desinstalar → desaparece.
4. Desinstalar y reinstalar conserva el historial.
5. La ficha explica qué hace la app; el copy de instalar dice la verdad en sueño,
   ayuno, glucosa y cetonas (no prometen fila).
6. Buscar algo no instalado ofrece encontrarlo en el Centro.
7. Cuenta nueva: cuadrícula con 9 apps, nunca vacía.
8. Un hombre instala Ciclo en modo acompañante: no aparece en su Edad ATP, ARGOS no
   lo menciona, no hay fila "Registrar ciclo" en TAREAS, y "Tu ciclo hoy" no sale en
   SALUD. Con la cuenta test femenina: cambiar a acompañante saca el ciclo de su
   contexto; volver a propio lo restaura tras confirmación.
