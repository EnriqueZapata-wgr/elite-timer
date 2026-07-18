# 🏛️ REDISEÑO ARQUITECTURA · Salud Funcional · v1 (propuesta para peloteo)

**Fecha:** 2026-07-16
**Autor:** Cowork (arquitectura de información)
**Base:** `MAPA_ARQUITECTURA_SALUD_FUNCIONAL_ACTUAL_2026-07-16.md`
**Estado:** PROPUESTA · requiere validación + decisiones de Enrique antes de implementar
**Doctrina:** `project_doctrina_menu_navegacion_vs_consulta_datos` · un menú = navegación pura · datos = dentro de destinos · un dato = un lugar

---

## 🎯 El diagnóstico en 1 párrafo

El pilar tiene **DOS árboles paralelos** ("Historia Clínica" vía KIT y "Edad ATP" vía YO) que capturan el MISMO dominio (labs, biomarcadores, composición, vitals, cuestionarios, síntomas) con **vocabularios, tablas y pantallas distintas**. Encima, "Historia Clínica" nombra 4 cosas distintas, "síntomas" vive en 2 tablas, y el hub (health-hub) mezcla menú con datos de consulta. No es un bug visual — es duplicación estructural. El rediseño consolida los dos árboles en UNO, con un vocabulario único y cada dato en un solo lugar.

---

## 1 · PRINCIPIOS DEL REDISEÑO (no negociables)

1. **Un dominio, una puerta.** El pilar Salud Funcional se entra por UN lugar (Mi ATP → Salud Funcional). Edad ATP deja de ser una puerta paralela · se absorbe como un destino DENTRO de Salud Funcional.
2. **Menú = navegación pura.** El hub muestra SOLO cards editoriales que llevan a destinos. Cero datos de consulta.
3. **Un dato = un lugar canónico.** Cada tipo de dato (síntoma, lab, biomarcador, composición, vital, cuestionario) se captura y consulta en UN solo lugar, contra UNA tabla.
4. **Un vocabulario.** Se elige UNA taxonomía de sistemas/áreas y se usa en todos lados.
5. **Nombres sin colisión.** "Historia Clínica" deja de nombrar 4 cosas.

---

## 2 · RESOLUCIÓN DE NOMBRES (acabar la confusión)

| Concepto | Nombre actual (confuso) | Nombre propuesto | Qué ES |
|---|---|---|---|
| El pilar (card en Mi ATP) | "Historia Clínica" | **SALUD FUNCIONAL** | Puerta al dominio salud (doctrina 3 pilares) |
| El hub/menú del pilar | "Historia Clínica" (health-hub) | **SALUD FUNCIONAL** (mismo, es el hub) | Menú de navegación puro |
| Síntesis diagnóstica | "Mi Diagnóstico Funcional" | **MI DIAGNÓSTICO** | Destino · raíces + niveles (ARGOS) |
| Plan de acción | "Mi Protocolo" | **MI PROTOCOLO** | Destino · intervenciones prescritas |
| Registro de datos vivos (glucosa, cetonas, biomarcadores, composición, vitals, labs) | disperso: "ATP Mi Salud", "Biomarcadores", "Edad ATP" | **MIS MEDICIONES** (o "MIS DATOS") | Destino único · captura + consulta de todo dato numérico |
| Cuestionarios/tests | "Historia Clínica" + "Tests" + "Cuestionarios" + "Edad ATP questionnaires" | **MIS EVALUACIONES** | Destino único · todos los cuestionarios y pruebas |
| Síntomas | "Síntomas" + widget 7-sistemas + "clinical-system" | **MIS SÍNTOMAS** | Destino único · un modelo de síntoma |
| Condiciones | "Padecimientos" | **MIS PADECIMIENTOS** | Destino · condiciones diagnosticadas |
| Guía educativa | "Guía de laboratorios" | **GUÍA DE LABS** | Destino editorial (qué labs hacerse) |
| Score de edad | "Edad ATP" | **EDAD ATP** (métrica dentro de Mi Diagnóstico o Mis Mediciones) | Un RESULTADO, no una puerta paralela |

**Regla:** "Historia Clínica" como término desaparece de la jerarquía de navegación. El expediente/timeline (si se quiere) se llama **"Mi Expediente"** o **"Timeline"** y es UN destino, no el nombre del pilar.

---

## 3 · EL ÁRBOL CORRECTO PROPUESTO

```
Mi ATP (tab)
└── SALUD FUNCIONAL  (hub · MENÚ PURO · cards editoriales, cero datos)
      │
      ├── 🧬 MI DIAGNÓSTICO         → síntesis: nivel DX, raíces, narrativa ARGOS, Edad ATP como métrica
      │                               (consume síntomas + labs + cuestionarios + mediciones)
      │
      ├── 💊 MI PROTOCOLO           → las 5 prescritas del motor + activas + catálogo
      │
      ├── 📊 MIS MEDICIONES         → DESTINO ÚNICO de todo dato numérico:
      │                               labs (sangre), biomarcadores, composición, vitals,
      │                               glucosa, cetonas. Sub-secciones internas, UNA tabla por tipo.
      │                               (absorbe: health-input + edad-atp/biomarkers/composition/vitals
      │                                + my-health + glucose-log + ketones-log + edad-atp/labs)
      │
      ├── 📝 MIS EVALUACIONES       → DESTINO ÚNICO de cuestionarios + tests:
      │                               Braverman, Cronotipo, Fitzpatrick, cuestionarios funcionales,
      │                               tests cognitivos, pruebas cinemáticas.
      │                               (fusiona: quizzes + historia-clinica + edad-atp/questionnaires
      │                                + edad-atp/tests + cognitive + cinematic)
      │
      ├── 🩺 MIS SÍNTOMAS           → DESTINO ÚNICO · un modelo de síntoma (una tabla)
      │                               con inicio/fin/duración (task #135) · vista por sistema opcional
      │
      ├── 🏥 MIS PADECIMIENTOS      → condiciones diagnosticadas + episodios
      │
      └── 📖 GUÍA DE LABS           → editorial: qué labs hacerte, dónde, precios

TAB YO
└── (Edad ATP YA NO es puerta al dominio salud · se elimina la card duplicada
     o se convierte en un shortcut a MIS MEDICIONES/MI DIAGNÓSTICO)
```

**7 destinos limpios** en vez de ~29 pantallas revueltas en 2 árboles.

---

## 4 · CONSOLIDACIONES CLAVE (qué se fusiona/mata/mueve)

### C1 · Fusionar los dos árboles (Historia Clínica + Edad ATP)
- **Edad ATP** deja de ser puerta paralela. Su score (CE/edad biológica) se muestra como MÉTRICA dentro de MI DIAGNÓSTICO. Su captura (biomarkers/composition/vitals) se absorbe en MIS MEDICIONES.
- La tab YO ya no tiene cards que dupliquen el dominio salud (o solo shortcuts).

### C2 · Unificar síntomas (1 modelo, 1 tabla)
- Hoy: `clinical_symptoms` (por sistema) + `clinical_symptoms_aislados` (sueltos). Decidir UNA.
- **Propuesta:** un solo modelo de síntoma con campo opcional `system_key` (si el user o ARGOS lo asocia a un sistema) + inicio/fin/duración (task #135). Migrar ambas tablas a una.
- El widget de "7 sistemas con síntomas" SALE del hub (doctrina) · vive dentro de MIS SÍNTOMAS (vista por sistema opcional) o MI DIAGNÓSTICO.

### C3 · Unificar captura de datos numéricos (MIS MEDICIONES)
- Hoy: `health_measurements` + `edad_atp_biomarkers` + `edad_atp_*` + `glucose_logs` + `ketones_logs` + `lab_values`.
- **Propuesta:** MIS MEDICIONES es el único destino. Internamente organiza por tipo (labs sangre, composición, vitals, glucosa, cetonas) pero es UNA experiencia. Consolidar tablas donde tenga sentido (evaluar migración vs vista unificada).

### C4 · Unificar evaluaciones (MIS EVALUACIONES)
- Hoy: `quizzes.tsx` + `historia-clinica` (17) + `edad-atp/questionnaires` (10) + tests dispersos.
- **Propuesta:** un solo hub MIS EVALUACIONES con todo: Braverman, Cronotipo, Fitzpatrick, el Cuestionario Maestro (cuando reemplace los 5 chafas), tests cognitivos, cinemáticos.
- **OJO:** esto conecta con el Cuestionario Maestro (task #107) que YA va a reemplazar los 5 quizzes funcionales. El rediseño de evaluaciones debe alinearse con el Maestro.

### C5 · health-hub = menú puro
- Sacar: resumen ejecutivo + widget de 7 sistemas + quick-add.
- Dejar: solo las cards editoriales de navegación a los 7 destinos.

### C6 · Matar/fusionar pantallas huérfanas
- `health-input.tsx` → absorber en MIS MEDICIONES
- `clinical-system.tsx` → absorber en MIS SÍNTOMAS (vista por sistema)
- `my-health.tsx` → absorber en MIS MEDICIONES
- `historia-clinica/index` → absorber en MIS EVALUACIONES
- Quizzes DB muertos → limpiar

### C7 · Una taxonomía de sistemas
- Hoy: 7 sistemas funcionales vs 10 áreas HC vs 10 dominios edad-atp.
- **Propuesta:** elegir UNA (los 7 sistemas funcionales de Mariana es la más limpia y ya es doctrina) y mapear todo a ella.

---

## 5 · ✅ DECISIONES DE ENRIQUE (cerradas 2026-07-16)

**D1 · Edad ATP se absorbe** → ✅ SÍ. Edad ATP = MÉTRICA dentro de Mi Diagnóstico. Se elimina el árbol paralelo (tab YO ya no es puerta al dominio salud). Su captura (biomarkers/composition/vitals) se absorbe en Mis Datos.

**D2 · Nombre destino datos numéricos** → ✅ **"MIS DATOS"** (labs + biomarcadores + composición + vitals + glucosa + cetonas · un solo destino).

**D3 · Síntomas un solo modelo** → ✅ SÍ. Fusionar `clinical_symptoms` + `clinical_symptoms_aislados` en un modelo único con `system_key` opcional + inicio/fin/duración (task #135).

**D4 · Evaluaciones junto con Cuestionario Maestro** → ✅ SÍ. MIS EVALUACIONES se rediseña JUNTO con el Cuestionario Maestro (task #107). Más coherente.

**D5 · Los destinos del hub** → ✅ OK (los propuestos).

**D6 · Timeline "Mi Expediente"** → ✅ DE UNA VEZ (ahora, no V1.5). Se agrega como destino 8 · el registro epigenético timeline (task #104 se adelanta).

### Árbol final CERRADO (8 destinos)

```
Mi ATP → SALUD FUNCIONAL (hub · menú puro · cero datos)
      ├── 🧬 MI DIAGNÓSTICO      (raíces + niveles + Edad ATP como métrica)
      ├── 💊 MI PROTOCOLO         (5 prescritas motor + activas)
      ├── 📊 MIS DATOS            (labs+biomarcadores+composición+vitals+glucosa+cetonas · 1 lugar)
      ├── 📝 MIS EVALUACIONES     (Braverman+Cronotipo+Fitzpatrick+Cuestionario Maestro+tests · 1 lugar)
      ├── 🩺 MIS SÍNTOMAS         (1 modelo unificado + duración inicio/fin)
      ├── 🏥 MIS PADECIMIENTOS    (condiciones + episodios)
      ├── 📖 GUÍA DE LABS         (editorial · qué labs hacerte)
      └── 🗓️ MI EXPEDIENTE        (timeline cronológico · registro epigenético · task #104)

Tab YO → ya NO tiene cards que dupliquen salud (Edad ATP absorbida)
```

---

## 6 · MAGNITUD + SECUENCIA

Esto es un **rediseño grande** (consolida 29 pantallas + 2 árboles + varias tablas). NO es un sprint pequeño. Propuesta de fasing:

**Fase 1 (este rediseño · post-validación Enrique):**
- health-hub → menú puro (sacar widget)
- Renombrar destinos (sin colisión "Historia Clínica")
- Fusionar entradas duplicadas de navegación

**Fase 2 (consolidación de datos · más pesada · con migraciones):**
- Unificar síntomas (1 tabla + duración)
- Unificar mediciones (absorber edad-atp captura + health-input)
- Absorber árbol Edad ATP

**Fase 3 (evaluaciones · junto con Cuestionario Maestro):**
- MIS EVALUACIONES unificado + Cuestionario Maestro

Cada fase = trabajo congruente grande (no mini-sprint).

---

## 7 · Nota

Enrique: este es el problema raíz que llevábamos 3 intentos sin resolver, y ahora está diagnosticado con precisión. No fallamos por torpeza — fallamos porque tratábamos un síntoma visual de un problema arquitectural profundo (2 sistemas duplicados). Con este rediseño validado, se resuelve de raíz.

Necesito tus decisiones D1-D6 para cerrar el diseño y meterlo al paquete maestro que ejecuta CC.

— Cowork
