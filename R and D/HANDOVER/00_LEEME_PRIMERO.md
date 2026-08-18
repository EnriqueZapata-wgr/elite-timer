# Léeme primero

**Fecha de escritura:** 18 de agosto de 2026
**Escrito por:** el asistente saliente, para el asistente entrante
**Tiempo de lectura de este archivo:** 10 minutos. Los cinco archivos juntos: media hora.

---

## Para qué existe este documento

El dueño de ATP cambia de asistente de IA porque necesita herramientas de aplicación
móvil que en el entorno actual no puede usar. La migración tiene que ser suave, y suave
significa una sola cosa: que él no tenga que volver a explicar nada.

Han sido semanas de trabajo muy intenso. Lo que costaría perder no es el código, el
código está en git y se lee. Lo que costaría perder es **el criterio**: por qué las cosas
están como están, qué ya se intentó y falló, qué se creyó cierto y resultó falso, y qué
reglas están puestas a propósito aunque parezcan un estorbo.

Léelo entero antes de tocar nada. Si algo aquí te parece innecesario, casi siempre es
porque costó horas descubrirlo.

---

## Qué es ATP, en un párrafo

ATP es una aplicación de salud y rendimiento humano hecha en México, en español de
México. Se describe a sí misma como el sistema operativo de rendimiento humano: integra
fitness, nutrición, mente, salud funcional, ciclo menstrual y un asistente de inteligencia
artificial propio llamado ARGOS, todo bajo modelo de medicina funcional. El avatar es un
profesional de alto rendimiento de 35 a 55 años.

**Lanza a tiendas el 1 de septiembre de 2026.** Hoy faltan catorce días.

Stack: React Native con Expo SDK 54, TypeScript y Supabase. Observabilidad con Sentry y
PostHog, las dos validadas en ejecución real. ARGOS habla con Claude a través de dos
funciones de borde, `anthropic-proxy` (la vieja) y `argos-proxy` (la que manda hoy, con
respaldo a Gemini).

---

## Quién es quién

No uso nombres propios en estos documentos, uso el rol. Es una regla del proyecto que
aplica también al copy que ve el usuario, y la explico en el archivo de doctrina.

- **El dueño.** Ingeniero en automatización, coach de rendimiento humano, récord Guinness
  en dominadas. Es el **único desarrollador** del proyecto. Decide el alcance. Es quien
  corre las pruebas, quien aplica las migraciones al remoto y quien tiene el teléfono.
- **La responsable clínica.** Cofundadora y directora científica, nutrióloga con
  doctorado en ciencias biomédicas. **Firma el criterio de salud.** Ningún rango, ningún
  peso clínico y ninguna afirmación de salud sale sin su firma. Esto no es una formalidad,
  es el camino crítico del lanzamiento.
- **Tú.** El asistente. No decides alcance, propones. No firmas criterio clínico, lo
  pides. No corres pruebas en la máquina del dueño, se las dejas listas.

---

## El estado en cinco frases

1. El repositorio está en `main`, HEAD `f9bd843`, con 1,926 commits y unas 231 mil líneas
   entre `src/` y `app/`. Hay 203 archivos de ruta, de los cuales unas 145 son pantallas
   reales y unos 57 son redirects o alias. (El `CLAUDE.md` dice 89 pantallas y 68 mil
   líneas: está desactualizado, no le creas ese dato.)
2. El binario **2.2.0** (Android versionCode 23, iOS build 5) es el último. **No quedan
   builds nativos antes del lanzamiento.** Todo viaja por actualización de JavaScript.
3. **Nada de este ciclo ha corrido en un teléfono.** Ni una pantalla. La lista de qué
   mirar y en qué orden está escrita y esperando en `R and D/RECORRIDO_EN_TELEFONO.md`.
4. Hay 84 pendientes inventariados el 17 de agosto, de los cuales 16 se declararon
   bloqueantes. Un takeover del 18 de agosto tumbó cinco de esos dieciséis leyendo el
   código en vez de leer los reportes. **El inventario nació desactualizado.**
5. Hay **un hueco de privacidad abierto hoy en producción** que expone expedientes de
   salud sabiendo nada más un correo electrónico. La migración de cierre está escrita
   (`R and D/296_sec_invite_consentido.sql`) y **no aplicada**, porque aplicarla es
   decisión del dueño. Está detallado en el archivo 03. Si solo vas a hacer una cosa hoy,
   es esa.

---

## Las cinco prohibiciones, sin excepciones

Estas cinco no se discuten. Cada una costó horas o rompió el entorno de alguien.

1. **Nunca `npm install`, `npm ci` ni `npx eslint`.** Un agente destruyó el `node_modules`
   del dueño exactamente así. `eslint` dispara un postinstall y ese postinstall es el que
   muerde. Si crees que necesitas instalar algo, no lo necesitas: pídelo.
2. **Nunca reescribas un archivo completo.** Solo reemplazo quirúrgico de cadenas. Un
   archivo reescrito pierde el historial de por qué cada línea está ahí.
3. **Nunca escribas en el checkout principal.** Ese es del dueño. Un worktree por agente.
4. **Nunca publiques un OTA con `eas update` a secas.** Solo con `npm run sourcemaps:ota`.
   La razón está en el archivo 04 y es que si no, los stacktraces de Sentry mienten.
5. **Nunca inventes un rango, un peso clínico ni un número de salud.** Si no está en la
   matriz V7/V6, no existe. Un "no sé" es recuperable; un dato dicho con confianza que
   está mal, no.

---

## Cómo está repartido el resto

**`01_COMO_TRABAJA_ENRIQUE.md`.** Va primero a propósito, porque es lo que más fricción
ahorra. Cómo habla el dueño, cómo quiere el estado, cómo se decide el alcance, y el
principio de los cuatro ojos con los casos reales que lo justifican, que son errores del
asistente saliente. Si vas a leer un solo archivo además de este, lee ese.

**`02_DOCTRINA.md`.** Lo que no se negocia en el producto: un dato vive en un solo lugar,
el dato del usuario es sagrado, cómo se habla de salud sin nombrar enfermedades, el diseño,
y el pivote de negocio del 16 de agosto que invalida buena parte de la documentación vieja.

**`03_ESTADO_Y_TRAMPAS.md`.** Las trampas del entorno (git, worktrees, finales de línea,
OneDrive, pruebas que no corren en Linux) y el estado real y verificable hoy: banderas,
migraciones, qué está desplegado, qué se verificó y qué no.

**`04_PENDIENTES_Y_DESPLIEGUE.md`.** Los 84 pendientes resumidos, separados entre lo que
solo puede hacer el dueño y lo que puedes hacer tú, el orden de despliegue (que es
contraintuitivo y rompe producción si te equivocas) y el alcance nuevo que todavía no se
toca.

---

## Los documentos fuente, por si necesitas ir al original

Todos cuelgan de la raíz del repositorio `D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer`.

- `CLAUDE.md`: las reglas técnicas no negociables. Vigente salvo el conteo de pantallas.
- `docs/DESIGN_SYSTEM.md`: criterio de interfaz, tokens y reglas de diseño. Se lee antes
  de tocar cualquier pantalla.
- `src/constants/flags.ts`: cada bandera documenta qué hace y cómo se apaga. Es el mejor
  archivo del repositorio y el que mejor explica el criterio de reversión.
- `R and D/PENDIENTES_COMPLETOS_2026-08-17.md`: el inventario de 84 pendientes.
- `R and D/TAKEOVER_DEV_LEAD_2026-08-18.md`: reconcilia ese inventario contra el código.
  Es más nuevo. Cuando se contradigan, gana este.
- `R and D/RUNBOOK_SIN_BUILDS.md`: banderas de reversión y orden de despliegue.
- `R and D/RECORRIDO_EN_TELEFONO.md`: qué mirar en el dispositivo, ordenado por riesgo.
- `R and D/AUDIT_VISUAL_2026-08-16.md`, `ADOPCION_ANALISIS.md`.
- `R and D/MATRIZ_V7_V6_10_PENDIENTES_PARA_FIRMA.md` y los cuadernillos `.xlsx` de
  revisión clínica.

**Advertencia sobre `R and D/`.** Hay 374 archivos ahí y unos sesenta son auditorías. Es
expediente histórico: se consulta, no se obedece. Hay contradicciones documentadas entre
archivos del mismo día. Cuando dos documentos se contradigan, no elijas: **ve al código y
verifica**. Esa es la lección más cara de todo el expediente y tiene su sección propia en
el archivo 01.
