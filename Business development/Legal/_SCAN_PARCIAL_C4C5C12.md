# SCAN PARCIAL · Criterios 4, 5, 12

**Fecha:** 2026-07-21
**Alcance:** CRITERIO 4 (protocolos alto riesgo), CRITERIO 5 (salud mental/crisis), CRITERIO 12 (ciclo/embarazo)
**Modo:** solo lectura. Formato Parte E del brief.
**Base:** `src/constants/interventions-catalog.ts` (88 intervenciones), `src/services/interventions/*`, `app/fasting.tsx`, `app/breathing.tsx`, `src/services/pregnancy-gate-core.ts`, `src/hooks/use-cycle-gate.ts`, `src/constants/master-quiz-bank.ts`, `src/services/argos-service.ts`.

---

## HALLAZGO ARQUITECTONICO RAIZ (aplica a C4, C5 y C12)

El catalogo tiene datos clinicos RICOS: `contraindications`, `requiresClinicalValidation`, `sideEffects`, `recommendationRules.excludeIf` para las 88 intervenciones. **PERO estos datos SOLO se consumen en la ruta PUSH** (motor de prescripcion `personalizeInterventions()` -> filtra el "Top 5" que el sistema sugiere).

`src/services/interventions/personalize-interventions.ts:54-56`:
```
const eligible = catalog.filter(
  (i) => !i.requiresClinicalValidation && !isContraindicated(i, phenotype),
);
```

**No existe ningun gate en la ruta PULL** (usuario elige/activa/ejecuta manualmente). El comentario del propio catalogo lo confirma (lineas 30-33): "El motor NO las sugiere... el user si puede activarlas manualmente si ya las tiene en user_interventions." Es decir: el diseno INTENCIONALMENTE permite auto-activar cualquier protocolo, incluidos los `requiresClinicalValidation` (Wim Hof, tablas de apnea, ayuno de sardinas, OMAD, cold plunge). Esto convierte casi todo C4 en P0.

**Superficies REALMENTE ejecutables (con timer/tracking):** solo DOS -> `app/fasting.tsx` (ayunos) y `app/breathing.tsx` (respiracion). El resto (frio, sauna, contraste, luz roja, etc.) son catalogo + recordatorio de agenda, sin timer, pero igualmente auto-activables sin warning ni gate.

---

# CRITERIO 4 - Protocolos de alto riesgo sin gate/warning

## TABLA - Inventario de protocolos de AYUNO

| Key | Nombre | Duracion | Push/Pull | Ejecutable | requiresClinicalValidation | Contraindicaciones en catalogo | Gate/Warning en UI |
|---|---|---|---|---|---|---|---|
| `ayuno_14_10` | Ayuno 14:10 suave | 14h | Pull | Si (timer preset) | No | embarazo, lactancia, TCA, DM1, bajo peso, hipoglucemia | ninguno |
| `ayuno_16_8` | Ayuno 16:8 | 16h | Pull | Si (preset) | **Si** | + ninos/adolescentes, mujer premenopausica lutea | ninguno |
| `ayuno_18_6` | Ayuno 18:6 agresivo | 18h | Pull | Si (preset) | No | + sarcopenia, atleta hipertrofia | ninguno |
| `ayuno_20_4_omad` | Ayuno 20:4 / OMAD | 20-24h | Pull | Si (preset "OMAD 24") | **Si** | DM1, insuf. suprarrenal, hipotiroidismo, bipolar, hipoglucemiantes | ninguno |
| `protocolo_ayuno_sardinas` | Ayuno de Sardinas | **1-5 dias (~24-120h)** | Pull | Solo catalogo (NO timer propio; el timer generico si llega a 120h) | **Si** | alergia pescado, DM1, DM2 medicada, TCA, embarazo, lactancia, <18, IRC, hepatica, gota, porfiria, anticoagulante | ninguno |
| `sardinas_pescados_grasos` | Sardinas 2-3x/sem (alimento) | n/a | Pull | Catalogo (no ayuno) | No | alergia, gota, IRC, warfarina | ninguno |

**Presets del timer de ayuno (`app/fasting.tsx:94-101`):** 12:12, 14:10, 16:8, 18:6, 20:4, **OMAD 24h, 36h, 72h** + custom hasta **`MAX_FAST_HOURS = 120`** (5 dias). Hitos celebratorios en 24/48/**72 "ayuno prolongado"/96 "ayuno extendido"**/120h. El timer NO consulta embarazo, ni condiciones, ni edad. Cualquiera puede correr un ayuno de 120h con un tap.

> **>48h ejecutables hoy (contra decision A3 del brief = deben ser educativos, no ejecutables):** 36h, 72h y custom hasta 120h estan ejecutables via timer. El protocolo de sardinas 1-5d no tiene boton propio pero es replicable con el timer generico.

---

```
ID: C4-001
Criterio: 4
Ubicacion: app/fasting.tsx (lineas 54-101 presets + MAX_FAST_HOURS=120) + src/services/fasting-service.ts
Que encontre: El timer de ayuno es plenamente ejecutable (start/track/milestones/close) hasta 120h (5 dias). Presets 36h/72h y custom hasta 120h. Cero warning, cero gate tecnico, cero bloqueo por embarazo/lactancia/edad/condicion. Hitos celebran "72h ayuno prolongado" y "96h ayuno extendido".
Severidad propuesta: P0
Accion propuesta: MODIFICAR (ayunos <=48h) + ELIMINAR ejecutabilidad (>48h)
Detalle de la accion: (a) Cortar presets/custom >48h del timer (dejar 12:12-OMAD/24 como self-select educativo, alineado A3). Los ayunos prolongados 72h+ y el de sardinas pasan a contenido educativo solo-lectura (sin boton "iniciar", sin tracking) o a HUB Fx. (b) Agregar screening + warning + hard-gate embarazo/lactancia/DM1/TCA/bajo peso ANTES de iniciar cualquier ayuno. Requiere umbrales de Mariana.
Esfuerzo: M
Dependencias: Decision Enrique (cortar 72h+ vs mover HUB Fx) - Input Mariana (condiciones a gatear + edad minima ayuno)
Nota/duda: MAX_FAST_HOURS ya sugiere que producto sabia del tope 120h. Se corta a 48h o se deja educativo con contenido descriptivo?
```

```
ID: C4-002
Criterio: 4
Ubicacion: src/services/interventions/personalize-interventions.ts:54-56 + interventions-catalog.ts (comentario lineas 30-33)
Que encontre: contraindications y requiresClinicalValidation SOLO filtran la prescripcion PUSH (Top 5). No hay gate en la activacion manual (PULL). Por diseno el usuario puede auto-activar CUALQUIER intervencion, incluidas las 13 requiresClinicalValidation (Wim Hof, tablas apnea, sardinas, OMAD, cold plunge, etc.).
Severidad propuesta: P0
Accion propuesta: PROTEGER
Detalle de la accion: Introducir una capa de gate en la ruta PULL (activar/agregar-a-agenda/ejecutar) que reuse isContraindicated() + resolvePregnancyActive(). Para protocolos requiresClinicalValidation o con contraindicacion que matchea el fenotipo del usuario -> bloquear con mensaje o exigir consentimiento informado (checkbox no skippable). Hoy la logica clinica existe pero esta "colgada" solo del motor de sugerencias.
Esfuerzo: L
Dependencias: Input Mariana (que es hard-block vs warning-consent) - Decision Enrique (bloquear vs consent)
Nota/duda: Es el hallazgo raiz de C4. Sin esto, todos los gates individuales son parciales.
```

```
ID: C4-003
Criterio: 4
Ubicacion: app/breathing.tsx:182, 616-621, 716 + src/data/breathing-library.ts
Que encontre: Wim Hof (basico/extendido), tablas CO2/O2, hiperventilacion matutina, box breathing son timers ejecutables. Las contraindicaciones se muestran solo como TEXTO pasivo: "No recomendado con: {lista}." con icono warning. NO hay checkbox no-skippable (C3), NO hay gate tecnico, NO se capturan/verifican epilepsia/cardiopatia/embarazo/sincopes, NO se enforcan los limites (max 3 rondas, retencion pasiva max 90s). Contraindicaciones incluyen "agua_o_cercania_agua" pero no hay advertencia dura de nunca-en-agua.
Severidad propuesta: P0
Accion propuesta: PROTEGER
Detalle de la accion: Implementar C3 completo: (a) warning obligatorio con checkbox no-skippable la 1a vez (texto del brief C3, incluye "NUNCA dentro/cerca del agua ni al conducir"). (b) Captura + gate de epilepsia, cardiopatia, HTA no controlada, sincopes, <18, embarazo. (c) Enforce limites en el motor del timer: max 3 rondas guiadas/sesion, retencion pasiva max 90s con countdown. Aplica a wim_hof_basico/extendido, tabla_co2, tabla_o2, hiperventilacion_matutina.
Esfuerzo: M
Dependencias: Input Mariana (umbrales/condiciones exactas a gatear) - Legal (redaccion warning)
Nota/duda: hiperventilacion_matutina tiene contraindicacion "agua_o_ducha (shallow water blackout letal)" - riesgo de muerte real. Prioridad maxima dentro de C4.
```

```
ID: C4-004
Criterio: 4
Ubicacion: interventions-catalog.ts - familias bano_frio, ducha_fria, sauna, terapia_contraste, dive_reflex_cara_hielo
Que encontre: Frio extremo (cold_plunge_cns 2-6C, bano_frio_hormesis 2-4C, ducha_fria nivel 1-3, bano_frio_desinflamacion 10-15C, dive_reflex cara-hielo) y calor (sauna_finlandesa 80-90C, sauna_infrarrojo, sauna_vapor, bano_caliente 40-42C) tienen contraindicaciones cardiacas/embarazo/epilepsia ROBUSTAS en catalogo pero NINGUNA se enforca. No hay pantalla de ejecucion con timer (son catalogo + agenda), pero son pull-activables sin warning ni gate. dive_reflex es requiresClinicalValidation.
Severidad propuesta: P1
Accion propuesta: PROTEGER
Detalle de la accion: Al activar/agendar cualquier intervencion de frio <15C o calor (sauna) mostrar warning + gate embarazo/cardiopatia/epilepsia (via C4-002). Duracion sauna: cap y disclaimer. Alinea con C2 (frio <15C y sauna >20min bloqueados en embarazo).
Esfuerzo: M
Dependencias: C4-002 (capa de gate PULL) - Input Mariana (umbrales C y duracion sauna a gatear)
Nota/duda: Sin timer, el "riesgo de ejecucion" es menor que ayuno/respiracion, pero la recomendacion sin gate sigue siendo exposicion.
```

```
ID: C4-005
Criterio: 4 (cross C2 / C12)
Ubicacion: src/services/pregnancy-gate-core.ts + src/services/supplements-service.ts:44-56 (unica integracion)
Que encontre: El gate de embarazo/lactancia (resolvePregnancyActive / isPregnancyActive) EXISTE y sex-gatea bien, pero esta cableado UNICAMENTE en supplements-service.ts. NO gatea ayunos (fasting.tsx), NI respiracion (breathing.tsx), NI frio/sauna. Una usuaria embarazada puede correr un ayuno de 120h o Wim Hof sin ningun bloqueo. La unica exclusion de embarazo en intervenciones es via contraindications en el motor PUSH (personalize), que depende de que el Cuestionario Maestro haya capturado el embarazo Y solo aplica a sugerencias.
Severidad propuesta: P0
Accion propuesta: PROTEGER
Detalle de la accion: Cablear isPregnancyActive() como hard-gate en la ruta PULL de: ayunos >12h, Wim Hof/respiracion intensa, frio <15C, sardinas, sauna >20min, cetogenica, HIIT. Mensaje del brief C2. Reusar la infra que ya existe para suplementos.
Esfuerzo: M
Dependencias: C4-002 - Input Mariana (lista exacta protocolos a bloquear en embarazo/lactancia)
Nota/duda: La infra ya esta construida y probada (pregnancy-gate-core.test.ts) - es cuestion de extender su consumo, no de crearla.
```

```
ID: C4-006
Criterio: 4 (cross C5)
Ubicacion: interventions-catalog.ts:5698-5711 (dive_reflex_cara_hielo - recommendationRules.boostIf)
Que encontre: dive_reflex_cara_hielo (inmersion facial en hielo) tiene boostIf con { source:'profile', field:'panic_attack_activo', equals:true } y { quiz:'ansiedad', score:'high' }. Es decir, el motor esta disenado para RECOMENDAR meter la cara en agua con hielo a personas con ataques de panico activos / ansiedad alta. Hoy queda bloqueado del PUSH solo por el flag requiresClinicalValidation; si Mariana lo quita al firmar, se activaria la recomendacion.
Severidad propuesta: P2
Accion propuesta: MODIFICAR
Detalle de la accion: Remover panic_attack_activo / ansiedad-alta de boostIf de dive_reflex (protocolo vagal intenso, no es intervencion de crisis validada). Si se quiere una herramienta de rescate calmante, physiological_sigh es la apropiada y segura.
Esfuerzo: S
Dependencias: Input Mariana
Nota/duda: Riesgo latente, no activo (bloqueado por CV flag). Marcar para no olvidar al firmar.
```

```
ID: C4-007
Criterio: 4
Ubicacion: interventions-catalog.ts (13 intervenciones con requiresClinicalValidation:true)
Que encontre: Inventario de las 13 flaggeadas pendientes de firma Mariana = los protocolos de MAYOR riesgo: wim_hof_basico, wim_hof_extendido, tabla_co2, tabla_o2, hiperventilacion_matutina, ayuno_16_8, ayuno_20_4_omad, protocolo_ayuno_sardinas, dive_reflex_cara_hielo, ejercicio_ayuno_fuerza, omt_masticatorios, luz_roja_ojos, bulletproof_coffee. Estan fuera del PUSH pero activables por PULL (ver C4-002).
Severidad propuesta: P1
Accion propuesta: PROTEGER
Detalle de la accion: Mientras no esten firmadas + gateadas en PULL, considerar ocultarlas del catalogo navegable publico V1 (feature flag) o exigir consentimiento. No deben ser auto-activables sin gate.
Esfuerzo: M
Dependencias: C4-002 - Decision Enrique (ocultar vs consent) - Input Mariana (firma)
Nota/duda: ayuno_16_8 tiene CV=true aunque es de los "IF cortos" que el brief A3 deja quedarse - confirmar si el flag es correcto o legacy.
```

---

# CRITERIO 5 - Salud mental / crisis

```
ID: C5-001
Criterio: 5
Ubicacion: (busqueda global) - NO existe modulo standalone "S.O.S. crisis de panico"
Que encontre: El brief A1 asume un modulo S.O.S. de crisis de panico con IA generativa. NO encontre una pantalla/componente dedicado con ese nombre. Las superficies que tocan crisis/panico son: (1) intervencion physiological_sigh ("rescate"), (2) intervencion dive_reflex (boosteada por panic_attack, ver C4-006), (3) el chat ARGOS (IA generativa libre), (4) el check-in emocional que permite seleccionar "En panico". No hay un flujo de emergencia emocional guionado.
Severidad propuesta: P0 (informativo - confirma alcance A1)
Accion propuesta: DEJAR/CONFIRMAR
Detalle de la accion: Confirmar con Enrique que el "S.O.S. de panico" del dictamen es en realidad ARGOS chat (IA libre) y/o la intervencion de rescate, no un modulo aparte. La decision 2 del brief (ELIMINAR S.O.S. con IA generativa) se traduce entonces a: (a) blindar ARGOS ante mensajes de crisis (C5-002), (b) quitar panic-boost de dive_reflex (C4-006).
Esfuerzo: S
Dependencias: Decision Enrique (confirmar que es el "S.O.S.")
Nota/duda: Si SI existia un modulo S.O.S. y fue removido en un sprint previo, verificar que no quedo codigo muerto. No lo encontre vivo.
```

```
ID: C5-002
Criterio: 5
Ubicacion: src/services/argos-service.ts:334-345 (system prompt - Emergencia medica + Embarazo/condiciones criticas)
Que encontre: ARGOS es IA generativa libre (chat streaming). Su system prompt deriva ante "ideacion suicida" a "servicio de emergencia (911 en MX)" y a "su [profesional]". NO hay banner Linea de la Vida 800-911-2000 en ninguna parte del codigo (grep 0 resultados). Depende 100% de que el LLM ejecute la derivacion en texto libre; no hay guardarrail deterministico ni numero de linea de crisis hardcodeado.
Severidad propuesta: P0
Accion propuesta: PROTEGER
Detalle de la accion: (a) Agregar deteccion deterministica (server-side en argos-proxy o cliente) de keywords de crisis/ideacion suicida/autolesion que dispare un banner fijo NO generado por IA con Linea de la Vida 800-911-2000 + 911, ANTES/EN LUGAR de la respuesta libre del LLM. (b) Inyectar el numero 800-911-2000 en el system prompt de ARGOS como frase canonica de derivacion. Aplica regla P0-19 del brief.
Esfuerzo: M
Dependencias: Legal (texto exacto banner) - coordinacion con scan C1-C3 (system prompt ARGOS tambien se audita ahi)
Nota/duda: gate-orchestrator.ts (coach-engine) ya tiene infra de banderas rojas con escalacion 911 - se podria extender ahi el guion de crisis con la linea de vida.
```

```
ID: C5-003
Criterio: 5
Ubicacion: src/constants/master-quiz-bank.ts:417-421 (D9.6) + :189 (ansiedad) + :106-107 (depresion/ansiedad como condiciones) + src/services/salud/master-quiz-core.ts
Que encontre: El Cuestionario Maestro captura "Traumas emocionales activos o no resueltos que esten afectando tu vida hoy?" (D9.6, opciones incl. "Si, sin acompanamiento"), "ansiedad o pensamientos que no puedes apagar?" (D3), y depresion/ansiedad en lista de condiciones. El procesamiento (master-quiz-core.ts) NO tiene ninguna logica de derivacion/escalacion/banner ante respuestas positivas de trauma sin acompanamiento o depresion. Solo mapea a fenotipo. D9.6 marcado pendMariana ("framing sensible final").
Severidad propuesta: P0
Accion propuesta: PROTEGER
Detalle de la accion: Ante D9.6 = "sin acompanamiento" (trauma activo no acompanado) o marcadores de depresion severa -> mostrar card de derivacion con Linea de la Vida 800-911-2000 + sugerencia de acompanamiento profesional. No dejar la captura sin red de seguridad.
Esfuerzo: S
Dependencias: Input Mariana (framing D9.6 pendiente + criterio de disparo) - Legal (texto card)
Nota/duda: Capturar trauma/ideacion sin ofrecer recurso de ayuda es el patron exacto que reguladores senalan. pendMariana ya estaba flaggeado.
```

```
ID: C5-004
Criterio: 5
Ubicacion: src/data/emotions-library.ts:102 ("panicked" / "En panico" intensity 10) + app/checkin.tsx
Que encontre: El check-in emocional (RULER) permite seleccionar "En panico" (energia 10, intensidad 10) y otras emociones de alta activacion desagradable. Al seleccionar, el flujo solo deriva ejes de pleasantness/energy; no hay derivacion a recurso de crisis ni banner.
Severidad propuesta: P1
Accion propuesta: PROTEGER
Detalle de la accion: Si el usuario reporta "En panico" (o patron sostenido de estados de crisis), ofrecer suavemente la herramienta de rescate (physiological_sigh) + recurso Linea de la Vida. Sin alarmismo.
Esfuerzo: S
Dependencias: Input Mariana (umbral/frecuencia para disparar) - Legal
Nota/duda: Cruzar con C5-002; mismo recurso de crisis reutilizable.
```

```
ID: C5-005
Criterio: 5
Ubicacion: src/services/argos-service.ts (todo el pilar de conversacion) + argos-chat.tsx
Que encontre: TODA la conversacion de salud mental adyacente en ARGOS usa IA generativa libre (no guion pre-aprobado). El blindaje es exclusivamente via system prompt (derivacion "con respeto", 911). No hay guion fijo pre-aprobado para temas de crisis.
Severidad propuesta: P1
Accion propuesta: PROTEGER
Detalle de la accion: Definir guiones/frases canonicas pre-aprobadas para respuestas de crisis (inyectadas + fallback deterministico), no depender solo de la generacion libre. Ver C5-002.
Esfuerzo: M
Dependencias: C5-002 - Legal
Nota/duda: -
```

```
ID: C5-006
Criterio: 5 (cross C4-002)
Ubicacion: interventions-catalog.ts - nsdr_10min, yoga_nidra_30min, silencio_30min, journal_am/pm, digital_minimalism
Que encontre: Estas intervenciones tienen contraindicaciones de salud mental en catalogo (trauma disociativo, psicosis activa, "depresion_severa_con_ideacion_suicida_activa", "necesita conexion no aislamiento"). Como todo el resto, esos datos solo filtran PUSH, no gatean PULL. Ej: silencio_30min y digital_minimalism contraindicados en "depresion severa con ideacion suicida" pero auto-activables.
Severidad propuesta: P2
Accion propuesta: PROTEGER
Detalle de la accion: Cubierto por la capa de gate PULL de C4-002 (mismo mecanismo). Nota especifica: aislamiento/silencio en depresion severa es contraindicacion real.
Esfuerzo: (incluido en C4-002)
Dependencias: C4-002
Nota/duda: -
```

---

# CRITERIO 12 - Ciclo / Embarazo

```
ID: C12-001
Criterio: 12 (cross C2 / C4-005)
Ubicacion: src/services/pregnancy-gate-core.ts + src/services/supplements-service.ts:44-56
Que encontre: El gate embarazo/lactancia (isPregnancyActive/resolvePregnancyActive) es correcto y sex-seguro, PERO solo esta cableado en suplementos. No gatea ningun protocolo de riesgo (ayuno, respiracion, frio, sauna). = el gate C2 del brief esta 90% incumplido a nivel de protocolos de riesgo.
Severidad propuesta: P0
Accion propuesta: PROTEGER
Detalle de la accion: Ver C4-005 (mismo fix). Extender el gate ya existente a ayunos >12h, Wim Hof/respiracion intensa, frio <15C, sardinas, sauna >20min, cetogenica, HIIT sin approve. Mensaje del brief C2.
Esfuerzo: M
Dependencias: C4-002 - Input Mariana (lista protocolos + suplementos categoria-verde-embarazo)
Nota/duda: Duplica intencionalmente C4-005 para que aparezca en el conteo de ambos criterios.
```

```
ID: C12-002
Criterio: 12
Ubicacion: src/hooks/use-cycle-gate.ts + src/services/cycle/cycle-access-core.ts
Que encontre: useCycleGate guarda las pantallas del pilar Ciclo por biological_sex (deep-link safe, fail-safe a back). Esto esta BIEN implementado. No es un hallazgo negativo - es el modelo a replicar para el gate de embarazo en protocolos de riesgo.
Severidad propuesta: P2 (referencia positiva)
Accion propuesta: DEJAR
Detalle de la accion: Ninguna. Usar como patron de referencia para C4-005/C12-001.
Esfuerzo: -
Dependencias: -
Nota/duda: -
```

```
ID: C12-003
Criterio: 12
Ubicacion: src/utils/pregnancy.ts + mascara "ATP Embarazo" (cycle_modality='pregnancy')
Que encontre: "ATP Embarazo" = mascara que deriva semana gestacional/trimestre desde due_date con copy neutro y sin lenguaje alarmista (bien documentado: "cero lenguaje alarmista o de riesgo - solo la etapa"). NO ofrece un catalogo de protocolos VALIDADOS para embarazo; una usuaria embarazada recibe el catalogo general (menos el gate de suplementos). No hay whitelist de protocolos seguros en embarazo.
Severidad propuesta: P1
Accion propuesta: MODIFICAR / PROTEGER
Detalle de la accion: (a) Copy: OK, mantener neutro. (b) Definir con Mariana la whitelist de intervenciones seguras/recomendadas en embarazo y lactancia (categoria-verde) y que la mascara solo muestre/recomiende esas. (c) Todo lo demas -> gate C2. Sin whitelist, "ATP Embarazo" hoy expone a la usuaria al catalogo general de riesgo.
Esfuerzo: M
Dependencias: Input Mariana (whitelist embarazo/lactancia - CRITICO) - Decision Enrique (alcance modulo embarazo V1)
Nota/duda: ATP Embarazo es feature V1 o se desprioriza? Si va en V1, la whitelist de Mariana es bloqueante.
```

```
ID: C12-004
Criterio: 12
Ubicacion: src/services/interventions/personalize-interventions.ts:113-115 (buildUserState: pregnancy/lactancia) + master-quiz-core.ts:280-282
Que encontre: El motor de prescripcion PUSH si excluye 'embarazo'/'lactancia' via contraindications cuando phenotype.profile.pregnancy esta seteado (derivado del Cuestionario Maestro D9.4b). Funciona, pero (a) depende de que el quiz capturo el estado, (b) es solo PUSH, (c) el estado de embarazo del quiz (snapshot) puede divergir del estado real en cycle_settings.pregnancy_status. Dos fuentes de verdad de embarazo (quiz vs cycle_settings) no unificadas.
Severidad propuesta: P1
Accion propuesta: MODIFICAR
Detalle de la accion: Unificar la fuente de verdad de embarazo/lactancia (cycle_settings.pregnancy_status + client_profiles.cycle_modality via resolvePregnancyActive) y que TANTO el motor PUSH como el gate PULL lean de ahi, no del snapshot del quiz. Evita que una usuaria que actualizo su estado en Ciclo pero no rehizo el quiz quede desprotegida.
Esfuerzo: M
Dependencias: C4-002 - verificar drift entre las 2 fuentes
Nota/duda: reference_supabase_migration_gap / dedup semantico aplica: mismo concepto "embarazo" en 3 lugares.
```

---

# RESUMENES (Parte E)

## 1. Conteo por criterio
- **CRITERIO 4:** 7 hallazgos (C4-001 a C4-007) - 4xP0, 2xP1, 1xP2
- **CRITERIO 5:** 6 hallazgos (C5-001 a C5-006) - 3xP0, 2xP1, 1xP2
- **CRITERIO 12:** 4 hallazgos (C12-001 a C12-004) - 1xP0, 2xP1, 1xP2 (referencia positiva)
- **TOTAL:** 17 hallazgos - 8xP0 - 6xP1 - 3xP2

## 2. Top hallazgos mas graves (P0)
1. **C4-002** - Gate clinico existe pero SOLO filtra el PUSH; la ruta PULL permite auto-activar cualquier protocolo de riesgo sin bloqueo. **Hallazgo raiz de C4.**
2. **C4-005 / C12-001** - Gate embarazo/lactancia existe y funciona, pero solo cableado en suplementos. Ayunos, Wim Hof, frio, sauna: sin bloqueo en embarazo.
3. **C4-001** - Timer de ayuno ejecutable hasta 120h (5 dias) sin warning/gate/screening; hitos celebran 72h/96h.
4. **C4-003** - Wim Hof/apnea/hiperventilacion: contraindicaciones solo como texto pasivo; sin checkbox, sin gate, sin limites de rondas/retencion. hiperventilacion_matutina puede matar en agua ("shallow water blackout").
5. **C5-002** - ARGOS (IA generativa libre) deriva ideacion suicida a 911 pero NO hay banner Linea de la Vida 800-911-2000 en ninguna parte; sin guardarrail deterministico.

## 3. Decisiones que Enrique debe tomar
- **A3:** Ayunos >48h (72h/120h del timer + protocolo sardinas) se CORTAN de la ejecucion o se mueven a HUB Fx como educativo-solo-lectura? (C4-001)
- **A1/C5-001:** Confirmar que es el "S.O.S. de crisis de panico" del dictamen - ARGOS chat? la intervencion de rescate? No existe modulo standalone vivo.
- **C4-002:** Los protocolos contraindicados/CV se BLOQUEAN duro en PULL o se permiten con consentimiento informado (checkbox)?
- **C4-007:** Las 13 intervenciones requiresClinicalValidation se OCULTAN del catalogo navegable V1 (feature flag) hasta firma+gate, o se dejan con consent?
- **C12-003:** "ATP Embarazo" es feature de V1? Si si, la whitelist de protocolos seguros de Mariana es bloqueante.

## 4. Quick wins (S de esfuerzo)
- **C4-006** - Remover panic_attack_activo/ansiedad-alta del boostIf de dive_reflex_cara_hielo (1 edit).
- **C5-002 (parcial)** - Inyectar "Linea de la Vida 800-911-2000" como frase canonica en el system prompt de ARGOS (junto al scan C1-C3 que ya toca el prompt).
- **C5-003 (parcial)** - Card de derivacion con Linea de la Vida tras D9.6="sin acompanamiento".
- **C5-004** - Ofrecer physiological_sigh + recurso de crisis al seleccionar "En panico" en check-in.

## 5. Lo que necesita a Mariana (INPUT de umbrales clinicos - NO firma)
- **Lista de condiciones hard-block vs warning-consent** para la capa de gate PULL (C4-002). Cuales contraindicaciones son bloqueo absoluto y cuales consentimiento informado?
- **Lista exacta de protocolos a bloquear en embarazo/lactancia** (el brief C2 da una lista base; validar/completar). (C4-005/C12-001)
- **Whitelist de intervenciones y suplementos categoria-verde seguros en embarazo/lactancia** para el modulo ATP Embarazo. (C12-003) - CRITICO si el modulo va en V1.
- **Umbrales de limites de respiracion intensa:** max rondas/sesion y segundos max de retencion pasiva para Wim Hof/apnea (el brief C3 sugiere 3 rondas / 90s - validar). (C4-003)
- **Edad minima para ayuno** y condiciones a gatear en el timer de ayuno. (C4-001)
- **Criterio de disparo de la red de crisis** (trauma sin acompanamiento, depresion severa, patron de check-in en panico) + framing sensible de D9.6 (pendMariana). (C5-003/C5-004)

---

## Recomendacion de orden de ejecucion (para C4/C5/C12)
1. **C4-002** (capa de gate PULL) - desbloquea C4-004, C4-005, C4-007, C5-006, C12-001 de golpe. Fix raiz.
2. **C4-005/C12-001** (cablear gate embarazo ya existente a protocolos de riesgo) - infra lista, alto ROI.
3. **C4-001** (cortar/educativizar ayunos >48h + screening) - depende de decision Enrique.
4. **C4-003** (C3 completo Wim Hof: checkbox + gate + limites) - riesgo de muerte real.
5. **C5-002/C5-003/C5-004** (red de crisis: banner Linea de la Vida deterministico + guiones + disparadores) - coordinar con scan C1-C3 (system prompt).
6. **C12-003/C12-004** (whitelist embarazo + unificar fuente de verdad) - depende de si ATP Embarazo va en V1.
7. Quick wins C4-006 en paralelo.
