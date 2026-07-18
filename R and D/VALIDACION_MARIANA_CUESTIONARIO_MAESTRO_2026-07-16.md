# 🩺 Paquete de validación clínica · Cuestionario Maestro ATP
### Sesión Enrique + Mariana · fuente: `CUESTIONARIO_MAESTRO_ATP_v1.md`

**Objetivo de la sesión:** que Mariana firme el banco de preguntas para desbloquear Mega-Sprint D (implementación). NO es rediseñar — es validar/editar/aprobar. El banco ya está completo (80 preguntas). Este paquete la lleva directo a lo que **necesita su ojo clínico**, y deja lo de estilo de vida para skim.

---

## Cómo usar este paquete

Junto a cada pregunta, Mariana marca:
- ✅ **Aprobar** tal cual
- ✏️ **Editar** (escribir el cambio al lado)
- ❌ **Quitar** (no aporta / redundante / riesgo)
- ➕ **Falta** (algo que ella agregaría)

Las preguntas están agrupadas en **3 tiers por peso clínico**. Sugerencia: dedicar el 80% del tiempo al Tier 1.

---

# 🔴 TIER 1 · CLÍNICO CRÍTICO — firma obligatoria de Mariana

Estas mueven contraindicaciones, interacciones o framing sensible. Si algo se cuela mal aquí, hay riesgo real.

### D6 · Medicamentos actuales
- **D6.1** ¿Medicamento recetado actualmente? (lista + dosis + tiempo) → alimenta cross-check de `contraindications`. **Mariana: ¿la lista de autocomplete debe incluir clases específicas? ¿qué fármacos disparan flag fotosensibilizante?** ⬜
- **D6.2** OTC regular (Ibuprofeno / Paracetamol / Antihistamínicos / IBP / Laxantes / Melatonina). → IBP crónico = flag disbiosis/B12. **¿Chips correctos? ¿falta alguno?** ⬜
- **D6.3** Antibióticos >30 días último año → root disbiosis. ⬜
- **D6.4** Anticonceptivos hormonales (Píldora/DIU/Implante/Inyección) → dominancia estrogénica + depleción B6/folato/zinc/Mg. **¿El mapeo de depleción es correcto clínicamente?** ⬜

### D7 · Suplementos
- **D7.1** ¿Suplementos? (lista + BHA scanner + dosis) → fuente única `user_supplements`. ⬜
- **D7.2** Suplementos "de moda" (Creatina/Ashwagandha/NMN/Colágeno/Omega/Multi/D/Mg/Probióticos). **¿Falta alguno relevante clínicamente? ¿Ashwagandha va aquí dado que decidimos que como suplemento comercial no entra al catálogo?** ⬜

### D8 · Intervenciones estéticas/metabólicas
- **D8.1** Péptidos (BPC-157/TB-500/semaglutide/tirzepatide/ipamorelin). ⬜
- **D8.2** TRT / HRT (tipo + dosis + tiempo) → cross-check hormonal + biomarcadores esperados. ⬜
- **D8.3** Tratamientos bajar peso (Ozempic/bariátrica) → flag sarcopenia post-GLP-1. ⬜
- **D8.4** Estéticos con impacto hormonal (botox/fillers/cirugía). ⬜
- **D8.5** Cannabinoides medicinales (CBD/THC). **Mariana: ¿framing correcto? ¿legal/sensibilidad para stores?** ⬜

### D9 · Cirugías, antecedentes, traumas
- **D9.1** Cirugías previas (chips + año). Sin vesícula = ajuste grasas. ⬜
- **D9.2** Padecimientos crónicos diagnosticados → **la fuente de varias contraindicaciones**. **Mariana: ¿la lista de chips está completa y bien nombrada clínicamente? (Hashimoto, AR, Crohn, SOP, endometriosis, etc.)** ⬜
- **D9.3** Antecedentes familiares directos → prioridad preventiva. ⬜
- **D9.4** Mujeres: embarazos/partos/abortos/complicaciones → **activa flags `embarazo`/`lactancia`**. **Framing sensible.** ⬜
- **D9.5** Traumas físicos (accidentes/TCE/fracturas). ⬜
- **D9.6** Traumas emocionales activos (No / En terapia / Sin acompañamiento / Prefiero no responder) → activa modo trauma-informed en ARGOS. **Mariana: ¿el framing es seguro? ¿opciones correctas?** ⬜

### D4 · Salud bucal (puerta digestiva/inflamatoria)
- **D4.1–D4.5** (encías, periodontitis, anticoagulantes, dentista, etc.) → **¿las subpreguntas de deep-dive periodontitis son clínicamente correctas?** ⬜

### 🚩 Lista maestra de CONTRAINDICACIONES (revisión dedicada)
Flags binarios que **excluyen intervenciones absolutamente**. Mariana valida que cada flag se dispara de la pregunta correcta y no falta ninguno:

`embarazo` (D9.4) · `lactancia` (D9.4) · `diabetes_1` (D9.2) · `trastorno_alimentario_activo` (D9.2) · `medicamentos_fotosensibilizantes` (D6.1) · `condiciones_autoinmunes_activas` (D9.2) · `menores_edad` (age gate)

**Pregunta para Mariana:** ¿faltan contraindicaciones absolutas? (ej. epilepsia para ciertas respiraciones/luz, marcapasos para frío/sauna, anticoagulantes, insuficiencia renal/hepática para ayunos agresivos). ⬜

---

# 🟡 TIER 2 · CLÍNICO MODERADO — revisar, no obligatorio firmar línea por línea

Aportan al DX pero bajo riesgo. Skim y marcar solo lo que chirríe.

- **D1 · Estado actual del cuerpo** (7): energía, sueño, digestión, inflamación, foco, ánimo, peso reciente. ⬜
- **D2 · Composición corporal** (5): peso, altura, cintura, % grasa/músculo si lo sabe. ⬜
- **D3 · Piel + uñas + cabello** (6 · soft flags derm): incluye "uñas moradas / ronchas" que pediste. **¿Los soft flags dermatológicos son razonables sin sobrediagnosticar?** ⬜
- **D5 · Hábitos de consumo** (7): alcohol, tabaco, cafeína, ultraprocesados, azúcar, hidratación, nº comidas/ventana. ⬜
- **D10 · Exposiciones ambientales + cosméticos** (7): ambiente, humo 2da mano, filtrado agua, luz azul, aire libre, cosméticos endocrine disruptors, utensilios cocina (PFAS/aluminio). ⬜

---

# 🟢 TIER 3 · LIFESTYLE / CONTEXTO — skim rápido

Contexto para ARGOS y motivación. Casi cero riesgo clínico.

- **D11 · Contexto de vida** (6): estrés 1-10, turnos, horas trabajo, relaciones, jetlag, infancia (ACE). ⬜
- **D12 · Sexualidad + libido** (4 · sensible, saltable): libido, cambios 6m, función eréctil (H), función/placer (M). **Mariana valida solo el framing sensible + "prefiero no responder".** ⬜
- **D13 · Propósito + espiritualidad** (4 · Blue Zones): propósito, práctica contemplativa, naturaleza/semana, red comunitaria. ⬜
- **BONUS · Objetivos y motivación** (5): 3 objetivos, dolor mayor, disposición a cambiar, plazo esperado, qué te trajo a ATP. ⬜

---

## 🎯 Las 6 decisiones que SOLO Mariana puede cerrar

Si la sesión es corta, estas 6 son las que de verdad la necesitan:

1. **Lista de padecimientos crónicos (D9.2)** — que esté completa y clínicamente bien nombrada (es la fuente de la mitad de las contraindicaciones).
2. **Contraindicaciones faltantes** — ¿epilepsia, marcapasos, anticoagulantes, insuficiencia renal/hepática? (revisión de la lista maestra).
3. **Mapeo de depleciones de anticonceptivos (D6.4)** — validar B6/folato/zinc/Mg.
4. **Framing de las 3 secciones sensibles** — trauma (D9.6), sexualidad (D12), embarazo (D9.4): que sea seguro, respetuoso y con salida digna.
5. **Deep-dive de salud bucal (D4)** — periodontitis, anticoagulantes: que las subpreguntas sean correctas.
6. **Soft flags dermatológicos (D3)** — que no sobrediagnostiquen ni alarmen.

---

## Después de la sesión

Con las marcas de Mariana, se actualiza `CUESTIONARIO_MAESTRO_ATP_v1.md` (banco firmado) y **se desbloquea Mega-Sprint D** (`FABLE_MEGASPRINT_D_CUESTIONARIO_MAESTRO_2026-07-16.md`) para que CC lo implemente. El motor de personalización ya existe y funciona — este cuestionario es el input que lo alimenta.

— Cowork
