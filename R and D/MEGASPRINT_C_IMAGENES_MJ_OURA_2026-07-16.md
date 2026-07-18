# 🎨 MEGA-SPRINT C · Imágenes MJ estilo OURA (prep · Enrique genera)

**Fecha:** 2026-07-16
**Autor:** Cowork (análisis + prompts) → Enrique genera en MidJourney → Fable cablea
**Objetivo:** dar vida visual a la app estilo OURA · arreglar fondos apagados + agenda con imágenes repetidas/incorrectas.

---

## 🔍 Diagnóstico (auditoría en vivo + assets)

### Problema 1 · Fondos header "buenos días/noches" casi no se ven
- El saludo "Buenos días, ENRIQUE" tiene un fondo detrás que apenas se percibe (muy oscuro/apagado)
- Existen fondos `hoy-extra/tu-dia/` (amanecer, medio-dia, atardecer, noche · 2-3 variantes c/u) pero o no se usan en el header o están muy atenuados
- **Enrique:** "ni se ven jajaja · o los quitamos o los mejoramos para darle más vida estilo OURA"

### Problema 2 · Cards agenda con imágenes repetidas o que no van
- Hay 12 categorías de imagen de agenda: cardio, comida, despertar, entrenar, hidratacion, meditacion, off-pantallas, otros, sleep, sol-am, sol-pm, suplementos (3-4 variantes c/u)
- **PERO:** las 89 intervenciones del catálogo epigenético NO todas mapean a estas 12 categorías → las que no matchean caen a `otros` (genérica) o repiten
- Ejemplos de intervenciones sin categoría de imagen clara: grounding, respiración nocturna, coherencia cardíaca, box breathing, sauna, baño frío, lentes rojos, panel rojo, journal, NSDR, binaurales, N-Back, green time, OMT, oil pulling, etc.
- **Fable debe:** mapear cada intervención/tipo de evento a una categoría de imagen · crear categorías nuevas donde falte · evitar repetición adyacente

---

## 🎯 PARTE 1 · Fondos header HOY (4 momentos del día · estilo OURA)

**Decisión Enrique:** ¿mejorar o quitar? Recomiendo **mejorar** (da vida). Prompts MJ para 4 fondos de header (uno por momento circadiano · el header cambia con la hora):

**Estilo base (todos):** editorial cinematográfico, oscuro premium estilo OURA app, atmosférico, minimalista, degradado sutil, apto para overlay de texto blanco encima, ratio 3:2 horizontal, sin personas, sin texto.

1. **Amanecer (5-9am):**
   `Cinematic dark premium wellness app background, first light of dawn over calm horizon, deep amber and warm gold gradient bleeding into near-black, soft atmospheric haze, minimalist, subtle sun glow low on horizon, room for white text overlay top-left, moody editorial, OURA app aesthetic, no people no text, 3:2 --style raw`

2. **Medio día (9am-5pm):**
   `Cinematic dark premium wellness app background, midday clarity, deep teal and slate gradient with a single shaft of clean light, crisp minimal atmosphere, near-black base for text overlay, editorial OURA aesthetic, no people no text, 3:2 --style raw`

3. **Atardecer (5-9pm):**
   `Cinematic dark premium wellness app background, dusk golden hour fading to indigo, warm-to-cool gradient, soft glow on horizon, calm winding-down mood, near-black base for white text, editorial OURA aesthetic, no people no text, 3:2 --style raw`

4. **Noche (9pm-5am):**
   `Cinematic dark premium wellness app background, deep night, indigo and near-black gradient with faint starfield and soft moon glow, restful atmospheric, room for white text overlay, editorial OURA aesthetic, no people no text, 3:2 --style raw`

**Cableado (Fable):** el header lee la hora del user (o su `time-of-day` circadiano) y muestra el fondo correspondiente con un overlay oscuro suave (para legibilidad del saludo). Ver `hoy-extra/tu-dia/`.

---

## 🎯 PARTE 2 · Imágenes agenda faltantes (por categoría)

Las 12 categorías actuales cubren lo básico. Faltan categorías para las intervenciones nuevas del catálogo epigenético. **Nuevas categorías de imagen a generar** (B/N editorial · estilo agenda actual · ratio de card de agenda):

**Estilo base agenda (todos):** black and white editorial photography, high contrast, cinematic, single subject, atmospheric, premium wellness aesthetic, no text, agenda card crop.

| Categoría nueva | Intervenciones que cubre | Prompt MJ sugerido |
|---|---|---|
| `respiracion` | respiración nocturna, coherencia cardíaca, box breathing, physiological sigh, wim hof | `B&W editorial photo, person in calm controlled breathing, chest/diaphragm focus, serene, high contrast cinematic, no text` |
| `grounding` | grounding/earthing | `B&W editorial photo, bare feet on earth/grass/sand, connection to ground, morning light, cinematic, no text` |
| `frio` | baño frío, ducha fría, cold plunge, terapia contraste | `B&W editorial photo, cold water immersion, ice, steam breath, resilience, dramatic high contrast, no text` |
| `calor` | sauna finlandesa/infrarrojo/vapor, baño caliente | `B&W editorial photo, sauna heat, steam, wood, wellness ritual, cinematic, no text` |
| `luz-roja` | lentes rojos, panel rojo, luz roja ojos | `B&W editorial photo, red light therapy panel glow on face, night, futuristic wellness, high contrast, no text` |
| `lentes` | lentes ámbar/amarillos | `B&W editorial photo, amber blue-light glasses at dusk, screen glow, evening ritual, cinematic, no text` |
| `mente` | journal, NSDR, yoga nidra, meditación, silencio | `B&W editorial photo, contemplative stillness, journaling or meditation, introspective, soft light, no text` |
| `audio` | binaurales delta/theta/alpha/beta | `B&W editorial photo, headphones, sound waves, immersive audio, dark minimal, no text` |
| `cognitivo` | N-Back, tests atención | `B&W editorial photo, focused mind, brain training, sharp concentration, cinematic, no text` |
| `naturaleza` | green time, sol | `B&W editorial photo, immersion in nature, forest/park, biophilia, atmospheric, no text` |
| `oral` | OMT masticatorios, oil pulling | `B&W editorial photo, jaw/oral health, subtle, wellness, cinematic, no text` |

**Cableado (Fable):** función `agendaImageFor(interventionKey)` mapea cada intervención a su categoría · si no matchea, categoría `otros` (mejorar la actual) · rotar variantes para evitar repetición adyacente (dedup semántico visual).

---

## 🎯 PARTE 3 · Cards que faltan imagen (ya identificadas)

- Sub-pilar Hábitos: NUTRICIÓN, SUPLEMENTACIÓN, FITNESS (assets existen · solo cablear · va en Mega-Sprint A)
- Los 8 destinos nuevos de Salud Funcional (Mega-Sprint B) necesitarán imágenes editoriales:
  - Mi Diagnóstico ✅ (ya tiene · hoja+gota)
  - Mi Protocolo ✅ (ya tiene · manos+piedras)
  - **Mis Datos** (nuevo · prompt: `B&W editorial, data/biomarkers visualization, lab vials + charts, clinical premium, no text`)
  - **Mis Evaluaciones** (nuevo · prompt: `B&W editorial, thoughtful person taking assessment, introspection, cinematic, no text`)
  - **Mis Síntomas** (nuevo · prompt: `B&W editorial, body awareness, listening to body signals, subtle, no text`)
  - **Mis Padecimientos** (nuevo · prompt: `B&W editorial, medical history, resilience, cinematic, no text`)
  - **Guía de Labs** ✅ (ya tiene)
  - **Mi Expediente** (nuevo · prompt: `B&W editorial, timeline/journey of health, chronological path, cinematic, no text`)

---

## 🚦 Flujo del Mega-Sprint C

```
1. Enrique revisa prompts + decide (mejorar fondos vs quitar)
2. Enrique genera en MidJourney (--style raw, ratios indicados)
3. Enrique pasa los PNGs a assets/images/ (carpetas indicadas)
4. Fable cablea: header circadiano + agendaImageFor() + cards destinos
5. optimize-images + device test
```

**Nota:** este mega-sprint depende de que Enrique genere los assets. Fable solo cablea al final. Los prompts están listos arriba · Enrique genera cuando tenga tiempo · no bloquea A ni B.

---

## Resumen para Enrique

- **Parte 1:** 4 fondos header circadiano estilo OURA (amanecer/mediodía/atardecer/noche)
- **Parte 2:** ~11 categorías nuevas de imagen agenda (para las intervenciones del catálogo epigenético)
- **Parte 3:** 5 imágenes editoriales para destinos nuevos de Salud Funcional

Prompts MJ listos arriba. Genera cuando quieras · Fable cablea en un pase al final (después de A y B).

— Cowork
