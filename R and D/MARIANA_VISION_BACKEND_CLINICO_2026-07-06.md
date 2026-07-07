# MARIANA — Visión Backend Clínico ATP

**Fecha:** 2026-07-06
**Fuente:** 8 audios WhatsApp (AUD-20260706-WA0010 a WA0018)
**Transcripción:** OpenAI Whisper `small` local
**Contexto:** Enrique le pidió a Mariana su aplicación soñada como Fx (Functional practitioner) para atender pacientes en ATP. Ella es cofundadora + Chief Science Officer + modelo del backend clínico.

---

## 🎯 24 REQUERIMIENTOS EXTRAÍDOS

### PRE-CONSULTA (antes de que llegue el paciente)

**1. Cuestionario pre-consulta inteligente y RAMIFICADO** — `NUEVO`
- Antes de la cita, el paciente responde un cuestionario que se ramifica dinámicamente
- Empieza con preguntas para todos, luego se adapta según la principal preocupación
- Al llegar al consultorio, Mariana YA tiene el pre-clínico enfocado
- Reduce tiempo de anamnesis básica y permite ir directo a lo relevante

**2. Dashboard pre-consulta con datos de app del paciente**
- Antes de que llegue: ver adherencia últimas 2 semanas, sueño, suplementos, récord de hábitos
- "¿Cómo va a llegar?" — Mariana tiene idea previa del estado
- Facilita preparación de la consulta

**3. Agenda con asistente conversacional (ARGOS)**
- Mariana pregunta: "¿qué consultas tengo hoy?"
- ARGOS responde: "Tienes N consultas. Primer paciente es X (3ra consulta con resumen), segundo es de primera vez (con síntomas principales), tercero es Y..."
- Conversacional, no lista fría

**4. Alertas relevantes + banderas rojas ARGOS**
- Cruce automático de labs + genética + hábitos + notas anteriores
- ARGOS destaca lo prioritario
- Ejemplo: "Recuerda que estaba teniendo taquicardias por la tarde con acidez post-comida — pregúntale"

---

### DURANTE LA CONSULTA (mientras Mariana atiende)

**5. Asistente de anamnesis en tiempo real (grabación + estructuración automática)**
- Graba la consulta completa
- **Diferencia crítica vs otras apps:** no solo transcribe — genera EL EXPEDIENTE estructurado directamente
- Mariana no tiene que llenar plantillas manualmente después
- La transcripción se clasifica automáticamente en la historia clínica

**6. IA sugiere preguntas de seguimiento EN VIVO** — `KILLER FEATURE`
- Mientras el paciente habla, la IA detecta puntos clave que requieren follow-up
- Ejemplo: paciente dice "tengo las manos moradas y a veces se me duermen los pies"
- IA en pantalla: sugerencia sutil "explorar circulación / Raynaud / neuropatía"
- Mariana NO interrumpe al paciente, mantiene rapport, pero la IA le recuerda los puntos a explorar
- Cita textual Mariana: *"a mí no tanto pero a la mayoría [se les va la onda]... no quiero omitir nada"*

**7. Captura de calibración cualitativa (lenguaje corporal + señales subjetivas)** — `NUEVO`
- Botón discreto o mecanismo para anotar SIN escribir:
  - Tragado de saliva incómodo
  - Lenguaje corporal defensivo
  - Incomodidad frente al espejo (viéndose en medidas)
  - Tono emocional
- Cita textual: *"cuando los mido y se están viendo frente al espejo veo que no se pueden estar viendo porque se sienten incómodos con su propia imagen"*
- Estas señales SON parte de la evaluación clínica funcional, no adornos

**8. NO INTERRUMPIR rapport visual**
- Bajar la mirada para apuntar = pérdida de rapport
- La IA + botón discreto de calibración deben permitir a Mariana mantener contacto visual
- Design principle: **"todo lo escribible → automático o post-consulta"**

**9. Detector de interacciones medicamentosas/suplementación** — `KILLER FEATURE #2`
- Alertas automáticas de interacciones:
  - Medicamento ↔ medicamento
  - Medicamento ↔ suplemento
  - Suplemento ↔ suplemento
- Contra lo que YA toma + contra lo que Mariana piensa prescribir
- Cita textual: *"eso es de lo que más tiempo me quita realmente"*
- Este solo feature ya justifica todo el fee del clínico

**10. Historial de paciente recurrente completo + visible**
- Labs con rangos funcionales (no rangos poblacionales)
- Resumen de genética
- Resumen de hábitos (adherencia registrada)
- Todo en la pantalla, no en 5 tabs distintos

**11. Cruce cross-datos + resumen ejecutivo IA**
- La IA hace resumen de "esto es lo prioritario hoy" cruzando labs + hábitos + genética + notas
- No genérico — específico al paciente

**12. Memoria entre consultas + recordatorios contextuales**
- Cita textual: *"que la IA pueda mencionar '¿qué pasó con lo que me dijiste de los problemas que estabas teniendo con tu hijo?'"*
- IA guarda contexto emocional/personal, no solo clínico
- Permite conexión humana en la siguiente consulta

**13. Detección de momentos óptimos para upsell no-invasivo** — `COMERCIAL`
- Mariana tiene otros productos (retiros, tests genéticos, etc)
- IA detecta el momento adecuado durante la consulta:
  - "Este es el momento para sugerir un genético"
  - "Este es el momento para sugerir un retiro"
- Sale de manera natural, no invasiva
- Cita textual: *"encuentro interesante como detectar momentos óptimos para sugerir otros servicios u otros productos"*

---

### DURANTE Y AL FINAL DE LA CONSULTA (generación de outputs)

**14. Plan auto-generado durante la consulta**
- Mientras Mariana atiende, la IA va construyendo:
  - Plan de suplementación (basado en lo que YA toma + nuevas sugerencias)
  - Plan de hábitos
  - Plan nutricional personalizado (no genéricos)
- Mariana revisa + ajusta en lugar de construir desde cero
- Cita textual: *"en lugar de construir todo desde cero"*

**15. Envío inmediato del plan al paciente**
- Al cerrar consulta: 1-click "enviar plan"
- Paciente lo recibe in-app antes de salir del consultorio

**16. Calificación de adherencia (auto-evaluación + objetiva)**
- Pregunta al paciente subsecuente: "¿qué calificación te pones?"
- Y CRUZA con datos objetivos de la app (adherencia registrada)
- Se detecta gap entre autopercepción y realidad → insight terapéutico

**17. Score cuantitativo de cumplimiento con intervención predictiva** — `NUEVO`
- Si el paciente se está desviando mucho:
  - Alerta antes de que "se pierda al paciente"
  - IA sugiere ajuste O "reencuadre" del plan
- Cita textual: *"intervenir antes de que se pierda al paciente"*
- Design: la IA no espera a que Mariana se dé cuenta — proactiva

**18. Post-consulta: 2 minutos de calibración cualitativa**
- Después de que el paciente se va, Mariana tiene 2 min para anotar:
  - Notas subjetivas (lenguaje corporal si no se registró en vivo)
  - Percepciones emocionales
  - Contexto que "normalmente no aparece en historia clínica"
- Estas quedan como notas privadas del clínico

---

### ORGANIZACIÓN DE PACIENTES (macro-nivel)

**19. Agrupación inteligente por padecimiento + perfil**
- No solo tag por enfermedad
- Detecta CLUSTERS: paciente con >3 síntomas overlapping (ej: depresión + estreñimiento + insomnio) → perfil similar
- Cita textual: *"cápsulas o bullets de cositos como que si junta más de tres depresión, estreñimiento y no sé insomnio y entonces ya se suma a un perfil similar"*

**20. Búsqueda cross-expedientes por padecimiento**
- Mariana puede buscar: "pacientes con hipotiroidismo + Hashimoto" → lista + patrones
- Aprender de casos previos similares
- Investigación clínica dentro del backend

**21. Sugerencia priorizada de labs por caso**
- No lista genérica de labs
- Prioriza según:
  - Padecimiento principal
  - Labs pendientes/vencidos
  - Contexto ciclo (memoria `project_labs_con_contexto_ciclo`)

---

### OTROS INSIGHTS TRANSVERSALES

**22. Frustración explícita con apps actuales:**
- *"Otras aplicaciones... guardas el expediente como en transcripción pero después tienes que ir llenando plantillas sobre la historia clínica"*
- ATP debe DIFERENCIARSE: no plantillas post-hoc, todo automático estructurado

**23. Estilo de trabajo Mariana:**
- Su valor está en detectar micro-señales (lenguaje corporal, calibración fina)
- Su tiempo se pierde en: interacciones medicamentosas, notas manuales, prep de labs
- ATP debe LIBERAR ese tiempo para que ella agregue más valor humano/clínico

**24. Audio 8 truncado:**
- No llegó a describir workflow completo agenda + facturación + comisiones
- Enrique puede pedirle continuación específica

---

## 🎨 PRINCIPIOS DE DISEÑO DERIVADOS

### P1. "Nothing to write" para el clínico
- Todo lo escribible → automático o post-consulta
- Mariana enfoca energía en escuchar + observar + conectar

### P2. IA como copiloto discreto, no protagonista
- Sugerencias en pantalla lateral, no popups
- Botones sutiles para calibración (1-tap, no formularios)
- Mariana lidera, IA asiste

### P3. Estructura sobre transcripción cruda
- No solo "transcribimos y guardamos"
- Cada frase clasificada en historia clínica estructurada
- Búsqueda + patrones + clusters emergen automáticamente

### P4. Cruce inteligente cross-datos
- Labs + hábitos + genética + notas → resumen ejecutivo IA
- No 5 tabs para navegar, un dashboard consolidado por paciente

### P5. Intervención predictiva
- IA no espera crisis, ve tendencia negativa y sugiere ajuste
- Salva pacientes de "perderse" antes de que Mariana lo note

### P6. Momento comercial no invasivo
- Upsell orgánico dentro de flujo clínico
- IA identifica ventana, sugiere copy — nunca fuerza

### P7. Memoria emocional-contextual
- IA recuerda lo humano (hijo enfermo, viaje, boda) — no solo clínico
- Base para relación paciente↔Fx sólida a largo plazo

---

## ✅ ALINEACIÓN CON VISIÓN ENRIQUE (task #104 HUB Fx)

Comparativa:

| Elemento | Enrique | Mariana | Consolidación |
|----------|---------|---------|---------------|
| ARGOS pregunta pacientes hoy | ✓ | ✓ (con más detalle: resumen conversacional) | Convergen |
| Grabación consulta | ✓ | ✓ | Convergen |
| Multi-output SOAP/etc | ✓ | ✓ (plan auto-generado durante consulta) | Convergen |
| Plan generado 1-click al final | ✓ | ✓ (borrador durante, envío al final) | Convergen |
| Historial paciente visible | ✓ | ✓ (con más énfasis en resumen cruzado) | Convergen |
| Consent chat ARGOS↔user privado | ✓ (Enrique lo marcó) | No mencionado | Enrique define |
| Cambios protocolo con approval paciente | ✓ | Implícito | Convergen |
| **Cuestionario pre-consulta ramificado** | NO mencionado | ✓ | **NUEVO Mariana** |
| **IA sugiere preguntas en vivo** | NO mencionado | ✓ | **NUEVO Mariana** |
| **Detector interacciones medicamentosas** | NO mencionado | ✓ (killer feature) | **NUEVO Mariana** |
| **Captura calibración cualitativa 1-tap** | NO mencionado | ✓ | **NUEVO Mariana** |
| **Upsell inteligente momento óptimo** | NO mencionado | ✓ | **NUEVO Mariana + comercial** |
| **Agrupación por clusters de padecimiento** | Filtros básicos mencionados | ✓ (más profundo) | Expandir #105 |
| **Score adherencia + intervención predictiva** | Implícito | ✓ | Expandir #104/#105 |
| **Memoria emocional/contextual entre consultas** | Implícito | ✓ | Expandir #92 |

---

## 🚀 NUEVAS TASKS DERIVADAS

Se crearán tareas específicas para:
1. Cuestionario pre-consulta inteligente ramificado (task nueva)
2. Detector de interacciones medicamentosas/suplementación (task nueva)
3. Sistema de sugerencias en vivo de preguntas de seguimiento (task nueva)
4. Captura calibración cualitativa 1-tap (task nueva)
5. Detección momento óptimo para upsell no-invasivo (task nueva)
6. Score adherencia + intervención predictiva (task nueva)
7. Actualización #104 HUB Fx con visión Mariana consolidada
8. Actualización #105 Panel clínico con clusters + memoria emocional
9. Actualización #92 ARGOS memoria persistente con contexto emocional

---

## 📞 PENDIENTE CON MARIANA (audio 8 truncado)

Pedirle específicamente:
- Workflow completo agenda (Calendly / Google Calendar integración desde su perspectiva)
- Vista de comisiones + wallet clínico
- Manejo de contratos + facturación
- Comunicación clínico↔paciente asincrónica (chat interno #107 desde su perspectiva)
- ¿Cómo maneja seguimiento entre consultas? ¿Es rol ARGOS o de Mariana?
- Community de clínicos ATP — ¿le interesa como mentora?

---

*Sintetizado por Cowork 2026-07-06 desde 8 audios Mariana. Enrique valida. Alimenta sprint clínico v1.5 tasks #53, #104, #105.*
