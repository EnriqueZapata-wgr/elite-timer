# 🧬 CUESTIONARIO MAESTRO ATP · v1

**Fecha:** 2026-07-14
**Autor:** Cowork (Fase 0 · rediseño motor personalización)
**Aprobación clínica:** Mariana Doria (pendiente)
**Reemplaza:** Los 5 cuestionarios funcionales chafas actuales
**NO toca:** Braverman 313Q · Cronotipo Quiz (cada uno con su rol propio)

---

## Por qué este cuestionario existe

Los 5 quizzes funcionales actuales fueron descritos por Enrique como *"chafas, hechos como relleno de presentación de secundaria, sin background, preguntas escuetas, respuestas triviales, resultados que no dicen nada"*.

El cuestionario maestro nuevo debe **sentirse como el mapa y la brújula que settea ATP**. Su propósito es levantar el **fenotipo epigenético completo del user** para que el motor de personalización pueda prescribir 5 intervenciones específicas con "por qué a TI".

**Rol de cada cuestionario en el ecosistema ATP:**

| Cuestionario | Rol | Estado |
|---|---|---|
| **Braverman 313Q** | Estado neurológico/clima químico cerebral | INTOCADO · settea neurotransmisores base |
| **Cronotipo Quiz** | Ritmo biológico | INTOCADO · settea León/Oso/Lobo (+ estado delfín transitorio) |
| **Fitzpatrick 6Q** | Tipo de piel para exposición solar | INTOCADO · task #7 completada |
| **Cuestionario Maestro (NUEVO)** | Fenotipo epigenético completo del cuerpo/hábitos/exposiciones | ESTE DOC |

El Maestro NO reemplaza a Braverman/Cronotipo/Fitzpatrick — **los orquesta y agrega las dimensiones que faltan**.

Doctrinas raíz:
- `project_positioning_app_intervencion_epigenetica`
- `project_doctrina_registro_epigenetico_3_funciones`
- `feedback_customer_journey_antes_de_redisenar`
- `feedback_guiado_no_prisionero`
- `feedback_simple_vence_inteligente`

---

## 0 · Motor de ramificación dinámica (arquitectura raíz)

**Enrique 2026-07-14:** *"Podemos hacer esto de ramificar el cuestionario cuando se requiera. Que las mismas preguntas se obvien, brincándolas o que se profundice."*

### La regla en 1 frase

> El cuestionario NO es lineal · es un árbol de decisiones que salta preguntas irrelevantes y profundiza donde la respuesta lo amerita.

### Los 3 modos de ramificación

**1. SKIP (obviar):**
El sistema saca preguntas del flujo cuando el contexto las hace irrelevantes.
- Hombre → skip toda la Dimensión 12 femenina (ciclo, embarazos)
- No fuma / no ex-fumador → skip subpreguntas sobre intensidad y cesación
- No toma medicamentos → skip listas de dosis + tiempo
- No usa péptidos → skip subpreguntas sobre stack específico

**2. DEEP-DIVE (profundizar):**
Cuando la respuesta abre un rabbit hole clínicamente relevante, el sistema pregunta 2-5 preguntas de seguimiento.
- "Encías sangran casi siempre" → subpreguntas: ¿va al dentista? ¿toma anticoagulantes? ¿diagnóstico periodontitis?
- "Insomnio de mantenimiento" → subpreguntas: ¿a qué hora despiertas? ¿piensas o solo despiertas? ¿logras volver a dormir?
- "Uso Ozempic 6 meses" → subpreguntas: ¿dosis? ¿pérdida peso? ¿pérdida músculo? ¿efectos GI?
- "Autoinmune diagnosticada" → subpreguntas: ¿cuál? ¿años con dx? ¿medicación actual? ¿brotes últimos 3 meses?

**3. ADAPT (adaptar tono/formato):**
El sistema ajusta CÓMO pregunta según lo que ya sabe.
- Si ya declaró trauma emocional en D9.6 → tono más suave en D11 (contexto de vida)
- Si ya declaró ansiedad alta en D1.6 → skip pregunta redundante en D11 sobre estrés general
- Si edad ≥60 → sube prioridad preguntas sobre sarcopenia, cognición, sueño profundo
- Si edad ≤25 → baja prioridad preguntas sobre menopausia/andropausia

### Regla operativa para la implementación

Cada pregunta declara en su spec:

```yaml
question: D1.2
skip_when:
  - always_ask  # o condiciones específicas
deep_dive_when:
  - answer == 'insomnio_mantenimiento'
  - answer == 'insomnio_conciliacion'
follow_up_questions:
  D1.2.a: "¿A qué hora despiertas típicamente?"
  D1.2.b: "¿Piensas o solo despiertas?"
  D1.2.c: "¿Logras volver a dormir?"
```

### Ejemplos por dimensión (patrones canónicos)

**D5 Consumo · alcohol:**
- Si D5.3 = 0 → skip D5.3.a (tipo), D5.3.b (hora última), D5.3.c (borracheras/mes)
- Si D5.3 ≥7/semana → deep-dive: ¿tipo predominante? ¿hora típica? ¿te sientes mejor o peor al día siguiente? ¿alguna vez has considerado reducir?

**D6 Medicamentos:**
- Si "no medicamentos" → skip todo el bloque de dosis + interacciones
- Si "sí toma" → autocomplete con lista frecuente + campo libre + para cada uno: dosis + tiempo tomando + efectos secundarios notados

**D8 Intervenciones estéticas/metabólicas:**
- Si "nunca péptidos ni Ozempic ni TRT" → skip todo D8.2, D8.3, D8.4
- Si "sí Ozempic" → deep-dive: dosis · duración · %peso perdido · dieta actual · masa muscular actual · efectos GI · plan de salida

**D9.4 Embarazos (solo mujer):**
- Si hombre → skip completo
- Si mujer sin embarazos → skip complicaciones
- Si mujer con embarazos → deep-dive: cuántos · partos vaginales/cesáreas · complicaciones · lactancia (duración) · recuperación posparto

**D12 Sexualidad:**
- Si "prefiero no responder" en D12.1 → skip todo el bloque, respeta autonomía
- Si "libido bajó significativamente en 6 meses" → deep-dive: ¿desde cuándo específicamente? ¿coincide con algún evento? ¿toma medicamentos nuevos? ¿nivel de estrés cambió?

### Beneficios de la ramificación dinámica

- **Elimina fatiga** — el user no lee preguntas que obviamente no aplican
- **Densifica donde importa** — donde hay señal clínica, ATP profundiza
- **Personalización desde el input** — el cuestionario mismo se comporta distinto para cada user
- **Data richer** — capturamos matices que un cuestionario plano perdería

### Notas para implementación (Fable pass 2)

- Este doc tiene los patrones canónicos + ejemplos por dimensión
- Cowork + Mariana en pass 2 escribirán skip/deep-dive rules para CADA pregunta relevante
- El motor de ramificación es una función pura: `nextQuestion(answers, currentQuestion): Question | null`
- El progreso "sección X de Y" se calcula dinámicamente porque el total varía por user

---

## 1 · Filosofía UX (no negociable)

### El cuestionario NO puede sentirse eterno

- **Chunks de 5-8 preguntas por sección** (13 secciones × 5-8 preg = 65-104 preguntas máximo total)
- **Barra de progreso siempre visible:** "Sección 3 de 13 · Pregunta 4 de 7"
- **Botón atrás** en cada pregunta
- **"Guardar y continuar después"** disponible siempre (persiste en Supabase)
- **"Saltar esta sección"** disponible (con flag "incompleta" en motor)
- **Preview progresivo del resultado** al terminar cada sección: *"Ya identificamos: tu cronotipo es Oso · sistema digestivo Nivel 2 · siguiente sección hidratación →"*
- **Retomable por sección** desde Salud Funcional post-onboarding (para actualizar cuando cambien datos)
- **Ramificación inteligente:** mujer ve sección ciclo, hombre no la ve
- **Formatos variados:** sliders + opciones + toggles + escalas visuales + chips múltiples + números
- **Micro-copy que educa mientras trackea:** cada pregunta puede tener un "por qué te preguntamos esto" opcional
- **NO copy académico, sí cercano:** "¿Sueles despertarte a las 3am dando vueltas?" NO "¿Presenta insomnio de mantenimiento?"

### Duración objetivo

- **Onboarding completo:** 15-20 min (si el user hace todo de una)
- **Por sección:** 90-120 segundos
- **Puede completarse en múltiples sesiones** (guardar y continuar)

### Frecuencia de re-toma

- **Cada sección individualmente re-tomable** desde Salud Funcional
- **Recordatorio ATP:** cada 90 días o cuando el user reporte cambio de vida importante
- **Trigger automático re-toma parcial:** si un lab nuevo o síntoma nuevo hace que una sección sea incompleta

---

## 2 · Las 13 dimensiones

Cada dimensión mapea a `roots` del catálogo + `dx_levels` por sistema + flags de contraindicaciones.

### Dimensión 1 · Estado actual del cuerpo (7 preguntas)
### Dimensión 2 · Composición corporal (5 preguntas)
### Dimensión 3 · Piel + uñas + cabello (6 preguntas · soft flags dermatológicos)
### Dimensión 4 · Salud bucal (5 preguntas)
### Dimensión 5 · Hábitos de consumo (7 preguntas)
### Dimensión 6 · Medicamentos actuales (variable · ramificación)
### Dimensión 7 · Suplementos (variable · ramificación)
### Dimensión 8 · Intervenciones estéticas/metabólicas (5 preguntas)
### Dimensión 9 · Cirugías + antecedentes médicos + traumas (6 preguntas)
### Dimensión 10 · Exposiciones ambientales + cosméticos (7 preguntas)
### Dimensión 11 · Contexto de vida (6 preguntas)
### Dimensión 12 · Sexualidad + libido (4 preguntas · sensible)
### Dimensión 13 · Propósito + espiritualidad + significado (4 preguntas)
### Dimensión BONUS · Objetivos y motivación (5 preguntas · siempre al final)

**Total:** ~65-80 preguntas + ramificaciones.

---

## 3 · Preguntas detalladas por dimensión

Formato: `[código] Pregunta · [tipo respuesta] · [mapea a] · [micro-copy opcional "por qué"]`

Los `[mapea a]` alimentan directamente el motor de decisión (task #106).

---

### 🩺 D1 · Estado actual del cuerpo (7 preg)

**Micro-intro:** *"Cuéntanos cómo se siente tu cuerpo HOY. No hay respuestas malas — solo estás dibujando tu punto de partida."*

- **D1.1** ¿Cómo describirías tu energía la MAYORÍA de días?
  - Tipo: escala visual 1-5 (agotado → energizado)
  - Mapea: `dx_level.energia`, boost `cortisol_matutino_bajo` si ≤2
  - Por qué: *"La energía es la primera señal de si tus mitocondrias y tu tiroides están al 100."*

- **D1.2** ¿Cómo duermes en promedio?
  - Tipo: opciones (Duermo profundo y despierto listo / Duermo pero no descanso / Me despierto a media noche / No logro dormirme / Duermo poco pero funciono)
  - Mapea: `dx_level.sueno`, `dx_level.circadiano`, `roots.deficit_sueno_profundo`, `roots.adrenalina_nocturna`

- **D1.3** ¿Cómo va tu digestión?
  - Tipo: chips múltiples (Regular / Hinchazón frecuente / Estreñimiento / Diarrea / Reflujo / Gases / Dolor abdominal / Todo perfecto)
  - Mapea: `dx_level.digestion`, `roots.disbiosis`, `roots.reflujo_funcional`, `roots.permeabilidad_intestinal`

- **D1.4** ¿Sueles tener dolores físicos crónicos (más de 3 meses)?
  - Tipo: chips múltiples (Cabeza / Espalda baja / Cuello / Articulaciones / Muscular general / No tengo / Otro)
  - Mapea: `dx_level.inflamacion`, boost `roots.inflamacion_silenciosa`

- **D1.5** ¿Cómo describirías tu estado de ánimo predominante últimas 2-4 semanas?
  - Tipo: escala visual 1-5 (deprimido/apático → radiante/motivado)
  - Mapea: `dx_level.cognitivo`, `roots.deficit_neurotransmisores`, cross-check con Braverman

- **D1.6** ¿Tienes ansiedad o pensamientos que "no puedes apagar"?
  - Tipo: escala 1-5 (nunca → constantemente)
  - Mapea: `dx_level.estres`, `roots.estres_cronico`, `roots.adrenalina_nocturna`

- **D1.7** En un día promedio, ¿cuántas veces necesitas cafeína o algo estimulante para funcionar?
  - Tipo: número (0-8)
  - Mapea: `roots.cortisol_matutino_bajo`, `roots.hipotiroidismo_funcional` si >3

---

### 📏 D2 · Composición corporal (5 preg)

**Micro-intro:** *"Datos que ATP necesita para tu Edad ATP y para calibrar recomendaciones nutricionales y de fitness."*

- **D2.1** Peso actual
  - Tipo: número kg (con opción lb)
  - Mapea: fuente única `health_measurements.weight_kg` (doctrina placeholder única)

- **D2.2** Altura
  - Tipo: número cm (con opción ft/in)
  - Mapea: fuente única `client_profiles.height_cm`

- **D2.3** ¿Tienes acceso a báscula smart (Withings, Renpho, Xiaomi, etc.)?
  - Tipo: sí/no · si sí → subpregunta % grasa + masa muscular + agua
  - Mapea: `health_measurements.body_fat_pct`, `muscle_mass_kg`, `body_water_pct`

- **D2.4** Circunferencia de cintura (a la altura del ombligo)
  - Tipo: número cm (con instrucción visual)
  - Mapea: `health_measurements.waist_cm` → ratio cintura/altura calculado
  - Por qué: *"Es el mejor predictor de riesgo cardiometabólico. Más importante que el peso."*

- **D2.5** ¿Cómo se ha comportado tu peso últimos 6 meses?
  - Tipo: opciones (Estable / Subí 2-5kg / Subí +5kg / Bajé 2-5kg / Bajé +5kg / Fluctúa mucho)
  - Mapea: `roots.hiperinsulinemia`, `roots.hipotiroidismo_funcional`, `roots.cortisol_elevado_sostenido`

---

### ✨ D3 · Piel + uñas + cabello (6 preg · soft flags)

**Micro-intro:** *"Tu piel, uñas y cabello son ventanas al interior. Cambios sutiles nos dicen mucho de tu bioquímica."*

- **D3.1** ¿Cómo describirías tu piel?
  - Tipo: chips múltiples (Sana / Acné / Rosácea / Seca / Grasa mixta / Eczema / Psoriasis / Manchas / Envejecimiento acelerado)
  - Mapea: hormonal, digestion (piel = espejo intestino), inflamación

- **D3.2** ¿Te salen ronchas, urticaria o "granitos" con frecuencia?
  - Tipo: escala 1-5 (nunca → constantemente) + subpregunta ¿qué las dispara?
  - Mapea: `roots.permeabilidad_intestinal`, `roots.inflamacion_silenciosa`, mastocitos activados

- **D3.3** ¿Cómo están tus uñas?
  - Tipo: chips múltiples (Sanas / Se rompen fácil / Líneas horizontales / Manchas blancas / Amarillentas / Coloración morada punta dedos / Cutícula seca)
  - Mapea: soft flags biotina, zinc, hierro, circulación periférica, tiroides

- **D3.4** ¿Cómo está tu cabello?
  - Tipo: chips múltiples (Fuerte y brillante / Se cae más de lo normal / Sin brillo / Cambio de textura reciente / Encanece antes de tiempo / Adelgaza en coronilla / Adelgaza en sienes)
  - Mapea: tiroides, hormonal, estrés crónico, hierro/ferritina

- **D3.5** ¿Tienes moretones fáciles (te salen sin recordar el golpe)?
  - Tipo: sí/no + escala frecuencia si sí
  - Mapea: vitamina C, vitamina K, fragilidad capilar, tiroides

- **D3.6** ¿Cicatrizas rápido o lento?
  - Tipo: opciones (Rápido / Normal / Lento / Muy lento)
  - Mapea: zinc, vitamina C, glucosa alta, proteína baja, circulación

---

### 🦷 D4 · Salud bucal (5 preg)

**Micro-intro:** *"La boca es puerta al sistema digestivo, endocrino e inflamatorio. Data que casi nadie te pregunta pero es oro."*

- **D4.1** ¿Te sangran las encías al cepillarte?
  - Tipo: opciones (Nunca / A veces / Casi siempre / Sí y tengo diagnosticada periodontitis)
  - Mapea: inflamación sistémica, vitamina C, riesgo cardiovascular

- **D4.2** ¿Te salen aftas o "fuegos" bucales con frecuencia?
  - Tipo: escala frecuencia
  - Mapea: sistema inmune, vitamina B12, hierro, gluten sensitivity

- **D4.3** ¿Cómo es tu aliento matutino?
  - Tipo: opciones (Fresco / Normal / Mal aliento pese a cepillar / Mal aliento persistente)
  - Mapea: disbiosis, digestión ineficiente, hígado

- **D4.4** ¿Tienes empastes metálicos (amalgamas), coronas metal-porcelana o implantes metálicos en la boca?
  - Tipo: sí/no + cuántos aproximadamente si sí
  - Mapea: `roots.toxicidad_ambiental` (mercurio potencial), flag para detox

- **D4.5** ¿Cuándo fue tu última visita al dentista?
  - Tipo: opciones (<6 meses / 6-12 meses / 1-2 años / +2 años)
  - Mapea: adherencia preventiva

---

### 🍔 D5 · Hábitos de consumo (7 preg)

**Micro-intro:** *"Sin juicio. Solo dibujamos tu patrón real para poder personalizar."*

- **D5.1** ¿Cómo describirías tu alimentación mayoritaria?
  - Tipo: opciones (Real food · cocino casi todo / Mixta · algo procesado / Procesados frecuentes / Fast food frecuente / Restaurantes frecuente)
  - Mapea: `roots.sobrecarga_procesados`

- **D5.2** ¿Cuánta agua bebes en un día promedio?
  - Tipo: número litros
  - Mapea: hidratación baseline

- **D5.3** Alcohol · ¿cuántas bebidas por SEMANA en promedio?
  - Tipo: número + tipo (cerveza/vino/destilado)
  - Mapea: `roots.sobrecarga_hepatica`, flag ayuno metabólico, sueño

- **D5.4** Tabaco / nicotina · ¿fumas o vapeas?
  - Tipo: opciones (Nunca / Ex-fumador / Ocasional social / Diario)
  - Mapea: `roots.inflamacion_silenciosa`, cardiovascular, sistema respiratorio

- **D5.5** Cafeína · ¿cuántas tazas/dosis al día? ¿A qué hora la última?
  - Tipo: número + hora
  - Mapea: `roots.cortisol_elevado_sostenido` si tarde, `roots.deficit_sueno_profundo` si tarde

- **D5.6** ¿Consumes marihuana / CBD / otras drogas recreativas?
  - Tipo: opciones (Nunca / Ocasional / Frecuente / Diario) + tipo si aplica · pregunta discreta con opción "prefiero no responder"
  - Mapea: información contextual · no juicio · solo motor sabe

- **D5.7** ¿Cuántas comidas al día haces normalmente?
  - Tipo: número + hora de primera y última
  - Mapea: ventana de alimentación real, cross con `roots.hiperinsulinemia`

---

### 💊 D6 · Medicamentos actuales (variable · ramificación)

**Micro-intro:** *"Necesitamos saber qué tomas para evitar interacciones y contraindicaciones. Esta información SOLO la ve ATP, NUNCA se comparte."*

- **D6.1** ¿Tomas algún medicamento recetado actualmente?
  - Tipo: sí/no · si sí → lista con autocomplete de nombres comunes + campo libre + dosis + tiempo tomando
  - Mapea: `contraindications` cross-check con catálogo intervenciones, flag interacciones

- **D6.2** ¿Tomas medicamentos de venta libre (OTC) con regularidad?
  - Tipo: chips (Ibuprofeno / Paracetamol / Antihistamínicos / Antiácidos IBP / Laxantes / Melatonina OTC / Ninguno / Otros)
  - Mapea: crónico OTC = flag causa raíz (ej. IBP crónico → `roots.disbiosis`, malabsorción B12)

- **D6.3** ¿Alguna vez has tomado antibióticos por más de 30 días en el último año?
  - Tipo: sí/no + detalles
  - Mapea: `roots.disbiosis`, protocolo restaurativo microbioma

- **D6.4** ¿Tomas anticonceptivos hormonales? (si aplica)
  - Tipo: opciones (No / Píldora / DIU hormonal / Implante / Inyección / Otro)
  - Mapea: `roots.dominancia_estrogenica`, deplete B6/folato/zinc/magnesio

---

### 🧪 D7 · Suplementos actuales (variable · ramificación)

**Micro-intro:** *"Los suplementos son parte de tu bioquímica. Vamos a mapearlos para que no dupliques y para que veas qué te falta."*

- **D7.1** ¿Tomas suplementos actualmente?
  - Tipo: sí/no · si sí → lista + BHA scanner integrado + dosis + tiempo tomando
  - Mapea: `user_supplements` fuente única (doctrina), evita duplicación con recomendaciones

- **D7.2** ¿Alguno de estos suplementos "de moda" tomas o has tomado?
  - Tipo: chips (Creatina / Ashwagandha / NMN/NR / Colágeno / Omega-3 / Multivitamínico / Vitamina D / Magnesio / Probióticos / Ninguno)
  - Mapea: baseline suplementación, motor decide si mantener/ajustar

---

### 💉 D8 · Intervenciones estéticas/metabólicas (5 preg)

**Micro-intro:** *"Cada vez más gente usa péptidos, GLP-1, TRT y otras intervenciones. Necesitamos saber para calibrar tu protocolo."*

- **D8.1** ¿Usas o has usado péptidos (BPC-157, TB-500, semaglutide/Ozempic, tirzepatide, ipamorelin, etc.)?
  - Tipo: chips + detalles si sí
  - Mapea: flag contexto · afecta recomendaciones ayuno, ejercicio, nutrición

- **D8.2** ¿Estás en TRT (Testosterone Replacement Therapy) o HRT (Hormone Replacement Therapy)?
  - Tipo: sí/no + tipo + dosis + tiempo
  - Mapea: cross-check con `dx_level.hormonal`, biomarcadores esperados

- **D8.3** ¿Has hecho tratamientos para bajar de peso (Ozempic, cirugía bariátrica, medicamentos)?
  - Tipo: opciones + detalles
  - Mapea: flag masa muscular / sarcopenia post-GLP-1, ajusta prioridad `sarcopenia`

- **D8.4** ¿Tratamientos estéticos con impacto hormonal? (botox, fillers extensivos, cirugías estéticas invasivas)
  - Tipo: chips + año
  - Mapea: información contextual, potencial inflamación local

- **D8.5** ¿Usas cannabinoides medicinales (CBD/THC) recetados o auto-prescritos?
  - Tipo: sí/no + para qué
  - Mapea: información contextual sueño/ansiedad/dolor

---

### 🏥 D9 · Cirugías + antecedentes + traumas (6 preg)

**Micro-intro:** *"Tu historia médica es parte de tu epigenética. Un evento hace 20 años sigue modulando genes hoy."*

- **D9.1** ¿Cirugías previas?
  - Tipo: chips + año (Apéndice / Vesícula / Tiroides / Ginecológicas / Bariatría / Cardíacas / Ortopédicas / Otras / Ninguna)
  - Mapea: flag anatómico, cambios metabolismo (ej. sin vesícula = ajuste grasas)

- **D9.2** ¿Padecimientos crónicos diagnosticados?
  - Tipo: chips múltiples (Hipertensión / Diabetes 1 / Diabetes 2 / Hipotiroidismo / Hipertiroidismo / Autoinmune (SLE, Hashimoto, AR, Crohn, etc.) / Fibromialgia / Migraña / SOP / Endometriosis / Depresión / Ansiedad / TDAH / Ninguno / Otro)
  - Mapea: `contraindications` cross-check + prioriza protocolos específicos

- **D9.3** ¿Antecedentes familiares directos (padres/hermanos)?
  - Tipo: chips (Diabetes / Cardiovascular temprana / Alzheimer/Demencia / Cáncer específico / Autoinmune / Suicidio / Adicciones / Longevidad extrema)
  - Mapea: prioridad preventiva por riesgo genético

- **D9.4** Mujeres: ¿Embarazos, partos, abortos, complicaciones?
  - Tipo: números + complicaciones si aplica (solo mujer)
  - Mapea: hormonal historia, diastasis, cambios composición

- **D9.5** ¿Traumas físicos importantes en tu historia? (accidentes graves, TCE, fracturas mayores)
  - Tipo: descripción libre + año
  - Mapea: información contextual, potencial inflamación crónica residual

- **D9.6** ¿Traumas emocionales importantes activos o irresueltos que estén afectando tu vida hoy?
  - Tipo: opciones (No / Sí, en terapia / Sí, sin acompañamiento / Prefiero no responder) · sensibilidad
  - Mapea: `dx_level.estres`, prioridad Mente + trauma-informed care

---

### 🌍 D10 · Exposiciones ambientales + cosméticos (7 preg)

**Micro-intro:** *"Tu ambiente es tu epigenética invisible. Aire, agua, químicos, cosméticos: todo moldea tu expresión genética."*

- **D10.1** ¿En qué tipo de ambiente vives principalmente?
  - Tipo: opciones (Ciudad grande / Ciudad mediana / Pueblo / Rural)
  - Mapea: exposición contaminación aire, `roots.toxicidad_ambiental`

- **D10.2** ¿Fumas segunda mano? (alguien en casa fuma)
  - Tipo: sí/no + intensidad
  - Mapea: `roots.inflamacion_silenciosa`

- **D10.3** ¿Filtras el agua que bebes/cocinas?
  - Tipo: opciones (Sí filtro reverso osmosis / Filtro carbón / Solo hervida / Directa de tap / Botella)
  - Mapea: exposición cloro/fluoruro/pesticidas/metales

- **D10.4** ¿Cuántas horas al día pasas frente a pantallas con luz azul?
  - Tipo: escala (2-4h / 4-8h / 8-12h / +12h)
  - Mapea: `roots.sobreexposicion_luz_azul`

- **D10.5** ¿Cuántas horas al día pasas AL AIRE LIBRE (sin techo)?
  - Tipo: escala (<30min / 30-60min / 1-2h / +2h)
  - Mapea: `roots.deficit_exposicion_solar`

- **D10.6** ¿Qué productos aplicas en tu piel/cabello DIARIO? (mujeres + hombres con rutina)
  - Tipo: chips (Maquillaje / Cremas hidratantes / Perfume / Desodorante convencional / Champús comerciales / Filtro solar diario / Products "clean/orgánicos" / Poco/casi nada)
  - Mapea: exposición endocrine disruptors (ftalatos, parabenos, aluminio)

- **D10.7** ¿Cómo cocinas mayormente?
  - Tipo: chips (Sartén hierro / Acero inox / Cerámica / Antiadherente Teflón / Aluminio / Vidrio / Otro)
  - Mapea: exposición PFAS/aluminio · `roots.toxicidad_ambiental`

---

### 💼 D11 · Contexto de vida (6 preg)

**Micro-intro:** *"El estrés no es solo psicológico — es epigenético. Y el contexto donde vives moldea tu bioquímica diaria."*

- **D11.1** ¿Cómo describirías tu nivel de estrés general del último mes?
  - Tipo: escala 1-10
  - Mapea: `roots.estres_cronico`, `roots.cortisol_elevado_sostenido`

- **D11.2** ¿Trabajas en turnos rotativos o nocturnos?
  - Tipo: sí/no
  - Mapea: `roots.ritmo_circadiano_desregulado` alto, ajusta cronotipo esperado

- **D11.3** ¿Cuántas horas trabajas típicamente por semana?
  - Tipo: número
  - Mapea: contexto burnout, cortisol crónico

- **D11.4** ¿Cómo describirías tus relaciones cercanas (pareja/familia/amigos)?
  - Tipo: escala 1-5 (aisladas y conflictivas → nutritivas y estables)
  - Mapea: `dx_level.estres`, predictor longevidad Blue Zones

- **D11.5** Viajes con jetlag frecuentes (más de 3 husos horarios)
  - Tipo: escala frecuencia (nunca / mensual / trimestral / anual / raramente)
  - Mapea: `roots.ritmo_circadiano_desregulado`

- **D11.6** ¿Cómo describirías tu ambiente familiar de infancia? (breve, opcional)
  - Tipo: escala 1-5 (traumático → nutritivo) · con "prefiero no responder"
  - Mapea: información contextual ACE (Adverse Childhood Experiences), predictor inflamación adulta

---

### 💜 D12 · Sexualidad + libido (4 preg · sensible)

**Micro-intro:** *"La libido y la función sexual son biomarcadores hormonales potentes. Puedes saltar esta sección si prefieres — pero es data valiosa."*

- **D12.1** ¿Cómo describirías tu libido / deseo sexual actualmente?
  - Tipo: escala 1-5 (ausente → alto)
  - Mapea: hormonal (testosterona, estrógeno, cortisol, prolactina)

- **D12.2** ¿Notas cambios significativos en tu libido en los últimos 6 meses?
  - Tipo: opciones (Sí subió / Sí bajó / Estable / Fluctúa mucho)
  - Mapea: hormonal shift reciente

- **D12.3** Hombres: ¿Función eréctil?
  - Tipo: escala 1-5 (sin problemas → dificultad frecuente) · con "prefiero no responder"
  - Mapea: cardiovascular, testosterona, glucosa

- **D12.4** Mujeres: ¿Función sexual y placer?
  - Tipo: escala 1-5 (sin problemas → dificultades / sequedad / dolor) · con "prefiero no responder"
  - Mapea: hormonal, estrógeno, cortisol, estado psicológico

---

### 🌟 D13 · Propósito + espiritualidad + significado (4 preg)

**Micro-intro:** *"Blue Zones (poblaciones más longevas del mundo) tienen algo en común: sentido de propósito claro. No es esotérico, es epigenética."*

- **D13.1** ¿Sientes que tu vida tiene un propósito o significado claro?
  - Tipo: escala 1-5
  - Mapea: `dx_level.cognitivo`, predictor bienestar

- **D13.2** ¿Practicas algo espiritual/contemplativo con regularidad? (meditación, oración, contemplación, ritual)
  - Tipo: chips (Meditación / Oración / Yoga / Contemplación natural / Ritual grupo / Nada regular / Otro)
  - Mapea: baseline práctica interna, motor recomienda adherencia

- **D13.3** ¿Cuánto tiempo pasas en naturaleza a la SEMANA?
  - Tipo: horas
  - Mapea: `roots.estres_cronico`, cortisol modulation, biofilia

- **D13.4** ¿Cuentas con red comunitaria significativa? (amigos cercanos, grupo, tribu)
  - Tipo: escala 1-5 (aislado → tribu fuerte)
  - Mapea: predictor longevidad, motivación para módulo Comunidad ATP

---

### 🎯 BONUS · Objetivos y motivación (5 preg · siempre al final)

**Micro-intro:** *"Última sección. Con esto ATP calibra prioridades y sabe qué te haría feliz mover primero."*

- **B.1** Elige hasta 3 objetivos principales:
  - Tipo: chips múltiples (Más energía / Dormir mejor / Bajar de grasa / Ganar músculo / Mejor concentración/foco / Mejor salud mental / Longevidad/vivir más años saludables / Mejor libido / Reducir dolor / Resolver un padecimiento específico / Vitalidad general)
  - Mapea: prioriza intervenciones alineadas

- **B.2** ¿Cuál es TU dolor mayor hoy? (la cosa que más te frustra de tu salud)
  - Tipo: campo libre + chips comunes
  - Mapea: motor da máxima prioridad a este dolor

- **B.3** ¿Qué estás dispuesto a cambiar / sacrificar por lograr tus objetivos?
  - Tipo: chips múltiples (Cambiar alimentación / Reducir alcohol / Dejar tabaco / Hacer ejercicio consistente / Dormir más temprano / Salir al sol / Meditar / Reducir estrés laboral / Suplementar disciplinado / Todo lo que sea necesario)
  - Mapea: motor NO recomienda intervenciones que el user no está dispuesto a hacer

- **B.4** ¿En qué plazo esperas ver cambios?
  - Tipo: opciones (En 2 semanas / En 1 mes / En 3 meses / En 6 meses / Es viaje largo · sin prisa)
  - Mapea: calibra expectativa (Humby: la cosa toma mínimo 90 días para cambios reales)

- **B.5** ¿Qué te trajo a ATP? (opcional)
  - Tipo: campo libre
  - Mapea: contexto marketing + ARGOS narrative

---

## 4 · Scoring y mapeo al motor

Cada respuesta suma/resta puntos a:

### Niveles DX por sistema (5 niveles: 1=roto → 5=optimizado)
- **Circadiano** (respuestas D1.2, D5.5, D10.4, D10.5, D11.2, D11.5)
- **Metabólico** (D1.7, D2.5, D5.1, D5.7)
- **Digestivo** (D1.3, D3.2, D4.1, D6.2, D6.3)
- **Inflamatorio** (D1.4, D3.1, D3.2, D4.1, D5.4, D10.1, D10.2)
- **Estrés/Neuroendocrino** (D1.6, D9.6, D11.1, D11.3, D11.4, D11.6, D13.3, D13.4)
- **Sueño** (D1.2, D5.5, D10.4)
- **Hormonal** (D2.5, D3.4, D6.4, D8.2, D12.1, D12.2)
- **Cognitivo/Foco** (D1.5, D1.6, D13.1)
- **Cardiovascular** (D2.4, D5.4, D9.2, D9.3, D12.3)
- **Composición corporal** (D2.1, D2.2, D2.3, D2.4, D2.5)

### Roots activados (26 roots del catálogo)
Cada dimensión mapea a roots específicos como se anotó en cada pregunta arriba. El motor cuenta cuántas respuestas activan cada root → prioriza intervenciones que ataquen los roots más activados.

### Contraindicaciones activadas
Flags binarios que excluyen intervenciones absolutamente:
- `embarazo` (D9.4 mujeres activo)
- `lactancia` (D9.4)
- `diabetes_1` (D9.2)
- `trastorno_alimentario_activo` (D9.2 si se pregunta específicamente)
- `medicamentos_fotosensibilizantes` (D6.1 con match a lista)
- `condiciones_autoinmunes_activas` (D9.2)
- `menores_edad` (age gate previo)

### Contexto para ARGOS
- Objetivos (B.1, B.2, B.3, B.4) → ARGOS ajusta tono y narrativa
- Contexto de vida (D11) → ARGOS ajusta expectativas realistas
- Trauma (D9.6) → ARGOS activa modo trauma-informed

---

## 5 · Output final del cuestionario

Al terminar, el user ve un resumen tipo:

```
🧬 TU FENOTIPO EPIGENÉTICO · ATP

Sistemas prioritarios a trabajar:
  🔴 Circadiano · Nivel 2/5 (roto)
  🟡 Estrés · Nivel 3/5 (comprometido)
  🟢 Metabólico · Nivel 4/5 (sólido)

Causas raíz identificadas:
  • Ritmo circadiano desregulado (5 señales)
  • Cortisol elevado sostenido (4 señales)
  • Sobreexposición luz azul (3 señales)

Tu contexto:
  • Cronotipo: Oso (del quiz cronotipo)
  • Neurotransmisores dominantes: Acetilcolina baja + Dopamina baja (Braverman)
  • Objetivo principal: dormir mejor y más energía

ATP te prescribe estas 5 intervenciones basadas en TU perfil →
  [botón: Ver Mi Protocolo →]
```

Y directo lo lleva a Mi Protocolo con las 5 prescritas + "por qué a ti" personalizado.

---

## 6 · Modelo de datos

Nueva tabla Supabase:

```sql
CREATE TABLE user_master_quiz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section VARCHAR(50) NOT NULL, -- 'd1_estado_cuerpo', 'd2_composicion', etc.
  question_code VARCHAR(20) NOT NULL, -- 'D1.1', 'D1.2', etc.
  answer JSONB NOT NULL, -- respuesta estructurada según tipo (número, chips, texto)
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  skipped BOOLEAN DEFAULT false,
  UNIQUE(user_id, question_code)
);

CREATE INDEX idx_user_master_quiz_user_section ON user_master_quiz(user_id, section);

-- RLS
ALTER TABLE user_master_quiz ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_master_quiz_own_data ON user_master_quiz
  FOR ALL USING (auth.uid() = user_id);
```

Y una vista consolidada:

```sql
CREATE VIEW user_phenotype AS
SELECT
  user_id,
  jsonb_object_agg(question_code, answer) as answers,
  count(*) as questions_answered,
  count(*) FILTER (WHERE section IN (...)) as sections_completed,
  max(answered_at) as last_answered
FROM user_master_quiz
GROUP BY user_id;
```

El motor de personalización lee `user_phenotype` + `user_dx_levels` + `user_braverman_result` + `user_chronotype` + `user_labs` para prescribir.

---

## 7 · Implementación técnica (para Fable después)

**Componentes React Native nuevos:**
- `<MasterQuizShell>` — wrapper con progreso + guardar/salir + navegación
- `<MasterQuizSection>` — una sección (5-8 preguntas)
- `<MasterQuizQuestion>` — una pregunta con su tipo de input
- `<QuestionInputs>` — biblioteca de inputs (slider, chips, número, escala visual, opciones)
- `<SectionPreview>` — el preview progresivo al terminar sección
- `<QuizFinalSummary>` — el resumen final con fenotipo

**Persistencia:**
- Auto-save en cada respuesta (no bloqueante, background)
- Resume automático al abrir · retoma donde quedó
- Sección re-tomable desde Salud Funcional → "Actualizar mi cuestionario"

**Ramificación:**
- Género → mostrar/esconder secciones femeninas
- Age gate previo → adaptar preguntas
- Padecimientos declarados → subpreguntas específicas
- Suplementos declarados → integración con BHA scanner

---

## 8 · Estado y siguientes pasos

**Completado (Fase 0):**
- ✅ Schema extendido en `interventions-catalog.ts` (task #109)
- ✅ Doc mapeo epigenético con 7 P1 canónicos (task #108)
- ✅ Este doc — Cuestionario Maestro diseño completo (task #107)

**Pendiente:**
- ⏳ Deploy subagentes research mapeo 86 intervenciones (task #110)
- ⏳ Sesión validación clínica Mariana · 2 sesiones (task #9)
- ⏳ Motor personalización determinístico (task #106)
- ⏳ Implementación UI cuestionario · para Fable después

**Reglas invariantes:**
- Cero fuga clínica
- Cero deuda técnica
- Consentimiento informado explícito (D6, D7, D8 son sensibles)
- "Prefiero no responder" siempre disponible en preguntas sensibles
- Mariana firma antes de producción
