# SWEEP C1 · Palabras rojas — DIFF PROPUESTO (NO aplicado)
### Sprint Compliance 1 · Tarea 7 · 2026-07-21
### Estado: **PENDIENTE DE APROBACIÓN DE ENRIQUE** — el diff NO está mergeado ni commiteado.

Tabla de reemplazos B1 aplicada SOLO a strings user-facing:
- prescripción/receta/recetar → sugerencia
- tratamiento/tratar (clínico) → rutina
- dosis (suplemento) → aporte sugerido
- paciente → usuario

## Alcance verificado (grep exhaustivo, 2026-07-21)

**5 cambios en 4 archivos.** Es todo lo que queda de la tabla B1 en copy visible:

| # | Archivo | Antes | Después | Hallazgo |
|---|---|---|---|---|
| 1 | `app/salud/cuestionario-maestro/index.tsx:253` | "ATP te **prescribe** estas {N} para TU perfil" | "ATP te **sugiere** estas {N}…" | C1-007 |
| 2 | `app/salud/mis-evaluaciones/index.tsx:74` | "…y **prescribe** tus 5 intervenciones" | "…y **sugiere** tus 5 intervenciones" | C1-007 |
| 3 | `app/salud/padecimientos.tsx:364` | placeholder "(**tratamiento**, contexto)" | "(**medicación**, contexto)" | C1-009 |
| 4 | `src/services/nutrition-service.ts:371` | "¿**Dosis terapéuticas** adecuadas? (no subdosificado)" | "¿**Aporte sugerido** adecuado? (no por debajo del rango efectivo)" | C1-010/013 |
| 5 | `src/services/nutrition-service.ts:438` | "El **paciente** lleva hoy:" (prompt ARGOS) | "El **usuario** lleva hoy:" | C1-011 |

Notas de criterio:
- #3: la tabla B1 dice tratamiento→"rutina", pero aquí es historia del usuario
  (el tratamiento se lo dio SU médico) — "rutina" no aplica; se usa "medicación"
  como sugiere el scan C1-009.
- #4 y #5 son prompts LLM cuyo output se muestra al usuario (el modelo hace eco
  del vocabulario) — por eso cuentan como user-facing.

## Exclusiones respetadas (según brief)
- **"Diagnóstico / Mi Diagnóstico Funcional"** — NO tocado (rename grande, Sprint 4:
  PDF + prompt + analytics + cerebro). Incluye `mis-evaluaciones/index.tsx:58`
  "Alimentan tu diagnóstico funcional" — mismo archivo del cambio #2, se deja
  intencionalmente para Sprint 4.
- **`src/screens/coach/*`, `clinical-*`, `atp-ai-service`** — HUB Fx, "paciente/clínico"
  válido ahí. No tocados.
- **Comentarios e identificadores internos** — no tocados (ej. `master-quiz-service.ts:7`
  comentario "ATP te prescribe estas 5", tipos `PrescriptionCard`/`prescription-service`,
  `daily-habits-service.ts:2` comentario "del paciente").
- **"receta" de cocina** — falso positivo (argos-recipes, my-recipes), no tocado.

## Observaciones fuera de alcance B1 (para decidir en otro sprint)
- `nutrition-service.ts:438` abre con "Eres **nutriólogo** ATP" y `:375` dice
  "100 = grado **clínico**" — títulos/adjetivos profesionales con ATP como sujeto
  (cruza C1-012); no está en la tabla B1, se deja flaggeado.

## DIFF (aplicable con `git apply`)

```diff
diff --git a/app/salud/cuestionario-maestro/index.tsx b/app/salud/cuestionario-maestro/index.tsx
index b4e5969..8bce5e6 100644
--- a/app/salud/cuestionario-maestro/index.tsx
+++ b/app/salud/cuestionario-maestro/index.tsx
@@ -250,7 +250,7 @@ function SummaryView({ answers, ctx, userId, onGoProtocol, onBack }: {
 
           {top5.length > 0 && (
             <View style={s.rxBox}>
-              <EliteText style={s.rxTitle}>ATP te prescribe estas {top5.length} para TU perfil</EliteText>
+              <EliteText style={s.rxTitle}>ATP te sugiere estas {top5.length} para TU perfil</EliteText>
               {top5.map((r) => (
                 <View key={r.intervention.key} style={s.rxRow}>
                   <Text style={s.rxRank}>{r.rank}</Text>
diff --git a/app/salud/mis-evaluaciones/index.tsx b/app/salud/mis-evaluaciones/index.tsx
index c55b3ba..2b7a82f 100644
--- a/app/salud/mis-evaluaciones/index.tsx
+++ b/app/salud/mis-evaluaciones/index.tsx
@@ -71,7 +71,7 @@ export default function MisEvaluacionesScreen() {
               <View style={{ flex: 1 }}>
                 <EliteText style={s.masterTitle}>Cuestionario Maestro ATP</EliteText>
                 <EliteText variant="caption" style={s.cardBlurb}>
-                  Tu mapa y brújula: levanta tu fenotipo epigenético completo y prescribe tus 5 intervenciones.
+                  Tu mapa y brújula: levanta tu fenotipo epigenético completo y sugiere tus 5 intervenciones.
                 </EliteText>
               </View>
               <Ionicons name="chevron-forward" size={18} color="#A8E02A" />
diff --git a/app/salud/padecimientos.tsx b/app/salud/padecimientos.tsx
index a98e69f..bd4e9af 100644
--- a/app/salud/padecimientos.tsx
+++ b/app/salud/padecimientos.tsx
@@ -361,7 +361,7 @@ export default function PadecimientosScreen() {
                 <TextInput
                   value={fNotes}
                   onChangeText={setFNotes}
-                  placeholder="Notas opcionales (tratamiento, contexto)…"
+                  placeholder="Notas opcionales (medicación, contexto)…"
                   placeholderTextColor={TEXT.muted}
                   style={[styles.input, { minHeight: 60 }]}
                   maxLength={500}
diff --git a/src/services/nutrition-service.ts b/src/services/nutrition-service.ts
index 0814898..3c0dbaf 100644
--- a/src/services/nutrition-service.ts
+++ b/src/services/nutrition-service.ts
@@ -368,7 +368,7 @@ CONTEXTO DE USO: ${useContext || 'No especificado'}
 REGLA CRÍTICA: Evalúa el suplemento SEGÚN SU PROPÓSITO.
 SCORING DE SUPLEMENTOS:
 - ¿Formas biodisponibles? (citrato/bisglicinato > óxido, metilcobalamina > cianocobalamina): 30 pts
-- ¿Dosis terapéuticas adecuadas? (no subdosificado): 25 pts
+- ¿Aporte sugerido adecuado? (no por debajo del rango efectivo): 25 pts
 - ¿Excipientes limpios? (sin dióxido de titanio, talco, colorantes): 25 pts
 - ¿Ingredientes activos correctos para el propósito?: 20 pts
 
@@ -435,7 +435,7 @@ export async function suggestMealForDeficit(
 
   const response = await callAnthropic([{
     role: 'user',
-    content: `Eres nutriólogo ATP. El paciente lleva hoy: ${currentTotals.calories}kcal, ${currentTotals.protein}g prot, ${currentTotals.carbs}g carb, ${currentTotals.fat}g grasa.
+    content: `Eres nutriólogo ATP. El usuario lleva hoy: ${currentTotals.calories}kcal, ${currentTotals.protein}g prot, ${currentTotals.carbs}g carb, ${currentTotals.fat}g grasa.
 Le faltan: ~${Math.max(0, deficit.calories)}kcal, ~${Math.max(0, deficit.protein)}g prot, ~${Math.max(0, deficit.carbs)}g carb, ~${Math.max(0, deficit.fat)}g grasa.
 ${plan.foods_to_avoid?.length ? `Evitar: ${plan.foods_to_avoid.join(', ')}` : ''}
 ${plan.foods_to_prioritize?.length ? `Priorizar: ${plan.foods_to_prioritize.join(', ')}` : ''}
```

## Cómo aplicar tras aprobación
En la branch `fix/compliance-sprint-1` (o la que decida Enrique):
copiar el bloque diff a un archivo `sweep-c1.patch` y `git apply sweep-c1.patch`,
o pedir a CC que lo aplique (los 5 str_replace son quirúrgicos). Después:
`npx tsc --noEmit` + commit "C1 sweep palabras rojas (B1) aprobado por Enrique".
