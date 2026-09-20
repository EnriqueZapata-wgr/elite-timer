# Salida de la responsable clínica anterior · 20 de septiembre de 2026

Instrucción del dueño: "Mariana está fuera del proyecto por completo. Elimina
todo dato que la involucre." Precisión del dueño en las preguntas: **solo
borrar su nombre de todo, para no asignarle ninguna responsabilidad sobre lo
que hacemos y dejamos de hacer**; su cuenta y sus datos NO se borran; solo se
limpian los documentos vivos; los legales los ve con su abogado; el historial
de git se queda.

## 1. Qué quedó limpio (verificado con grep, cero residuos)

- **Código de la app** (EliteTimer): app/, src/, supabase/, scripts/, tools/:
  116 archivos de código, 233 líneas, todas comentarios, nombres de tests,
  textos de prompt o dos strings visibles; cero cambios de lógica, cero SQL
  (10 migraciones: solo comentarios, verificado byte a byte sin comentarios).
  Identificador `pendMariana` → `pendFirmaClinica` (y constantes
  `*_PEND_MARIANA` → `*_PEND_FIRMA_CLINICA`, tag `[PEND-FIRMA-CLINICA]`).
  Test `parser-v2-mariana.test.ts` → `parser-v2-caso-beta.test.ts`.
- **Cerebro de ARGOS embebido** en la edge function (`brain.generated.ts`):
  3 frases; contenido idéntico en todo lo demás.
- **ARGOS-BRAIN** (fuente del cerebro, v1.24.1): 17 archivos; los dos
  archivos del dominio DX que llevaban su nombre se renombraron
  (`metodo_clinico_atp.md`, `razonamiento_clinico_atp.md`); las firmas de los
  reportes DX pasan de "ARGOS | Mariana Doria | Enrique Zapata | Elite
  Diagnostics" a "ARGOS | Enrique Zapata | Elite Diagnostics"; las
  derivaciones "a Mariana" pasan a "al médico tratante". Cero cambios de
  contenido clínico. De paso se arregló el manifiesto (faltaba
  `12_cuatro_ojos.md`; el build llevaba desde el 31-ago sin poder correr).
- **argos-coach** (`api/brain.generated.js`): 20 ocurrencias, a mano, sin
  subir la versión embebida (1.21.0).
- **Documentos vivos**: CLAUDE.md, DOCTRINA_4EP, PIVOTE_ATP_3.0, RUTA,
  BACKLOG_MAESTRO, ENTREGA_PIVOTE, HANDOVER (2), diagnostico (SPEC y mockup
  Omar), ATP_ELITE_NOCHE1, BUGS_AUDIT, COWORK_REPORT. La regla de la casa
  pasó de nombrarla a: "las cuentas de personas ajenas al equipo (ex
  colaboradores, suscriptores de tienda) no se tocan: ni sus datos ni sus
  accesos, salvo instrucción escrita del dueño".
- **Cuenta de prueba en tests**: datos ficticios ('Valeria' / 'vale'); el
  beta se llama "beta-01" en todos los comentarios.

## 2. Qué NO se tocó, por decisión del dueño

- Su cuenta y sus datos en producción (perfil, consultas, clientes, pagos).
- Documentos históricos: `Business development/**` (30 archivos),
  `R and D/**` fuera de la lista viva (unos 160), `docs/`, `cowork_handoff/`
  (10), `VERSION.md` y los `_*.md` de ARGOS-BRAIN (changelog e historial).
- Historial de git.
- Archivos del dueño sin commit: `R and D/embudo/**` (incluida la
  transcripción con su nombre en el título), `_respaldo_enrique_*`.

## 3. Lo que corre el dueño (en orden)

1. **Accesos, hoy**: Supabase (dashboard y `profiles.role` si era admin),
   GitHub, Expo/EAS, App Store Connect, Play Console, RevenueCat, Sentry,
   PostHog, Skool, `hola@somosatp.com`, contraseñas compartidas. Esto no es
   parte de "quitar el nombre": es seguridad, y yo no llego.
2. **Cerebro en producción**: ARGOS lee la tabla `argos_brain` (store), no
   el embebido. Hasta que se publique y promueva v1.24.1, ARGOS sigue
   recibiendo su nombre en el prompt:
   `cd ARGOS-BRAIN && node build/publish-brain.mjs` → regresión →
   `node build/promote-brain.mjs all 1.24.1` (build/STORE_RUNBOOK.md).
   Luego `supabase functions deploy argos-proxy` (fallback limpio).
3. **argos-coach**: opcional `npm run sync:brain` para subir el fallback de
   1.21.0 a 1.24.1 (ya corre limpio); commit y deploy.
4. **Público**: confirmar si la Política de privacidad y los Términos
   publicados llevan el bloque "Firmado por" con su nombre (PRIVACY L219,
   TOS L222) y si el copy de App Store / Play ("co-fundado por ... Mariana
   Doria", APP_STORE_METADATA L82) está publicado. Retirarlos es cambio de
   texto público: con abogado.
5. **Datos que la nombran ante clientes** (dato de producción; solo con
   instrucción escrita): `functional_dx ... interpretado_por` y
   `nutrition_plans` ("Lo asignó ..."), `scheduled_routines.assigned_by`
   (la vista pinta `assigned_by_name`), `lab_results.reviewed_by`. Si alguna
   evaluación cargada trae su nombre, la app lo muestra al cliente.

## 4. Para el abogado (inventario, sin editar nada)

1. **Convenio entre accionistas** (borrador no firmado, 50/50, vesting 4
   años con cliff 1, cláusula 5.2 de recompra a valor nominal si un socio
   deja de participar antes del vesting): cómo se documenta su salida y la
   titularidad de PI y cuentas que PIVOTE_ATP_3.0 ya declara de Enrique.
2. **Política de privacidad y Términos "Firmado por: Mariana Doria, PhD,
   Co-Fundadora, CSO"**: retirar la firma y versionar sin invalidar las
   aceptaciones registradas.
3. **Re-atestación**: la postura de compliance (BRIEF_LEGAL_ALCANCE L56,
   SIGNOFF_ATESTACION sección 4, HANDOFF_DEV L103-134, DECISIONES L20, y los
   36 "ok" suyos en Beta_Launch_Kit/09b) se apoyaba en su validación de
   contenido: umbrales de gates (`safety_params`), contraindicaciones,
   catálogo de intervenciones, claims. Con ella fuera, o se contrata un
   Director Médico titulado (DICTAMEN P0-07, P1-26) o se retiran del código
   y del copy las afirmaciones de "validación clínica" (hoy dicen "equipo
   clínico de ATP", y ese equipo no tiene a nadie con cédula).
4. **Elite**: quién firma la interpretación genética y la evaluación (hoy
   "Enrique Zapata, dirección clínica", sin cédula; DICTAMEN L156/208, riesgo
   art. 250 CPF). PIVOTE 1.3: hace falta proveedor de interpretación
   genética.
5. **Propiedad intelectual del dominio DX**: `metodo_clinico_atp.md` y
   `razonamiento_clinico_atp.md` se destilaron de sus planes reales de
   paciente; la matriz V7/V6 la firmaba como coautora (crédito retirado del
   código esta noche). Si el convenio no cerró la cesión, es tema.
6. **Datos personales**: dos tests conservan valores de laboratorio de su
   beta (mal parseados, relabelados "beta-01") y su cuenta sigue en la base
   con consultas y cobros de Stripe. Qué se conserva, qué se le entrega y
   qué se anonimiza (LFPDPPP).
7. **Nombre legal**: el repo la llama "Mariana Doria", "Mariana Zapata" y
   "Mariana Zapata Doria"; el convenio lo marca "por confirmar".

## 5. Decisiones que tomé solo (reversibles)

- Crédito "Autor: Enrique Zapata + Mariana Doria (Co-Founder & CSO)" en la
  matriz V7/V6 → "Autor: Enrique Zapata". Si la coautoría tiene peso de PI,
  el abogado dirá.
- En PIVOTE_ATP_3.0 la nota "Enrique le dará regalías por decisión propia"
  quedó como "cualquier regalía a ex colaboradores es decisión propia de
  Enrique", y la decisión de "convencerla de colaborar como proveedora
  genética" se retiró (ya no está).
- En HANDOVER se escribió que el puesto de firma clínica está vacante y que
  lo firmado se apoyaba en una profesional que ya no está (re-atestar o
  retirar, ver abogado). No es un crédito: es información que el próximo
  desarrollador necesita.
- La cita textual de Enrique en `seguridad_clinica.md` (ARGOS-BRAIN) se
  recortó, no se reescribió.
- El guard de `argos-alcance-core.test.ts` ya no vigila su nombre literal
  (vigila "Enrique" y padecimientos). Propuesta de la revisión: sustituir la
  lista por una aserción genérica de "cero nombres propios" con allowlist.
- ARGOS-BRAIN: manifiesto arreglado (`12_cuatro_ojos.md`); versión 1.24.1.

---

## 6. LO QUE FALTA POR LIMPIAR (inventario completo, 20-sep 23:00)

Barrido con grep (mariana | doria) sobre las seis carpetas conectadas:
EliteTimer, ARGOS-BRAIN, argos-coach, ATP, Programas High ticket,
ARNtro_ATP_v4.0_Research (ATP-audio-pipeline: cero).

### P0 · Vivo: sigue generando responsabilidad hacia clientes o público

| # | Dónde | Qué dice | Quién | Estado |
|---|---|---|---|---|
| 1 | Tabla `argos_brain` en producción (store) | El prompt de ARGOS en prod trae las 3 frases con su nombre | Dueño: `publish-brain.mjs` → regresión → `promote-brain.mjs all 1.24.1`; luego `functions deploy argos-proxy` | Fuente limpia (v1.24.1), store pendiente |
| 2 | `Programas High ticket/Elite Enterprice/ARGOS_Skill/**` (10 archivos, 27 ocurrencias: SKILL.md 6, tono_y_estilo 5, reglas_seguridad 3, INSTRUCCIONES 3, Prompt_MAESTRO 2, plantilla_reporte 2, cruce_fenotipico 2, rangos_funcionales 2, metodologia 1, COMO_ACTIVAR 1) | Es el skill que procesa cada cliente Elite nuevo y firma los reportes "ARGOS \| Mariana Doria \| Enrique Zapata" | Cowork (siguiente tanda, misma política que ARGOS-BRAIN) | Pendiente |
| 3 | Entregables YA enviados a clientes: Fabiola (Manual y Portal 12-sep, index), Vicente (Manual 9-sep), Víctor Milke (DX 7-sep, DX 9-sep, Manual 9-sep) | Firma "ARGOS \| Mariana Doria \| Enrique Zapata \| Elite Diagnostics" y "Mariana Doria, nutrición funcional" | Dueño decide si se reenvían | Copias limpias creadas junto a cada original: `*_sin_firma_anterior.html` (7). Los originales no se tocaron: son el registro de lo que se entregó |
| 4 | Pitch / brochure Elite: `Elite Enterprice/ATP_ELITE_DIAGNOSTICS_Pitch_2026.html`, `_Movil_2026.html` (4 c/u) y las versiones v1 a v10 | "Enrique Zapata & Mariana Doria" como autores; sesión de Oncogenética a su cargo (PIVOTE 1.3 ya lo pedía: brochure 2026-B sin ella) | Cowork edita los dos vigentes; el dueño confirma cuál es el que circula | Pendiente |
| 5 | Web: `ATP/Business development/landing/index.html` (8), `founders.html` (7), `precios.html` (1) | "Marco clínico funcional co-firmado por Mariana Doria", "sesiones donde Enrique y Mariana enseñan", "presenciales con Enrique, Mariana" | Dueño: confirmar si es lo publicado en somosatp.com (WordPress); Cowork edita los HTML | Pendiente |
| 6 | Textos legales y de tienda: PRIVACY_POLICY_v1 L219 y TERMS_OF_SERVICE_v1 L222 "Firmado por: Mariana Doria, PhD, Co-Fundadora, CSO"; APP_STORE_METADATA L82 "co-fundado por ... Mariana Doria" | Firma legal y copy público | Abogado + dueño | Pendiente (sección 4) |
| 7 | Datos en producción que la app pinta al cliente: `functional_dx ... interpretado_por`, `nutrition_plans` ("Lo asignó ..."), `scheduled_routines.assigned_by` (vista `assigned_by_name`), `lab_results.reviewed_by` | Si alguna fila trae su nombre o su UUID, el cliente lo ve | Dueño, con instrucción escrita; Cowork prepara el SELECT de inventario | Pendiente |
| 8 | argos-coach `api/brain.generated.js` | Limpio a mano en 1.21.0; `npm run sync:brain` lo trae a 1.24.1 | Dueño (con deploy) | Opcional |

### P1 · Histórico: no genera responsabilidad nueva; se queda por decisión del dueño

- **EliteTimer, 210 archivos rastreados**: `R and D/` raíz 138 y subcarpetas 24
  (embudo 8, decks 8, ARGOS_COSTOS_2026-08 5, web 1, research_notes 1,
  02_pending 1), `Business development/` 30 (Legal 17, Beta_Launch_Kit 9,
  00_CIMIENTO 2, ATP_DIFY_MASTER, App_Store_Assets), `docs/` 8 (edad-atp 7,
  ECONOMIA_OPERACION), `cowork_handoff/` 10.
- **14 archivos con su nombre en el TÍTULO** (rastreados): Beta_Launch_Kit
  06_COPY_MARIANA_REVIEW_COMPACTO, 09_CATALOGO_INTERVENCIONES_MARIANA_ENRIQUE,
  09_CURACION_50_ACCIONABLES_MARIANA_ENRIQUE, 09b_SEEDS_CATALOGO_ARRANQUE_MARIANA;
  R and D: AWAY_RUN_BUGS_MARIANA, DELIVERY_BUGS_MARIANA_2026-08-03,
  FLAGS_MARIANA_CONSOLIDADO_2026-07-14, MARIANA_VISION_BACKEND_CLINICO_2026-07-06,
  VALIDACION_MARIANA_CUESTIONARIO_MAESTRO (.docx, _2026-07-16.md,
  _revisado.docx), VALIDACION_MARIANA_MB11_PAQUETE (.docx, _2026-07-19.md) y
  un `.~lock.VALIDACION_MARIANA_MB11_PAQUETE.pdf#` (basura de LibreOffice,
  rastreada por error).
- **No rastreados en EliteTimer**: `R and D/embudo/` 8 (RUTA_COMERCIAL_3.0,
  _archivo 2, comunidad/SKOOL_ABOUT y SKOOL_RUNBOOK, correos/SUPERSEDED,
  narrativa/MANUAL_DE_COMUNICACION, narrativa/TRANSCRIPT_MARIANA_ENRIQUE_2026-08-27),
  `_respaldo_enrique_20260829-040028/` 5, `_to_delete/CLAUDE.md.bak-2026-09-06`.
- **ARGOS-BRAIN**: VERSION.md (changelog) y 7 `_*.md` (auditorías, handoffs).
- **ATP (carpeta)**: 122 archivos (105 md, 8 html, 3 py, pptx, pdf...):
  `Business development/MARIANA_TRABAJO_CLINICO_v2.0.0.md`,
  `MARIANA_WORKSHOP_DECISIONES.md`, `BUSINESS_MODEL_CANVAS_ATP.html`, la
  landing (P0-5), `BACKUP_EDAD_ATP_2026-06-10/.../edad-atp-matriz-v7-v6.ts`
  (copia vieja con la coautoría), `MKTNG/.../ATP_Logo_Final.html`,
  `ATP_Presentacion_Alianza.pptx`, `ATP_Manual_de_Marca.pdf`, reportes
  Cowork de julio.
- **Programas High ticket**: además de P0-2/3/4: `CUESTIONARIO_LEVANTAMIENTO_DX_ELITE.md`,
  `ELITE (LEGACY)/_SISTEMA/referencias/PROMPT_Calculadora_EdadBiologica_ARGOS.md`,
  `Clientes/*/_Legacy_Original` y `00_Interno` (Alexis, Vicente, Víctor: 8).
- **ARNtro_ATP_v4.0_Research**: 7 (índice, ciencia del genoma, pipeline,
  bases de datos, competitivo, arquitectura, roadmap).
- **Fuera de archivos** (dueño): comunidad Skool (PIVOTE decía que era de
  ella), material en redes y YouTube que la cite, Payment Links de Stripe de
  sus consultas, su cuenta en RevenueCat / Sentry / PostHog, alias de correo.

Regla para cualquier limpieza futura: misma política de reemplazo de esta
noche (equipo clínico de ATP / método ATP / Enrique / beta-01 / firma
clínica), cero cambios de contenido, cero borrado de datos, historial intacto.
