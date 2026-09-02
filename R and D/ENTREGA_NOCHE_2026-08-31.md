# Entrega noche 31 de agosto de 2026

Rama: `main`. Todo sin commitear, a propósito; los comandos van al final.

Trabajaron **nueve agentes implementadores y seis revisores**, todos con el
mismo briefing (reglas de la casa + memoria del proyecto) y 4EP en serio: cada
módulo fue auditado por un par independiente que ejecutó código, no leyó de
vista, y cada defecto encontrado se corrigió y se re-verificó. Salieron **31
defectos reales en revisión**; los 31 están cerrados o flagueados abajo. El
barrido final del verificador pasó en los 92 archivos tocados.

Total: 77 archivos modificados (~3,000 líneas reales) + 27 nuevos + 2
migraciones aplicables + 1 en espera.

---

## Lo que pediste anoche, punto por punto

### "Los ajustes del número uno, hazlos todos" · HECHO
- **2.1** Ajustes ya no miente: el proveedor sale del entitlement de RevenueCat
  (App Store / Google Play / portal de Stripe). Quien compre en la preventa
  (Stripe) verá "Gestionar en el portal de suscripción", no "Apple".
- **21.2** La nota "el modo claro va llegando por partes" se retiró.
- **21.3 + 21.1** Las cinco pantallas en negro, migradas y medidas con
  `contrastRatio` (la causa real en medidas: leía tokens fuera de ThemeReady).
  Y el contenedor de navegación sigue al tema: se acabó el destello negro
  entre pantallas.
- **17.5 + 17.2** Ciclo pide su consentimiento (CB-7, que ya existía como
  texto legal) en la puerta de Ciclo, Ajustes Y Reportes de ciclo; "Ahora no"
  no ensucia el log legal. Y hay UNA fórmula de ovulación, verificada contra
  los ciclos reales de las tres usuarias (antes la de 30 días veía "Ovulación"
  un día después del punto del calendario).
- **13.5** `argos-proxy`: solo falta tu comando de deploy (abajo).

### "Qué pasa cuando los estudios fallan" · HECHO como lo definiste
Se cancela, se limpia el búfer (el archivo huérfano de storage se borra en el
mismo fallo), se suelta el candado y se dice "Vuélvelo a intentar". El fallo
viaja a **Sentry** con etapa, tipo y tamaño, agrupado como `SubidaEstudio[etapa]`:
cuando llegue el primero, me lo pasas y corregimos la causa.

### "Los huecos de consentimiento, dímelos en chat" · AQUÍ VAN
Del `COMPLIANCE_DATOS_STORES.md`, estado real a hoy:
1. **Ciclo necesitaba consentimiento propio** (guarda actividad sexual, libido
   y embarazo; Apple lo clasifica sensible). → **Cerrado esta noche** con CB-7.
2. **HealthKit hacia Supabase** (guideline 5.1.3 de Apple): el import ya
   explica y pide permiso ANTES de leer, pero **no persiste el registro** en
   `user_consent_log`. Persistirlo requiere un código nuevo (el CHECK solo
   admite CB-1 a CB-7) = migración + texto legal. **Decisión tuya**: ¿lo
   agregamos como CB-8 antes de tiendas?
3. **El correo del tutor** que recolectaba el dato de una persona que nunca
   aceptó términos: **ya no existe en el código** (se retiró con MB-12). Solo
   confirma que el rating de tiendas va 18+.
4. La pantalla de pareja (`cycle_companions`) que debía decir qué ve la otra
   persona: **está apagada por bandera** (`COMPANION_MODE_ENABLED = false`),
   así que no bloquea. Cuando se encienda, ahí sí.
5. PostHog se monta antes del consentimiento: declarable, no bloquea tiendas;
   sería problema con usuarios en Europa. Sin cambio.

### "Completa los módulos a medias" · ESTADO REAL, sin inflar

**SUPLEMENTACIÓN — completa.** Fichas con dosis por cápsula/gota/porción
(migración 312), el escáner la alimenta (y NO inventa: con "2 cápsulas por
porción" no divide, muestra la etiqueta), interruptor **Del plan / Eventual**
como pediste (solo el plan cuenta para adherencia, HOY y agenda), registro
variable "hoy tomé ×N", pantalla de **historial** (30 días, KPIs, barras por
día de semana) y adherencia por suplemento y global. 146 aserciones de test.

**ARGOS — hub completo.** La pestaña recibe con: **Hablar** (chat +
conversaciones recientes), **Que te explique** (Edad ATP, tu último
laboratorio, qué es un electrón: abren el chat con contexto cargado), **Que te
enseñe** (guía de labs, tutorial, intervenciones), **Que lo haga por ti**
(generar receta, sugerencias, ordenar mi día) y **Voz**. Además: ARGOS ya
cuenta los hábitos del día igual que HOY (mandaba "X/20" con el 20 clavado),
y el clasificador del coach ya no es "primero que matchea".

**RECETAS → ARGOS — hecho como lo pediste.** La ficha ya es una hoja real
(ingredientes con sustitutos y notas, pasos, macros con raya) y trae
**"Pedirle a ARGOS que la modifique"**: abre el chat con la receta cargada y
la instrucción de que quieres cambiarla ("me falta esto", "no me gusta esto,
qué harías"). Sirve para las del catálogo y las tuyas. De pilón: la lista de
súper ya no pierde fracciones ("3/4 taza" llegaba como "1"; eran 109
ingredientes afectados).

**CARDIO — beta honesta, para corregir juntos.** `Cardio` dejó de ser
biblioteca: perfil con FC máxima (Tanaka 2001), zonas (Karvonen), VO2max
estimado (Uth 2004, o Cooper si hiciste el test), captura de FC en reposo, tu
semana en minutos por zona. **Cada fórmula lleva su cita en el código y dice
"estimado" en pantalla**; un fisiólogo revisor validó las cinco contra las
publicaciones originales. Lo que espera tu corrección: los cortes de zona
(50/60/70/80/90 es convención; ACSM usa otros) y la banda de VO2max de la
matriz (una sola para todas las edades y sexos; la pantalla lo confiesa).

**AYUNO — consolidado.** Una sola definición de "cumplí" (las seis que había
ahora llaman a la misma función), día canónico = día en que TERMINA (42 de tus
54 ayunos cruzan medianoche y la racha se rompía mientras seguías ayunando),
cierre automático idempotente que ya no depende de abrir la pantalla y que
**sigue mostrando el aviso legal de las 120 horas** (deja huella y la pantalla
la recoge), mediana pintada, y cada fase dice "aproximado" con su fuente
marcada para Mariana.

**AGENDA — la causa raíz, con evidencia.** Tus pushes de las 07:30 llegaban a
las 21:50 porque las instancias del día nacían cuando abrías la agenda, con la
hora de aviso ya vencida, y el despachador las soltaba al instante (está en tu
base, textual). Arreglado en cliente y servidor. Además: orden por hora real
(los pospuestos cuentan), **Cambiar hora** en cada evento, y el diagnóstico de
la "lista enorme": no eran duplicados, era una card por (suplemento × toma);
la decisión de agruparlas por franja es tuya (flag).

**TRIBU — lo puntual.** Mariana ya no es "A": su fila pública tenía cadena
vacía del backfill; la cadena de nombre se curó y **el correo jamás entra** al
nombre público. Lo grande (el muro, retos, reacciones) tiene plan escrito en
el parte del agente; mi lectura y la del revisor: post-lanzamiento, porque
toca frontera de datos personales.

**N-BACK 19.2**: ya estaba resuelto desde el 22-ago; el documento de
pendientes estaba desactualizado. Verificado con 409 aserciones.

### "El HTML de Omar" · SPEC ESCRITO
`R and D/diagnostico/SPEC_DIAGNOSTICO_V3.md` (701 líneas): anatomía de las 11
secciones, de qué dato sale cada una, qué existe ya en ATP y qué no, y el plan
en tres noches. **El hallazgo que lo cambia todo**: el DX v3 no es un formato,
es la salida del **Algoritmo Excel V7** puesta en prosa (los tres números
grandes son PhenoAge / edad con ajuste / algoritmo Excel; reproduje la
aritmética contra el ejemplo). Y producción corre el motor v2: hoy la app y el
DX v3 darían **dos Edad ATP distintas**. Antes de implementar pantallas
necesito tus respuestas a 8 preguntas (están numeradas en el spec; la primera
es esa: ¿qué motor manda?).

---

## Decisiones que quedaron para ti (consolidadas)

1. **Motor del diagnóstico**: ¿Excel V7 o v2? (bloquea el DX)
2. **Adherencia de suplementos**: por toma o por día (hoy conviven las dos).
3. **CB-8 para el import de salud**: ¿migración + texto legal antes de tiendas?
4. **CB-7 y los consumidores**: ¿retirar el consentimiento debe apagar también
   lo que Entrenar/ARGOS/HOY leen del ciclo? Hoy solo apaga las pantallas de
   Ciclo, y el copy ya lo dice con precisión.
5. **Agenda**: suplementos como una card por franja en vez de una por toma.
6. **Ayuno**: el 95 % de tolerancia ahora se ve en el historial ("Completado" a
   15 h 12 de 16). Reversible en una línea si no te gusta.
7. **Coach del fisiólogo**: cortes de zona ACSM vs convención actual.
8. La limpieza de las 9 filas raras de ayuno (propuesta escrita, sin aplicar).

**Para Mariana se acumuló** (además de sus dos documentos): las 5 fórmulas de
cardio, la definición de fase ovulatoria, las ventanas de fases del ayuno, la
ventana de recurrencia del coach (14 días) y la banda única de VO2max.

---

## Avisos de higiene

- **Los 58 archivos fantasma de CRLF quedaron normalizados**: tu `git status`
  ya solo muestra cambios reales.
- CLAUDE.md trae un bloque nuevo ("Antes de escribir copy") que vino de tu otro
  Cowork del embudo. Se queda.
- Nada tocó `app.json` ni `plugins/`: no hace falta build nativo.
- `_to_delete/` acumula temporales de los agentes; bórrala cuando quieras.

## Los comandos (lunes por la mañana)

**1. Verificar.** (Corrección del 1-sep: como hoy YA es el 1 de septiembre, la
311 del reset de electrones volvió a `supabase/migrations/` y entra en el push
de hoy junto con la 312 y la 313, en orden. La carpeta de espera se retiró.)

```
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
git branch --show-current
npx tsc --noEmit
npm test
```

**2. Base y funciones** (311 reset de electrones + 312 suplementos + 313 ayuno, y las dos edge):

```
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
npx supabase db push
npx supabase functions deploy dispatch-agenda-notifications
npx supabase functions deploy argos-proxy
```

**3. Commit** (por rutas, no `git add .`: así quedan fuera el respaldo,
`_to_delete/` y lo del embudo que maneja tu otro Cowork):

```
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
git add app src supabase CLAUDE.md .maestro
git add ".expo/types"
git add "R and D/diagnostico" "R and D/ATP_Pendientes.docx" "R and D/ATP_Plan_de_pruebas.docx"
git add "R and D/ENTREGA_NOCHE_2026-08-31.md" "R and D/PROPUESTA_LIMPIEZA_FASTING_LOGS_2026-08-31.md"
git commit -m "noche 31-ago: suplementacion completa, argos hub, cardio beta, ayuno consolidado, agenda y ciclo con consentimiento"
git push
```

**4. OTA** (después de que el db push haya pasado):

```
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
eas update --branch preview --message "modulos completos: suplementos, argos, cardio, ayuno, agenda, ciclo"
```

**Prueba de humo para los tres** (dos minutos): Suplementos → marca una ficha
como Eventual y mira que salga en su grupo; ARGOS → pide "explícame mi Edad
ATP"; una receta → "Pedirle a ARGOS que la modifique"; Cardio → captura tu FC
en reposo; Ciclo → debe aparecer el consentimiento UNA vez (avísales a Mariana
y a Paty para que no lo reporten como bug); Agenda → pospón un evento 15 min y
espera el aviso.
