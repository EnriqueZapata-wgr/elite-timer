# Auditoría de claims user-facing · Catálogo de Intervenciones vs. Research

**Fecha:** 2026-07-21
**Autor:** Cowork (auditoría de compliance · solo lectura)
**Archivo auditado:** `src/constants/interventions-catalog.ts` (88 intervenciones)
**Campos revisados (USER-FACING):** `name`, `how`, `benefit`, `scientificInfo`
**Campos NO auditados (internos):** `mechanismSummary`, `citation`, `sources`, `contraindications`, `epigeneticImpact` — estos SÍ tienen respaldo y sirvieron como fuente de verdad.
**Research cruzado:** campos `sources[]`/`citation` de cada intervención + `R and D/RESEARCH_MAPEO_BATCH_A/B/C_2026-07-14.md` + `research_notes_extra_batch_*` + `MAPEO_EPIGENETICO_INTERVENCIONES_v1.md`.

---

## Para Mariana — cómo leer esto (no investigues desde cero)

Este doc ya cruzó cada claim cuantitativo/de-promesa contra el respaldo que YA vive en el catálogo. **La sorpresa buena:** casi todos los números del catálogo SÍ vienen de un estudio primario nombrado que ya está en el campo `sources` de esa intervención (no son inventados). El problema legal **no es fabricación** — es de **fraseo y superlativos**:

1. **Verbo causal/terapéutico → asociativo.** "reduce mortalidad", "previene [condición]", "elimina", "cura" deben decir "se asocia con / apoya / ayuda a", porque el respaldo suele ser observacional (cohortes) o mecanístico.
2. **Superlativos no demostrables.** "predictor #1", "Intervención #1", "la de mejor evidencia", "marker independiente de longevidad" — ningún estudio ranquea un #1.
3. **Puñado de números sin cita** (estimaciones mecanísticas de melatonina/N3) → suavizar a mecanismo sin número prometido.

Tu decisión pedida está marcada en cada fila ⚠️/❌. Los ✅ solo necesitan tu OK al ajuste de verbo (el número se queda con su cita).

**Doctrina aplicada:** respaldo = mecanismo + estudio primario (no autoridades capturadas AHA/USDA/Harvard/ADA como validación). Lenguaje educativo, no terapéutico.

---

## ✅ TIENE CITA — el número/afirmación está respaldado por estudio primario en `sources`

> Se quedan. Único ajuste: atribuir la cifra a su estudio y cambiar verbo causal → asociativo donde el respaldo es observacional. El **número no cambia**.

| Intervención (`key`) | Campo | Claim actual (fragmento exacto) | Respaldo encontrado | Reescritura propuesta |
|---|---|---|---|---|
| `sauna_finlandesa` | benefit | "…KIHD cohort · 4-7 sesiones/sem → **50-63% menor riesgo**" (mortalidad CV) | **Laukkanen 2015 JAMA Intern Med** (cohorte KIHD, 2315 hombres) — ya en `sources`. Estudio observacional. | "En la cohorte finlandesa KIHD, 4-7 sesiones/sem **se asociaron con** 50-63% menor riesgo de mortalidad cardiovascular (Laukkanen 2015)." (cambiar "reducción de mortalidad" → "se asoció con menor riesgo"; ver superlativo abajo) |
| `ducha_fria_nivel1` | benefit | "protocolo Buijze 2016 mostró **29% menos ausentismo** laboral" | **Buijze 2016 PLoS One** (RCT ducha fría) — en `sources`. | Se queda tal cual (ya está atribuido a estudio + es RCT). OK directo. |
| `postura_cuclillas_defecar` | benefit | "**reduce tiempo defecación 50-60%** (Sikirov 2003)" | **Sikirov 2003 Dig Dis Sci** (n=28, 51s vs 130s = ~60% menos) — en `sources`. | Se queda (el 50-60% deriva de 130s→51s del propio estudio). *Nota: "previene hemorroides" en la misma línea NO — ver ⚠️.* |
| `luz_roja_ojos` | benefit | "Jeffery 2020-2024 demostró mejora contraste cromático **+17-20%** en >40 años" | **Shinhmar/Jeffery 2020 J Gerontol + 2021 Sci Rep** — en `sources`. | Se queda con atribución. Suavizar "demostró" → "documentó/observó". |
| `bano_caliente_vespertino` | benefit | "Meta-análisis Haghayegh 2019 · **reduce latencia sueño 36%**" | **Haghayegh 2019 Sleep Med Rev** (meta-análisis) — en `sources`. | "…se asoció con ~36% menos latencia de sueño (meta-análisis Haghayegh 2019)." Cambiar "reduce" → "se asoció con". |
| `pausas_activas_60min` | benefit | "Dempsey/Owen 2012 · …**reduce glucosa postprandial + insulina 20-25%**" | **Dempsey/Owen (Diabetes Care)** — en `sources` (AUC -20-25%). | "…se asocia con ~20-25% menos glucosa/insulina postprandial (Dempsey 2016)." Ajuste de verbo. |
| `standing_desk` | benefit | "Buckley 2014 · 185 min de pie post-comida **atenuaron glucosa postprandial en 43%**" | **Buckley 2014** — en `sources`. | Parte numérica se queda (atribuida). *"Reduce mortalidad asociada a sedentarismo" en la misma línea → ⚠️.* |
| `parpadeo_consciente` | benefit | "Patel 1991 · **frecuencia parpadeo baja 60%** durante uso pantalla" | **Patel 1991** — en `sources`. | Se queda (es un dato descriptivo del fenómeno, no una promesa). *"previene ojo seco crónico" → ⚠️.* |
| `terapia_contraste` | benefit | "**clearance lactato (Vaile: -22% tiempo recovery)**" | **Vaile et al.** — en `sources`. | Se queda con atribución. |
| `wim_hof_basico` | benefit | "dispara **adrenalina 200-300%**, IL-10 antiinflamatoria (Kox 2014 PNAS)" | **Kox 2014 PNAS** (estudio Wim Hof control voluntario inmunidad) — en `sources`. | Se queda (atribuido a estudio primario replicable). |
| `cold_plunge_cns` | benefit | "dopamina + noradrenalina hasta **250-500%** (Šrámek 2000)" | **Šrámek 2000** (inmersión agua fría, catecolaminas) — en `sources`. | Se queda con atribución. |
| `bano_frio_hormesis` | benefit | "norepinefrina/dopamina **250-500%** … (Søberg 2021)" | **Šrámek 2000 / Søberg 2021** — en `sources`. | Se queda con atribución. |
| `masticar_mas_20` | benefit | "**reduce ingesta calórica 10-15%**" | **Zhu & Hollis 2014 (J Acad Nutr Diet) + Li 2011 (Am J Clin Nutr)** — ambos RCT en `sources`. | "…se asocia con ~10-15% menos ingesta calórica (Zhu & Hollis 2014)." Añadir atribución + suavizar verbo. |
| `ejercicio_ayuno_fuerza` | benefit | "en ayuno la **mTOR se atenúa 40%**, síntesis proteica queda negativa (Van Proeyen)" | **Van Proeyen et al.** — en `sources`. | Se queda con atribución (además es una *advertencia*, no una promesa comercial). |
| `green_time_30min` | benefit | "**NK cells activity ↑ 50% × 7 días** post (Li Qing 2007 · phytoncides)" | **Li Qing 2007** (forest bathing, células NK) — en `sources`. | Se queda con atribución. |
| `silencio_30min` | benefit | "neurogénesis hipocampal (**Kirste 2013 · 2h silencio ↑50% neurogénesis vs ruido en ratones**)" | **Kirste 2013** — en `sources`. | Se queda: **ya declara "en ratones"** (honesto). Mantener la aclaración de especie. |
| `death_hang` | benefit | "grip strength (**predictor mortalidad Rantanen 1999**)" | **Rantanen 1999** (grip strength y mortalidad) — en `sources`. Asociación. | "…la fuerza de agarre se asocia con longevidad (Rantanen 1999)." Suavizar "predictor" → "se asocia con". |
| `meta_pasos_8k` | benefit | "Umbral funcional real de **reducción de mortalidad** (Paluch 2022 Lancet Public Health)" | **Paluch 2022 Lancet Public Health** — en `sources`. Asociación dosis-respuesta. | "…se asocia con menor mortalidad (Paluch 2022)." Quitar "Umbral funcional real de reducción" → "se asocia con menor mortalidad". |

---

## ⚠️ SUAVIZAR — mecanismo plausible pero el número exacto / el superlativo / el verbo no está respaldado

> El respaldo del *efecto* existe; lo que NO está respaldado es la **cifra precisa prometida**, el **ranking "#1"**, o el **verbo terapéutico**. Reescribir a lenguaje de mecanismo/asociación **sin número prometido**.

### A) Superlativos no demostrables

| Intervención (`key`) | Campo | Claim actual (fragmento) | Respaldo | Reescritura propuesta |
|---|---|---|---|---|
| `vo2max_training` | benefit + mechanismSummary | "VO2max = **predictor #1 de mortalidad** por todas las causas" / "el predictor #1 de longevidad" | Mandsager 2018 respalda **asociación** dosis-respuesta, NO un ranking "#1". | "El VO2max es **uno de los predictores más fuertes** de mortalidad por todas las causas (asociación dosis-respuesta, Mandsager 2018)." Eliminar "#1". |
| `levantamiento_compuesto` | benefit | "**Intervención #1 anti-sarcopenia** + declive metabólico" | El "#1" viene de Attia *Outlive* (libro de divulgación), no de estudio primario. Anti-sarcopenia sí bien establecido. | "Intervención **de primera línea** contra la sarcopenia y el declive metabólico." Quitar "#1". |
| `sauna_finlandesa` | benefit | "**La intervención con mejor evidencia** de reducción de mortalidad cardiovascular en humanos" | Superlativo comparativo no demostrable (aunque KIHD es sólido). | "Una de las intervenciones con **evidencia observacional más consistente** en salud cardiovascular." |
| `farmers_walk` | benefit | "**Marker independiente de longevidad**" / "La 'caminata más honesta'" | Grip/carry se asocia con longevidad (Rantanen), pero "marker independiente de longevidad" es afirmación fuerte sin cita en esta intervención. | "La fuerza de agarre y core **se asocia con** marcadores de longevidad." |

### B) Números sin cita (estimaciones mecanísticas — quitar la cifra prometida)

| Intervención (`key`) | Campo | Claim actual (fragmento) | Respaldo | Reescritura propuesta |
|---|---|---|---|---|
| `pantallas_off_60min` | benefit | "reducción de supresión melatonina **de ~50% a ~15%**" | Sin cita para estas cifras exactas (estimación mecanística). Efecto luz-azul→melatonina sí documentado. | "Mayor protección de la melatonina que la versión corta; mejor onset y arquitectura de sueño profundo." (quitar 50%/15%) |
| `pantallas_off_90min` | benefit | "máxima protección de melatonina (**supresión residual <5%**)" | Sin cita para "<5%". | "Máxima protección de la melatonina y arquitectura de sueño óptima." (quitar <5%) |
| `blackout_total_cuarto` | benefit | "**sueño profundo N3 aumenta 20-30%**" | Sin cita para 20-30% (mecanístico). | "Apoya mayor sueño profundo N3 y reparación glinfática." (quitar 20-30%) |
| `antifaz_nocturno` | benefit | "suficiente para **85-95% del beneficio**" | Sin cita para 85-95% (estimación). | "Cubre la mayor parte del beneficio del blackout ambiental, con micro-filtraciones menores." |
| `vo2max_training` | benefit | "**Aumenta 7-9% en 8 semanas**" | Cifra plausible (protocolo Noruego 4×4 tipo Helgerud 2007) pero **sin cita en `sources`**. | Si Mariana valida Helgerud: "mejora VO2max de forma medible en ~8 semanas (Helgerud 2007)". Si no: quitar la cifra → "mejora medible del VO2max en semanas". |
| `caminata_postprandial` | benefit | "**Reduce glucosa postprandial 20-50%**" | Dirección **muy** respaldada (Reynolds 2016, DiPietro 2013, Buffey 2022 en `sources`), pero esos estudios reportan rangos ~12-22%; el "hasta 50%" excede lo citado. | "**Baja la glucosa postprandial** vía captación muscular insulina-independiente (Reynolds 2016, DiPietro 2013)." Quitar "20-50%" o ajustar a "~15-25%". |
| `dive_reflex_cara_hielo` | benefit | "**bradicardia 10-25% en <30 seg**" | Reflejo de inmersión es fisiología documentada; el rango exacto 10-25% no está citado aquí. | "Activa el reflejo de inmersión (bradicardia refleja vía trigémino→vago) en segundos." (quitar 10-25% o citar) |
| `meta_pasos_10k` | how | "gradiente/desnivel … activa cadena posterior + **gasto energético +20-30%**" | Sin cita para +20-30% (estimación). | "…el desnivel activa la cadena posterior y aumenta el gasto energético." (quitar cifra) |

### C) Verbo terapéutico / promesa de prevención (mecanismo real, verbo a suavizar)

| Intervención (`key`) | Campo | Claim actual (fragmento) | Respaldo | Reescritura propuesta |
|---|---|---|---|---|
| `panel_rojo_cara` | benefit + mechanismSummary | "Wunsch & Matuschka 2014 · **+30-40% densidad colágeno en 12 semanas**" | Wunsch 2014 (Photomed Laser Surg) SÍ existe y documentó aumento de densidad de colágeno, pero **el +30-40% en 12 semanas no es una cifra limpia del estudio** (reportó satisfacción + perfilometría + densidad, sin ese % exacto). **Caso arquetipo de suavizar.** | "**Se asocia con** mayor densidad de colágeno dérmico y mejor textura de piel (Wunsch & Matuschka 2014)." Quitar "+30-40% en 12 semanas". |
| `postura_cuclillas_defecar` | benefit | "**previene hemorroides**" | Reduce Valsalva (mecanismo), pero "previene hemorroides" es promesa terapéutica sin RCT de prevención. | "Reduce el esfuerzo (Valsalva) al evacuar." Quitar "previene hemorroides". |
| `ejercicio_ocular_near_far` | benefit | "**previene fatiga acomodativa**, **reduce miopía adquirida** por near work" | Mecanismo (Rosenfield/CVS) plausible; "reduce miopía adquirida" y "previene" son promesas sin RCT. | "**Ayuda a aliviar** la fatiga acomodativa por trabajo de cerca prolongado." Quitar "previene" y "reduce miopía". |
| `standing_desk` | benefit | "**Reduce mortalidad** asociada a sedentarismo (Chastin meta-analysis)" | Chastin respalda **asociación**, no reducción causal de mortalidad por pararse. | "El menor tiempo sedentario **se asocia con** mejores marcadores de salud (Chastin)." Suavizar verbo. |
| `parpadeo_consciente` | benefit | "**previene ojo seco crónico**, ojo rojo vespertino" | Restaura película lagrimal (mecanismo); "previene ojo seco crónico" es promesa terapéutica. | "**Ayuda a** mantener la película lagrimal y reducir molestias oculares por pantalla." |
| `omt_masticatorios` | benefit | "**prevención bruxismo**" | Tono muscular facial (mecanismo); prevención de bruxismo no establecida. | "Apoya el tono muscular facial y la función masticatoria." Quitar "prevención bruxismo". |
| `n_back_challenge` | benefit | "…y **prevención de declive** [cognitivo]" | Entrena working memory (documentado); "prevención de declive" es promesa. | "Herramienta cognitiva estructurada para entrenar la memoria de trabajo." Quitar "prevención de declive". |
| `levantamiento_compuesto` | benefit | lista termina en "…densidad ósea, control glucémico, **mortalidad**" | Token suelto "mortalidad" como beneficio; asociación (Rantanen) sí existe pero el token crudo suena a promesa. | "…densidad ósea, control glucémico y **marcadores asociados a longevidad**." |
| `eliminar_aceites_vegetales` | benefit | "**baja inflamación silenciosa**, **protege membranas** celulares" | Mecanismo doctrina-alineado (ratio ω-3/ω-6, peroxidación); "baja inflamación" como promesa cuantitativa-implícita. | "**Se asocia con** menor carga oxidativa de PUFA ω-6 y mejor ratio ω-3/ω-6." (mantiene mecanismo, suaviza absoluto) |

---

## ❌ SIN RESPALDO — no hay estudio ni mecanismo sólido que lo sostenga (los más urgentes)

| Intervención (`key`) | Campo | Claim actual (fragmento) | Respaldo | Reescritura propuesta |
|---|---|---|---|---|
| `separadores_dedos_pies` | benefit + assignRule + mechanismSummary | "**previene juanetes (hallux valgus)**" / "bloqueando la deformidad hallux valgus por vía mecánica" | **Ninguno primario.** `sources` es mayormente mecanístico/tradicional. Que los separadores *prevengan/corrijan* juanetes no está establecido (evidencia escasa, pequeños estudios de ángulo, no de prevención). Promesa estructural. | "**Puede ayudar a** la alineación del antepié y la propriocepción plantar; redistribuye la carga en los dedos." Quitar "previene juanetes"/"bloquea la deformidad". |
| `digital_minimalism_1dia_semana` | benefit + mechanismSummary | "**Restaura dopamina baseline (reset tolerancia hedónica)**" | **Ninguno primario.** `sources` = solo libros de divulgación (Newport, Twenge *iGen*, Hansen). El "reset de dopamina baseline" es concepto pop-neuro sin estudio humano que lo mida. Los beneficios de atención/ánimo SÍ tienen algo de respaldo, la neuromecánica NO. | "**Ayuda a** romper el ciclo de refuerzo variable de las redes, mejorar la atención y reducir la comparación social." Quitar "restaura dopamina baseline / reset tolerancia hedónica". |

---

## Conteo por clasificación

| Clasificación | # claims |
|---|---|
| ✅ **TIENE CITA** (número respaldado; solo ajuste de verbo/atribución) | **18** |
| ⚠️ **SUAVIZAR** (superlativo / número sin cita / verbo terapéutico) | **21** |
| ❌ **SIN RESPALDO** (quitar/reescribir a educativo neutro) | **2** |
| **Total claims flaggeados** | **41** |

*(⚠️ desglose: 4 superlativos · 8 números sin cita · 9 verbos terapéuticos de prevención.)*

---

## Los ❌ sin respaldo — acción urgente (top priority)

1. **`separadores_dedos_pies` → "previene juanetes (hallux valgus)"** — promesa de prevención de una deformidad estructural sin respaldo primario. Es el claim de mayor exposición legal (promete evitar una condición médica). Reescribir a mecanismo de alineación/propriocepción.
2. **`digital_minimalism_1dia_semana` → "Restaura dopamina baseline (reset tolerancia hedónica)"** — neuromecanismo pop-science sin estudio humano; las fuentes citadas (libros) hablan de atención/ánimo, no de dopamina. Reescribir a los beneficios conductuales que sí se sostienen.

---

## Qué necesita DECISIÓN de Mariana (no lo decide Cowork)

- **Verbo global asociación vs. causal:** confirmar el patrón "reduce/previene → se asocia con/apoya/ayuda a" en TODOS los ✅ (la cifra se queda, solo cambia el verbo). Si Mariana lo aprueba como regla, Cowork lo aplica de una.
- **`vo2max_training` "7-9% en 8 semanas":** ¿validar cita Helgerud 2007 y mantener cifra, o quitar el número? (hoy no hay cita en `sources`).
- **`caminata_postprandial` "20-50%":** ¿ajustar a "~15-25%" (lo que reportan Reynolds/DiPietro) o quitar la cifra? El "hasta 50%" excede lo citado.
- **`panel_rojo_cara` "+30-40% colágeno":** confirmar que Wunsch 2014 NO reporta ese % limpio → aprobar reescritura a "mayor densidad de colágeno" sin número. (Es el caso arquetipo que motivó esta auditoría.)
- **Superlativos "#1":** ¿aceptas "uno de los predictores más fuertes" / "de primera línea" en lugar de "#1"? (aplica a `vo2max_training`, `levantamiento_compuesto`, `sauna_finlandesa`, `farmers_walk`).
- **`silencio_30min`:** mantiene "en ratones" (Kirste 2013). ¿OK extrapolar con esa aclaración explícita, o quitar la cifra 50%?

---

## Notas de método / exclusiones

- **Specs técnicas de producto NO son claims de salud** y se dejaron fuera del conteo: los porcentajes tipo "lentes bloquean ~85-95% del pico azul 400-500 nm" (`lentes_ambar`, `lentes_rojos`, `lentes_amarillos`) describen el filtro, no prometen un desenlace clínico. OK como están.
- **Dosis/tiempos en `how`** (minutos de sol por fototipo, ml de agua, reps, °C) son instrucciones de ejecución, no claims de eficacia. No flaggeados.
- Los 12 claims ✅ con número + estudio primario **NO deben borrarse**: borrarlos empobrecería el producto sin razón, ya que el respaldo existe. Solo requieren el ajuste de verbo.
- Toda cita usada como respaldo ya vive en el campo `sources[]`/`citation` de su intervención; ninguna se inventó para este doc.
