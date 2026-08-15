# 📋 INVENTARIO COMPLIANCE ATP — Scan completo de los 12 criterios
### De: Cowork Developer · Para: Cowork Comercial/Legal + Enrique · Fecha: 2026-07-21
### Fuente: `BRIEF_DEV_COMPLIANCE_SCAN_2026-07-21.md` (Parte D) · Ventana: primer cobro Founders AGOSTO 2026

**Método:** scan sistemático de toda la app (grep + revisión de componentes + catálogos de intervención + system prompts de ARGOS + edge functions + app.json) contra los 12 criterios, ejecutado por 4 barridos paralelos. Solo lectura — CERO cambios al código. Este inventario es para que Enrique decida punto por punto ANTES de la cirugía.

**El detalle completo de cada hallazgo (con texto/código actual, ubicación exacta, acción y esfuerzo) vive en 4 parciales en esta misma carpeta:**
- `_SCAN_PARCIAL_C1C2C3.md` — lenguaje médico, claims, personas (23 hallazgos)
- `_SCAN_PARCIAL_C4C5C12.md` — protocolos de riesgo, salud mental, ciclo/embarazo (17)
- `_SCAN_PARCIAL_C6C7.md` — interpretación de labs, score de productos (18)
- `_SCAN_PARCIAL_C8C9C10C11.md` — datos/consentimiento, transferencia, cobro, stores (24)

---

## 1 · RESUMEN POR CRITERIO (82 hallazgos totales)

| Criterio | Tema | Total | P0 | P1 | P2 |
|---|---|---|---|---|---|
| C1 | Lenguaje médico reservado | 13 | 2 | 6 | 5 |
| C2 | Claims de resultado | 3 | 0 | 2 | 1 |
| C3 | Personas como avales | 7 | 1 | 3 | 3 |
| C4 | Protocolos de alto riesgo | 7 | 4 | 2 | 1 |
| C5 | Salud mental / crisis | 6 | 3 | 2 | 1 |
| C6 | Interpretación datos clínicos | 10 | 2 | 4 | 4 |
| C7 | Evaluación productos terceros | 8 | 2 | 3 | 3 |
| C8 | Datos / consentimiento | 8 | 3 | 4 | 1 |
| C9 | Transferencia internacional | 5 | 1 | 3 | 1 |
| C10 | Suscripción / cobro | 6 | 0 | 4 | 2 |
| C11 | Metadata stores | 5 | 0 | 2 | 3 |
| C12 | Ciclo / embarazo | 4 | 1 | 2 | 1 |
| **TOTAL** | | **82** | **19** | **37** | **26** |

**19 P0 bloqueantes de cobro.** Ninguno imposible; la mayoría son S/M de esfuerzo. Los verdaderamente pesados son 3 (rename Diagnóstico, gate de protocolos en ruta pull, y todo el bloque de consentimiento/aviso de privacidad).

---

## 2 · TOP 10 MÁS GRAVES (los P0 de mayor riesgo)

1. **C3-001 · "Dra. Mariana Zapata, PhD" como avaladora médica** (`medical-disclaimers.ts:30`). Viola directo la PRIME DIRECTIVE: pone a Mariana como responsable médica del contenido. Además "Dra." indebido. **Fix S — quick win.**
2. **C8-004 · No existe Aviso de Privacidad in-app.** Solo links a páginas no publicadas. Bloquea todo el edificio del consentimiento. **Sin esto no se puede cobrar. Fix M (requiere el texto legal del cowork legal).**
3. **C8-001 · El signup no registra aceptación de Términos ni Privacidad.** La cuenta se crea sin consentimiento legal guardado (las columnas existen, nada las escribe). **Fix M.**
4. **C4-001 · Timer de ayuno ejecutable hasta 120h** (presets 36/72h, hitos que celebran "72h/96h"), sin warning, sin gate, sin screening, sin bloqueo por embarazo/edad. Choca con A3. **Fix M.**
5. **C4-002 (raíz) · La ruta PULL no tiene gate clínico.** Los datos de contraindicación solo filtran la ruta PUSH (motor). El usuario puede auto-activar cualquiera de los 13 protocolos `requiresClinicalValidation` (Wim Hof, apneas, sardinas, OMAD, cold plunge). **Fix raíz que destraba media docena. Fix M.**
6. **C4-003 · Wim Hof / hiperventilación / apneas sin checkbox no-skippable ni gate.** `hiperventilacion_matutina` con contraindicación "shallow water blackout letal" solo como texto pasivo. Riesgo de muerte real. **Fix M.**
7. **C5-002 · No existe el banner Línea de la Vida (800-911-2000) en ninguna parte** (grep 0). ARGOS es IA generativa libre; deriva a 911 pero sin guardarraíl determinístico para ideación suicida. **Fix S-M.**
8. **C1-001 · "Mi Diagnóstico Funcional"** en UI + PDF descargable (`Diagnostico-Funcional-ATP.pdf`) + tour + prompt. La palabra roja #1 en el artefacto de mayor exposición (el usuario lo manda a su médico). Rename → "Mi Mapa Funcional". **Fix L (toca muchos lugares).**
9. **C7-001 · Sello binario "BIOHACKER APPROVED / NO APROBADO"** sobre productos de terceros (`BhaScanSheet.tsx`, persistido en DB). Sello publicable aprobado/rechazado → debe ser ATP Functional Score numérico por atributos. **Fix M.**
10. **C9-002 · Sin consentimiento específico de transferencia internacional.** Datos sensibles (salud, labs, ciclo, voz) salen a EE.UU. (Anthropic, Gemini, ElevenLabs, Supabase, Sentry, PostHog) sin consentimiento explícito. **Fix M (parte del bloque de consentimiento).**

---

## 3 · DECISIONES QUE ENRIQUE DEBE TOMAR (no las puede tomar el dev solo)

1. **S.O.S. crisis de pánico:** el scan NO encontró un módulo standalone vivo con ese nombre. Las superficies de crisis hoy son: ARGOS chat, la intervención de "rescate", y el check-in que permite marcar "En pánico". **¿Qué era exactamente el S.O.S. del dictamen? ¿Se elimina el check-in "En pánico", se elimina la intervención de rescate, o solo se le pone el banner Línea de la Vida?**
2. **Ayunos >48h (sardinas, 72h, prolongados):** ¿se cortan del todo de V1, o se dejan como **contenido educativo solo-lectura** (sin timer, sin tracking)? El brief dice educativo-sí-ejecutable-no; confirmar y decidir qué pasa con los hitos "72h/96h" ya existentes.
3. **Los 13 protocolos `requiresClinicalValidation`:** ¿se gatean con warning+consentimiento (guiado), o se sacan de V1 pública y se mueven al HUB Fx? (Wim Hof, apneas, sardinas, OMAD, cold plunge, etc.)
4. **Claims del catálogo de intervenciones (C2-001):** decenas de campos `benefit`/`scientificInfo` con claims cuantitativos ("reduce mortalidad", "50-63% menor riesgo", "+30-40% colágeno en 12 semanas"). ¿Se suavizan a lenguaje educativo uno por uno (necesita input de Mariana como contenido), o se recortan?
5. **Edad mínima:** hoy es 13 (13-17 con consentimiento parental). El brief pide 18. **¿Subimos a 18 duro?** (impacta a cualquier menor que ya tenga cuenta).
6. **Compra de H+ (C10-002):** hoy está en stub/dev con precio MXN hardcoded. Vender moneda virtual por dinero real FUERA del IAP de la store = rechazo de Apple/Google. **¿H+ se compra solo vía IAP de la store?** (decisión de arquitectura de cobro).
7. **Renombrar "Diagnóstico" (C1-001):** confirmar "Mi Mapa Funcional" como nombre final y que el dev proceda con el rename global (UI + PDF + tour + prompt + analytics).

---

## 4 · QUICK WINS (esfuerzo S que resuelven P0/P1 — sweep de bajo riesgo)

- **C3-001:** quitar "Dra. Mariana Zapata, PhD" del disclaimer → reformular a autoría de contenido educativo. (1 línea)
- **C10-001:** copy de H+ "moneda transable / tu esfuerzo se vuelve moneda" → quitar "moneda/transable". (`how-to-earn.tsx`, copy)
- **C5-002:** agregar banner Línea de la Vida (800-911-2000) como componente reutilizable en toda superficie de crisis. (componente nuevo S)
- **C3-005 / food-additives-db.ts:** archivo muerto con marcas de terceros (FEMSA, Bimbo, Lala) + `toxicity: high` en comentario → borrar el archivo. (delete)
- **Sweep C1 de palabras rojas** en strings user-facing con la tabla de reemplazos B1 (diagnóstico→evaluación, protocolo→Práctica/Ruta, dosis→aporte sugerido, paciente→usuario) → diff para approve rápido. **Ojo: NO tocar `src/screens/coach/*` ni servicios `clinical-*` (son HUB Fx, ahí "paciente/clínico" es válido).**
- **C9-003:** agregar `beforeSend` con scrubbing de PII a la init de Sentry. (config S)
- **app.json:** permiso de ubicación "Always" → "When In Use". (1 línea)

---

## 5 · LO QUE NECESITA A MARIANA (input de contenido, NO firma)

Mariana aporta umbrales y listas como **contenido técnico**, nunca como avaladora legal (PRIME DIRECTIVE):

- **Umbrales de screening de fiebre (B5):** confirmar los cortes (>39°C, >48h, <3 meses, embarazo, síntomas rojos) que disparan "busca atención médica".
- **Gate de embarazo/lactancia (C2/C12):** lista de qué protocolos bloquear y qué suplementos son categoría-verde-embarazo.
- **Gate de Wim Hof/respiración (C3):** confirmar condiciones a gatear (epilepsia, hipertensión, cardiopatía, síncopes) y límites (rondas, retención).
- **Claims del catálogo (C2-001):** revisar los `benefit`/`scientificInfo` con claims cuantitativos y decir cuáles tienen respaldo citable y cuáles se suavizan.
- **Copy educativo de labs (B3):** validar que la lectura educativa no cruce a nombrar enfermedad.

---

## CONFIRMACIONES POSITIVAS (lo que YA cumple — no requiere acción)

- **Interpretación de labs** (`lab-rating.ts`) no nombra enfermedades ni prescribe → cumple B3 hoy.
- **Dosis de suplementos** = registro del usuario, no prescripción personalizada → cumple B4 hoy.
- **Score BHA/food evalúa atributos** (forma química, biodisponibilidad, aditivos), no marcas; y es privado al usuario, sin base pública → el problema es solo la SALIDA binaria + el naming, no la lógica.
- **Export de datos y borrado de cuenta** (DSAR + delete con re-auth + gracia 30 días) existen y están cableados a UI → cumple gran parte de C8.
- **"INAI"** no aparece en el código de la app (solo en docs internos).
- **Cancelación de suscripción** vía gestor de la store (aceptable para IAP).
- **Copy "de por vida"/Founders** NO está en el código de la app — vive en la web (fuera de este repo; auditar allá).

---

## RECOMENDACIÓN DE ORDEN DE EJECUCIÓN

**Sprint Compliance 1 — Quick wins + los P0 de 1 archivo** (1-2 días): sweep de palabras (con approve del diff), quitar "Dra. Mariana", banner Línea de la Vida, borrar food-additives-db muerto, copy H+, Sentry scrubbing, permiso ubicación. Resuelve ~8 P0/P1 baratos.

**Sprint Compliance 2 — Consentimiento y privacidad** (bloqueante de cobro): Aviso de Privacidad in-app + consentimiento granular en signup + registro de aceptación + consentimiento de transferencia internacional + gate 18+. **Necesita los textos legales del cowork legal.** Es el muro más importante para poder cobrar en agosto.

**Sprint Compliance 3 — Gates de protocolos** (tras decisiones de Enrique 1-3): gate clínico en ruta pull, warnings no-skippables (Wim Hof), screening de fiebre, extender gate embarazo a ayunos/frío/calor, cortar/educativizar ayunos >48h. **Necesita umbrales de Mariana.**

**Sprint Compliance 4 — Renames grandes** (tras decisión 7): Diagnóstico→Mapa Funcional (UI+PDF+prompt+analytics) y BHA→ATP Functional Score numérico. Coordinar el rename de BHA con el action-key del cobro server-side de H+.

**Nota de coordinación:** el rename de "Diagnóstico" y el system prompt de ARGOS tocan el cerebro central (ahora servido desde store) — coordinar con el Cowork Cerebro para que el vocabulario educativo baje también al cerebro, no solo a la app.
