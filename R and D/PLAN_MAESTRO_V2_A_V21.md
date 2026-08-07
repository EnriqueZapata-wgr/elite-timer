# 🗺️ Plan maestro · de donde estamos a V2.1

**Fecha:** 5-ago-2026 · Enrique + Cowork

> 📌 **Nota de numeración (MB-27, 6-ago).** Este plan quedó corrido UN número
> desde MB-26: aquí "MB-26" es Cuerpo y "MB-27" es Nutrición, pero
> `ESTADO_CONTINUIDAD.md` (más reciente) manda: **MB-26 fue el día
> inteligente, MB-27 es Cuerpo, MB-28 Nutrición, MB-29 Salud fino, MB-30
> Sueño+build, MB-31 la piel, MB-32 DIFY.** Al leer los bloques de abajo,
> súmale uno al número desde Cuerpo en adelante.
**Principio rector:** la distancia entre dolor y solución es implementación.
DIY (low ticket) → DIWY (medium) → DIFY (high). **V2.0 sube la app de DIY a DIWY.
La capa DIFY es ARGOS operando los packs, y va al final a propósito: necesita datos
de packs corriendo para tener qué operar.**

---

# 📍 PUNTO A · donde estamos hoy (verificado en main)

**Hecho y mergeado:** MB-20 (el día), MB-21 (ARGOS), MB-22 (Centro), MB-23
(configuración y avisos mixtos), 33 iconos SVG montados.

**Deudas abiertas:**

| Deuda | Tamaño |
|---|---|
| 21 iconos siguen en Ionicons | chico, mecánico |
| 13 bugs del recorrido (`ESTADO_Y_BACKLOG_2026-08-01.md`) | chicos, dispersos |
| Copy de fichas del Centro incompleto | copy, no código |
| MB-24 avisos inteligentes | diseñado, no escrito |
| 5 huecos estructurales H1-H5 | el corazón de este plan |
| 4 secrets de Supabase | **solo Enrique** · gate de tiendas |
| Legal + productos de tienda | **Enrique/Mariana** · corre en paralelo |
| Modo claro | **no hay infraestructura de temas: es construir, no activar** |
| Sueño | solo registro manual, sin import ni alarma |

---

# 🧠 LAS 4 REGLAS QUE MINIMIZAN RETRABAJO

Estas cuatro reglas son las que hacen que sean 6 bloques y no 12:

1. **Cada superficie se toca UNA vez.** Los 13 bugs del recorrido NO tienen su propio run:
   cada uno viaja dentro del overhaul de su dominio. Arreglar nutrición hoy y rediseñarla en
   tres semanas es pagar dos veces.
2. **UN solo build nativo.** Todo lo que exige binario nuevo (permisos de salud, acciones de
   notificación, iconos nativos, purga de PNGs viejos) se junta en un solo MB. Cada build
   nativo extra son días de espera de tiendas.
3. **El motor antes que el contenido.** El motor de packs se construye una vez y lo reusan
   los 10 perfiles, los protocolos y los paquetes de salud. Nada de contenido antes de motor.
4. **El sistema de temas antes de pintar.** Modo claro y modo noche rojo son LA MISMA
   infraestructura (tokens de tema). Se construye una vez y salen los dos.

---

# 🛤️ LA RUTA · 6 mega-bloques

## MB-25 · EL MOTOR DE PACKS ← el que más valor destraba

**Qué:** la pieza que instala apps + enciende hábitos con su hora + fija metas + prende
avisos, de un jalón. La entrada de 3 preguntas. Los **5 packs sin bloqueo**: bajar
revoluciones, dormir mejor, energía estable, foco, longevidad.

**Por qué primero:** la infraestructura ya existe toda (Centro instala, MB-23 dejó avisos
por app, hábitos nacen con momento). El motor solo orquesta. **Cinco perfiles vendibles sin
construir una función nueva.**

**Depende de:** Mariana firma los 10 nombres (paralelo, no bloquea el código).
**Gate de salida:** Enrique instala un pack y su semana completa corre sin atorarse.

## MB-26 · CUERPO COMPLETO → desbloquea packs 4, 5, 6 y 9

**Qué:** **H2** rutina asignada al día (el grande) · **H4** Entrenar conoce la fase del
ciclo (sale casi gratis con Entrenar abierto) · **H1** peso y medidas (captura + gráfica)
· bugs 1-3 del recorrido (el import de cardio que nunca funcionó, sus filtros, su copy).

**Por qué junto:** es un solo dominio. Cuatro packs se destraban con un solo MB, incluida
tu propia señal más fuerte: que no usas la app para entrenar.

## MB-27 · NUTRICIÓN COMPLETA → sostiene packs 3, 4 y 5

**El bloque más grande de contenido del plan.** Nutrición es un módulo mayor que se ha
trabajado poco, y aquí se completa de una vez:

- **Registro de comida rápido** (el pack de energía es el de más fricción de los diez y
  vive o muere aquí) · `meal_type` que ya existe en la base y nadie ofrece (bug 9) · el
  modo completo que no cumple lo que promete (bug 8).
- **Leer etiquetas:** escáner de código de barras + base de datos de alimentos
  (OpenFoodFacts como arranque). ✅ **La cámara ya está en el binario** por el registro con
  foto, así que el escáner NO exige build nuevo. ⚠️ La cobertura de productos mexicanos en
  OpenFoodFacts es decente pero imperfecta: el flujo debe degradar con gracia a captura
  manual cuando el código no exista.
- **Recetas y lista de súper** al nivel del resto de la app, conectadas entre sí y con el
  registro (una receta manda ingredientes a la lista, la lista sabe qué ya compraste).
- Hidratación con su encabezado (bug 4).

## MB-28 · SALUD POR DENTRO → completa packs 7 y 10

**El overhaul FINO y completo, no otra pasada ligera.** Barrido pantalla por pantalla de
todo el pilar:

- **H5** subir labs sin fricción · **H3** reporte exportable para el médico (el trabajo que
  el perfil 7 nos contrata: monitorear y graficar, no tratar).
- Los **9 destinos de SALUD como apps instalables** + Edad ATP a un tap (default).
- **Paquetes de salud sobre el motor de MB-25** (por eso va después del 25, no antes).
- Jerarquía de Sol, stats de glucosa y cetonas, y todo lo que el recorrido marcó del pilar.

**🚦 Al cerrar MB-28: V2.0 funcional completa.** Todo lo anterior es OTA.

## MB-29 · SUEÑO VIVO + EL BLOQUE NATIVO · v2.0.0 → tiendas

**El módulo de sueño hoy está muerto: solo registro manual.** Este bloque le da vida por
DOS vías independientes, para no depender de que una funcione:

**Vía 1 · Sleep Cycle interno (la que no depende de nadie):**

**La app abierta en el buró toda la noche**, pantalla en negro/rojo, teléfono cargando.

⚠️ **Sensor: MICRÓFONO, no acelerómetro.** Decisión de doctrina: el acelerómetro exige el
teléfono bajo la almohada, y campos electromagnéticos junto a la cabeza durante el sueño
van contra nuestra postura de salud funcional. El micrófono escucha desde el buró.

- **Alarma inteligente en rango:** defines tu ventana de despertar; dentro de ella te
  despierta cuando el ruido de movimiento sugiere que estás menos profundo, **con rampa de
  volumen: empieza muy bajito y sube.** Si no detecta el momento, suena al cierre de la
  ventana.
- **Contador de horas** (de "me dormí" a que despiertas).
- **Score de la noche + tiempo roncando**, por patrones de sonido. ⚠️ **Sin fases y sin
  promesa de fases.** Score honesto.
- 🥷 **Modo avión recomendado desde la propia pantalla:** todo el procesamiento es local y
  la app está en primer plano, así que la noche corre completa con radios apagados y
  sincroniza en la mañana. **Cero señales junto a tu cabeza: doctrina ATP hecha feature,
  y ninguna app de sueño lo ofrece así.**
- 🔒 **El audio JAMÁS se graba ni se sube:** solo se procesan niveles y patrones en el
  dispositivo. Va en el copy, en el aviso de privacidad y en la respuesta a revisión de
  tiendas — un micrófono nocturno es lo primero que Apple pregunta. El permiso de
  micrófono es config nativa: otra razón de que esto viva en el bloque del build.
- La pantalla nocturna comparte la paleta/curva del modo noche de MB-30 (la pintura, no
  la función).

**Vía 2 · Importar lo que el teléfono ya mide:** HealthKit + Health Connect (sueño y el
cardio ya arreglado en MB-26). *"Sin sueño estamos a ciegas con un tercio de la vida del
cliente."*

**El filtro nocturno de sistema (el f.lux de verdad):**

- **Android: SÍ se puede y se construye.** Permiso de overlay (lo que hace Twilight): un
  filtro encima de TODO el teléfono que progresa del ámbar al rojo oscurecido conforme
  avanza la noche, sin impedir visibilidad. Es la razón #1 de que este bloque sea nativo.
- **iPhone: ninguna app puede dibujar encima de otras.** El camino real: **Atajos del
  sistema puede activar filtros de color a una hora programada, automático.** La app
  configura ese atajo contigo, guiado paso a paso, más Night Shift. Mismo resultado por la
  vía que Apple permite. **Es "do it with you" literal.**

**Y el resto del binario, junto:** acciones de notificación (la pieza nativa de MB-24; el
presupuesto y arbitraje pueden ir por OTA después), iconos al binario, purga de PNGs
viejos, bump a v2.0.0.

⚠️ **Oura, Garmin y Ultrahuman se SOLICITAN, no se programan** (aprobación de socio, tarda
semanas). **Ese papeleo lo puede arrancar Enrique hoy mismo, en paralelo.**

**🚦 Gate de tiendas:** los 4 secrets (Enrique) + legal publicado. Sin eso no se sube.

## MB-30 · LA PIEL · V2.1 (OTA sobre v2.0.0)

**Qué:** el sistema de temas (tokens) construido UNA vez, y de ahí salen las TRES pieles:

- **Modo claro** completo.
- **Modo oscuro** (el actual, formalizado en tokens).
- **Selector adentro de la app: claro / oscuro / automático.** El automático sigue el modo
  día/noche del teléfono (`useColorScheme`), como pidió Enrique.
- **Modo noche rojo DENTRO de la app:** progresión cálida amarrada a `screen_time_cutoff`
  (la pantalla nocturna del Sleep Cycle de MB-29 es esta misma pieza). El filtro de sistema
  ya quedó en MB-29 porque es nativo.
- Colores legacy (bug 12), pulido de Mente (bugs 5, 6, 7, 10, 11), los 21 iconos restantes.

**Por qué al final:** pintar dos veces es el retrabajo más caro. Primero se acomodan todas
las pantallas (MB-25 a 29), luego se les da la piel. ⚠️ Requiere el capítulo LIGHT del
design system, que hoy no existe: se escribe como parte de este bloque.

## MB-31 · LA CAPA DIFY · ARGOS OPERA LOS PACKS

Deja de ser una nota: es el bloque que corona la escalera. **Tres piezas, en este orden:**

1. **El semanal del pack.** Una vez por semana ARGOS revisa la adherencia del pack (los
   datos ya los deja el motor de MB-25) y propone UN ajuste: mover el corte de cafeína que
   llevas dos semanas fallando, bajar de seis hábitos a cuatro, o el siguiente hábito
   cuando dominas uno. **Un ajuste por semana, no un regaño diario.**
2. **El ajuste se aplica con un tap.** ARGOS propone, el usuario acepta, el motor ejecuta.
   Nada se mueve solo sin consentimiento: mismo principio del gate de MB-21.
3. **Proactividad dentro del presupuesto de avisos** de MB-24: ARGOS compite por los
   mismos slots que todos, no tiene canal privilegiado.

**Por qué al final y no antes:** necesita semanas de datos de packs corriendo para tener
qué operar. Y es ancla de venta Pro: el "hazlo por ti" es lo que justifica el tier.

---

# 🧵 EL CARRIL PARALELO (no-código, no bloquea, sí gatea)

| Quién | Qué | Gatea |
|---|---|---|
| Mariana | firma los 10 nombres de packs | contenido de MB-25 |
| Enrique | 4 secrets de Supabase | tiendas |
| Enrique | legal + aviso de privacidad en somosatp.com | tiendas |
| Enrique | productos en App Store / Play + Small Business Program | tiendas |
| Enrique | solicitud de socio Oura/Garmin/Ultrahuman | integraciones futuras |
| Enrique + Cowork | copy de packs y fichas del Centro | MB-25 y MB-28 |

---

# 📊 EL MAPA EN UNA TABLA

| | MB | Destraba | Vía | Versión |
|---|---|---|---|---|
| B | **25** Motor de packs | 5 packs vendibles · DIY→DIWY | OTA | v2.0 |
| C | **26** Cuerpo (H1+H2+H4) | packs 4, 5, 6, 9 | OTA | v2.0 |
| D | **27** Nutrición (+etiquetas) | sostiene 3, 4, 5 | OTA | v2.0 |
| E | **28** Salud fino (H3+H5+paquetes) | packs 7, 10 · **V2.0 completa** | OTA | v2.0 |
| F | **29** Sueño vivo + nativo (f.lux, MB-24) | pack 2 medible · **tiendas** | **BUILD** | **v2.0.0** |
| G | **30** La piel (claro/oscuro/auto) | las tres pieles de un esfuerzo | OTA | **v2.1** |
| X | **31** DIFY: ARGOS opera los packs | ancla de venta Pro | OTA | v2.2 |

**Cada MB es un away run con su audit antes del merge, como hasta ahora.** Los briefs se
escriben uno por uno cuando su turno llega, con el código de ese momento — escribirlos
todos hoy sería garantizar retrabajo.

---

# ⏭️ EL SIGUIENTE PASO CONCRETO

1. Enrique aprueba este plan (o lo veta donde haga falta).
2. Cowork escribe el brief de **MB-25** hoy.
3. Enrique manda los 10 nombres a Mariana hoy (es un mensaje, no una junta).
4. Enrique arranca el papeleo de Oura/Garmin cuando tenga un hueco: es un formulario.
