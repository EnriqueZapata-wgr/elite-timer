# Anexo B · Fitness 24 → 11

Diseño de detalle producido por agente de arquitectura, 12-ago-2026. Las retrospectivas (/history, /progress, /fitness-strength) se van a Reports (Anexo A).

## 1. Sobrevivientes (11)

| Ruta | Rol único |
|---|---|
| /fitness-hub | La única puerta del pilar. Sesión de hoy + semana + accesos. Absorbe fitness-train y fitness-my |
| /routine-generator | Motor determinista. Puertas AUTO / EXPLORAR / INTERVALOS (ex-HIIT) → /session |
| /my-routines | Rutinas guardadas + limpieza en lote + import de compartida (?share=CODE como sheet) |
| /builder | Editor de rutinas. Único escritor de routines |
| /session | Runner ÚNICO (ex strength-session): series, métodos ATP, bloques de tiempo, intervalos, cierre con PRs |
| /log-strength | Registro retro de fuerza (ex log-exercise): benchmark → variante → sets, RIR, 1RM en vivo |
| /log-cardio | Cardio completo: disciplinas + PRs por distancia + manual + fase de importación Health |
| /plan-entrenamiento | Plan semanal, único dueño de "qué toca cada día" |
| /exercise-library | Catálogo |
| /exercise-detail | Ficha + clip + "entrenar este" → /session?slugs= |
| /mobility-assessment | 7 tests guiados + CTA a rutina de movilidad |

## 2. La decisión del runner: gana strength-session, se renombra /session

Entradas verificadas: hacia strength-session 5 (fitness-hub:151, routine-generator:278, exercise-detail:198, my-routines:209, builder:225). Hacia execution solo llega contenido sin matrix_slug (fitness-hiit:107, my-routines:214, builder:230, session-summary:148 REPETIR). El árbitro es routineUsesClipRunner() en routine-bridge-core.ts:58: la interfaz la decide el CONTENIDO.

Por qué el de fuerza absorbe al timer: strength-session ya corre tiempo (TiempoBlockRunner, ramas esTiempo) y concentra lo irreproducible: persistencia real (workout_sessions + exercise_logs + upsert de PRs + señal Edad ATP), stashLiveSession (retomar sesión interrumpida), stashPendingSession (re-subida al reconectar), celebración de PR. execution no persiste ni una serie: escribe cardio_sessions 'other' + electrón.

**Features únicos de execution a absorber (no negociable):** motor useRoutineEngine + flattenRoutine (steps prep/work/rest/restBetween); CircularTimer con anillo, rojo final y aura; píldoras de rondas anidadas; play/pause/skip/restart step/restart rutina; preview SIGUIENTE + DESPUÉS; stats en vivo con mini-barra; cierre de timer (total, % trabajo/descanso, saltados, REPETIR); analytics WORKOUT_STARTED/COMPLETED mode timer; crédito conditioning (cardio_sessions 'other' + electrón tras insert); useRegisterOwnNav.

session-summary está huérfano verificado (nadie lo empuja): muere sin redirect; lo rescatable es su "EFICIENCIA %" al cierre unificado.

## 3. Absorciones

- fitness-train → fitness-hub: hero "HOY TE TOCA X" (getAsignacionHoy), tira de fase de ciclo (fail-closed), copy de próximo día, 4 secundarios.
- fitness-my → fitness-hub: era menú puro de 76L; retrospectivas → un enlace a Reports; cardio → /log-cardio; movilidad → /mobility-assessment.
- fitness-cardio → /log-cardio: grid de disciplinas (ya existe como selector), chips de PRs por distancia (dato que no vive en otro lado), autoSyncSiActiva al focus, enlace a ?fase=importar.
- cardio-import → fase de /log-cardio: las 7 fases (cargando/consentimiento/no_disponible/permiso_manual/leyendo/lista/resultado) se conservan íntegras, consentimiento primero.
- fitness-hiit → puerta INTERVALOS del generador: presets Tabata/EMOM/AMRAP/30-30 y buildPresetRoutine() a hiit-presets-core.ts testeable; "armar el mío" → /builder?mode=timer.
- shared-routine → sheet de /my-routines?share=CODE: getShareInfo, cloneFromShare, estados de error.
- log-exercise → /log-strength adelgazado: conserva 3 pasos, búsqueda, variante propia, RIR, Epley en vivo, PR previo, ?exerciseId=. Pierde los method-runners (Method35/EMOMAuto/MyoReps + voz): entrenar en vivo es del runner. Cambia dueño de escritura: pasa a llamar saveWorkoutSession() (un solo escritor de fuerza).

## 4. Navegación propuesta

```
/fitness-hub (única puerta)
├── HOY (hero) ────────────► /session?plan=…
├── Mi plan ───────────────► /plan-entrenamiento
├── ENTRENAR: generar ─────► /routine-generator (AUTO·EXPLORAR·INTERVALOS) ─► /session
│   ├── mis rutinas ───────► /my-routines (abrir→/session · editar→/builder · ?share sheet)
│   └── construir ─────────► /builder ── probar ─► /session
├── REGISTRAR: fuerza ─────► /log-strength · cardio ─► /log-cardio (?fase=importar)
├── EXPLORAR ──────────────► /exercise-library ─► /exercise-detail ─► /session?slugs=
├── Movilidad ─────────────► /mobility-assessment
└── Mis reportes ──────────► /reports/entrenamiento
```

## 5. Redirects

| Vieja | Nueva |
|---|---|
| /fitness-train, /fitness-my | /fitness-hub |
| /fitness-cardio | /log-cardio |
| /cardio-import | /log-cardio?fase=importar |
| /fitness-hiit | /routine-generator?puerta=intervalos |
| /execution?routine= | /session?routine= |
| /strength-session | /session (alias permanente) |
| /session-summary | sin redirect (huérfano); borrar + _layout:211 |
| /log-exercise | /log-strength (conserva ?exerciseId=) |
| /shared-routine?code=X | /my-routines?share=X |
| /timer | quitar (Stack.Screen fantasma en _layout:206, el archivo no existe) |
| /fitness-strength, /progress, /history, /personal-records | Reports; repuntar (tabs)/progreso.tsx |

## 6. Decisiones abiertas

1. **Dueño de "hoy"**: el plan explícito (scheduled_routines) manda; sin asignación cae al determinista. Un solo hero.
2. **Crédito de sesión de puro tiempo**: fase 1 mantiene cardio_sessions 'other' + electrón (cero riesgo); unificar a workout_sessions tipo conditioning es migración aparte.
3. **log-strength sobrevive** (registrar lo hecho ≠ entrenar en vivo); la escritura única via saveWorkoutSession lo hace seguro.
4. **HIIT como puerta del generador** (11 rutas); descubribilidad mitigada con fila "Intervalos" en el hub.

## 7. Esfuerzo

Runner unificado 3.5-4d · hub único 1.5-2d · cardio 1.5d · log-strength 1d · HIIT 0.5-1d · shared sheet 0.5d · redirects/limpieza 0.5d · QA regresión (5 entradas al runner, sesión viva, cola de pendientes, electrones) 1d. **Total ≈ 10-11.5 días.** 3 PRs: (1) runner con execution vivo como fallback → (2) hubs + cardio → (3) limpieza y muerte de execution.
