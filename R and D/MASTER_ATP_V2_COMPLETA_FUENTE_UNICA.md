# 🎯 MASTER · ATP V2 COMPLETA (pre-genética) — FUENTE ÚNICA DE VERDAD
### Cerrado por Enrique 2026-07-21 · Este doc manda. Todo lo demás jala de aquí.
### Apéndice exhaustivo (226 ítems): `_BARRIDO_FEATURES_COMPLETO.md`

---

## LA MISIÓN (no acepta menos)
App **completa, editorial, pulida**: los 7 pilares production-ready, meditaciones con audio real, Fitness reconstruido, N-Back jugable, ARGOS Jarvis, comunidad. **Nada a medias. No se vende hasta que esté completa.**

**DENTRO de V2 completa:** los 7 pilares + ARGOS (orb, voz/dictado, proactividad) + audio Mente + Fitness rebuild + N-Back + Sleep + Comunidad/social + gamificación + onboarding WOW + las features del research que suben el nivel.

**FUERA (explícito, para después):** genética · wearables/hardware · multimodal-hardware · backend clínico Fx (HUB Fx) · LIGHT mode (v2.1). Estas NO bloquean "completa pre-genética".

## LA REGLA QUE MATA EL LIMBO
Desde hoy, **toda** feature/ajuste/idea/TBD vive en este maestro o en el barrido. Cuando Enrique diga "¿y aquello?", se busca aquí y ESTÁ. Cada sprint que cierra, se actualiza este doc. Si algo no está aquí, no existe — así que se agrega en el momento en que se dice.

---

## ESTADO HOY (226 ítems: ~72 hechos · ~46 en curso · ~58 pendientes · ~50 ideas/research)

| Pilar | Total | Titular del estado |
|---|---|---|
| Infra/Compliance/Stores | 38 | Compliance 2/3/4 EN CURSO (CC). Cimiento hecho. |
| HOY/Agenda/YO/Edad ATP | 40 | Corazón sólido. Edad ATP arreglada. Falta pulido premium + routing granular. |
| Fitness | 17 | **~35% — el rebuild más grande pendiente.** |
| Nutrición/Suplementos/Score | 24 | Falta multi-toma AM+PM (raíz) + BHA→Functional Score. |
| Mente | 31 | Pilar sacado de obra negra; **falta producir el audio real (31 piezas).** |
| Salud Funcional | 27 | Arquitectura hecha. Falta guía labs + auditoría qué-sirve. |
| Ciclo/Embarazo | 12 | Bidireccional aterrizado. Falta pulir máscara embarazo. |
| Tests | 9 | Braverman + quizzes OK. N-Back falta UI. |
| ARGOS | 26 | Orb + dictado aterrizados. **Falta proactividad, multimodal, Meet ARGOS copy.** |
| Comunidad | 14 | Amigos base. **Falta la capa social tipo Strava (el foso).** |
| Gamificación | 11 | Electrones/H+ OK. Falta racha-sin-culpa (research). |
| Onboarding/Pulido | 24 | Posicionamiento en curso. Falta tour WOW + pulido transversal. |

---

## EL ORDEN PARA LLEGAR A COMPLETA (spine de mega-batches)

Cada MB termina en GATE: tsc verde (CI) + device test + rolling smoke. CC construye → Cowork audita → merge. **Este es el camino, en orden:**

### 🔴 AHORA (en vuelo)
- **Compliance 2/3/4** — CC construyendo encadenado. Cowork audita cada rama. Desbloquea cobrar. *(no es opcional; es el candado legal)*

### 🟥 FUNDAMENTOS DE PRODUCTO (lo que el usuario toca a diario)
- **MB-2 · Suplementos end-to-end** — multi-toma AM+PM (raíz), scan→plan+Functional Score, dropdown fluido, tomas en agenda. *(M)*
- **MB-1.5 · Pulido del loop diario** — press states, feedback pointer-down, routing granular de HOY (research: Oura "one big thing" + Whoop "score = coaching"). *(M)*

### 🟧 LOS TENT-POLES (lo que hace grande a ATP)
- **MB-3 · Fitness REBUILD** — customer journey primero, ejecución de rutina, timers, biblioteca, registro fuerza/cardio, editorial. Integra el **motor de protocolo-en-vivo** del research (WHM/apnea: fases del nivel real + háptico/voz). *(XL, time-box duro)*
- **MB-4 · ARGOS Jarvis completo** — orb+dictado (✅) → proactividad con gobernanza + multimodal (foto→interpreta) + Meet ARGOS copy (#141). Ancla de venta Pro. *(L restante)*
- **MB-5 · Mente + AUDIO real** — producir las 31 piezas del catálogo (pilotos listos → script ensamble ffmpeg → 2 voces → Storage) + binaurales (adaptar biohacker_estoico) + los 4 cuencos. Validación Mariana de las 6 piezas sensibles. *(L)*

### 🟨 MÓDULOS QUE COMPLETAN
- **MB-6 · Sleep Track** — motor de sueño real, 4 cronotipos, alimenta Edad ATP/Score. *(L)*
- **MB-7 · Ciclo/Embarazo** — pulir máscara ATP Embarazo + labs por fase. Bidireccional ✅. *(M)*
- **N-Back Challenge** — lógica lista, falta UI editorial (research: Elevate visual + Brain Workshop motor). Enmarcado honesto ("mide tu memoria de trabajo", nunca "te hace más inteligente"). *(L)*
- **Guía de labs completa** + auditoría qué-sirve de Salud Funcional. *(M)*

### 🟩 LO QUE SUBE EL NIVEL (research → producto)
- **Comunidad social tipo Strava** — el foso de retención que falta: comparativas contra tu yo pasado + tribu founders. *(L)*
- **Racha-sin-culpa** (Way of Life SKIP legítimo + Duolingo escudo) — encaja con Ciclo fase lútea. *(M)*
- **Aha cruzado tipo Levels** — hacer visual "dormiste mal → tu ventana de foco se movió". El diferenciador #1. *(M)*
- **Onboarding WOW** (MB-10) — tour editorial 7 pilares + Meet ARGOS + posicionamiento. *(M)*

### 🟦 CIERRE
- **MB-8 · Pulido editorial transversal** — cero huecos negros, cero snake_case, todo editorial. *(M)*
- **MB-12 · Infra pre-beta + device retest grande** (ambas cuentas) + build nativo de versión. *(M)*
- **MB-11 · Validación clínica Mariana** — paralelo, ya no en pausa (dictamen legal salió). Scoring ×5 + listas. *(S, bloqueado por agenda de Mariana)*

---

## CÓMO TRABAJAMOS (para que no se pierda nada, nunca más)
1. **Este doc es el ancla.** Cada sprint que cierra → actualizo estado aquí.
2. **Cada idea/TBD que sueltes → la meto aquí en el momento**, no "para después".
3. CC construye en mega-batches encadenados (Fable aguanta). Cowork audita cada rama antes del merge (el candado que cachó el número de crisis, la voz abierta, la fuga PII).
4. Cuando preguntes "¿y X?" → está en este maestro o en el barrido. Si no, lo agrego al instante.
5. Genética/wearables/clínico/LIGHT → doc aparte de "post-completa", no se mezclan.

---

## PRÓXIMO DISPARO (cuando compliance cierre)
El siguiente mega-batch a CC es **MB-2 + MB-3 (Fitness)** o **MB-5 (Audio Mente)** — tú eliges cuál primero. Mi voto: **MB-5 Mente-audio primero** (los pilotos ya están, es contenido que le da alma y es visible al instante), en paralelo con que tú y Mariana produzcan/validen. Fitness (MB-3) es el más pesado y merece su propia corrida dedicada.
