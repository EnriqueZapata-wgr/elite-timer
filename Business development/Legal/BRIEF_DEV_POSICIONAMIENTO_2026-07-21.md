# 🔧 BRIEF DEV · Bajar el posicionamiento a la app + cierre de pulido

**Fecha:** 2026-07-21
**De:** Cowork Legal/Comercial → Cowork Developer
**Fuente de verdad:** `POSICIONAMIENTO_MASTER.md` (en ATP/Business development). Léelo — de ahí sale todo.
**Esto complementa** al `HANDOFF_DEV_CIERRE_COMPLIANCE` y al `SIGNOFF_ATESTACION_PROTOCOLOS`. No los sustituye.

---

## Lo nuevo que hay que hacer: meter el posicionamiento "optimizar sanos" en la app

El posicionamiento no es solo marketing — es escudo legal, y solo funciona si está **consistente en todas las superficies de la app**. Mete la **versión precisa** (del master §2) en:

1. **Onboarding — pantalla explícita nueva** (temprana, antes de capturar datos sensibles):
   > "ATP no es medicina para enfermos. Es una herramienta para entender y optimizar tu cuerpo, y llegar mejor preparado a tu médico. No diagnostica ni trata enfermedades. Si tienes una condición de salud, ATP trabaja junto a tu médico, no en su lugar."

2. **Disclaimer global** (componente `MedicalDisclaimer`): actualizar el texto para incluir la línea "ATP no es medicina para enfermos; es optimización y educación".

3. **Footer de pantallas de resultados** (Mapa Funcional, Edad ATP, labs): disclaimer corto "Estimación educativa, no diagnóstico. ATP optimiza, no trata."

4. **Descripción de App Store / Google Play**: reescribir con la versión precisa. Categoría "Salud y bienestar" / "Estilo de vida". Sin palabras rojas del master §4.

5. **System prompt de ARGOS** (coordinar con Cowork Cerebro): ARGOS se presenta como coach de optimización y educación, NUNCA como médico. Aplica las palabras verdes/rojas del master §4. Ante síntomas de enfermedad → deriva al médico ("esto amerita que lo veas con tu médico").

---

## Recordatorio del pulido pendiente (ya definido, para que no se pierda)

**Sprint 2 · Consentimiento** — `AVISO_DE_PRIVACIDAD_v1` Parte 3. Construir ya, publicar con razón social de la SAS.

**Sprint 3 · Protocolos — MANTENER CON ATESTACIÓN** (ver `SIGNOFF_ATESTACION_PROTOCOLOS`, no el "split por letalidad" viejo):
- Ayuno: contador completo a 120h + atestación al fijar objetivo >48h + alertas 36h/72h + auto-cierre 120h.
- Wim Hof / frío / sauna / apneas: ejecutables con atestación contextual que corre CADA VEZ (textos exactos en el sign-off §2). Hard-block automático por condición declarada (capa 1).
- Embarazo/lactancia: hard-block (no atestación) en los de riesgo real.
- Las 6 capas obligatorias + PULL nunca PUSH (el sistema/ARGOS nunca empujan estos protocolos).
- Cláusula 11-bis de asunción de riesgo ya está en los T&C.

**Sprint 4 · Renames** — Diagnóstico→Mi Mapa Funcional, BHA→ATP Functional Score, sweep de palabras rojas. Coordinar vocabulario con Cowork Cerebro.

**Crisis** — banner Línea de la Vida **800-911-2000** en toda superficie de crisis + guardarraíl determinístico en ARGOS.

**Claims** — atribuidos a estudios con link a biblioteca + disclaimer educativo.

---

## De Mariana (contenido, NO firma)
Condiciones a atestar/bloquear por protocolo · lista categoría-verde-embarazo · umbrales de fiebre · qué campo del cuestionario dispara cada hard-block.

## Reporta
El diff de cada sprint para QA de compliance. Y avísame cuando el posicionamiento esté en onboarding + disclaimer + stores para verificar consistencia con el master.
