# 🎸 Cola de briefs MB-8 · MB-10 — Tramo 3 para CC

**Fecha:** 2026-07-18 · Autocontenido: cada sección se pega como prompt o se corre encadenado con el prompt del final.
**Prerequisito:** tramo 2 (MB-5/6/7) terminado y auditado. MB-10 además consume lo que MB-4 haya dejado (orb + personalidad); si MB-4 no está mergeado aún, MB-10 construye contra la interfaz del spec y lo anota.

**Invariantes (las de siempre):** `str_replace` quirúrgico · tsc verde vía CI · commits por tema · delivery doc · migraciones idempotentes + RLS + policy · **cero borrado automático de filas del user** · `Constants.expoConfig.extra` · español MX · cero nombres propios en copy · leer `docs/DESIGN_SYSTEM.md` antes de tocar pantallas · tests de regresión por bug cerrado.

---

# MB-8 · PULIDO EDITORIAL + LEGIBILIDAD APP-WIDE

**Branch:** `feat/mb8-pulido`

Barrido transversal de deudas P2/P3. El polish del loop diario YA se hizo (MB-1); aquí van las superficies de menor frecuencia. Referencia de deudas: `PLAN_MAESTRO_V2_LOCKED_2026-07-17.md` §MB-8 + tracker.

## Alcance

### 1. Legibilidad
- **Mi Expediente:** snake_case → labels legibles (P2-1). El barrido general ya se hizo en fixes previos; verificar que Mi Expediente quedó cubierto y cerrar lo que falte.
- **Cuestionario:** duplicado Fitzpatrick Tipo 5 vs Tipo 4 (#86) — placeholder duplicado, corregir. Los 3 tests rojos post-firma epigenética (#125): actualizarlos para que reflejen la doctrina nueva, no debilitarlos.

### 2. Cards pelonas y vacíos
- **Hidratación:** hoy está pelona → contexto epigenético + historial del día + imagen editorial (P2-3).
- **Vacíos negros restantes:** Evaluaciones + lo que no haya cerrado el lazy-load fix (P2-4). El patrón ya existe (placeholder siempre visible + expo-image); aplicarlo donde falte.
- **Card A "Mi Diagnóstico Funcional" sin imagen editorial** (#71).

### 3. Notificaciones
- **Toast "N notificaciones sin leer":** auto-dismiss + que no tape el header (P3-2).

### 4. Salud Funcional — deudas puntuales
- **Cetonas 3 fuentes** (#113): sangre + aliento + orina como fuentes del módulo.
- **Vocabulario +5 categorías** (#114): ocular + vagal + respiracion + atencion + contemplativo. Aplicar dedup SEMÁNTICO sobre familias canónicas, no strings (doctrina `feedback_dedup_semantico_no_textual`).
- **Scoring motor ×10→×5** (#130) — ⚠️ SOLO si Mariana ya validó (va en el paquete MB-11). Si no hay firma, NO tocar el scoring; anotarlo.
- **Cold interventions sin tag fiebre** (#130): verificar ducha_fria/wim_hof/sauna tienen la contraindicación de fiebre viral (doctrina `project_doctrina_promover_fiebre_no_antipireticos`).

### 5. Higiene
- Colores hardcoded fuera de `brand.ts` restantes → tokens (journal, cycle-*, tabs).
- Podar worktrees viejos (#20) si aún inflan el árbol.
- Rename migraciones 198a→198 / 198b→199 (#85) — ⚠️ CUIDADO: verificar el estado en la tabla de historia de migraciones remota ANTES de renombrar; si ya están aplicadas con esos nombres, usar `migration repair` para no romper el historial. Documentar exactamente qué se hizo.

## Terminado cuando
Sweep pantalla-por-pantalla: ninguna con identificador crudo, vacío negro, ni card pelona · toast se auto-descarta · cetonas 3 fuentes · vocab nuevo integrado sin duplicar familias.

---

# MB-10 · ONBOARDING WOW + WELCOME TOUR POST-PAGO

**Branch:** `feat/mb10-onboarding`

## Doctrina que manda
- `project_app_welcome_tour`: onboarding APP = bienvenida + setup + tour **POST-PAGO**. 7 pantallas + Meet ARGOS. El WOW se logra por CALIDAD, no por cantidad de confetti.
- `feedback_distinguir_marketing_vs_producto`: el funnel de venta vive en somosatp.com (web). La app NO vende — recibe a alguien que YA pagó. Cero pantallas de pricing/venta en este flujo.
- `feedback_guiado_no_prisionero`: el tour es skippeable en todo momento. Un "Saltar" visible, sin culpa.

## Alcance

### 1. Flujo completo post-pago
Bienvenida → setup esencial → Meet ARGOS → tour (7 pantallas) → HOY.
- El setup pide SOLO lo mínimo para que HOY tenga sentido el día 1 (lo demás se captura con el uso — Cuestionario Maestro ya existe para eso).
- Transiciones con motion de calidad (skill apple-design). Primera impresión = percepción de precio.

### 2. Meet ARGOS
- Integra el orb (MB-4 J2) y la selección de voz M/F con preview.
- ⚠️ **El copy lleva flag de revisión vivo (task #141).** Estructura y motion sí; el copy actual NO se da por final y el flag NO se quita. Si MB-4 no está mergeado, construir contra la interfaz del spec y anotarlo.

### 3. Tour de 7 pantallas
Una por pilar, editorial, cada una con UNA idea y UNA imagen. No manual de usuario: apetito, no instrucciones. El detalle lo enseña la app con el uso.

## Terminado cuando
Flujo post-pago corre completo de bienvenida a HOY · skippeable siempre · Meet ARGOS con orb + selección de voz integrados (o stub anotado si MB-4 no aterrizó) · cero venta dentro de la app · flag de copy intacto.

---

# NOTA · MB-11 y MB-12 NO van en esta cola

- **MB-11 (validación Mariana):** no es código — es el paquete clínico consolidado que preparan Cowork + Enrique y firma Mariana. Fecha dura: fin de MB-5 (¡ya!). Blocker de MB-12.
- **MB-12 (infra pre-beta):** último gate antes de testers; requiere MB-11 firmado + device retest grande de ambas cuentas. Se lanza solo, cuando todo lo demás esté mergeado.

---

# PROMPT ENCADENADO (pegar a CC cuando el tramo 2 esté auditado y mergeado)

```
AWAY RUN V2 · TRAMO 3 — MB-8 → MB-10 encadenados

Contexto: mismo método del tramo anterior. Trabaja de corrido, NO te detengas a
preguntar: aplica el default documentado y anota la duda en el delivery doc.

Brief completo (autocontenido, los 2):
R and D/FABLE_COLA_MB8_MB10_2026-07-18.md

Léelo entero antes de arrancar. MB-10 tiene doctrina obligatoria (post-pago,
cero venta en app, guiado no prisionero).

MÉTODO:
1. Un branch por MB: feat/mb8-pulido → feat/mb10-onboarding (el segundo sale
   del primero terminado, no de main).
2. Commits por tema, tsc verde vía CI en cada commit.
3. Push al terminar cada MB. NO mergees a main — Cowork audita antes.
4. Delivery doc por MB en R and D/: qué hiciste, qué NO, dudas, checklist device.
5. Si un MB se traba, anótalo, sáltalo, sigue.

INVARIANTES: str_replace quirúrgico · CERO borrado automático de filas del user ·
migraciones idempotentes + RLS + policy · generateUUID · getLocalToday()/
parseLocalDate() · Constants.expoConfig.extra · DeviceEventEmitter tras
electrones/nutrición · expo-audio nunca expo-av · español MX · cero nombres
propios · DESIGN_SYSTEM.md antes de tocar pantallas · tests de regresión.

FUERA DE ALCANCE:
- Scoring motor ×5 SIN firma de Mariana (si no hay firma, no tocar, anotar).
- Copy de Meet ARGOS: flag vivo, NO darlo por final ni quitar el flag.
- LIGHT mode, Fitness rebuild profundo, binaurales (v2.1).

Al terminar: recap corto (qué quedó, qué no, decisiones pendientes de Enrique)
para la auditoría pre-merge de Cowork.
```
