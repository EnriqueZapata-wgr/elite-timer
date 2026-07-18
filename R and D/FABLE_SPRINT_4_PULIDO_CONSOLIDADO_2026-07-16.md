# 🔧 FABLE SPRINT 4 · Pulido consolidado (post-motor + co-auditoría)

**Fecha:** 2026-07-16
**Contexto:** El motor de personalización YA está vivo en producción (co-auditado en web con Enrique · funciona espectacular: 5 prescritas con rationale personalizado citando fenotipo). Este sprint pule lo que la co-auditoría reveló + los 5 puntos de Enrique.
**Branch:** `fix/sprint-4-pulido` desde `main` (post-merge motor)

---

## 📚 Doctrinas nuevas obligatorias (leer)

1. **`feedback_nombres_propios_nunca_en_copy_usuario`** (2026-07-16) — NUNCA nombres de personas en copy user-facing. ATP/ARGOS son las voces.
2. **`feedback_no_matar_placebo_seguros_no_ingenuos`** — Nivel 1 user-facing limpio.
3. **`project_doctrina_registro_epigenetico_3_funciones`** — para síntomas con duración.

---

## 🎯 BLOQUE A · Copy user-facing (rápido · alto impacto) · P0-P1

### A.1 · "Humby" → "ATP" (P0 · doctrina dura)
- `app/salud/intervenciones/index.tsx`: "Trabajas 8 · **Humby recomiendo** enfocarte en 5-7" → "Trabajas 8 · **ATP recomienda** enfocarte en 5-7 para lograr consistencia"
- **Barrido completo:** grep en TODO el código de copy user-facing por nombres propios (Humby, Kresser, Bredesen, Attia, Sinclair, Huberman, Prieto, Mariana, etc.). Reemplazar por ATP/ARGOS o quitar. Los nombres solo viven en docs internos + campo `sources` (que NO se muestra Nivel 1).

### A.2 · snake_case técnico → legible (P1)
- El copy del motor muestra IDs crudos: `cortisol_ritmo`, `presion_arterial_matutina`, `25-OH-vitamina_D`, `tasa_oxidacion_grasas_max_METS`, `lactato_umbral_zona2_bpm_watts`, `PCR_hs`, `HRV RMSSD`, `HRV SDNN`
- Crear mapa `displayLabel` (key técnica → label legible español): `cortisol_ritmo`→"ritmo de cortisol", `PCR_hs`→"PCR", `25-OH-vitamina_D`→"vitamina D (25-OH)", etc.
- Aplicar en `buildEpigeneticImpactSentence` del motor + donde se rendericen biomarcadores/mecanismos
- Los datos internos quedan snake_case · SOLO el display se legibiliza

### A.3 · "Braverman" en copy · PENDIENTE DECISIÓN ENRIQUE
- Card motor dice "gaba low (Braverman)". Braverman = nombre propio (test neurotransmisores)
- Enrique decide: mantener "Braverman" (es el test que el user hizo, reconocible) O cambiar a "tu perfil neuroquímico" / "tu test de neurotransmisores"
- **NO tocar hasta que Enrique confirme**

---

## 🎨 BLOQUE B · Visual · P1

### B.1 · Renombrar pilares Mi ATP (task #89)
- "HISTORIA CLÍNICA" → "SALUD FUNCIONAL"
- "HÁBITOS" → "HÁBITOS FUNCIONALES"
- "COMUNIDAD" → "COMUNIDAD ATP"
- Ver doctrina `project_doctrina_mi_atp_3_pilares`

### B.2 · Cards sub-pilar Hábitos sin imagen
- NUTRICIÓN, SUPLEMENTACIÓN, FITNESS muestran gradient vacío
- Cablear assets existentes `habits-portal/nutricion.png`, `suplementacion.png`, `fitness-el/ella.png` (verificar que existen en disco)

### B.3 · Imágenes MJ estilo OURA (requiere Enrique genere prompts)
- Fondos header "buenos días/noches" casi no se ven → mejorar o quitar (más vida estilo OURA)
- Cards agenda con imágenes REPETIDAS o que no corresponden al evento → reasignar assets únicos coherentes por tipo
- **Cowork arma lista de qué mejorar + prompts MJ sugeridos → Enrique genera → Fable cablea**

---

## 🏗️ BLOQUE C · Estructural · P1 (hacer BIEN esta vez)

### C.1 · Historia Clínica · TODA info en cards (RECURRENTE · task #133)
- Enrique lo ha pedido muchas veces, se rompe cada vez (task #67, #92)
- **Fix definitivo:** TODA info suelta (síntomas tipo "Tuve gripa de sábado a martes" debajo de sistemas) va DENTRO de cards contenedoras
- Compartimentalizar por sistema funcional
- Filtrar/dedup: CERO data repetida cross-card
- Investigar POR QUÉ se rompe cada vez (¿algún render condicional? ¿componente que se resetea?)
- Auditar `health-hub.tsx` completo

### C.2 · Síntomas con duración inicio/fin (task #135)
- Cuando se marca síntoma → flag ACTIVO + el user puede marcar "resuelto" → duración calculada (como ayuno)
- Migración: agregar `resolved_at` + `is_active` a tabla síntomas
- UI: botón "marcar como resuelto" + mostrar duración ("Gripa · 3 días")
- Alimenta registro epigenético + patrones ARGOS

---

## 🔬 BLOQUE D · Motor · P1

### D.1 · Cold interventions sin tag fiebre (task #130)
- Code notó: `ducha_fria`/`wim_hof`/`sauna` NO tienen contraindicación fiebre aunque deberían
- Auditar TODAS las cold interventions · agregar `fiebre_viral_activa_37_8_o_mas` donde falte

### D.2 · Calibrar scoring ×10→×5 (task #130 · con Mariana)
- Confirmado en vivo: scoring satura a 100 (Coherencia cardíaca=100, resto 60-70)
- Code recomendó bajar boost de ×10 a ×5 para discriminación fina
- **Calibrar con Enrique+Mariana antes de aplicar**

---

## 🔄 BLOQUE E · Data · P0

### E.1 · Cronotipo propagación (task #129)
- ACLARADO: no es placeholder duplicado · Enrique re-hizo test → Oso (real hoy)
- Verificar que el cambio León→Oso se propagó a TODAS las fuentes (agenda wake_time, config, validatedSchedule, HOY, card YO)
- Confirmar consistencia cross-app tras cambio de cronotipo

---

## 🔍 BLOQUE F · Cowork hace (no Fable)

### F.1 · Auditoría completa pilar Salud Funcional (task #134)
- Cowork audita cada pantalla: qué sirve, qué es relleno, qué eliminar/consolidar
- Reporte keep/fix/kill por pantalla

### F.2 · Lista imágenes MJ a mejorar + prompts (task #132)
- Cowork arma la lista + prompts sugeridos para que Enrique genere

---

## 🚦 Orden sugerido para Fable

```
Sprint 4a (rápido · 4-6h):
  A.1 Humby→ATP + barrido nombres
  A.2 snake_case legible
  B.1 nombres pilares
  B.2 cards Hábitos imagen
  → device test + merge + OTA (quick wins visibles)

Sprint 4b (estructural · 8-12h):
  C.1 Historia Clínica cards (el recurrente · con cuidado)
  C.2 síntomas duración
  E.1 cronotipo propagación
  → device test + merge + OTA

Sprint 4c (motor · con Mariana):
  D.1 cold sin fiebre
  D.2 scoring calibración
```

**Pendientes de decisión Enrique antes de ejecutar:** A.3 Braverman · D.2 scoring ×5 · B.3 prompts MJ

---

## 🔒 Invariantes

- str_replace quirúrgico · tsc limpio · tests integration reales
- Cero fuga clínica · nombres propios NO en copy (doctrina nueva)
- Dedup semántico · datos user sagrados
- Delivery doc por sprint

— Enrique + Cowork
