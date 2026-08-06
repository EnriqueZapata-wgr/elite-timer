# 🗂️ BARRIDO EXHAUSTIVO · Backlog Maestro de Features ATP

**Fecha:** 2026-07-22 · **Autor:** Cowork (barrido de rescate) · **Propósito:** que NADA se pierda en el limbo.
Extracción de CADA feature, ajuste, idea, TBD, pendiente y deuda dispersa en `R and D/`, `Business development/`, el código (`src/`, `app/`, `components/`, `services/`), el task list Cowork (#1–#148) y `CLAUDE.md`.

**Leyenda de estado:**
- ✅ **hecho** — en vivo / mergeado
- 🔨 **en curso** — parcial / código listo sin verificar en device
- ⬜ **pendiente** — decidido, planeado, sin construir
- 💡 **idea-TBD** — idea suelta / decisión abierta / spec sin fecha
- 🔬 **idea-research** — feature a "robar" del research de apps, aún no en producto

**Fuentes de verdad:** `PLAN_MAESTRO_V2_LOCKED_2026-07-17.md` (spine MB-0→MB-12) · `ESTADO_100_ATP_MASTER_TRACKER_2026-07-17.md` · `TRIAGE_BUGS_ENRIQUE_30` · `FABLE_COLA_MB5-7/MB8-10` · `SPEC_ARGOS_JARVIS_v1` · `CATALOGO_AUDIO_MENTE_v1` · `NBACK_CHALLENGE_SPEC_v1` · `V1.3_BACKLOG_MASTER` · `RESEARCH_WELLNESS_APPS_MASTER + LANDSCAPE_EXPANDIDO` · `FABLE_BRIEF_MAPA_COMUNIDAD/TRANSFORMACION` · `V1_FEATURE_MAP` · task list Cowork · grep de código.

> Convención de fuente: `MB-x` = mega-batch del plan LOCKED · `#N` = task Cowork · `PLAN`/`TRACKER`/`TRIAGE`/`SPEC`/`RESEARCH` = doc · `código:archivo` = marcador en el código.

---

## 0 · INFRA / DEPLOY / COMPLIANCE / STORES

| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| INF-1 | Sacar repo de OneDrive | Mover a carpeta local no-sincronizada (index corrupto ~4×) | ⬜ | MB-0 paso 0 |
| INF-2 | CI GitHub Actions `tsc --noEmit` | Gate autoritativo automático en cada push (mata tsc-en-OneDrive manual) | ⬜ | MB-0 destrabador (b) |
| INF-3 | SPA fallback en `vercel.json` | Rewrites catch-all → `/index.html` (404 crudo en refresh/deep-link) | ⬜ P0 | TRACKER INFRA-P0 · audit web P0-1 |
| INF-4 | Capa de tokens semánticos | Alias `bg`/`surface`/`text`/`accent` sobre brand.ts (habilita LIGHT sin repintar) | 🔨 | MB-0 (a) · `brand.ts:364` |
| INF-5 | Normalizar `as any` de expo-router | Regenerar tipos, quitar 8 casts de rutas (protege el gate tsc) | ⬜ | MB-0 (c) · #64 |
| INF-6 | Cuenta de test femenina | Habilita smoke de Ciclo/Embarazo (hoy ciego en cuenta masculina) | ⬜ | MB-0 (d) |
| INF-7 | Spike stack nativo | Decidir deps del build único: expo-audio, keyboard-controller, lib motion orb | ⬜ | MB-0 (e) |
| INF-8 | Build nativo único | Un solo `eas build` post-MB-1 con todas las deps previsibles (no 3 reactivos) | ⬜ | PLAN §4.1 |
| INF-9 | `react-native-keyboard-controller` | Dep nativa que blinda KEY-1 (no está en deps aún) | ⬜ | MB-4 delivery · PLAN §4.1 |
| INF-10 | `expo-audio` (matar expo-av) | expo-av deprecado SDK54; audio background + lock screen | 🔨 | MB-5 · PLAN §4.1 |
| INF-11 | `UIBackgroundModes:['audio']` | Config nativo para audio en background | ✅ | MB-4 delivery (ya existía) |
| INF-12 | Sentry sourcemaps upload | Subida de sourcemaps para errores legibles | ⬜ P1 | TRACK C · #59 |
| INF-13 | SQL boost testers H+ | Otorgar H+ inicial a testers | ⬜ P1 | TRACK C · #60 |
| INF-14 | Runbook launch day | Runbook actualizado con DX+Intervenciones+Comunidad | 🔨 | TRACK C · #61/#76 |
| INF-15 | Comms testers + invite Skool | Templates + invitación al grupo | ⬜ P1 | TRACK C · #62 |
| INF-16 | Grupo Skool cerrado + URL | Grupo privado con URL final | ⬜ P1 | TRACK C · #63 |
| INF-17 | Device retest grande consolidado | Retest de todos los batches juntos, cuenta masc + fem | ⬜ | MB-12 · #41 |
| INF-18 | Bump versión + build de release | app.json bump → build inmediato (regla #11) | ⬜ | MB-12 |
| INF-19 | Podar worktrees viejos | `.claude/worktrees/*` inflan tsc | ⬜ P3 | #20 |
| INF-20 | Rename migraciones 198a→198/198b→199 | CLI rechaza letras; verificar historia remota antes (migration repair) | ⬜ P3 | #85 |
| INF-21 | Flag `INTERVENTIONS_DRIVE_HOY=true` | Momento fuerte beta (ya ON en código) | ✅ | #42/#78 |
| INF-22 | Telemetría de costo por request ARGOS | Costo/request + rate-limits per tier + logging (frontera J3/J4) | ⬜ | SPEC §5.2 · PROMPT_004 |
| INF-23 | Rate limits per tier | Límites de uso ARGOS por tier | ⬜ PB | CLAUDE.md · PROMPT_004 |
| INF-24 | argos-proxy + fallback | Sonnet + fallback Gemini + logging (ya construido) | ✅ | memoria argos-proxy |
| INF-25 | Migrar Sonnet 4-20250514 → 4-6 | Upgrade de modelo (proxy ya en sonnet-5 según delivery) | 🔨 | CLAUDE.md · PROMPT_004 |
| INF-26 | Compliance: lenguaje médico / claims / personas | Scans C1-C12 (palabras rojas, posicionamiento no-diagnóstico) | ✅ | #142-145 · Legal/ |
| INF-27 | Aviso de privacidad + T&C + reembolsos | Docs legales v1 (URLs en somosatp.com) | ✅ | Legal/ |
| INF-28 | App Store / Play assets + ASO | Metadata, capturas, ASO, developer accounts | ⬜ | V1.3 Stores · App_Store_Assets/ |
| INF-29 | Web reset password en somosatp.com | Página `/reset-password` (hoy solo deep-link `atp://`) | 💡 | V1.3 M6 |
| INF-30 | Widgets nativos (post-stores) | Próximo evento, día timeline, tap agua, suples, meditar, comida, ARGOS | 💡 | V1.3 N4 |
| INF-31 | Notificaciones nativas 3 tipos | Standard / Adaptive ARGOS / Silent log-only, config por categoría | 💡 | V1.3 N5 |
| INF-32 | Wearable service (stub) | `wearable-service.ts` DESACTIVADO; sueño/pasos/HRV sin fuente | 🔨 PB | código:`wearable-service.ts` · `day-compiler.ts:248` |
| INF-33 | Integración Apple Health / wearables | Pararse sobre Apple Health, permisos granulares opt-in | 💡 PB | V2.1+ · PLAN §8 |
| INF-34 | Performance: diagnóstico pantallas lentas | Instrumentar console.time + PostHog, top-3 bottlenecks | 💡 | V1.3 M4 · #35 |
| INF-35 | Fix navegación profunda (stack/tabbar) | `router.replace('/')` reinicia stack; pantallas hondas pierden tabbar | 💡 | V1.3 M3 |
| INF-36 | Rewire boot / splash unificado real | SplashLoader con barra 0-100% real alimentada por compileDay | 💡 | V1.3 B1 |
| INF-37 | GlobalTopBar rollout a ~50 pantallas | Barra superior consistente (hoy solo en labs de referencia) | 💡 | V1.3 M2 |
| INF-38 | Trial countdown en TopBanner | Variante cuando exista sistema de trial/RevenueCat | 💡 | código:`TopBanner.tsx:102` TODO(#23) |

---

## 1 · HOY / AGENDA / YO / EDAD ATP

### HOY
| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| HOY-1 | Regresar cards meditación + journal a HOY | Desaparecieron / quedaron condicionadas al protocolo; activables | ⬜ P0 | MB-1 · bug Enrique HOY-1 |
| HOY-2 | Rediseñar "Ajustar mi protocolo" | Se siente horrendo; mapear customer journey antes; guiado no prisionero | ⬜ P1 | MB-1 · bug Enrique HOY-2 |
| HOY-3 | HomeFloatingButton rework | Matar "rayito" que reinicia (router.replace→navigate); casita ATP arriba-izq persistente salvo HOY | ⬜ P0 | MB-0 HOME-1 · #26 |
| HOY-4 | Routing granular de cards | Cada card → su pantalla específica (no hub-para-todo) | ✅/🔨 | Batch 1 · #1/#90 |
| HOY-5 | Cards HOY reflejan Mi Protocolo | Motor prescribe → HOY muestra (fin de config manual vieja) | ✅ | Batch 4 · #3b/#30 |
| HOY-6 | Journal completado palomea electrón | Bug del electrón booleano (3 lugares) | ✅ | Batch 1 · #17 |
| HOY-7 | HERO card recomendación dinámica local | ~20 reglas TS locales (hora, ayuno, proteína, sol) — gratis, sin ARGOS | ✅/💡 | V1.3 B3 · V1_FEATURE_MAP |
| HOY-8 | 8 cards electrones editoriales | Grid 2×4 → 8 cards full-width con imagen B/N + estados (glow en ventana óptima) | ✅/🔨 | V1.3 B5 |
| HOY-9 | Cards Check-in + Proteína + Agua editoriales | Counters inline, estilo Hero | ✅/🔨 | V1.3 B6 |
| HOY-10 | Card UV editorial con vida | Sun icon animado por hora + índice UV color + ventana óptima | 💡 | V1.3 B2 |
| HOY-11 | Press states + feedback pointer-down | scale(0.97), feedback en pointer-down, transiciones (loop de mayor frecuencia) | ⬜ | MB-1 polish loop |
| HOY-12 | 3 usos lime plano en HOY | Revisar en device, migrar a tokens | 🔨 P3 | audit ronda2 código |
| HOY-13 | WearableMetricCard (cardio/pasos) | Muestra "—" mientras wearable es stub | 🔨 PB | código:`WearableMetricCard.tsx` |
| HOY-14 | "Últimas sesiones cross-pilar" timeline | Journal, breathwork, meditación, check-ins | ✅ | V1_FEATURE_MAP |

### AGENDA
| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| AGE-1 | Unificar Agenda ↔ HOY (el "corazón") | Hecho=tachado sin notif; no-hecho=recordatorio; todo ligado a Mi Perfil | ✅ | Batch 4 · #30 |
| AGE-2 | Dedup dual (exacto + semántico) | Familias canónicas cross-vocabulario | ✅ | Batch 1/4 · #29 |
| AGE-3 | Notificaciones locales por evento | Path que sí dispara (sin cancelAll) | ✅ | Batch 1/4 · #28 |
| AGE-4 | Dedup semántico residual | "Desayuno proteico"+"Romper ayuno"; "Running"+"Zona 2" | ⬜ P3 | audit web P3-3 |
| AGE-5 | Eventos pasados sin estado | Atenuar/colapsar recordatorios cuya hora ya pasó | 🔨 P3 | audit web P3-4 · código:`AgendaMiniCard.tsx:75` |
| AGE-6 | Device retest notifs background | Verificar disparo en background físico | ⬜ P1 | #41 |
| AGE-7 | Conectar tomas de suplementos a agenda | Momentos de toma → cards de agenda | ⬜ P1 | SUP-4 |
| AGE-8 | Agenda-editor (calendario vertical) | Vista Google-Cal, drag&drop, editar hora/duración/repetir/notify, plantillas de día | 💡 | V1.3 B4.c |
| AGE-9 | Agenda-settings (reglas inteligentes) | Desayuno Xh tras cena, ayuno objetivo, sunrise/sunset geo, café OFF, ventana entrenamiento | 💡 | V1.3 B4.d |
| AGE-10 | "Reorganiza con ARGOS" (280 H+) | Reorganizar agenda bajo demanda con cobro H+ | 💡 | V1.3 B4.c/f |
| AGE-11 | Comandos ARGOS chat para agenda | "mueve cena a 8pm", "plan ayuno 18h hoy" | 💡 | V1.3 B4.f |
| AGE-12 | Palomar agenda = electrón/hábito | Eventos-hábito disparan hábito con idempotency; no-hábito = 1 electrón | ✅/🔨 | V1.3 B4.e |

### YO
| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| YO-1 | Edad ATP como 1er dato en YO | Score estrella desplegado primero (perfil founder ahí) | ⬜ P1 | MB-1 · bug Enrique YO-1 |
| YO-2 | Cronotipo Delfín como estado temporal | Avisar + mostrar cronotipo madre; no esconderlo | ⬜ P1 | MB-6 · #12 doctrina Delfín |
| YO-3 | YO rediseñado (Disciplina + Cronotipo + Progresión) | Que YO diga algo de ti, no menú muerto | ✅ | Batch 2 · #8 |
| YO-4 | Rutas YO a destinos propios | rank→progreso, tendencias→reportes-mes | ✅ | Batch 2 · #5 |
| YO-5 | Ventana de foco pico en cronotipo | Leer peak_focus_start/end (ya en DB, sin usar) + conectar a agenda | ⬜ | MB-6 punto 2 |
| YO-6 | Propagación cambio de cronotipo | Reflejar en HOY/agenda/protocolo/ARGOS (bug León→Oso) | ✅ | #129 · MB-6 punto 3 |

### EDAD ATP
| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| EDA-1 | Corregir sentido invertido "años SOBRE tu edad" | "27.8 biológicos · 7.2 años SOBRE" confuso; verificar cálculo+palabra+input edad real | ⬜ P1 | MB-1 · audit web P1-1 |
| EDA-2 | Motor Edad ATP v2 (5 áreas ciegas) | Cardio/Cognición/Composición/Fuerza/Rejuvenecimiento + anclaje + modulador hábitos | ✅ | reference motor v2 |
| EDA-3 | Validación final copy médico Edad ATP | Borrador v1 pendiente firma Mariana | 🔨 | código:`edad-atp-model.ts:1` |
| EDA-4 | SF_DOMAIN_WEIGHTS reales | Pesos placeholder bloquean SF=0.6083 exacto | ⬜ | código:`edad-atp-v2-model.ts:201` |
| EDA-5 | Validar clamp con datos reales | Sprint 5 TODO (±3 → ±1.5) | ⬜ | código:`edad-atp-v2-model.ts:65` |
| EDA-6 | Flujo de captura dedicado (params questionnaire) | Algunos params sin flujo de captura | ⬜ | código:`edad-atp-source-map.ts:139` |
| EDA-7 | Edad ATP GRATIS en web como lead magnet | Test de edad biológica público para capturar leads (modelo NOVOS) | 🔬 | RESEARCH landscape |
| EDA-8 | Presentar Edad ATP nivel Oura | UN número + color de estado, complejidad escondida | 🔬 | RESEARCH master (Oura) |

---

## 2 · FITNESS (rebuild — ~35%)

| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| FIT-1 | Rename "ATP Explorar" → "ATP Fitness" | `fitness-hub.tsx:39` | ⬜ P1 | MB-3 · bug Enrique FIT-1 |
| FIT-2 | "Timer rápido" → pantalla TIMERS ESTÁNDAR | Hoy manda a construir rutina; debe abrir timers existentes | ⬜ P1 | MB-3 · FIT-2 |
| FIT-3 | Card cardio HOY → registrar cardio directo | Hoy manda a Fitness hub | ⬜ P1 | MB-3 · FIT-3 |
| FIT-4 | REBUILD completo de Fitness | Arquitectura info (menú-vs-datos), ejecución rutina, biblioteca, métodos, registro fuerza/cardio, electrones correctos | ⬜ XL | MB-3 · FIT-4 · #6/#14 |
| FIT-5 | Capa editorial Fitness | Molde EditorialCard a 3 cards + matar vacío negro | ⬜ P2 | MB-3 Fase 3C · audit web P2-2 |
| FIT-6 | Biblioteca de ejercicios | Nombres canónicos + variaciones (recortable si time-box aprieta) | 🔨 | MB-3 · V1_FEATURE_MAP |
| FIT-7 | Métodos propietarios ATP | Basados en 3× GWR de Enrique (ej. Método 3-5 ya existe) | 🔨 | código:`Method35.tsx` · V1_FEATURE_MAP |
| FIT-8 | Ejecución en vivo (timer + series/reps/peso) | Registro set-a-set | 🔨 | V1_FEATURE_MAP |
| FIT-9 | Personal Records tracking automático | PR por ejercicio | 🔨 | V1_FEATURE_MAP |
| FIT-10 | Cardio (running/cycling) distancia+tiempo | Registro cardio con electrones validados (dio mal antes) | 🔨 | V1_FEATURE_MAP · #34 |
| FIT-11 | Pasos diarios (integración) | Requiere wearable | 🔨 PB | V1_FEATURE_MAP |
| FIT-12 | Body measurements | Peso, medidas, composición | 🔨 | V1_FEATURE_MAP |
| FIT-13 | Mobility assessments | Evaluación de movilidad | 💡 | V1_FEATURE_MAP |
| FIT-14 | ARGOS Routines "modo coach exigente" | Generación adaptada a nivel real | 💡 | V1_FEATURE_MAP |
| FIT-15 | Heatmap anatómico de fatiga (7 sistemas) | Mapear 7 sistemas de Mariana sobre silueta (modelo Fitbod) | 🔬 | RESEARCH landscape |
| FIT-16 | Producción editorial cinematográfica del guiado | Contenido aspiracional, no tracker (modelo Nike Training Club) | 🔬 | RESEARCH landscape |
| FIT-17 | Logging entre-series en segundos | Fricción mínima como principio (modelo Hevy/MyFitnessPal) | 🔬 | RESEARCH landscape |

---

## 3 · NUTRICIÓN / SUPLEMENTOS / ATP FUNCTIONAL SCORE

### Nutrición
| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| NUT-1 | Registro por foto (food scan IA) | IA identifica comida + estima macros | ✅ | V1_FEATURE_MAP |
| NUT-2 | Registro por texto (food-text) | Descripción en lenguaje natural | ✅ | V1_FEATURE_MAP |
| NUT-3 | Platos frecuentes / guardados | Ir directo a comidas usuales | ✅ | V1_FEATURE_MAP |
| NUT-4 | Modo SIMPLE (default) vs COMPLETO (opt-in) | 2 números vs detalle full; toggle con confirmación | ✅ | V1_FEATURE_MAP · doctrina guiado |
| NUT-5 | Proteína por peso corporal | 1.8g/kg desde body measurements | ✅ | V1_FEATURE_MAP |
| NUT-6 | Balance macros por % kcal (rangos ATP) | Carbos 0-25 / grasas 50-75 / proteína 20-35 + red flags | ✅ | V1_FEATURE_MAP |
| NUT-7 | Recetas + favoritos + lista de compra | Suma automática de ingredientes por unidad | 🔨 | V1_FEATURE_MAP |
| NUT-8 | Ayuno IF + profundo | Timer visual + timeline activación metabólica | ✅ | V1_FEATURE_MAP |
| NUT-9 | Hidratación con contexto | Card pelona → contexto epigenético + historial del día + imagen editorial | ⬜ P2 | MB-8 · audit web P2-3 |
| NUT-10 | Estado biológico EN VIVO del ayuno | "¿en qué zona estás ahora?" nunca gatear el dato que engancha (modelo Zero) | 🔬 | RESEARCH master |
| NUT-11 | Motor que aprende de TU respuesta y reajusta | ARGOS aplicado a nutrición (modelo MacroFactor) | 🔬 | RESEARCH landscape |
| NUT-12 | Base de datos de labo curada | Los biohackers no perdonan datos basura (modelo Cronometer) | 🔬 | RESEARCH landscape |

### Suplementos
| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| SUP-1 | Scan → "agregar a mi plan" | Crea card con datos prellenados (texto libre editable) + sello BHA auto | ⬜ P1 | MB-2 · bug Enrique SUP-1 |
| SUP-2 | Dropdown de introducción trabado | Menú hasta-abajo, no intuitivo (imagen adjunta) | ⬜ P1 | MB-2 · SUP-2 |
| SUP-3 | Múltiples tomas/día (AM+PM) [RAÍZ] | Reactivar Sprint SUPS_DOSIS_MULTIPLES; sin esto nada cierra | ⬜ P1 | MB-2 · SUP-3 |
| SUP-4 | Tomas → cards de agenda | Recordatorios reales (reusar path notif local) | ⬜ P1 | MB-2 · SUP-4 |
| SUP-5 | Perf suplementos lento | Optimizar pantalla lenta | ⬜ P2 | #35 |
| SUP-6 | Sello BHA + scan etiqueta | Scan gratis Pro / cobra | ✅ | #39/#58 |
| SUP-7 | Bug embarazo gateado por sexo | Hombre ya no ve "estás embarazada" (isPregnancyActive) | ✅ | Batch 1 · #4 |
| SUP-8 | Biblioteca personal + dosis flexibles | supplement_library como entidad única, tracking histórico, gráficas adherencia, reporte médico | ✅/🔨 | V1.3 N1 · V1_FEATURE_MAP |
| SUP-9 | Catálogo curado ATP (14×5, N1-N4) | Suplementos × objetivos con nivel evidencia + precauciones (Mariana) | ✅ | V1_FEATURE_MAP |
| SUP-10 | BHA V2 crowd-sourced + comparativo | Base crowd-sourced + comparativo de productos | ⬜ PB | #53 |
| SUP-11 | Doctrina plantas tradicionales SÍ / extractos NO | Té/polvo/alimento en catálogo; cápsulas industrializadas a BHA | ✅ | memoria doctrina plantas |
| SUP-12 | Comprimir fotos (palanca de costo) | Reducir costo de servir (LLM+storage) | 💡 | memoria costos servicio |

---

## 4 · MENTE (audio, respiración, meditación, journal, cognitivo)

### Audio (catálogo v1 = 31 piezas voz + 3 binaurales)
| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| MEN-1 | Reproductor de audio cableado al catálogo | Player con background + lock screen (expo-audio) | 🔨 | MB-5 · #19/#46 |
| MEN-2 | Script de ensamble (parser + ffmpeg) | Segmentos + silencios exactos + cama sonora + normalización LUFS | ⬜ | CATALOGO_AUDIO pipeline |
| MEN-3 | 12 piezas Fase 1 (motor las prescribe) | NSDR, sueño, mindfulness, estrés, ansiedad, SOS pánico, escaneo, gratitud, pranayama, cierre día, pausa 1min, cues | ⬜ | CATALOGO_AUDIO Fase 1 |
| MEN-4 | 13 piezas Fase 2 (identidad ATP) | 9 mantras + visualización día ideal + WOOP + perdón + amor/compasión | ⬜ | CATALOGO_AUDIO Fase 2 |
| MEN-5 | 6 piezas Fase 3 (profundas) | Observación ecuánime, presencia, visualización meta, sanación perdón, relajación profunda, abundancia | ⬜ | CATALOGO_AUDIO Fase 3 |
| MEN-6 | 3 binaurales por código | Alpha/theta/delta generados con ffmpeg (~$0) — resuelve #46 | ⬜ | CATALOGO_AUDIO · #46 |
| MEN-7 | Biblioteca de sonidos (camas) | Room tone, naturaleza, drone/pad, campana firma ATP, cues respiración | ⬜ | CATALOGO_AUDIO |
| MEN-8 | Elegir "la campana ATP" | Firma sonora que el user oye miles de veces | 💡 | CATALOGO_AUDIO |
| MEN-9 | 3 guiones piloto (validan pipeline) | mindfulness_base, sueno_induccion, mantra_amor_fati en 2 voces | ⬜ | CATALOGO_AUDIO paso 2 |
| MEN-10 | Validación Mariana de piezas 🩺 | SOS pánico (obligatorio disclaimer), estrés, ansiedad, sanación, relajación, abundancia | ⬜ | CATALOGO_AUDIO |
| MEN-11 | Voz M/F en todo el catálogo | Usuario escucha su elección de Meet ARGOS | ⬜ | CATALOGO_AUDIO |

### Respiración
| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| MEN-12 | Audio respiración (sonidos/fondos/música/editorial) | Sacar de obra negra | ⬜ | MB-5 · #18 |
| MEN-13 | Timer visual con anillo por fase | Verde inhala / azul retén / naranja exhala + cues sonoros | ✅ | V1_FEATURE_MAP |
| MEN-14 | Técnicas: 4-7-8, Box, Coherencia 5-5, Wim Hof Lite | Con contraindicaciones (embarazo/cardíaco/agua) | ✅ | V1_FEATURE_MAP |
| MEN-15 | Copy autoridad fuera (Navy SEALs/Stanford) | Doctrina no citar autoridades | ✅ | #140 |
| MEN-16 | Motor de protocolo-en-vivo (respiración premium) | Burbuja animada + fases del nivel REAL + háptico/voz/soundscape + entrada por estado deseado | 🔬 | RESEARCH landscape (WHM/STAmina/Breathwrk) |
| MEN-17 | Gate de seguridad WHM | Reconocer posición segura + prohibición agua/conducir + botón Detener siempre visible | 🔬 | RESEARCH landscape · Sprint 3 |

### Meditación / Journal / Check-in
| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| MEN-18 | Pantallas de ejecución terminadas | Cuenta regresiva legible, estados claros, salida sin castigo (registra tiempo real) | ⬜ | MB-5 punto 1 |
| MEN-19 | Barrido copy placeholder vivo | "En comunidad verifica pronto", "Próximamente", "Lorem", "TODO" — ninguno sobrevive | 🔨 | MB-5 punto 1 · código:`community-presence-core.ts:26` |
| MEN-20 | Bug electrón de journal | 3 lugares cableados + test de regresión + emit electrons_changed | 🔨 | MB-5 punto 2 |
| MEN-21 | Bugs de check-in (persistencia) | Estados que no persisten bien | ⬜ | MB-5 punto 3 |
| MEN-22 | Copy "@" inclusivo | "Relajad@"→"En calma"; barrer literales | ⬜ P3 | MB-5 · audit web P3-1 |
| MEN-23 | Journal con racha + prompts rotativos | 10 prompts editoriales, historial con filtros | ✅ | V1_FEATURE_MAP |
| MEN-24 | Medallas Mente 7/30/90/365d | Por categoría (mente_medals) | ✅ | V1_FEATURE_MAP |
| MEN-25 | mind-hub legacy eliminado | Matar duplicado vivo | ✅ | #139 |

### Cognitivo (N-Back + tools atención)
| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| MEN-26 | N-Back Challenge (UI surface) | Lógica + mig 197 + tests listos; falta UI. Dual N-Back, grilla 3×3 + audio, progresión N | ⬜ PB (20-30h) | #45 · NBACK_SPEC |
| MEN-27 | Algoritmo adaptativo Jaeggi (90%/75%) | Motor de dificultad (sube/baja N) — modelo Brain Workshop | ⬜ | NBACK_SPEC |
| MEN-28 | Métricas N-Back (current_n, best_n, accuracy, racha) | Pantallas post-sesión + historial + gráfica | ⬜ | NBACK_SPEC |
| MEN-29 | Copy honesto N-Back (no "te hace más inteligente") | "Reto que mide y entrena working memory" (lección FTC/Lumosity) | ⬜ | RESEARCH landscape · compliance |
| MEN-30 | Tools atención (PVT/Stroop/TMT) | Para correlacionar con N-Back | ⬜ PB | #115 |
| MEN-31 | N-Back editorial (no austero) + baseline personal | Verse premium (Elevate); comparar solo contra sí mismo (Lumosity) | 🔬 | RESEARCH landscape |

---

## 5 · SALUD FUNCIONAL (labs, Mapa Funcional, protocolos, biomarcadores)

| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| SAL-1 | Salud Funcional 8 destinos + arquitectura nav-vs-datos | Rediseño raíz (un dato = un lugar) | ✅ | Mega-Sprint B · #133 |
| SAL-2 | Mi Diagnóstico legible | Narrativa funcional, raíces, confianza, Edad ATP | ✅ | audit ronda2 (resuelto) |
| SAL-3 | Guía de Labs (5 paquetes MX + PDF export) | Léxico mexicano, momentos clave; expandir contenido con Mariana | 🔨 | Sprint Labs · #93 · V1.3 N2 |
| SAL-4 | Mi Expediente timeline | Por mes con íconos | ✅ | Mega-Sprint B · #104 |
| SAL-5 | Mi Expediente snake_case → labels legibles | Nombres de labs crudos | ⬜ P2 | MB-8 · audit web P2-1 |
| SAL-6 | Síntomas con flag inicio/fin (is_active/resolved_at) | Medir duración como ayuno | ✅ | #135 |
| SAL-7 | Padecimientos TENÍA vs TIENE | Distinguir resuelto de activo (mismo modelo síntomas) | 🔨 | memoria padecimientos |
| SAL-8 | Motor Mi Protocolo (5 prescritas "por qué a TI") | DX + Braverman + labs → 5 intervenciones | ✅ | Mega-Sprint motor · #106/#127 |
| SAL-9 | Catálogo epigenético (89 intervenciones) | Multi-paradigma + rastro epigenético | ✅ | #105/#108/#110 |
| SAL-10 | Auditoría "qué sirve / qué no" Salud Funcional | Revisar todo el pilar | 🔨 P2 | #134 |
| SAL-11 | Scoring motor ×10→×5 (validar Mariana) | Calibrar; SOLO con firma Mariana | ⬜ P1 | #130 · MB-11 |
| SAL-12 | Cetonas 3 fuentes (sangre/aliento/orina) | Módulo cetonas | ✅ | #113 |
| SAL-13 | Vocab +5 categorías | Ocular/vagal/respiración/atención/contemplativo (dedup semántico) | ✅ | #114 |
| SAL-14 | Ducha Haghayegh corregir | 90min = antelación, no duración; baño tibio + flora piel | ✅ | #117 |
| SAL-15 | Cold interventions tag fiebre | ducha_fria/wim_hof/sauna con contraindicación fiebre viral | 🔨 | #123/#130 |
| SAL-16 | Biomarcadores caros tier 1/2/3 | HSP70/NEFA/succinato/irisin en taxonomía; motor solo los pide si diferencial crítico | ⬜ PB | memoria biomarcadores |
| SAL-17 | 144 biomarcadores en 20 categorías | Upload PDFs con parsing IA | ✅ | V1_FEATURE_MAP |
| SAL-18 | Motor de lectura de labs (time-series) | "Corazón de ATP", último por parámetro | 🔨 PB | memoria labs_corazon |
| SAL-19 | Flags clínicos labs sin auto-fix | AST/GGT doble-key, B12=6000, leucocitos mixtos (decisión Mariana) | 💡 | V1.3 M1 |
| SAL-20 | Protocolo Ayuno Sardinas (detalles finales) | Duración/cantidad/electrolitos/exclusiones pendientes Enrique-Mariana | 🔨 | código:`interventions-catalog.ts:8694` |
| SAL-21 | Rutas de captura por parámetro pendiente | Fallback a formulario general (Mariana #16) | 🔨 | código:`data-capture-routes.ts` |
| SAL-22 | Lenguaje labs-sin-diagnóstico | "punto de partida, no diagnóstico" / "óptimo ≠ normal con color" (Function/InsideTracker) | 🔬 | RESEARCH landscape · compliance |
| SAL-23 | Conectar marcadores entre sí (no lista suelta) | Biomarcadores relacionados (modelo Function Health) | 🔬 | RESEARCH landscape |
| SAL-24 | Re-test cada 3 meses como motor de retención | IA propone / humano valida (modelo Superpower/Lifeforce → HUB Fx) | 🔬 | RESEARCH landscape |
| SAL-25 | Dogfooding público Enrique (Blueprint) | 3× GWR mostrando sus números = autoridad gratis | 🔬 | RESEARCH landscape |
| SAL-26 | Mapa de transformación DX (levantamientos) | 1 integral choncho + 9 sublevantamientos por área con skip logic | 🔨 | FABLE_BRIEF transformación |
| SAL-27 | Actualizar DX Pro auto / Base manual (750 H+) | Auto al llegar dato nuevo (Pro) vs botón manual con cobro (Base) | 🔨 | FABLE_BRIEF transformación |

---

## 6 · CICLO / EMBARAZO

| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| CIC-1 | Pilar Ciclo base | Calendario, síntomas, predicción, compañero | ✅ | pilares base |
| CIC-2 | Modulación bidireccional | Folicular/ovulatoria intensificar; lútea/menstrual escuchar (no paternalismo) | ✅ doctrina/🔨 copy | MB-7 · doctrina ciclo |
| CIC-3 | Máscara "ATP Embarazo" | Transforma módulo con sensibilidad extra visuals+copy | 🔨 | MB-7 · memoria embarazo |
| CIC-4 | Capturar estado actual embarazo/lactancia | No solo histórico (gap cuestionario) | ⬜ | MB-7 · memoria padecimientos |
| CIC-5 | Labs de mujeres contextualizados por fase | Estradiol/progesterona/LH/FSH junto a fase; decir si falta fase | 🔨 | MB-7 · memoria labs+ciclo |
| CIC-6 | Barrido gate biological_sex en toda superficie Ciclo | Ninguna pantalla renderiza sin verificar sexo (bug "estás embarazada") + test cuenta masc | ⬜ | MB-7 punto 4 |
| CIC-7 | Predicción y síntomas (modelo is_active/resolved_at) | Verificar que Ciclo use igual que el resto | 🔨 | MB-7 punto 5 |
| CIC-8 | Gate de smoke en cuenta femenina | Probar todo el pilar en device con cuenta fem | ⬜ | MB-7 gate |
| CIC-9 | Anonymous Mode / privacidad como alivio | Consentimiento que se siente como control, no letra chica (modelo Flo post-Roe) | 🔬 | RESEARCH landscape · Sprint 2 |
| CIC-10 | Diseño neutral-científico anti-rosa | "adulta con biología poderosa" (modelo Clue) | 🔬 | RESEARCH landscape |
| CIC-11 | Temperatura basal automática vía wearable | Input pasivo grado médico (modelo Natural Cycles) | 🔬 PB | RESEARCH landscape |
| CIC-12 | SKIP legítimo por fase lútea | Racha no se rompe en fase lútea (modelo Way of Life) | 🔬 | RESEARCH landscape |

---

## 7 · TESTS (Braverman + quizzes)

| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| TST-1 | Cuestionario Maestro (mig 203) | Reemplaza 5 quizzes chafas, alimenta motor | ✅ | Mega-Sprint D · #107 |
| TST-2 | Ediciones Enrique v2 | Aplicadas | ✅ | EDICIONES_ENRIQUE_v2 |
| TST-3 | Validación final preguntas con Mariana | Blocker MB-12 | 🔨 P1 | MB-11 · roadmap |
| TST-4 | Fitzpatrick Tipo 5 vs Tipo 4 dup | Placeholder duplicado, corregir | ⬜ P2 | #86 · MB-8 |
| TST-5 | 3 tests rojos post-epigenética | ayuno_16_8 + lentes_rojos + 3ro → doctrina nueva | ⬜ P2 | #125 |
| TST-6 | Braverman 313Q | Test de neurotransmisores (base) | ✅ | pilares · braverman-questions |
| TST-7 | Cherry-pick orphans p5b (5 cuestionarios HC) | Commit 7570251 nunca mergeado | 💡 | V1.3 M5 |
| TST-8 | Quiz que hace sentir el programa a la medida | Onboarding cognitivo tipo Peak/NeuroNation | 🔬 | RESEARCH landscape |
| TST-9 | Reaction Time (único test no-formulario) | El resto = formularios de captura | ✅ | memoria tests |

---

## 8 · ARGOS (Jarvis: orb, voz, proactividad, multimodal)

| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| ARG-1 | System Prompt Jarvis (J1) | 5 pilares + tono + 3 niveles no-matar-placebo + prohibiciones | 🔨 | SPEC §1 · J1 |
| ARG-2 | Migrar modelo a Sonnet 4-6 | (proxy ya en sonnet-5 según delivery) | 🔨 | SPEC §1.6 · PROMPT_004 |
| ARG-3 | Orb / waveform 4 estados (J2) | idle/escuchando/pensando/hablando, glass lime→teal, 60fps, reduce-motion | 🔨 código✅/device-gate | SPEC §2 · MB-4 delivery |
| ARG-4 | Proactividad + gobernanza anti-spam (J3) | Cap/día + quiet hours por cronotipo + una a la vez + descartable + supresión tras 2 | ⬜ | SPEC §3/§5 · J3 |
| ARG-5 | Síntomas pattern detection | ARGOS nota patrones de síntomas | ⬜ PB | #48 |
| ARG-6 | Cross-parameter analysis | Cruza parámetros (post research Mariana) | ⬜ PB | #49 |
| ARG-7 | Vigencia inteligente de labs por parámetro | Sabe cuándo un lab caducó | ⬜ PB | #50 |
| ARG-8 | Multimodal (J4) | Foto comida/etiqueta/lab → interpreta con contexto; gate por H+ | 🔨 | SPEC §3 · J4 |
| ARG-9 | Voz: STT Gemini + TTS ElevenLabs (J5) | Streaming, primer audio <2s, interrumpible; edge function argos-voice | 🔨 código✅/device-gate | MB-4 delivery · SPEC §4 |
| ARG-10 | H+ voz (voice_turn 400 inicial, mig 206) | Cobro server-side calibrable con argos_logs | ✅ | MB-4 delivery |
| ARG-11 | VAD automático de barge-in | Interrumpir sin tap (hoy es por tap) | 💡 | MB-4 delivery |
| ARG-12 | Secrets ElevenLabs + deploy edge function | ELEVENLABS_API_KEY + voice IDs M/F + deploy (manos Enrique) | ⬜ | MB-4 delivery dudas |
| ARG-13 | Elegir 2 voces ElevenLabs ES-MX (Flash) | Mentor cálido con autoridad, catálogo o clonada | 💡 D1 | SPEC §0 · próximos pasos |
| ARG-14 | Dirección visual exacta del orb | Paleta/forma/materia (esfera translúcida lime→teal que respira) | 💡 D2 | SPEC §0 |
| ARG-15 | Firma de la voz / nombre | ¿se auto-presenta cada turno o solo en Meet ARGOS? | 💡 D3 | SPEC §0 |
| ARG-16 | Meet ARGOS reescritura WOW | Texto Enrique; flag honestidad IA vivo | ⬜ P1 | #43/#141 |
| ARG-17 | 3 demos verificables (gate J5) | Proactiva pertinente + foto etiqueta + voz 5 turnos <2s | ⬜ | SPEC §6 |
| ARG-18 | ARGOS on-doctrine (labs reales, deriva profesional) | Base actual | ✅ | audit web · Sprints Magia |
| ARG-19 | intervention_rationale narrativa (Pro gratis) | "Por qué a TI" narrativo | ✅ | #47 |
| ARG-20 | ARGOS aterrizar contexto (timeContext geo) | Hora + sunrise/sunset + reglas suaves | 🔨 | V1.3 M7 · docs/ARGOS_LECCIONES |
| ARG-21 | ARGOS = "score que es coaching" | Abro y sé qué hacer hoy, en español MX claro (modelo Whoop) | 🔬 | RESEARCH master |
| ARG-22 | El "aha" cruzado hecho visual | "dormiste mal → foco se movió → glucosa picará" (modelo Levels) | 🔬 | RESEARCH master |
| ARG-23 | Micro-dosis diaria (reflejo de abrir) | ARGOS en HOY sin depender de contenido (modelo Daily Calm) | 🔬 | RESEARCH master |
| ARG-24 | Carisma/personalidad en TODA la app | Personalidad ARGOS omnipresente, no en una modalidad (modelo Peloton) | 🔬 | RESEARCH landscape |
| ARG-25 | ALMA de ARGOS: ingeniero de la creencia | Placebo honesto, espejo de evidencias, 1%=ruta (ancla venta Pro) | 💡 | memoria personalidad_creer |
| ARG-26 | Un cerebro ARGOS único cross-plataforma | Matar 3 proyectos, capa de ajuste por plataforma | 💡 | memoria cerebro_central |

---

## 9 · COMUNIDAD (social tipo Strava, retos, ranking, Skool)

| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| COM-1 | Hub Comunidad (entry point + pantalla real) | app/comunidad/index.tsx | 🔨 | #28/#57 |
| COM-2 | Amigos (buscador + request bidireccional) | Buscar por nombre/username/país, agregar/aceptar/rechazar, contador | 🔨 | FABLE_BRIEF comunidad |
| COM-3 | Perfil público con visibilidad granular | Foto/alias/país/streak/electrones/badges/cronotipo/amigos — todo opt-in | 🔨 | FABLE_BRIEF comunidad |
| COM-4 | NUNCA público: DX, síntomas, labs, journal, ciclo | Datos clínicos jamás en perfil | ✅ regla | FABLE_BRIEF comunidad |
| COM-5 | Feed de actividad de amigos | Badge, streak milestone, rango, "completó su día", PR fitness | 🔨 | FABLE_BRIEF comunidad |
| COM-6 | Reacciones emoji (fuego/aplauso/respect) | Sin comentarios de texto libre | 🔨 | FABLE_BRIEF comunidad |
| COM-7 | Presencia comunidad (placeholder honesto) | Bajo umbral no inventa número | ✅ | código:`CommunityPresence.tsx` |
| COM-8 | Push notif solicitud de amistad | Notif al recibir request | ⬜ PB | #19 |
| COM-9 | Retos con inscripción + auth bridge Skool | Comunidad V1.5, bridge automático a Skool | ⬜ PB | #52 |
| COM-10 | Ranking cron automatización | Opción B post-beta | ⬜ PB | #55 |
| COM-11 | Assets B/N card Comunidad Mi ATP | Imagen editorial | ⬜ | #56 |
| COM-12 | Capa social/comparativa (el foso) | Comparar Edad ATP/electrones/adherencia contra tu yo pasado + tribu (modelo Strava/segmentos) | 🔬 | RESEARCH landscape |
| COM-13 | Boss battle grupal cooperativo | Reto grupal (modelo Habitica, sin lo punitivo) | 🔬 | RESEARCH landscape |
| COM-14 | Canal B2B2C (licenciar a clínicas/empresas) | Escala sin CAC (modelo Headspace for Work → HUB Fx) | 🔬 | RESEARCH master |

---

## 10 · GAMIFICACIÓN (electrones, H+, rachas)

| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| GAM-1 | Economía electrones + H+ | Base $399/mes; H+=$0.01; ancla Braverman 1,000 H+ | ✅ | memoria economía protones |
| GAM-2 | Electrón booleano nuevo = 3 lugares | Falta el 3ro = falla silenciosa; emit electrons_changed | ✅ regla | memoria nuevo_electron |
| GAM-3 | Features LLM caras = transacción H+ (no gate tier) | Pro = all-you-can-eat (modelo Ultrahuman PowerPlugs) | ✅ doctrina | memoria features_premium |
| GAM-4 | Cardio otorgó electrones mal | Validar pesos (dio 4.5 vs oficial 2.5) | ✅ | #34 |
| GAM-5 | Racha-sin-culpa como sistema (3 estados) | "lo hiciste" / "hoy no aplicaba" (skip legítimo) / "fallaste recuperable" | 🔬 | RESEARCH landscape (Way of Life/Duolingo/Finch) |
| GAM-6 | Escudo/freeze de racha ganado | Recuperar con esfuerzo, no con dinero (modelo Duolingo) | 🔬 | RESEARCH landscape |
| GAM-7 | Ausencia = cariño, nunca reproche | "qué bueno que volviste" (modelo Finch) | 🔬 | RESEARCH landscape |
| GAM-8 | Arrancar con UNA acción mínima y apilar | Anti-saturación "Mi Protocolo sugiere TODO" (modelo Fabulous) | 🔬 | RESEARCH landscape |
| GAM-9 | Framing de deuda para hábitos rezagados | Aversión a "pagarla" mueve más que score neutro (modelo Rise, con cuidado placebo) | 🔬 | RESEARCH master |
| GAM-10 | Regla ética de racha | Si la racha deja de servir tu meta, se mata (modelo Duolingo) | 🔬 | RESEARCH landscape |
| GAM-11 | Badges/rangos + streak milestones | 7d/30d/100d, rango subido | ✅/🔨 | FABLE_BRIEF comunidad |

---

## 11 · ONBOARDING / DISEÑO / EDITORIAL / PULIDO TRANSVERSAL

### Onboarding
| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| ONB-1 | Flujo post-pago completo | Bienvenida → setup mínimo → Meet ARGOS → tour 7 pantallas → HOY | 🔨 | MB-10 · welcome_tour |
| ONB-2 | Meet ARGOS con orb + selección voz M/F preview | Integra J2 + preview; copy con flag vivo | 🔨 | MB-10 · #141 |
| ONB-3 | Tour 7 pantallas (una por pilar, editorial) | Apetito no instrucciones; skippeable siempre | 🔨 | MB-10 |
| ONB-4 | Distinguir marketing funnel (web) de onboarding (app) | Cero venta/pricing dentro de la app | ✅ regla | memoria distinguir_mkt |
| ONB-5 | Onboarding como ritual, no formulario | Descubrimiento personal memorable/compartible (modelo Zoe/Oura) | 🔬 | RESEARCH master |
| ONB-6 | AgeGate (menor de edad → email madre) | Gate de edad | ✅ | código:`AgeGateModal.tsx` · AGE_GATE_SPEC |

### Design system / editorial / pulido
| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| ONB-7 | Design system ATP (matar lime-brutalist) | Degradados+teal+amarillo editorial, 3 colores | ✅ | Batch 3 · #23 |
| ONB-8 | Molde EditorialCard + imágenes MJ estilo OURA | Aplicado a mayoría; fondos + agenda + destinos | ✅ | Mega-Sprint C · #132 |
| ONB-9 | LIGHT mode | Valores light sobre capa semántica + sweep pantalla-por-pantalla | ⬜ PB v2.1 | MB-9→v2.1 · #24 |
| ONB-10 | "Navy SEALs" en 2 campos benefit | Quitar autoridad user-facing (interventions-catalog:3320/3541) | ⬜ P1 | MB-0 NAVY-SEALS · #140 |
| ONB-11 | Morado off-brand #7c3aed | chronotype.tsx:29 → token brand.ts | ⬜ P2 | audit ronda2 código |
| ONB-12 | KeyboardAvoidingView app-wide | Teclado tapa inputs bajos; componente Screen compartido | ⬜ P0 | MB-0 KEY-1 |
| ONB-13 | Vacíos negros restantes | Evaluaciones + lo que no cerró Fitness/lazy-load | ⬜ P2 | MB-8 · audit web P2-4 |
| ONB-14 | Toast "N sin leer" auto-dismiss | No tapar header, ocultamiento suave | 🔨 P3 | MB-8 · audit web P3-2 · código:`TopBanner.tsx:65` |
| ONB-15 | Card "Mi Diagnóstico Funcional" sin imagen | Imagen editorial faltante | ⬜ | #71 |
| ONB-16 | Barrido snake_case app-wide | Identificadores crudos → legibles (Mi Expediente residual) | ✅/🔨 | #137 · MB-8 |
| ONB-17 | Colores hardcoded → tokens brand.ts | journal, cycle-*, tabs | ⬜ | MB-8 higiene |
| ONB-18 | Tab icons gradient lime→teal | LinearGradient + mask Ionicons | 💡 | V1.3 B7 |
| ONB-19 | Biblioteca ~50 imágenes B/N editoriales | Hero agenda (40) + electrones (8), 2x retina | 🔨 | V1.3 B8 |
| ONB-20 | Copy/UX globales | Español MX, explicar siglas, ejemplos, helper multiselect, inputs iOS | 🔨 P2 | memoria copy_ux_globales |
| ONB-21 | Cleanup HOY (matar viejos) | ElectronBadge viejo, engrane header, cards legacy | 🔨 | V1.3 B9 |
| ONB-22 | Meet ARGOS 2da pasada honestidad IA | Flag vivo, no dar copy por final | ⬜ | #141 |
| ONB-23 | Paint overlay para bugs visuales persistentes | Técnica: pedir screenshot marcado tras 2 fixes fallidos | 💡 método | memoria paint_overlay |
| ONB-24 | Reduce-motion en animaciones | Accesibilidad (orb ya lo respeta) | 🔨 | SPEC §2.3 |

---

## 12 · BACKEND Fx / CLÍNICO (B2B2C — post-founders, v2.1+)

| # | Nombre corto | Qué es | Estado | Fuente |
|---|---|---|---|---|
| FX-1 | Backend clínico con Mariana como modelo | B2B2C: clínicos 25% por pacientes | ⬜ PB | memoria backend_clinico |
| FX-2 | 24 requerimientos Mariana | Cuestionario ramificado, detector interacciones, "nothing to write" | ⬜ PB | memoria mariana_vision |
| FX-3 | HUB Fx (graba/transcribe/SOAP) | ARGOS SOAP, chat encriptado que el clínico nunca ve; fee $1,499 + ~$200/mes/paciente | ⬜ PB | memoria hub_fx |
| FX-4 | Sistema afiliados wallet unificado | Clínicos+centros+coaches+influencers+retiros | ⬜ PB | memoria afiliados · #52 |
| FX-5 | Detector de interacciones (suplementos/fármacos) | Parte de los 24 req | ⬜ PB | memoria mariana_vision |
| FX-6 | 142 protocolos salud funcional (4 tiers/20 cat) | Embudo redes→PDF→Skool→app→coaching | 🔨 | memoria protocolos |
| FX-7 | Coach Proactivo módulo | Dogfood Enrique → general (v1.5) | ⬜ PB | #54 · memoria coach_proactivo |
| FX-8 | Panel revisión manual user_reports | V1.1 post-beta | ✅ | #18 |

---

## RESUMEN DE CONTEO

**Total de ítems: 226**

| Pilar / Módulo | Ítems |
|---|---|
| 0 · Infra / Deploy / Compliance / Stores | 38 |
| 1 · HOY / Agenda / YO / Edad ATP | 40 (HOY 14 · Agenda 12 · YO 6 · Edad ATP 8) |
| 2 · Fitness | 17 |
| 3 · Nutrición / Suplementos / Score | 24 (Nutrición 12 · Suplementos 12) |
| 4 · Mente | 31 (Audio 11 · Respiración 6 · Medit/Journal 8 · Cognitivo 6) |
| 5 · Salud Funcional | 27 |
| 6 · Ciclo / Embarazo | 12 |
| 7 · Tests | 9 |
| 8 · ARGOS | 26 |
| 9 · Comunidad | 14 |
| 10 · Gamificación | 11 |
| 11 · Onboarding / Diseño / Pulido | 24 (Onboarding 6 · Design/pulido 18) |
| 12 · Backend Fx / Clínico | 8 |

**Por estado (aprox):** ✅ ~72 · 🔨 ~46 · ⬜ ~58 · 💡 ~22 · 🔬 ~28

---

## LOS 10 PENDIENTES MÁS GRANDES (esfuerzo × impacto)

1. **FIT-4 · Fitness REBUILD completo (XL).** "Donde nació la app", hoy ~35%. Arquitectura de info + ejecución rutina + biblioteca + métodos + registro fuerza/cardio con electrones correctos. Time-box duro. → MB-3.
2. **ARGOS Jarvis completo (~8 semanas).** Ancla de venta Pro y puente de cash. Falta cerrar J1 (system prompt) + J3 (proactividad+gobernanza) + J4 (multimodal) y verificar en device J2/J5. Las 3 demos verificables. → MB-4.
3. **MEN-1..11 · Audio Mente (catálogo 31 piezas + binaurales).** Script de ensamble ffmpeg + 3 guiones piloto + producción por fases + validación Mariana 🩺 + cablear reproductor. Es la "obra negra" del pilar. → MB-5.
4. **MB-2 Suplementos end-to-end (SUP-1..4).** Múltiples tomas AM+PM es la raíz; sin ella nada cierra. Scan→plan+BHA, dropdown, tomas→agenda. Riesgo de migración.
5. **SAL-26/27 + SAL-11 · Mapa de transformación DX + scoring motor validado.** Levantamientos con skip logic + DX auto/manual + calibración ×5 firmada por Mariana (blocker de "V2 lista").
6. **MB-6 · ATP Sleep Track (L).** Motor de sueño real: arquitectura 5 ciclos, 4 cronotipos, aporte a ATP Score, ventana de foco. Pantalla editorial ya existe vacía.
7. **COM-1..6 + COM-12 · Comunidad estilo Strava (el foso).** Hub + amigos + perfil público con visibilidad granular + feed + reacciones + capa comparativa. Mayor palanca de retención que falta.
8. **ONB-9 · LIGHT mode (v2.1).** Valores light sobre capa semántica + sweep pantalla-por-pantalla. "Bestia aparte", recuperada 2-3 semanas al diferirla.
9. **MEN-26..30 · N-Back Challenge + tools atención (20-30h).** Lógica+mig+tests listos; falta UI editorial + algoritmo adaptativo Jaeggi + métricas + copy honesto (compliance FTC).
10. **INF-1/2/8 + MB-12 · Cimiento infra + hardening pre-beta.** Sacar repo de OneDrive + CI tsc + build nativo único + device retest grande consolidado + Sentry/Skool/comms. La red que evita "5 sprints → 30 bugs".

---

## NOTAS DE MÉTODO

- **Nada se decidió/recortó aquí** — es captura pura. La priorización vive en `PLAN_MAESTRO_V2_LOCKED` (spine MB-0→MB-12).
- Los ítems 🔬 **idea-research** son features probadas en otras apps, listas para adaptar (capa social, protocolo-en-vivo, racha-sin-culpa, aha cruzado, labs-sin-diagnóstico). NO están en el producto aún.
- Muchos ✅ tienen device-gate pendiente (código listo, sin verificar en device físico) — marcados 🔨 donde el delivery lo indica.
- Fuera de V2.0 (track post-founders): LIGHT, Backend Fx, wearables/multimodal-hardware/genética, Comunidad V1.5, Coach Proactivo, BHA V2.

*Barrido generado por Cowork · 2026-07-22 · fuente única de "todo lo que existe disperso" para que nada quede en el limbo.*
