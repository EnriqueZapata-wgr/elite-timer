# Inventario de funciones ATP, con estado y evidencia

> **Fecha de medición:** 18-ago-2026 · rama `main` · commit `2b16f93` · 1,947 commits
> **Documento hermano:** `R and D/PRD_ATP_2026-08.md`

---

## Cómo se asignó cada estado

El estado **se midió contra el código**, no se copió de un reporte. Cada renglón trae su evidencia: archivo, ruta, migración, bandera o commit.

| Estado | Criterio |
|---|---|
| **LOGRADO** | Está en `main`, tiene pantalla o servicio, y hay evidencia de que funciona. Si nadie lo vio correr en un teléfono, se dice en el mismo renglón con la marca `(sin device)`. |
| **POR REVISAR** | El código está, pero no se sabe si funciona: sin prueba en dispositivo, sin cobertura, o con una duda concreta apuntada. |
| **POR IMPLEMENTAR** | Está decidido y falta construirlo. |
| **FUTURO** | Se habló pero no está decidido, o depende de algo que no existe. |
| **MUERTO** | Lo mató el pivote del 16 de agosto. Se lista para tacharlo, no para hacerlo. |

**Marca `(sin device)`:** de todo el ciclo de cierre, solo tres cosas se probaron a mano en un teléfono real (laboratorios, el asistente navegando, la biblioteca de alimentos). Todo lo demás lleva esa marca. No es un adorno: es la diferencia entre "el código está" y "la función existe para el usuario".

**Bug contra alcance faltante.** Una función que nunca funcionó porque le falta una pieza no es una falla. El renglón lo dice cuando aplica.

---

## TABLERO

**Medido el 18-ago-2026 contando las etiquetas de este mismo documento.**

| Estado | Funciones |
|---|---|
| LOGRADO | 74 |
| POR REVISAR | 53 |
| POR IMPLEMENTAR | 58 |
| FUTURO | 16 |
| MUERTO por el pivote | 9 |
| **Total inventariado** | **210** |

**El número que importa de este tablero no es el 74.** De esas 74 funciones logradas, **65 llevan la marca `(sin device)`**, y solo **5 traen evidencia explícita de haber corrido en un teléfono**: la biblioteca de alimentos, ATP Labs, y el asistente en sus tres funciones probadas a mano. O sea que el producto tiene 74 funciones terminadas y 5 verificadas frente a una persona.

**Reparto por pilar** (medido contando las etiquetas de este documento el 18-ago-2026):

| Pilar | Funciones inventariadas |
|---|---|
| HOY | 27 |
| FITNESS | 14 |
| NUTRICIÓN | 17 |
| MENTE | 11 |
| SALUD | 36 |
| CICLO | 13 |
| TESTS | 12 |
| ARGOS | 23 |
| Transversal (negocio, infraestructura, cumplimiento) | 57 |

Que el bloque transversal sea el más grande del inventario, más grande que cualquier pilar, no es un accidente de conteo: es la forma de este lanzamiento. Lo que falta para el 1 de septiembre casi nunca es producto, es cobro, cumplimiento y verificación.

Que MENTE tenga solo 11 renglones tampoco es que sea el pilar más chico: es el pilar que **no se auditó**, así que su inventario está declarado desde el código y no desde una corrida. Es el hueco de medición más grande de este documento (ver MEN-11).

### Otros números medidos hoy

| Qué | Cuánto | Dónde se midió |
|---|---|---|
| Pantallas propias | ~141 | 203 `.tsx` en `app/`, menos 2 layouts y 60 con `Redirect` |
| Banderas de función | 18 (16 encendidas, 2 apagadas) | `src/constants/flags.ts` |
| Packs | 8 | `src/constants/packs.ts` |
| Apps del springboard | 35 (16 instalables) | `src/constants/app-registry.ts` |
| Puertas del hub de salud | 4 + 1 condicional al ciclo | `src/constants/salud-puertas.ts` |
| Dominios de reportes | 14 | `src/components/reports/domains/` |
| Evaluaciones declaradas | 26 (solo 6 con ruta viva) | `src/constants/assessments/` |
| Migraciones | 221 (la última es la 300) | `supabase/migrations/` |
| Funciones de borde | 14 | `supabase/functions/` |
| Archivos de prueba | 345 sobre 976 de código | `src/` y `app/` |
| Pruebas de renderizado | **0** | no hay archivo de prueba con extensión de componente |

---

## LAS CINCO QUE MÁS VALOR LE DAN AL LANZAMIENTO

En orden. No son las más difíciles: son las que cambian si el 1 de septiembre sale bien o sale mal.

**1. Cerrar el hueco de invitación de clientes (SALUD-28).**
La función que vincula un cliente a un coach corre con permisos de dueño, se salta las políticas de fila, no verifica identidad ni consentimiento, y toma la identidad de un parámetro en vez del token. Quedó ejecutable por el rol anónimo, cuya llave viaja dentro del paquete de la app. 44 tablas confían en ese vínculo, 21 con permiso de escritura, incluidos estudios clínicos y check-ins emocionales. Y como el rol de coach se deriva de tener al menos un cliente activo, quien se autoinvita se vuelve coach a ojos de la app. **La migración que lo cierra ya está escrita** (`R and D/296_sec_invite_consentido.sql`), fuera de la carpeta de migraciones a propósito. Es mover un archivo y aplicar. Es lo más barato y lo más grave de la lista.

**2. Las tres decisiones clínicas que dan veredictos de salud equivocados (SALUD-12).**
Una T3 libre etiquetada en la unidad equivocada hace que una tiroides en el piso puntúe 100 de 100 con texto tranquilizador. Un corte de ApoB en cero hace que todo el intervalo crítico salga "aceptable". Una fila de LDH copiada de otro parámetro hace que el 100% de las mujeres con LDH normal reciban "pide atención". Un "no sé" se recupera; un dato equivocado dicho con confianza manda a una persona a un consultorio o a preocuparse sin motivo. **Bloqueado por firma clínica**, con plazo pedido al 25 de agosto y sin evidencia en el repositorio de que el cuadernillo se haya enviado. Además hay tres conteos distintos del mismo pendiente (10, 13 y 16) y nadie declara cuál es el vigente.

**3. Correr la aplicación en un teléfono, por lista y por riesgo (transversal).**
65 de las 74 funciones marcadas como logradas nunca vieron un dispositivo, incluidos el paywall con precios reales, el gate de consentimientos, los permisos de salud del sistema y el tema claro completo. La suite no abre una sola pantalla, así que ningún verde dice nada sobre esto. Ya existe la lista priorizada por riesgo (commit `89c938e`). Es la única función de este top cinco que no requiere escribir código.

**4. La pasarela central de alta con su correo propio (INFRA-8 a INFRA-13).**
Hoy alguien puede pagar y quedarse sin acceso, y nadie se entera. No hay cola de provisión, no hay tablero, no hay reconciliación contra el padrón de la comunidad, y el correo transaccional sale por el servicio compartido de desarrollo con límites bajos. La lista que más duele de las cuatro que produce la reconciliación es "cobros activos sin membresía vigente": gente pagando sin producto. Bloqueante declarado: dominio de correo verificado.

**5. Que la siembra del día 1 use el pack elegido (HOY-3).**
La función acepta el argumento de los hábitos del pack y **ningún llamador se lo pasa**, así que el día 1 es genérico para todos. La primera cifra que ve quien acaba de pagar $890 MXN es "0 de 8", con ocho filas que no eligió y de las cuales solo cuatro se palomean con el dedo. No hay una sola prueba que cubra esa función. Cuesta poco y es literalmente el primer minuto del producto.

**Mención honorable, fuera del top cinco por costo/beneficio:** resincronizar el cerebro del asistente (ARGOS-3). Hoy no duele porque el proxy lee el cerebro del almacén central, pero la copia empaquetada va dos versiones atrás y el día que la lectura central falle, ARGOS contesta con doctrina vieja, sin error visible, y vuelve a nombrar especialidades médicas.

---

# PILAR 1 · HOY

**HOY-1 · Compilador del día**: **LOGRADO (sin device)**
`src/services/day-compiler.ts`. Arma la lista del día uniendo hábitos booleanos, cuantitativos e intervenciones activas.

**HOY-2 · Las intervenciones activas manejan HOY y la agenda**: **LOGRADO (sin device)**
Bandera `INTERVENTIONS_DRIVE_HOY` encendida. Convierte "Mi Protocolo" en renglones del día y en eventos de agenda que heredan el envío de avisos. Los protocolos precargados quedaron como biblioteca de referencia. Doble lectura viva: apagar la bandera revive el camino anterior sin migrar datos.

**HOY-3 · Siembra suave del día 1**: **POR REVISAR**
Bandera `DIA_1_SIEMBRA_SUAVE` encendida, `src/services/hoy/install-core.ts:183` y `install-service.ts:193-196,227`. **Duda concreta:** la función acepta los hábitos del pack como segundo argumento y el único llamador real (`app/onboarding/v2/notifications.tsx:71`) no se lo pasa, así que el día 1 es genérico. Además no existe ninguna prueba que la cubra. Baja el día 1 de 13 filas a 8, no a 3, porque cinco hábitos obligatorios los fuerza el compilador por unión.
*Para pasar a LOGRADO:* cablear el segundo argumento, escribir su prueba, y ver el día 1 en un teléfono.

**HOY-4 · Estado casi vacío de HOY con una sola salida**: **LOGRADO (sin device)**
`src/components/hoy/TareasView.tsx:317-339`, apunta al armador de packs. Commit `0603f19`.

**HOY-5 · Agenda con horarios y avisos**: **POR REVISAR**
`agenda_events` con origen de intervención, entregados por `dispatch-agenda-notifications`. Nunca se validó en dispositivo que el aviso llegue a la hora correcta.

**HOY-6 · Electrones como logros**: **LOGRADO**
`src/constants/electrons.ts`. Sobrevivieron al pivote y ya no compran nada. Verificado en la tarea PREMIUM-5.

**HOY-7 · Premios de nivel wearable**: **POR REVISAR**
Bandera `SALUD_DEL_SISTEMA_ALIMENTA_EL_DIA` encendida. Las reglas de premio existían desde el día uno y **nunca se dispararon** porque nadie leía la tabla de salud del sistema. Ahora se leen. Sin device, o sea que no hay evidencia de que un paso real pague un premio real.

**HOY-8 · Packs que configuran la app completa**: **LOGRADO (sin device)**
8 packs en `src/constants/packs.ts`. Un pack instala apps, enciende hábitos con su hora, fija metas y configura avisos.
*Duda adjunta, listada aparte:* los 8 no se distinguen entre sí visualmente, mismo molde y mismo glifo gris.

**HOY-9 · Centro ATP como instalador**: **POR REVISAR**
`app/centro/`. 36 fichas construidas sobre una plantilla de cuatro huecos, de las cuales 21 no llenan el quinto. La sección de atajo ya lleva al armador (`centro/index.tsx:145`, corregido).

**HOY-10 · Springboard ATP con 35 aplicaciones**: **LOGRADO (sin device)**
`src/constants/app-registry.ts`, 16 instalables y 19 fijas.

**HOY-11 · Siembra inicial de aplicaciones**: **POR REVISAR**
`install-core.ts:132-134`: siembra 2 apps para hombre y 3 para mujer de un catálogo de 16 instalables. Y se dispara solo al montar el tab ATP (`app/(tabs)/kit.tsx:102`), así que quien nunca abre ese tab no recibe ninguna.
*Para pasar a LOGRADO:* decidir si dos apps es la siembra correcta y sacar el disparador del montaje de una pantalla.

**HOY-12 · Onboarding v2 de nueve pantallas**: **LOGRADO (sin device)**
`app/onboarding/v2/`. El barrido visual del 16-ago lo declaró impecable en tema claro, sin un solo salto. Son 9 pantallas y unos 28 toques antes de la primera acción útil.

**HOY-13 · Gate de consentimientos en el layout de pestañas**: **LOGRADO (sin device)**
Banderas `LOGIN_PASA_POR_GATE` y `TABS_EXIGEN_CONSENTIMIENTO`, commits `6edc46c`, `cec79b1`, `46c2b9b`. Cierra de un golpe las siete puertas de enlace profundo que entraban sin montar el gate. Ambas banderas están clavadas en `true` por prueba: apagarlas por emergencia funciona pero deja la suite roja.

**HOY-14 · El gate degrada a pestañas cuando falla la red**: **POR IMPLEMENTAR** *(bug de cumplimiento)*
`app/index.tsx:65-67`. Un fallo de red al arrancar mete a un usuario sin onboarding ni consentimientos de datos sensibles, transferencia internacional y mayoría de edad directo a HOY. Es la única pieza del rediseño del primer minuto que es cumplimiento y no estética.

**HOY-15 · Tour de la orbe de doce pasos**: **POR IMPLEMENTAR** *(se reemplaza, no se arregla)*
`OrbTour.tsx`. Marca "visto" tanto al completar como al abandonar (`:96`), así que penaliza a quien lo salta. La decisión es reemplazarlo por un marcador de guía único más descubrimiento por lugar.

**HOY-16 · Ajustes alcanzable desde la app**: **POR IMPLEMENTAR**
Medido hoy: **cero llamadas a `router.push('/settings')` en toda la aplicación**. La única puerta viva es un tile entre unos veinte iconos del springboard (`app-registry.ts:185`) y pedírselo al asistente (`argos-nav-resolver-core.ts:188`).

**HOY-17 · Ajustes simplificado**: **LOGRADO (sin device)**
Commit `31cdd9d`. Dejó de ser el basurero de la app.

**HOY-18 · La configuración de vibración y sonido apaga algo**: **POR IMPLEMENTAR**
Las funciones de háptica no leen la preferencia de vibración y el módulo de sonidos no lee la de sonido. Apagarlas en Ajustes no apaga casi nada.

**HOY-19 · Racha unificada**: **POR REVISAR** *(bug conocido)*
Conviven dos reglas: una sin día de gracia y otra con día de gracia. Dos pantallas muestran números distintos de la misma racha. La fusión no se hizo porque el entorno de pruebas no arrancaba, y el propio código lo confiesa en un comentario.

**HOY-20 · Saludo de HOY por hora real**: **LOGRADO (sin device)**
Commit `4d0493b`. Antes decía "buenas noches" a las 8:43 de la mañana.

**HOY-21 · Filtro nocturno**: **POR REVISAR**
No sobrevive al reinicio y la superposición no cubre toda la barra de estado. Limitación aceptada, sin arreglo posible por actualización remota.

**HOY-22 · Acciones destructivas fuera de la pulsación larga**: **POR REVISAR**
Commit `99ff86c` sacó varias del gesto oculto. Quedan cuatro que siguen viviendo solo ahí.

**HOY-23 · Cinco eventos de medición del primer minuto**: **POR IMPLEMENTAR**
No existe ninguno: paso visto, pack elegido, primer electrón del día 1, día 1 sin un solo toque, respuesta a notificaciones. Sin ellos, el rediseño del primer minuto se evalúa a ojo.

**HOY-24 · Tokens de movimiento**: **POR IMPLEMENTAR**
No existe `src/constants/motion.ts`. Cada animación decide su duración por su cuenta.

**HOY-25 · Widgets de iOS**: **FUTURO**
Exige compilación nativa y hay un hueco de servicio en frío sin resolver.

**HOY-26 · Arquitectura de cinco pestañas con la orbe al centro**: **FUTURO**
Decidida en concepto, seis decisiones sin brief. Después del lanzamiento.

**HOY-27 · Puerta visible a la economía de moneda interna**: **MUERTO**
La mitad de este punto que sigue viva (la puerta a evaluaciones) está en TESTS.

---

# PILAR 2 · FITNESS

**FIT-1 · Motor de rutinas**: **POR REVISAR**
`src/engine/`, con `src/engine/__tests__/engine.test.ts` de 384 líneas que verifica una rutina de récord de 239 pasos y 4,076 segundos. **Duda concreta y grave:** ese archivo está excluido del entorno de pruebas (`vitest.config.ts`), no es una prueba del entorno sino un script a mano, y **ningún script de `package.json` lo invoca**. Lleva meses sin ejecutarse.
*Para pasar a LOGRADO:* correrlo una vez, o meterlo a la suite.

**FIT-2 · Constructor de rutinas**: **POR REVISAR**
`app/builder.tsx`. Sale en negro sobre tema claro (no reacciona al tema). Es una de las ocho pantallas del hallazgo de tema.

**FIT-3 · Biblioteca de ejercicios y matriz**: **LOGRADO (sin device)**
`app/exercise-library.tsx`, `app/exercise-detail.tsx`, `src/constants/exercise-matrix.ts`, `exercise-instructions.ts`.

**FIT-4 · Métodos propietarios de entrenamiento**: **LOGRADO (sin device)**
`src/constants/training-methods.ts`. Tema claro aplicado en el lote 6 (commit `a098da9`).

**FIT-5 · Ejecución de rutina**: **POR REVISAR**
`app/execution.tsx`, `app/fitness-train.tsx`. Es la pantalla que más depende del cronómetro en tiempo real y nunca corrió en un teléfono en este ciclo.

**FIT-6 · Registro de fuerza, cardio y HIIT**: **LOGRADO (sin device)**
`app/log-strength.tsx`, `app/log-cardio.tsx`, `app/fitness-hiit.tsx`, `app/cardio-import.tsx`.

**FIT-7 · Reporte de entrenamiento**: **POR REVISAR** *(bug conocido)*
`src/components/reports/domains/entrenamiento.tsx`, commit `96c7e0d`. **Duda concreta:** contradice a `app/progress` con el mismo dato. Dos verdades del mismo volumen.

**FIT-8 · Fuerza y benchmarks**: **POR REVISAR**
`app/progreso`. Lima sobre oliva, ilegible en el barrido del 16-ago.

**FIT-9 · Frecuencia cardiaca por sesión de ejercicio**: **POR IMPLEMENTAR** *(alcance faltante, no falla)*
La tabla solo guarda la de reposo. No hay fuente para la de sesión, así que la función nunca pudo existir.

**FIT-10 · Evaluación de movilidad**: **POR REVISAR**
`app/mobility-assessment.tsx`. Cayó en el tercio del barrido visual que no sirvió.

**FIT-11 · Puente de fitness hacia Edad ATP**: **LOGRADO (sin device)**
Las primarias entran sólidas al motor y las secundarias empujan. Documentado en el motor v2.

**FIT-12 · Asignación de rutinas a clientes**: **POR REVISAR** *(sospecha de bug de base)*
`routine_assignments` tiene políticas de fila encendidas y **sin ninguna política definida** (`038_security_hardening.sql:19` la enciende y el bucle de `:94` la salta). Eso probablemente rompe toda lectura de asignaciones desde el cliente.
*Para pasar a LOGRADO:* verificar contra la base y escribir la política.

**FIT-13 · Clips 3D de la biblioteca matriceada**: **FUTURO**
Encargo de producción externa.

**FIT-14 · Pilar FITNESS auditado visualmente**: **POR REVISAR** *(transversal)*
Buena parte del pilar quedó sin auditar de verdad en el barrido del 16-ago porque sus capturas cayeron en carga o en pantalla equivocada.

---

# PILAR 3 · NUTRICIÓN

**NUT-1 · Registro de comida por texto**: **LOGRADO**
`app/food-text.tsx`, `app/food-register.tsx`. Con evidencia de teléfono por la biblioteca de alimentos.

**NUT-2 · Registro por foto**: **POR REVISAR**
`app/food-scan.tsx`. Depende de la cámara del build 2.2.0 y nunca se probó desde ese build.

**NUT-3 · Código de barras**: **POR REVISAR**
`app/food-barcode.tsx`. Misma dependencia de cámara.

**NUT-4 · Biblioteca de alimentos**: **LOGRADO** *(con evidencia de teléfono)*
`src/constants/argos-food-library.ts`, migraciones `265_food_library.sql` y `266_food_library_seed.sql`. Una de las tres cosas probadas a mano por el dueño.

**NUT-5 · Score de comida por calidad, no por macros**: **POR REVISAR**
Construido. Sin verificación en dispositivo y sin evidencia de que la lectura agregada del día se calcule como se diseñó.

**NUT-6 · Preferencias de comida**: **POR REVISAR**
`app/food-preferences.tsx`. Salió 100% negra en el barrido de tema claro.

**NUT-7 · Ayuno con fases estimadas**: **LOGRADO (sin device)**
`src/constants/fasting-phases.ts`, `fasting-protocols.ts`, `app/fasting.tsx`. La pastilla declara que la fase es una estimación por tiempo, que es lo honesto sin sangre.

**NUT-8 · Modo medido del ayuno por GKI**: **POR REVISAR** *(construido completo, detrás de bandera apagada)*
Bandera `FASTING_MEASURED_MODE = false`. **Lo verifiqué hoy: está todo.** El núcleo (`src/services/fasting-metrics-core.ts`), el servicio (`fasting-measurement-service.ts`), sus pruebas (`__tests__/fasting-metrics-core.test.ts`) y el cableado en pantalla (`app/fasting.tsx:217-220`). Lee glucosa y cetonas capturadas durante el ayuno y muestra profundidad de cetosis real por índice glucosa/cetonas, nunca como afirmación de autofagia.
*Para pasar a LOGRADO:* una prueba en dispositivo con glucosa y cetonas reales, y encender la bandera por actualización remota. No requiere compilación ni migración.

**NUT-9 · Registro de cetonas en sangre**: **LOGRADO (sin device)**
`app/ketones-log.tsx`, migración 078.

**NUT-10 · Cetonas de aliento y orina en un evento comparable**: **POR IMPLEMENTAR** *(alcance faltante)*
Falta el modelo de datos que las haga comparables entre sí.

**NUT-11 · Ventanas horarias de las fases del ayuno**: **POR IMPLEMENTAR** *(espera firma clínica)*
Las actuales son provisionales.

**NUT-12 · Hidratación**: **LOGRADO (sin device)**
`app/hydration.tsx`. Tema claro aplicado en el lote 3.

**NUT-13 · Suplementos**: **LOGRADO (sin device)**
`app/supplements.tsx`. Vive dentro de NUTRICIÓN, no como pilar propio.

**NUT-14 · Recetas, mis recetas, cocina y lista de compra**: **POR REVISAR**
`app/my-recipes.tsx`, `app/cocina.tsx`, `app/lista-compra.tsx`, `app/argos-recipes.tsx`. **Duda concreta:** las recetas de arranque no tienen un solo importador vivo, o sea que existen en el repositorio y no llegan a nadie.

**NUT-15 · Reporte de nutrición**: **POR REVISAR**
`src/components/reports/domains/nutricion.tsx`. Problemas de legibilidad sobre degradados en el barrido del 16-ago.

**NUT-16 · Simplificar la pantalla de ayuno**: **POR IMPLEMENTAR**
1,343 líneas y 30 superficies presionables. La referencia del sector tiene 4.

**NUT-17 · Modo macro como módulo opcional**: **FUTURO**
Del PRD v1.2. La doctrina de calidad sobre precisión sí se aplicó; el interruptor global de macros nunca se construyó.

---

# PILAR 4 · MENTE

**MEN-1 · Escritura y su historial**: **LOGRADO (sin device)**
`app/journal.tsx`, `app/journal-history.tsx`, `src/constants/journal-types.ts`.

**MEN-2 · Check-in emocional con cuadrícula de estados**: **POR REVISAR**
`app/checkin.tsx`, `app/emotions.tsx`. **Duda concreta:** es el peor caso de legibilidad de toda la aplicación según el barrido del 16-ago, con etiquetas sobre la retícula y celdas a 9 o 10 píxeles.

**MEN-3 · Navegación emocional, para moverte y no solo registrarte**: **POR REVISAR**
`app/emotion-navigation.tsx`. Salió 100% negra en el barrido de tema claro. Es el diferenciador declarado del pilar frente a la competencia.

**MEN-4 · Perfil, historial y exploración emocional**: **POR REVISAR**
`app/emotion-profile.tsx`, `emotion-history.tsx`, `emotion-exploration.tsx`.

**MEN-5 · Color de la emoción heredado por coordenada**: **LOGRADO (sin device)**
`src/constants/concept-colors.ts`. La coordenada bautiza el color y se hereda a historial y perfil.

**MEN-6 · Respiración**: **POR REVISAR**
`app/breathing.tsx`. Sin verificación en dispositivo, y es una función que solo se juzga con el teléfono en la mano.

**MEN-7 · Meditación con audios guiados**: **LOGRADO (sin device)**
`app/meditation.tsx`, `app/mente/`, con los audios en un bucket privado servido por la función de borde `mente-audio-url`. Once audios producidos.

**MEN-8 · Los ocho mantras**: **POR IMPLEMENTAR**
Escritos y en revisión. El canal de producción de audio es otro repositorio, está congelado, sin control de versiones, y arrastra un error de metadatos en el ensamblador.

**MEN-9 · Reportes de mente y de emociones**: **POR REVISAR**
`src/components/reports/domains/mente.tsx` y `emociones.tsx`. Ambos con datos que no se leen por contraste.

**MEN-10 · Nombre de la sección de escritura**: **FUTURO**
Tres candidatos, sin decisión. Renombrar la ruta exige compilación parcial.

**MEN-11 · Pilar MENTE auditado**: **POR REVISAR** *(transversal, y es el hueco más grande del inventario)*
El pilar completo **no se auditó** en el ciclo de cierre, ni visualmente ni funcionalmente. Sus capturas cayeron en carga o en pantalla equivocada. Todo lo de arriba se declara desde el código, no desde una corrida.

---

# PILAR 5 · SALUD

**SAL-1 · ATP SOL y exposición a luz solar**: **LOGRADO (sin device)**
Tema claro aplicado en el lote 5. El hábito de sol se ancla al índice ultravioleta real.

**SAL-2 · Glucosa**: **LOGRADO (sin device)**
`app/glucose-log.tsx`, migración 040, par núcleo/servicio extraído en el commit `752a834`.

**SAL-3 · Hub de salud por cuatro puertas**: **LOGRADO (sin device)**
`src/constants/salud-puertas.ts`. Sustituyó un menú de catorce tarjetas. La quinta puerta del ciclo aparece solo con su gate abierto.

**SAL-4 · ATP Labs sobre serie de tiempo**: **LOGRADO** *(con evidencia de teléfono)*
`lab_values` como tabla canónica, `loadLabsReport`. Una de las tres cosas probadas a mano. El barrido declaró que los labs aguantan la lupa.

**SAL-5 · Ficha por biomarcador**: **LOGRADO (sin device)**
Bandera `LABS_FICHA_POR_BIOMARCADOR`, `src/constants/biomarcador-contenido.ts`, ruta `/edad-atp/lab/[key]`, commits `ef10271`, `beb780d`. Tu número contra tu ventana, qué altera la lectura, con qué se lee, tu historia. Contenido escrito en el repositorio, no generado por modelo: abrir una ficha cuesta cero.

**SAL-6 · Unidades alineadas antes de calificar**: **LOGRADO (sin device)**
Bandera `LABS_UNIDADES_ALINEADAS`, `src/constants/lab-unidades-core.ts`. Antes, una testosterona sana de 993 ng/dL se calificaba contra una ventana escrita en ng/mL y salía "pide atención" en las tres superficies que leen labs.

**SAL-7 · Rangos funcionales de una sola fuente**: **LOGRADO (sin device)**
Bandera `RANGOS_UNA_SOLA_FUENTE`. El motor legacy y la matriz V7/V6 daban dos veredictos del mismo biomarcador del mismo cliente según la pantalla. Gana la matriz por procedencia: cita fuente, autoría y fecha, y tiene fixtures de regresión contra el original.

**SAL-8 · Umbrales femeninos en el score que se persiste**: **LOGRADO (sin device)**
Bandera `UMBRALES_FEMENINOS_EN_EL_SCORE`, `src/services/salud/umbrales-femeninos-core.ts`, commit `5714df0`. El motor legacy definía 98 parámetros y en 95 el arreglo femenino era idéntico al masculino. Una mujer con testosterona perfectamente en su ventana puntuaba 0 de 100. Los umbrales no se escribieron a mano: se leen de la matriz.

**SAL-9 · El sexo no se adivina cuando falla la red**: **LOGRADO (sin device)**
Bandera `SEXO_NO_SE_ADIVINA`, commit `338a316`. Antes, un fallo de red asumía hombre de 40 años y **guardaba** ese número. Medido sobre dos pacientes reales: sumaba 3.20 y 1.64 años de Edad ATP.

**SAL-10 · Motor de Edad ATP v2**: **LOGRADO (sin device)**
`src/constants/edad-atp-motor-v2-config.ts`, `edad-atp-v2-model.ts`. **Corrección importante:** los pesos nunca fueron placeholder. El comentario que lo decía llevaba dos meses obsoleto y casi congela el número que vende el producto entero (commit `a447a49`).

**SAL-11 · Edad biológica por PhenoAge**: **LOGRADO (sin device)**
Trabaja sobre valores crudos, no lee bandas, y por eso ninguna de las banderas de rangos la mueve.

**SAL-12 · Las decisiones clínicas de la matriz V7/V6**: **POR IMPLEMENTAR** *(bloqueado por firma, en el top cinco)*
Tres producen veredictos equivocados hoy: T3 libre etiquetada en la unidad equivocada (falso negativo, el más peligroso), ApoB con corte en cero (todo el intervalo crítico sale aceptable), LDH en mujeres con la fila de otro parámetro (falso positivo en el 100% de las mujeres con LDH normal). Documentado en `R and D/MATRIZ_V7_V6_10_PENDIENTES_PARA_FIRMA.md`.
*Duda estructural adjunta:* hay tres conteos distintos del mismo pendiente (10, 13 y 16) y nadie declara cuál es el vigente.

**SAL-13 · El score funcional que se persiste sigue en el motor legacy**: **POR IMPLEMENTAR**
Las banderas de rangos son de presentación. El score que se guarda todavía corre con el motor viejo, y cambiarlo mueve un número guardado en base: no cabe en una bandera de presentación.

**SAL-14 · Expediente e historia clínica**: **LOGRADO (sin device)**
`app/historia-clinica/`, rediseñado con el molde editorial en el commit `44913f4`.

**SAL-15 · Cuestionarios de historia clínica**: **POR REVISAR**
`src/constants/historia-clinica-questionnaires.ts`. **Duda concreta:** las preguntas las propuso el asistente y **no están validadas clínicamente**.

**SAL-16 · Padecimientos con estado activo contra resuelto**: **LOGRADO (sin device)**
Distingue "tenía" de "tiene" con marca de activo y fecha de resolución.

**SAL-17 · Protocolos e intervenciones**: **LOGRADO (sin device)**
`src/constants/interventions-catalog.ts`, `intervention-vocab.ts`. Activar una intervención la crea en agenda, reportes y backend de un solo movimiento.

**SAL-18 · Catálogo de intervenciones validado v3 y con ciclo femenino**: **POR IMPLEMENTAR** *(espera firma)*
Faltan dosis, ventanas y criterios en varios protocolos, y falta el ciclo femenino completo.

**SAL-19 · Permisos de salud del sistema (HealthKit y Health Connect)**: **POR REVISAR**
Encendidos en el build 2.2.0 (commit `642d3fe`). **Nunca se probaron desde ese build en un teléfono.**

**SAL-20 · La salud del sistema alimenta el día**: **LOGRADO (sin device)**
Bandera `SALUD_DEL_SISTEMA_ALIMENTA_EL_DIA`, `health-read-core`. Antes, la tabla de salud diaria se llenaba y **exactamente dos archivos del repositorio la mencionaban**: la migración y el que escribe. La persona conectaba su teléfono, veía "sincronizado" y en la app no cambiaba nada. El candado "lo manual nunca se pisa" es una prueba roja, no un comentario.

**SAL-21 · Importación de sueño sin duplicar tramos**: **LOGRADO (sin device)**
`src/services/sleep/sleep-import-core.ts`, función `nochesDesdeTramos`, cinco pruebas nuevas, commit `7169c56`. Bug real corregido: 12 de 14 noches guardadas eran matemáticamente imposibles, hasta 24 horas de sueño en una cama de 9, porque los tramos se traslapan y se sumaban.

**SAL-22 · Limpiar las noches imposibles ya guardadas**: **POR IMPLEMENTAR**
Migración `300_sleep_nights_limpiar_duraciones_imposibles.sql` **escrita y no aplicada**. Las 12 filas malas no se arreglan solas porque el importador nunca pisa una noche existente.

**SAL-23 · Sesión de sueño propia con alarma inteligente**: **POR IMPLEMENTAR** *(alcance faltante, NO es una falla)*
`app/sleep-session.tsx`. **Este es el caso testigo del inventario.** Cero filas con origen de sesión propia en producción; las 14 que hay vienen todas del sistema. Revisado el código, **no hay bug**: la alarma, el score y el ronquido están bien y probados. Lo que falta es una pieza de diseño: toda la sesión vive en memoria y solo se escribe cuando la persona toca "ya desperté". Si el sistema mata la app, la manda a segundo plano o el teléfono se reinicia durante ocho horas, la noche se pierde entera sin dejar rastro. En Android es probable porque no hay servicio en primer plano.
*Dos salidas:* checkpoint periódico a almacenamiento local (viaja por actualización remota) o servicio en primer plano de verdad (exige código nativo y compilación). Sin decidir.

**SAL-24 · Umbrales del sueño**: **POR REVISAR**
Son calibración de escritorio, no de noche real.

**SAL-25 · Ficha de emergencia con QR público**: **LOGRADO (sin device)**
`src/components/QrFicha.tsx:88,104-116`, `app/ficha-emergencia.tsx`.

**SAL-26 · QR clínico privado**: **POR IMPLEMENTAR** *(alcance faltante, con cuatro decisiones no técnicas antes)*
Solo existe el público. La cuarta decisión, la más preocupante, es qué significa "la historia clínica completa": hay cuatro documentos distintos que podrían serlo. Imposible antes del 1 de septiembre si exige compilación.

**SAL-27 · Bitácora de quién accede a los datos**: **POR IMPLEMENTAR**
La tabla existe con rol, tipo y recurso, y **nadie escribe en ella**. Si el QR clínico se construyera hoy, no habría rastro de quién abrió qué.

**SAL-28 · Invitación de clientes con consentimiento**: **POR IMPLEMENTAR** *(hueco de privacidad abierto en producción, número uno del top cinco)*
La función corre con permisos de dueño, se salta las políticas de fila, no verifica identidad ni consentimiento, inserta el vínculo como activo directo, y toma la identidad de un parámetro y no del token. Quedó ejecutable por el rol anónimo, cuya llave viaja en el paquete de la app. 44 tablas confían en ese vínculo, 21 con escritura. Y como el rol de coach se deriva de tener un cliente activo, quien se autoinvita se vuelve coach. **La migración que lo cierra está escrita:** `R and D/296_sec_invite_consentido.sql`, fuera de la carpeta de migraciones a propósito.
*Nota de causa raíz:* la reapertura del permiso no viene de ninguna migración del repositorio. Casi con certeza fue una edición por el editor de la consola. Un reemplazo de función restablece los permisos por defecto de Postgres, que incluyen al rol anónimo. Ya existe el camino correcto y con consentimiento (`connect_to_coach`): no hay que diseñar nada nuevo, hay que migrar llamadores.

**SAL-29 · Panel de detalle de cliente**: **POR REVISAR**
4,250 líneas, **cobertura cero**, excluido a propósito del único guard que lo tocaría, y fuera de los candados de color. Solo se monta con ancho de 1024 píxeles o más y usuario coach, o sea que **en un teléfono no se ve nunca**. Ahí apareció un contraste de 1.0, texto literalmente invisible, que pasó toda la suite.

**SAL-30 · Reportes por 14 dominios y export maestro**: **LOGRADO (sin device)**
`src/components/reports/domains/`, commit `69884ff`. El export produce dos archivos distintos para dos destinatarios distintos a propósito.
*Duda adjunta:* cuatro de esos reportes tienen datos que no se leen por contraste (ayuno, emociones, economía, adherencia).

**SAL-31 · Composición corporal y medidas**: **POR REVISAR**
`app/medidas.tsx`. Sale en negro sobre tema claro.

**SAL-32 · Sistema clínico**: **POR REVISAR** *(bug conocido)*
`app/clinical-system.tsx` imprime hemoglobina glucosilada con 19 decimales y en la escala equivocada. Además es una pantalla sin entrada desde ninguna otra pantalla de usuario: está en la lista de candidatas a fusionarse.

**SAL-33 · ATP Genética**: **FUTURO**
Del PRD v1.2. Cero código. No existe módulo, ni parser de variantes, ni pantalla.

**SAL-34 · Integración directa con laboratorios mexicanos**: **FUTURO**
Depende de convenios que no existen.

**SAL-35 · Tablas con políticas de fila encendidas y sin política**: **POR IMPLEMENTAR**
Nueve tablas en esa condición. La de mayor riesgo aparece en FIT-12.

**SAL-36 · Auditar las funciones con permisos de dueño**: **POR IMPLEMENTAR**
57 funciones sin auditar una por una.

---

# PILAR 6 · CICLO

**CIC-1 · Calendario y registro del ciclo**: **LOGRADO (sin device)**
`app/cycle.tsx`, `app/cycle-history.tsx`, `src/constants/cycle-info.ts`.

**CIC-2 · Catálogo de síntomas**: **LOGRADO (sin device)**
`src/constants/sintomas-catalog.ts`.

**CIC-3 · Predicción de fase**: **POR REVISAR**
Sin verificación contra ciclos reales de varias personas.

**CIC-4 · Gráficas de ciclo**: **POR REVISAR**
`app/cycle-charts.tsx`. Texto de un solo color sobre degradados que van de claro a negro: ilegible en parte del recorrido.

**CIC-5 · Ajustes del ciclo**: **LOGRADO (sin device)**
`app/cycle-settings.tsx`.

**CIC-6 · Modo acompañante**: **POR REVISAR**
Construido. Sin evidencia de uso ni de prueba.

**CIC-7 · Quinta puerta del hub de salud con su gate**: **LOGRADO (sin device)**
`salud-puertas.ts`, con marca de solo femenino.

**CIC-8 · Laboratorios leídos con la fase del ciclo**: **LOGRADO (sin device)**
Los labs de mujeres siempre se leen con su fase. La ficha por biomarcador lo respeta.

**CIC-9 · Reporte de ciclo**: **LOGRADO (sin device)**
`src/components/reports/domains/ciclo.tsx`.

**CIC-10 · Doctrina bidireccional en el contenido**: **POR REVISAR**
La fase folicular intensifica y la lútea escucha. Está en la doctrina; falta verificar que todo el contenido del pilar la respete y no trate el ciclo como una sola bajada.

**CIC-11 · Ciclo femenino en el catálogo de intervenciones**: **POR IMPLEMENTAR** *(espera firma)*

**CIC-12 · La promesa de que los datos del ciclo no se comparten**: **POR REVISAR** *(riesgo de cumplimiento)*
La promesa está escrita en la interfaz del módulo. La pasarela y el registro de clientes que están por construirse tienen que respetarla sin excepción, y eso todavía no está garantizado por ningún candado.

**CIC-13 · Módulo de embarazo**: **FUTURO**
Diseñado como máscara del pilar. Fuera de alcance.

---

# PILAR 7 · TESTS

**TST-1 · Braverman de 313 preguntas**: **LOGRADO (sin device)**
`src/constants/braverman-questions.ts`, `app/braverman.tsx`, `app/braverman-premium.tsx`.

**TST-2 · Los cinco quizzes funcionales**: **LOGRADO (sin device)**
`src/constants/functional-quizzes.ts`, `functional-systems.ts`, `app/functional-quiz.tsx`.

**TST-3 · Banco maestro de preguntas**: **LOGRADO (sin device)**
`src/constants/master-quiz-bank.ts`.

**TST-4 · Registro de evaluaciones**: **POR REVISAR**
Medido hoy: **26 evaluaciones declaradas y solo 6 con ruta viva** (`src/constants/assessments/registry.ts` y `physical.ts`). Las otras 20 siguen abriendo su pantalla original, que es la que funciona hoy, pero el registro promete algo que en su mayoría no tiene destino nuevo.
*Para pasar a LOGRADO:* decidir si las 20 restantes se cablean o si el registro deja de declararlas.

**TST-5 · Prueba de N-Back**: **POR REVISAR** *(bug sospechado, sin confirmar)*
`src/services/mente/nback-core.ts`. La calificación deja fuera con un solo error. Sospecha: denominador por canal mal calculado o muy pocos reactivos. No confirmado. No bloquea el lanzamiento.

**TST-6 · Racha de N-Back unificada**: **LOGRADO (sin device)**
Commit `855b63a`. Se quedó la regla que no le quita días al usuario.

**TST-7 · Reporte de N-Back**: **LOGRADO (sin device)**
`src/components/reports/domains/nback.tsx`.

**TST-8 · Cronotipo**: **LOGRADO (sin device)**
`app/my-chronotype.tsx`, `src/constants/assessments/cronotipo-desempate.ts`, commit `6069efa`. Dejó de salir de un volado.

**TST-9 · La sección de tests alcanzable**: **POR IMPLEMENTAR**
`/tests` no tiene entrada desde ninguna pantalla de usuario y está a cinco niveles de profundidad.

**TST-10 · Los nueve cuestionarios de Edad ATP**: **POR IMPLEMENTAR**
Sin entrada desde ninguna pantalla de usuario.

**TST-11 · Tiempo de reacción**: **POR REVISAR**
Es la única prueba que de verdad necesita ser interactiva; el resto son formularios por doctrina. Sin verificación en dispositivo, y una prueba de reacción sin device no significa nada.

**TST-12 · Motor de cuestionarios auditado**: **POR REVISAR** *(transversal)*
No se auditó en el ciclo de cierre.

---

# ARGOS (cruza los siete pilares)

**ARG-1 · Proxy con modelo primario y respaldo**: **LOGRADO** *(con evidencia de teléfono)*
`supabase/functions/argos-proxy/index.ts:27`. Modelo primario Sonnet 5, respaldo Gemini 2.5 Flash por endpoint compatible, nunca OpenAI. Si los dos fallan responde con estado exitoso y marca de degradado, para que el cliente no muestre pantalla de falla.
*Corrección al documento maestro:* `CLAUDE.md` todavía menciona el modelo de 2024. Está desactualizado.

**ARG-2 · Cerebro central promovido por base de datos**: **LOGRADO (sin device)**
El proxy lee primero el almacén central y solo cae a la copia empaquetada si esa lectura falla. Los registros confirman que las llamadas reales usan el central.

**ARG-3 · Resincronizar la copia empaquetada del cerebro**: **POR IMPLEMENTAR**
La copia dentro de la función de borde declara versión 1.20.0 y el repositorio del cerebro va en 1.22.1, ya promovida. **Hoy no duele.** El día que la lectura central falle, ARGOS sigue contestando sin error visible con doctrina vieja, vuelve al formato anterior y **vuelve a nombrar especialidades médicas**, que es justo lo que se quitó. No hay alerta que lo detecte ni columna que registre de dónde salió el cerebro de cada respuesta.

**ARG-4 · Insight diario dentro de una ventana**: **LOGRADO (sin device)**
Bandera `INSIGHT_EN_VENTANA`, migración 275, commit `f3abb54`. La guarda anterior no era "uno al día", era una caché de 6 horas que se anulaba sola: el evento de cambio de día se emite desde 36 lugares del código. Medido a 30 días: 193 llamadas contra un diseño de una por persona por día. El primer insight del día siempre se genera.

**ARG-5 · ARGOS lee los laboratorios de verdad**: **LOGRADO** *(con evidencia de teléfono)*
Bandera `ARGOS_LEE_LABS_DE_VERDAD`, commits `258b2b9`, `b90a0c8`. Antes leía una tabla ancha de once columnas fijas con límite de un renglón, así que una pregunta sobre magnesio era literalmente incontestable aunque hubiera 244 mediciones en 60 parámetros guardadas. Cuesta 1,740 tokens sobre unos 26,000, o sea 6.7% más.

**ARG-6 · ARGOS navega la app**: **LOGRADO** *(con evidencia de teléfono)*
Bandera `ARGOS_RESUELVE_RUTAS_DINAMICAS`, commits `36796ba`, `5e92ee5`. Antes ofrecía moldes de ruta con los corchetes puestos y empujaba a una ruta inexistente, con el nombre del parámetro como título visible. Resolverlas sumó 55 destinos reales.

**ARG-7 · ARGOS explica la pantalla en la que estás**: **LOGRADO (sin device)**
**Corrección medida hoy:** un análisis de adopción declaró esta función con cero llamadas fuera de las pruebas. Ya no es cierto. Está cableada en `src/components/ui/ScreenHeader.tsx:13,57` desde el commit `4d5996e`, memoizada por ruta. El análisis quedó viejo.

**ARG-8 · ARGOS configura ajustes con confirmación**: **POR REVISAR**
Nueve ajustes de lista blanca, commit `452c8c7`. Sin verificación en dispositivo, y es una función que escribe configuración de la persona.

**ARG-9 · Límite explícito del alcance**: **LOGRADO (sin device)**
Bandera `ARGOS_LIMITE_DE_ALCANCE`, clavada en `true` por prueba. **El origen importa:** ARGOS no improvisó cuando ofreció armar preguntas para un endocrinólogo, el prompt base pedía textualmente sugerir tipo de especialista. La regla contraria estaba escrita y el límite nunca se había decidido, solo se había asumido. La derivación por urgencia médica no la toca esta bandera y no se apaga nunca.

**ARG-10 · Un turno, un tema**: **LOGRADO (sin device)**
Commit `cf70889`. Se acabó el arrastre de contexto entre turnos.

**ARG-11 · Sufijo de evidencia retirado**: **LOGRADO** *(decisión, bandera apagada a propósito)*
Bandera `ARGOS_SUFIJO_DE_EVIDENCIA = false`. Se apagó el texto, **no la observabilidad**: el chequeo sigue corriendo y registrándose. Se quitó porque eran dos avisos apilados al final y este no aparece en ningún documento legal, verificado por búsqueda en las dos carpetas legales. Se disparaba con palabras tan comunes como "toma", "protocolo" o "ayuno", o sea casi siempre. El aviso de cumplimiento sí se queda.

**ARG-12 · El proxy toma la identidad del token**: **LOGRADO (sin device)**
Bandera `ARGOS_MANDA_JWT_DEL_USUARIO`, commit `7545600`. Antes decidía cuota, techo de gasto y a quién cargar cada llamada con el identificador que venía en el **cuerpo**, que lo escribe el cliente, autenticado con la llave anónima que viaja en el paquete. Cualquiera podía quemarle el techo a otra persona, o rotar identificadores inventados para que ATP pagara la cuenta.
*Dependencia de orden, la única que importa:* la variable de entorno que exige token en el servidor **no se prende** hasta que esta bandera haya llegado a todos por actualización remota. Con la bandera apagada y la variable encendida, nadie puede usar ARGOS.

**ARG-13 · Techo antiabuso por gasto real**: **POR REVISAR**
$500 MXN diarios, commit `bec3126`. **Falla abierta a propósito** en las dos ramas de error: cortarle el asistente a todos los que pagan por un tropiezo de base cuesta más que el fraude. Nunca se validó en producción con un caso real.

**ARG-14 · Detección de intención sin lista de verbos**: **LOGRADO (sin device)**
Commit `fc8a8b7`. La conjugación dejó de decidir si ARGOS te lleva o te contesta.

**ARG-15 · Voz del asistente**: **POR REVISAR**
Función de borde `argos-voice` y `argos-tts`. Sin verificación en dispositivo.

**ARG-16 · Orquestador del coach proactivo**: **POR REVISAR**
`src/lib/coach-engine/`, 17 módulos y 10 suites, **en `main` desde el 2 de junio**. Se creyó atorado en una rama sin fusionar y es falso.
*Dudas concretas:* la recurrencia está fija en falso y no enriquece el contexto con la energía del día.

**ARG-17 · Respaldo cuando el modelo primario recibe un PDF**: **POR IMPLEMENTAR**
Si el primario falla con un documento adjunto no hay respaldo, porque el secundario no procesa documentos: responde con error duro. **El procesamiento de laboratorios por PDF no tiene red.**

**ARG-18 · Sugerencias de navegación en el chat vacío**: **LOGRADO (sin device)**
Commit `1875627` metió dos chips que enseñan que la orbe también navega. Antes, de seis sugerencias por defecto, ninguna era de navegación.

**ARG-19 · La orbe fuera de los controles**: **LOGRADO (sin device)**
Commit `605aad5`. Antes tapaba controles en más de 40 capturas, incluidos el botón de guardar del perfil, el de otorgar acceso a datos sensibles y avisos médicos cortados.

**ARG-20 · Voz conversacional de ida y vuelta**: **FUTURO**

**ARG-21 · Multimodal completo**: **FUTURO**

**ARG-22 · Cuota diaria partida por plan**: **MUERTO**
Verificado: ya no existe en el proxy.

**ARG-23 · Prima de la llamada por voz**: **MUERTO**

---

# TRANSVERSAL · NEGOCIO, INFRAESTRUCTURA Y CUMPLIMIENTO

No es un pilar, pero sin esto el 1 de septiembre no existe.

**INF-1 · Cobro web con firma verificada**: **LOGRADO (sin device)**
`payment-webhook/index.ts`, con firma real de un proveedor y token compartido del otro, e idempotencia por índice único.

**INF-2 · Cobro por tienda**: **POR REVISAR**
`revenuecat-webhook/index.ts`. **El paywall nunca se ha visto con precios reales** y el barrido lo capturó diciendo "precios sin conexión".

**INF-3 · Paywall que no se muere cuando la tienda no contesta**: **LOGRADO (sin device)**
Commit `a70cbc0`. Falla de forma honesta y recuperable.

**INF-4 · Código de activación como puente**: **LOGRADO (sin device)**
Tabla y función de canje, un solo uso, formato propio.

**INF-5 · Contabilidad de vigencias**: **LOGRADO (sin device)**
Concesiones, historial, resolución de vigencia efectiva con precedencia de tienda sobre web sobre gratis, y expiración por tarea diaria.
*Riesgo señalado:* esa tarea diaria es la de mayor consecuencia silenciosa. Si falla, hay fuga de ingreso y nadie se entera.

**INF-6 · Membresía única en el código**: **LOGRADO (sin device)**
Migración `290_membresia_unica.sql`, commits `127f683`, `b7282e8`.

**INF-7 · Protones apagados sin borrar datos**: **LOGRADO (sin device)**
La migración 290 declara explícitamente lo que **no** hace: no borra saldos, ni transacciones, ni reescribe la etiqueta de plan, ni revoca las funciones de gasto. Ese dato es de las personas y se sigue exportando. La propuesta destructiva vive escrita y sin aplicar.

**INF-8 · Qué pasa con el saldo comprado y no gastado**: **POR IMPLEMENTAR** *(decisión de negocio)*
Hay dinero de otras personas en una tabla y ninguna decisión tomada.

**INF-9 · Correo transaccional propio**: **POR IMPLEMENTAR** *(bloqueante absoluto)*
Hoy sale por el servicio compartido de desarrollo, con límites bajos y sin dominio verificado.

**INF-10 · Los cuatro correos del ciclo de vida**: **POR IMPLEMENTAR**
Acceso con código, bienvenida, recordatorio a 48 horas sin canjear, y aviso de renovación con anticipación. **El último es obligación legal desde el 13 de diciembre de 2025.** Hoy solo se manda el código, y si falta la llave queda pendiente manual.

**INF-11 · Cola de provisión con reintentos**: **POR IMPLEMENTAR**
Hoy una función hace las cuatro cosas seguidas y no hay estado por destino.

**INF-12 · Tablero del registro de clientes**: **POR IMPLEMENTAR**
No existe. Quién pagó, quién canjeó, quién está en la comunidad, qué tarea va atrasada.

**INF-13 · Reconciliación diaria contra el padrón de la comunidad**: **POR IMPLEMENTAR**
Produce cuatro listas, y la peor es "cobros activos sin membresía vigente".

**INF-14 · Identificador de membresía propio como ancla**: **POR IMPLEMENTAR**
Hoy el ancla implícita es el correo, que cambia, puede no coincidir con el del cobro, y el pago puede ocurrir antes de que exista la cuenta.

**INF-15 · Autoservicio para recuperar el código**: **POR IMPLEMENTAR**

**INF-16 · Alta manual**: **POR IMPLEMENTAR**
Solo diseñada en documento.

**INF-17 · Comunidad conectada a la app**: **POR IMPLEMENTAR**
Hoy es una constante con una dirección web. Sin alta, sin baja, sin verificación de nada.

**INF-18 · Motor de comisiones de afiliados**: **POR IMPLEMENTAR**
Las cuatro tablas están creadas y vacías. No hay motor ni captura del código en el registro.

**INF-19 · Productos configurados en las tiendas**: **POR IMPLEMENTAR**
Siguen armados con los tres planes viejos y un escalón de mejora que ya no aplica.

**INF-20 · Los cuatro secretos de producción**: **POR IMPLEMENTAR** *(gate declarado)*
Sin ellos no se sube a tiendas.

**INF-21 · Aviso de privacidad y términos completos**: **POR IMPLEMENTAR**
Sin razón social ni domicilio, y una cláusula de reembolso con una cifra inventada entre corchetes.

**INF-22 · Política de reembolso escrita**: **POR IMPLEMENTAR**

**INF-23 · Tema claro completo**: **POR REVISAR**
11 lotes aplicados, colores críticos de 1,270 a 976 (commit `c7c1608`). **Quedan ocho pantallas que salen en negro** porque no reaccionan al tema, y el contenedor raíz de navegación pinta negro durante la transición, o sea un destello negro en cada movimiento.
*Además:* el barrido de tema claro tiene 309 capturas y **el tema claro nunca se fotografió en la carpeta que la suite revisa**; ninguna captura está versionada, viven solo en una máquina.

**INF-24 · El stack de autenticación lee el tema**: **LOGRADO (sin device)**
Bandera `AUTH_RESPETA_EL_TEMA`, commits `35ef5e5`, `0d184e8`. Nació apagada porque el logotipo horizontal es blanco y sobre el fondo claro daba 1.1 de contraste: la marca desaparecía en el 22% del alto de la primera pantalla que ve quien acaba de pagar. Se resolvió montando el logo vertical como geometría de datos, sin transformador nuevo ni dependencia nueva.

**INF-25 · La firma vertical del logo**: **POR IMPLEMENTAR** *(espera decisión de marca)*
21 trazos sin montar, declarados firma de otra época.

**INF-26 · Set de iconos propio**: **POR IMPLEMENTAR** *(encargo de diseño externo)*
Prerrequisito duro del springboard. Hoy son iconos de terceros, monocromos.

**INF-27 · Tres decisiones de color**: **POR IMPLEMENTAR**
El ámbar sin legislar, el contraste del panel de coach, y la ficha de emergencia clara sobre tema oscuro.

**INF-28 · Observabilidad de errores y de producto**: **LOGRADO**
Ambas validadas en ejecución real.

**INF-29 · Mapas de origen en cada actualización remota**: **POR REVISAR**
Solo suben con el script correcto. Si alguien despliega sin él, los rastros de error mienten.

**INF-30 · Grabación de sesión**: **POR IMPLEMENTAR**
Falta activarla y revisar la primera grabación real, que es donde se decide si hay problema de privacidad.

**INF-31 · Migraciones aplicadas al remoto**: **POR REVISAR**
Cuatro (275, 276, 290, 295) se declaran aplicadas, pero ese dato es de segunda mano y no se puede verificar desde el repositorio. Dos más están escritas y sin aplicar (296 y 300).

**INF-32 · Objetos de base que ninguna migración crea**: **POR IMPLEMENTAR**
Varios objetos vivos en producción no nacen de ninguna migración. Si hubiera que reconstruir desde cero, no existen.

**INF-33 · Tarea programada de avisos sociales**: **POR IMPLEMENTAR**
Está **comentada** en su migración aunque el manual de lanzamiento la lista como requerida.

**INF-34 · Las pruebas corren en Linux**: **POR IMPLEMENTAR** *(mitigación número uno del punto único de falla)*
El árbol de dependencias tiene binarios de Windows. **Ningún agente de este ciclo pudo correr una sola prueba.** Nunca reinstalando sobre el árbol existente: eso ya destruyó un entorno una vez.

**INF-35 · Integración continua que corra la suite sola**: **POR IMPLEMENTAR**
No hay flujo de trabajo con trabajo de pruebas, ni artefacto de corrida, ni fecha conocida de la última corrida verde.

**INF-36 · Pruebas de renderizado**: **POR IMPLEMENTAR**
**Cero en todo el repositorio.** El entorno está fijado en modo servidor, no hay biblioteca de renderizado, y no existe un solo archivo de prueba con extensión de componente. Con 141 pantallas en producción, nada verifica que una pantalla monte.
*Trampa adjunta:* el patrón de inclusión exige carpeta de pruebas y extensión sin componente. El día que alguien escriba la primera prueba de componente, no se ejecuta y la suite sigue verde sin avisar.

**INF-37 · Cobertura del panel de detalle de cliente**: **POR IMPLEMENTAR**
Ver SAL-29. Es el único módulo sin pruebas automáticas ni humanas posibles.

**INF-38 · Inventario de accesos escrito**: **POR IMPLEMENTAR**
Quién es titular de cada cuenta, dónde vive el segundo factor, quién rota cada secreto. No existe. No hay archivo de ejemplo de variables de entorno, el documento de seguridad lista cuatro secretos con nombres que el código ya no usa, y hay 22 variables reales en las funciones de borde, seis sin documentar.

**INF-39 · Respaldos de la base verificados**: **POR REVISAR**
No hay script, ni flujo, ni política documentada. Probablemente existan por el plan contratado, sin confirmar.

**INF-40 · Segundo par de manos con acceso de solo lectura**: **POR IMPLEMENTAR**

**INF-41 · Dejar de editar la base fuera del repositorio**: **POR IMPLEMENTAR** *(es una regla, no código)*
Ya está escrita como regla y se rompió al menos dos veces. Es la causa raíz confirmada del hueco de SAL-28.

**INF-42 · Limpieza de alias y redirecciones**: **POR IMPLEMENTAR**
Medido hoy: 60 archivos de `app/` contienen una redirección. Alrededor de 40 muestran exactamente la misma pantalla que otra ruta.

**INF-43 · Archivos huérfanos**: **POR IMPLEMENTAR**
41 fichados y no borrados a propósito, esperando confirmación.

**INF-44 · Cobertura de servicios con efectos**: **POR IMPLEMENTAR**
Solo 13 archivos cubiertos. Y de 345 archivos de prueba, 50 leen texto de archivos en vez de comportamiento, y 51 simulan la base con un objeto vacío: **ninguna prueba del repositorio ejerce una consulta real ni valida una política de fila.**
*Consecuencia ya cobrada:* el hueco de SAL-28 vivió meses debajo de una suite verde, porque la prueba leía el archivo de migración, que seguía diciendo lo correcto, mientras el permiso real se había revertido en la base.

**INF-45 · Renderizador de PDF a imagen para el barrido**: **POR IMPLEMENTAR**
Hoy falla a propósito, capturado por diseño.

**INF-46 · Panel B2B para empresas**: **FUTURO**

**INF-47 · Modos de app**: **FUTURO**
Del PRD v1.2. Tres modos de interfaz, nunca construidos.

**INF-48 · Niveles de dificultad**: **FUTURO**
Del PRD v1.2. Tres niveles, nunca construidos.

**INF-49 · Suplementación como pilar con código de afiliado**: **FUTURO**
La pantalla existe dentro de NUTRICIÓN. El pilar y la monetización, no. Tiene un problema de cumplimiento con las tiendas por resolver antes.

**INF-50 · Grafo familiar y paquete familiar**: **FUTURO**
Parqueados desde mayo.

**INF-51 · Coaches como aliados certificados**: **FUTURO**
Falta el filtro de calidad.

**INF-52 · Precios por planes y carpeta de gating**: **MUERTO**

**INF-53 · Paywall por plan y funciones premium por transacción**: **MUERTO**

**INF-54 · Prueba gratis de 14 días**: **MUERTO** *(y con una pregunta abierta)*
Estaba definida para un plan mensual que ya no existe. Qué significa un periodo de prueba con una sola membresía es una decisión pendiente, pero la función tal como estaba diseñada está muerta.

**INF-55 · Borrar las tablas de moneda interna**: **MUERTO**
El propio inventario de pendientes recomienda no hacerlo.

**INF-56 · Legibilidad de la pantalla de administración de la economía**: **MUERTO**

**INF-57 · Ronda de fundadores**: **MUERTO**
Cerrada.

---

## Apéndice A · Las cosas que parecen rotas y no lo están

Se listan para que nadie las "arregle" y pierda días.

1. **Los pesos de Edad ATP nunca fueron placeholder.** Comentario obsoleto de dos meses; los pesos reales entraron el 8 de junio, hora y media después del comentario.
2. **El motor del coach no está atorado en una rama.** Está en `main` desde el 2 de junio.
3. **Los consentimientos no estaban tapados por su propio botón.** Es geométricamente imposible: la barra es hermana posterior del área desplazable y las casillas obligatorias viven debajo del texto.
4. **Los filtros numéricos nunca estuvieron rotos.** Las comillas venían de la presentación de la consola, no de la interfaz de datos.
5. **ARGOS no improvisó lo del endocrinólogo.** El prompt lo pedía textual.
6. **La falla abierta del techo de gasto es a propósito**, no un descuido de seguridad.
7. **La respuesta degradada con estado exitoso es deliberada**, para que el cliente no muestre pantalla de falla.
8. **La función de lectura del cerebro abierta al rol anónimo está bien:** exige una llave que no viaja en el paquete de la app. No cerrarla.
9. **El gate no verifica la bitácora de consentimientos a propósito:** una migración vieja marcó a todos los usuarios preexistentes como completados, y verificar ahí los mandaría a re-firmar lo que ya firmaron. El dato del usuario es sagrado.
10. **El repositorio no está en OneDrive.** Lo que está en OneDrive son los documentos de negocio.
11. **La pantalla de sesión de sueño en negro es correcta por diseño**, no es un fallo de tema.
12. **El conteo de banderas cambió tres veces en 24 horas y ninguna medición estuvo mal:** el archivo cambió el mismo día. Se cuenta con un comando, nunca se copia.

## Apéndice B · Trampas del entorno

1. Prohibido reinstalar dependencias, limpiar el árbol o correr el revisor de estilo. Ya destruyó un entorno.
2. El entorno de pruebas no corre en Linux por binarios de Windows.
3. Agregar un árbol de trabajo de git sobre este montaje se cuelga y deja el árbol sin índice.
4. Una diferencia de 188 archivos que no cambiaron es solo final de línea. Si la comparación ignorando finales de línea sale vacía, no se confirma.
5. Tres banderas están clavadas en `true` por prueba. Apagarlas por emergencia funciona pero deja la suite roja.
6. Reemplazar una función de base restablece los permisos por defecto, que incluyen al rol anónimo. Después de cada reemplazo hay que revocar de nuevo.

---

*Todo número de este documento se midió el 18-ago-2026 sobre el commit `2b16f93`. Cuando envejezcan, se vuelven a medir. No se copian.*
