# 🔧 CIERRE COMPLIANCE · Handoff final al Cowork Developer

**Fecha:** 2026-07-21
**De:** Cowork Legal/Comercial → Cowork Developer
**Estado:** Sprint 1 ✅ ejecutado. Este documento cierra Sprints 2, 3 y 4 con TODAS las decisiones tomadas + umbrales clínicos en borrador.
**Objetivo:** que el dev pueda ejecutar todo lo restante sin esperar más inputs (salvo la razón social de la SAS, que llega mañana).

**Documentos de referencia (misma carpeta Legal):**
- `DICTAMEN_LEGAL_NIVEL_A_2026-07-21.md` — el "por qué" legal de cada punto
- `BRIEF_DEV_COMPLIANCE_SCAN_2026-07-21.md` — el brief original + nombres cerrados
- `AVISO_DE_PRIVACIDAD_v1_2026-07-21.md` — texto legal + spec de checkboxes (Parte 3)
- `TERMINOS_Y_CONDICIONES_v1_2026-07-21.md` — T&C para linkear

---

## ⚠️ REGLA DE PUBLICACIÓN (leer primero)

La SAS se constituye **mañana**. Hasta tener la razón social + domicilio:
- **Construye** todo el flujo de consentimiento, gates, renames — SÍ.
- **NO publiques** el Aviso de Privacidad ni los T&C. Déjalos en staging con el placeholder `[RAZÓN SOCIAL]`.
- En cuanto Enrique pase la razón social (mañana), se inyecta y se publica.
- **Ningún documento se publica con el nombre personal de Enrique.** El responsable siempre es la SAS.

---

## SPRINT COMPLIANCE 2 — Consentimiento + Privacidad (el muro para cobrar)

**Fuente del texto:** `AVISO_DE_PRIVACIDAD_v1_2026-07-21.md`

1. **Cablear los 7 checkboxes** de la Parte 3 en el signup. No pre-marcados. Log de auditoría con: `user_id`, `timestamp`, `ip`, `aviso_version`, `texto_hash`, `checkbox_id`.
   - CB-1 (Términos + Privacidad), CB-2 (datos sensibles), CB-3 (transferencia internacional), CB-4 (mayoría de edad) → **OBLIGATORIOS**, bloquean creación de cuenta / onboarding.
   - CB-5 (marketing), CB-6 (voz), CB-7 (ciclo/embarazo) → **OPCIONALES**, contextuales, no bloquean.
2. **Aviso Simplificado** (Parte 2) se muestra arriba de los checkboxes en el signup.
3. **Aviso Integral** (Parte 1) va publicado en `somosatp.com/privacidad` + linkeado in-app (esto es web — coordinar dónde vive).
4. **T&C** linkeados en CB-1 (publicados en `somosatp.com/terminos`).
5. **Verificar** que las edge functions `account-deletion-processor` y `data-export-generator` estén cableadas a los botones ARCO en Perfil → Privacidad (Descargar datos / Cancelar cuenta / Rectificar / Oponerme).
6. **Gate de edad 18+**: fecha de nacimiento obligatoria + CB-4. Si DOB < 18 → pantalla de bloqueo "no disponible para menores".

---

## SPRINT COMPLIANCE 3 — Gates de protocolos (decisión: SPLIT POR LETALIDAD)

**Decisión cerrada:** los protocolos de riesgo de muerte se sacan de la V1 pública (a HUB Fx o solo-lectura educativa); los moderados se quedan con gate duro + warning + consentimiento.

### 3.1 · Protocolos que SE VAN de V1 pública (riesgo de muerte)
Mover a HUB Fx (feature flag) o dejar **solo-lectura educativa** (sin timer, sin tracking, sin botón "iniciar"):
- **Wim Hof / hiperventilación / apneas** (riesgo shallow water blackout — letal)
- **Ayunos > 48h** (72h, prolongados, "ayuno de sardinas 1-5 días") — quitar timer, quitar hitos "72h/96h"
- Cualquier otro de los 13 `requiresClinicalValidation` con contraindicación de muerte

### 3.2 · Protocolos que SE QUEDAN en V1 con gate duro + warning + consentimiento
- Cold plunge / inmersión en frío corta (>15°C)
- OMAD / ayunos ≤ 48h (self-selected, no push del sistema)
- Sauna / calor (con límite de tiempo)
- Estos requieren: gate técnico (bloquea por condición médica declarada) + warning no-skippable la primera vez + checkbox de consentimiento por protocolo.

### 3.3 · Gate de crisis / salud mental (decisión: GUARDARRAÍL, no cortar)
- **Mantener** el check-in emocional (incluido "En pánico") y la intervención de rescate.
- La intervención de rescate usa **guion pre-aprobado**, NO IA generativa libre en contexto de crisis.
- **Banner Línea de la Vida (800-911-2000)** como PRIMERA pantalla obligatoria en toda superficie que toque pánico/crisis/ideación. Componente reutilizable.
- ARGOS: guardarraíl determinístico ante ideación suicida (deriva a Línea de la Vida + 911 antes de cualquier otra respuesta).

### 3.4 · Claims del catálogo (decisión: MANTENER CON REFORMULACIÓN ATRIBUIDA)
- Los cuantitativos SE QUEDAN en el catálogo, pero reformulados como **ciencia atribuida al estudio**, no como promesa del producto.
  - ❌ "Reduce tu mortalidad 50-63%"
  - ✅ "Según [estudio + link a biblioteca], [intervención] se asoció con una reducción del 50-63% en [outcome] en [población]. Los resultados individuales varían."
- Cada claim **linkea a la biblioteca de estudios** (cablear el link).
- **Disclaimer educativo** al pie del catálogo: "La información proviene de literatura científica sobre las intervenciones, no constituye promesa de resultados individuales ni recomendación médica."
- **En marketing (landing/ads) NO van cuantitativos de producto** — eso es web, se maneja aparte, solo cualitativo.

---

## SPRINT COMPLIANCE 4 — Renames (decisiones cerradas)

### 4.1 · "Diagnóstico" → "Mi Mapa Funcional"
- Rename global: UI + PDF descargable (`Diagnostico-Funcional-ATP.pdf` → `Mapa-Funcional-ATP.pdf`) + tour + system prompt de ARGOS + eventos de analytics.
- Sweep de la palabra "diagnóstico" en TODO lo user-facing → "evaluación" / "mapa" / "lectura funcional" según contexto.
- **Coordinar con el Cowork Cerebro:** el vocabulario educativo debe bajar también al cerebro central de ARGOS (servido desde store), no solo a la app.

### 4.2 · "BHA" → "ATP Functional Score"
- Rename + convertir la salida binaria ("BIOHACKER APPROVED / NO APROBADO") a **score numérico por atributos**.
- Reglas duras: (a) NUNCA refiere a marcas — solo fórmulas/ingredientes/atributos; (b) lenguaje 100% objetivo, cero adjetivos ofensivos; (c) score privado al usuario, sin base pública de marcas.
- Coordinar el rename con el action-key del cobro server-side de H+ (si aplica).
- Borrar el archivo muerto `food-additives-db.ts` (tiene marcas de terceros + `toxicity: high`).

### 4.3 · Tabla de reemplazos (sweep de palabras rojas)
| Original | Final |
|---|---|
| Mi Diagnóstico Funcional | Mi Mapa Funcional |
| Diagnóstico (suelto) | Evaluación |
| Protocolo (1 sesión) | Práctica |
| Protocolo (multi-día) | Ruta |
| Prescripción / Recetar | Sugerencia |
| Tratamiento | Rutina |
| Dosis (suplemento) | Aporte sugerido |
| BHA | ATP Functional Score |
| Paciente (app pública) | Usuario |

**Ojo:** NO tocar `src/screens/coach/*` ni servicios `clinical-*` — son HUB Fx, ahí "paciente/clínico" es válido.

---

## UMBRALES CLÍNICOS (BORRADOR — construir contra estos; Mariana los CONFIRMA como contenido, NO como firma legal)

El dev puede construir los gates YA con estos umbrales conservadores estándar. Mariana confirma o ajusta después. Estos NO son firma de responsabilidad de Mariana — son parámetros de contenido.

### Fiebre — dispara card obligatoria "Busca atención médica ahora" (bloquea el contenido "acompañar"):
- Temperatura > 39°C
- Duración > 48 horas
- Embarazo declarado
- Síntomas rojos: rigidez de nuca, dificultad respiratoria, confusión / alteración mental, sarpullido que no blanquea, convulsión
- Si NINGUNO aplica → se ofrece el contenido "acompañar" como opt-in con disclaimer.

### Embarazo / lactancia — HARD GATE (bloquear, no bypasable):
- Ayunos > 12 horas
- Wim Hof / hiperventilación / apneas
- Inmersión en frío < 15°C
- Ayuno de sardinas
- Sauna > 20 min / calor extremo
- HIIT sin approve médico
- Dieta cetogénica estricta
- Suplementos fuera de la lista categoría-verde-embarazo (Mariana entrega la lista)
- Mensaje: "Este protocolo no está disponible durante embarazo o lactancia. Consulta con tu ginecólogo(a) para pautas seguras en esta etapa."

### Wim Hof / respiración intensa — GATE + WARNING no-skippable:
- **Gate (bloquear si el usuario declaró):** embarazo, epilepsia, hipertensión no controlada, cardiopatía, historia de síncopes/desmayos. (Menores ya bloqueados por edad 18+.)
- **Warning no-skippable primera vez:** "La respiración intensa puede causar mareo o pérdida de conciencia. NUNCA la practiques dentro o cerca del agua, ni al conducir, ni en solitario. Detén la sesión si sientes mareo intenso, dolor en el pecho o palpitaciones."
- **Límites técnicos:** máx 3 rondas guiadas por sesión; retención pasiva máx 90 seg con countdown.

---

## QUÉ NECESITA A MARIANA (input de contenido, NO firma legal)

Pídele a Mariana como CONTENIDO técnico (nunca como avaladora legal):
1. Confirmar/ajustar los umbrales de fiebre de arriba.
2. La **lista de suplementos categoría-verde-embarazo** (los permitidos).
3. Confirmar las condiciones a gatear en Wim Hof.
4. Revisar los claims del catálogo y decir cuáles tienen cita citable en la biblioteca.

---

## ORDEN SUGERIDO DE EJECUCIÓN

1. **Sprint 2 (consentimiento)** — construir ya, publicar cuando llegue razón social (mañana). Es el muro para cobrar.
2. **Sprint 4 (renames)** — sweep de palabras + Diagnóstico→Mapa + BHA→Score. Coordinar con Cowork Cerebro.
3. **Sprint 3 (gates)** — mover mortales a solo-lectura/HUB Fx + gates de los moderados + banner Línea de la Vida + screening fiebre + gate embarazo. Construir con los umbrales borrador; Mariana confirma en paralelo.

**Reporta a Enrique** cuando cada sprint esté listo, con el diff, para QA de compliance contra el dictamen.
