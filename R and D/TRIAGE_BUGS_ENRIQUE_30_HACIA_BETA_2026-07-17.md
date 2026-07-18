# 🗂️ Triage · 30 bugs Enrique + auditorías → batches hacia beta (2026-07-17)

Meta: soft launch 1 ago con testers + afiliados. Clasificado en **🔴 beta-blocker** (rompe la experiencia o es riesgo) vs **🟡 post-soft-launch** (grande, mejora, no bloquea). Agrupado en batches congruentes (nada de mini-sprints).

---

## BATCH 1 · 🔴 Bugs funcionales — "que deje de sentirse roto" (CC primero, rápido)
Lo que hace que un tester piense "esto está roto". Van juntos, quirúrgico.

- **#4 [CLÍNICO/SEGURIDAD] Suples le dice a Enrique (hombre) "estás embarazada, revisa con tu médico".** El flag embarazo/lactancia (D9.4b, recién shipeado en D) NO está gateando por sexo, o default mal. Máxima prioridad — es riesgo clínico + rompe confianza.
- **#1 Cards HOY routing incorrecto** (#90): hidratación→Nutrición, journal/meditación/respiración→hub Mente en vez de su pantalla específica. Routing granular.
- **#3b Cards HOY fijadas a "configura hoy", no responden a Mi Protocolo.** El motor prescribe pero HOY sigue mostrando la config manual vieja. (Ligado a #30.)
- **#17 Journal completado no palomea el electrón en HOY.**
- **#20 Check-in emocional: "atrás" en cierto punto te SACA de la app.** (nav bug)
- **#21 Rachas de check-in mal contadas.**
- **#28 Agenda no manda notificaciones** (el recordatorio de journal sí, desde hace días → hay un path que funciona, copiar).
- **#29 Agenda: eventos repetidos** (uno manual + motor). Dedup.
- **#2/#8b N-Back no aparece** → NO es bug: está en V1.5 (lógica+mig 197+tests, sin UI). Decisión: ¿surface "próximamente" o se queda oculto? (rápido)

## BATCH 2 · 🔴 Routing "todo va a Reportes ATP" + YO inservible
El síntoma #5: demasiadas cards caen en la misma pantalla → se siente roto. Raíz: hubs que no discriminan destino (misma doctrina menú-vs-datos).

- **#5 Rank, disciplina, tendencias, reportes, otros → todos a Reportes ATP.** Rediseñar rutas o podar cards.
- **#8 YO = 4 cards al mismo lugar + cronotipo que no dice nada.** "YO es basura." Necesita rediseño: que YO de verdad te diga algo de ti (no un menú muerto).
- **#15 Sueño → Reportes.** Necesita su pantalla propia editorial (vacía hasta conectar dispositivo, pero se ve bien). Ligado a #16 ATP Sleep Track.
- **#26 Ícono Home no persistente** en toda la app → entorpece navegación. (rápido, transversal)

## BATCH 3 · 🔴 Sistema de diseño ATP (la palanca que mata "borrador" de un golpe)
**#23 es la RAÍZ:** predomina el verde lime brutalist (legacy ELITE). ATP ≠ ELITE. **ATP = degradados + imagen editorial + fondos, 3 colores: lime + teal principales, amarillo secundario.** Arreglar el design system de raíz arregla la sensación borrador en TODAS las pantallas a la vez.

- **#23 Design system: matar lime-brutalist → tokens ATP** (degradados, teal, editorial). Doctrina de diseño.
- **#7/#22/#25 Editorial faltante:** Mente, Fitness, Nutrición, Ayuno, ATP Sol, Check-in.
- **#10 Mis Datos** (¡tu ejemplo favorito!) → solo falta imagen editorial.
- **#11 Mis Evaluaciones:** cards de emojis → editorial (reciclar imágenes o crear).
- **#24 Versión LIGHT de la app** (post-blocker si aprieta el tiempo).

## BATCH 4 · 🔴 CORAZÓN: unificar Agenda ↔ HOY (#30)
Tu palabra: "es el corazón de ATP." Agenda = el orden; HOY = las acciones con recompensa + links. Deben ser UNO:
- Hecho → **tachado, sin notificación**. No hecho → **recordatorio**.
- Todo vinculado a **MI PERFIL** (no genérico).
- Absorbe #3b (HOY refleja Mi Protocolo), #28 (notifs agenda), #29 (dedup).
Este es sprint conceptual grande — probablemente el más importante para que ATP "se sienta ATP".

## BATCH 5 · 🟡 Pantallas clínicas legibles (importante, no bloquea si BATCH 3 las hace presentables)
- **#9 Mi Diagnóstico no se entiende** ("ni ganas dan de leerlo").
- **#13 Mi Expediente:** chingón en concepto, ilegible para user normal.
- **#12 [DOCTRINA] Cronotipo borró Delfín — MAL.** Delfín es REAL pero es estado TEMPORAL: se le avisa al user + se le dice su cronotipo madre para que se apegue y resuelva. No se esconde. (fix de doctrina)

## BATCH 6 · 🟡 Módulos en obra negra (cada uno su sprint dedicado — probablemente POST soft-launch)
- **#6/#14 FITNESS casi en ceros.** "Donde nació la app", no invita a entrenar, sin pies ni cabeza. Rebuild grande.
- **#19 Meditación en obra negra** → ElevenLabs + sonidos.
- **#18 Respiración:** sonidos, fondos, música, editorial.
- **#16 ATP Sleep Track** (sleep cycle integrado) — en fila de producción.

## BATCH 7 · 🟡 ARGOS level-up (#27)
Se siente chafón, lime-brutalist, sin personalidad, no navega fácil. Subirlo a "IA profesional con presencia". Ligado a BATCH 3 (design) + el rol Jarvis. Grande.

---

## Recomendación de secuencia
1. **CC arranca BATCH 1 YA** (funcionales + el bug clínico #4). Rápido, mata la sensación "roto".
2. **BATCH 3 (design system)** en paralelo/después — es la palanca de mayor impacto visual y desbloquea el "se siente ATP".
3. **BATCH 4 (agenda↔HOY)** — el corazón, sprint dedicado.
4. **BATCH 2 + 5** (routing YO/Reportes + clínicas legibles).
5. **BATCH 6 + 7 (Fitness, Mente audio, Sleep, ARGOS)** → evaluar cuáles entran al soft-launch vs post. Fitness es delicado por ser el origen — decisión de Enrique.

**Para el 1 de agosto NO todo tiene que estar perfecto:** los blockers reales son BATCH 1-4. Fitness full-rebuild, Sleep Track, ARGOS personality y light mode pueden ir en la primera actualización post-soft-launch sin matar el beta, si el tiempo aprieta.
