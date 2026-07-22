# ✅ DELIVERY · Sprint Compliance 4 — Renames + Posicionamiento

**Fecha:** 2026-07-22 · **Rama:** `fix/compliance-sprint-4` (desde `fix/compliance-sprint-3` — NO desde main)
**Estado:** construido, tsc 0 errores, 1947 tests verdes. **NO mergeado — espera auditoría de Cowork.**
**Fuentes:** HANDOFF §4 (renames) · POSICIONAMIENTO §2 versión precisa + §4 palabras verdes/rojas (vía BRIEF_DEV_POSICIONAMIENTO y T&C §2) · DECISIONES fila 7

---

## 1 · "Diagnóstico" → "Mi Mapa Funcional" (global)

- **UI**: 26 reemplazos en 20 archivos — pantalla `salud/diagnostico` (título, Alerts, CTAs "Generar/Actualizar mi Mapa Funcional"), health-hub ("MI MAPA FUNCIONAL"), rationale, padecimientos, síntomas, mis-evaluaciones, kit, settings, tour (`app-tour-core`).
- **PDF**: filename `Diagnostico-Funcional-ATP-vN.pdf` → **`Mapa-Funcional-ATP-vN.pdf`** + `<h1>Mi Mapa Funcional</h1>` + dialogTitle de compartir (dx-pdf-service, dx-html).
- **Prompts que generan texto visible**: dx-prompt (síntesis) + intervention-rationale-core piden "Mi Mapa Funcional".
- **Analytics**: no existía ningún evento con "diagnostico" (verificado) — nada que renombrar; el cobro sigue por action_key `dx_generation` (interno).
- **System prompt de ARGOS**: NO tocado — vive en el cerebro v1.20 (servido desde store), como indicó el brief.
- **NO tocado** (correcto): la ruta `/salud/diagnostico` (slug interno, evita romper deep links — renombrarla es cosmético y va aparte si se decide), disclaimers defensivos ("no constituye diagnóstico"), preguntas de intake sobre diagnósticos MÉDICOS reales, coach/* y clinical-* (HUB Fx), key JSON `diagnostico_funcional` (interna).

## 2 · BHA → ATP Functional Score (binario → score numérico)

- **Salida**: veredicto binario "BIOHACKER APPROVED / NO APROBADO" ELIMINADO → **score 0-100 por 4 atributos** (Formas y biodisponibilidad · Colorantes y endulzantes · Excipientes y rellenos · Transparencia de etiqueta), cada uno con nota objetiva de hechos de la etiqueta.
- **Total determinístico**: el cliente promedia los 4 atributos; NO se confía el total al LLM (parse defensivo con clamp 0-100, 15 tests).
- **Reglas duras §4.2 en el prompt**: nunca marcas de terceros, sin adjetivos valorativos, score privado, registro-no-recomendación intacto, criterios de formulación de Mariana conservados.
- **UI** (`BhaScanSheet`): círculo con score + color semántico (`getScoreColor`) + barras por atributo. Ficha de suplementos: chip "SCORE N"; scans legados binarios muestran chip neutro "EVALUADO · RE-ESCANEA" (cero adjetivos, cero borrado de datos).
- **Migración `211_functional_score.sql`**: columna `user_supplements.functional_score` (0-100). `bha_status` legado se conserva (cero borrado).
- **Action-key del cobro H+**: se MANTIENE `bha_scan` (interno, no user-facing) — renombrarlo exigiría deploy coordinado de `proton_action_costs` + argos-proxy sin beneficio de compliance. Documentado en la migración y el código.
- **food-scan**: el auto-sello binario "clean → approved" se retiró — el score numérico solo sale del scanner dedicado.
- `food-additives-db.ts`: ya borrado en Sprint 1 (verificado).

## 3 · Sweep palabras rojas §4

- **prescribe/prescripción → sugiere/sugerencia**: cuestionario maestro ("ATP te sugiere estas N"), mis-evaluaciones, prompt de ARGOS ("sugerir uno solo").
- **dosis → aporte sugerido / cantidad**: prompt ARGOS formato protocolo ("aporte sugerido, timing, duración"); registro del usuario en Suplementos → "Cantidad" (es SU registro, no pauta de ATP — criterio documentado); nutrition card "Evalúa calidad de formulación".
- **paciente → usuario**: prompt atp-ai-service (`## USUARIO`).
- **tratamiento**: placeholder de padecimientos → "manejo"; se conservan "tratamiento de mis datos" (jurídico), intake de tratamientos médicos reales, y disclaimers defensivos.
- **NO tocados**: coach/* y clinical-* (HUB Fx), "recetas" culinarias (NUTRICIÓN), "dosis de sol" (metáfora), identificadores de código, rank de gamificación "Biohacker" (nombre de nivel, no claim de producto — flag a Enrique si también quiere retirarlo).

## 4 · Pantalla de posicionamiento en onboarding

- Nuevo paso **`positioning`** (paso 2 de 9): welcome → **positioning** → privacy (checkboxes S2) → profile… Ordena el flujo exigido: posicionamiento → consentimiento → datos.
- Texto central = §2 versión precisa VERBATIM: "ATP no es medicina para enfermos…". 3 bullets de apoyo (optimiza/educa/acompaña).

## 5 · Disclaimers y stores

- **MedicalDisclaimer global v1.1**: incluye "ATP no es medicina para enfermos; es optimización y educación" (bump de versión → re-solicita aceptación a todos vía el gate #42).
- **Footers de resultados** (nuevo `ResultDisclaimerFooter`): "Estimación educativa, no diagnóstico. ATP optimiza, no trata." en Mapa Funcional, Edad ATP (result-preview), labs-guide y edad-atp/labs — las 4 pantallas de resultado no tenían disclaimer persistente al pie (gap detectado en auditoría).
- **Stores**: `Business development/App_Store_Assets/APP_STORE_METADATA_v2_COMPLIANCE_2026-07-22.md` — descripción reescrita con la versión precisa, sin palabras rojas, **sin nombres personales** (créditos de fundadores fuera; copyright → [RAZÓN SOCIAL]), Edad ATP como estimación educativa, Línea de la Vida en el bloque IMPORTANTE. Pendiente approve de Enrique (keyword "biohacking" en ASO).

## Verificación

tsc 0 errores · 1947 tests verdes (incl. 15 nuevos del score) · eslint 0 errores · typed routes regenerado.

⚠️ **Post-merge:** `npx supabase db push` (migraciones 209+210+211 de la cadena de ramas) · OTA para el copy · el bump del disclaimer v1.1 re-pedirá aceptación a todos los usuarios (esperado).

## Pendientes / decisiones

1. Enrique: aprobar copy de stores v2 + decidir rank "Biohacker" + si se renombra el slug `/salud/diagnostico`.
2. Mariana: validar los 4 atributos del Functional Score como contenido.
3. Cerebro ARGOS v1.20 ya trae el vocabulario — verificar consistencia en device test.
