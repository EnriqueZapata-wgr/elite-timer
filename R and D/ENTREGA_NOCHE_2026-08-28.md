# Entrega de la noche · 28-ago-2026

Rama **`overnight/28-ago`**, cuatro commits. Nada tocó `main`.

---

## Lo primero, porque cambia cómo debes leer todo lo demás

**Nada de esto se compiló.** Ni `tsc`, ni la suite. Las tres vías estaban
cerradas: `tsc` no cabe en el techo de 45 segundos que tiene mi puente contra tu
disco, en segundo plano no sobrevive entre llamadas (lo probé: el log quedó en
cero bytes y sin código de salida), y clonar el repo de mi lado está bloqueado.

Así que "garantizar que va a funcionar" no lo puedo firmar. Lo que monté es lo
más cerca que existe sin compilador:

- El **parser de TypeScript** sobre cada archivo tocado. Eso es exactamente lo
  que habría cachado el error de `StatsBar` que te tronó hace días.
- La **lógica pura transpilada y EJECUTADA** con aserciones reales. No es
  simulación: son 18 + 123 + 24 aserciones que corrieron de verdad.
- **Cuatro revisiones independientes**, una por bloque. Encontraron cuatro fallas
  graves, todas mías, todas arregladas antes de commitear.

**Tu primer comando de la mañana, y hasta que salga verde no mergees nada:**

```
git checkout overnight/28-ago
npx tsc --noEmit
npm test
```

---

## Lo que quedó hecho

### 1 · Ayuno · terminar a la hora real

Tu queja, textual: *"termino dándole aceptar, termina el ayuno, y después me
tengo que ir a mi historial, editar ayuno, poner hora de inicio y de fin"*.

TERMINAR ahora pregunta la **hora**, no la intención: *Ahora* / *Ajustar la
hora*. El servicio no cambió ni una línea: `breakFast` ya aceptaba una hora de
fin arbitraria, el `new Date()` estaba clavado en el único sitio que la llamaba.
Era UI, nada más.

Esto revierte a propósito una decisión documentada que citaba el SPEC de Zero.
Ese SPEC dice *"no te avienta un diálogo de confirmación"*, y preguntar la hora
no es confirmar: es capturar un dato que la app daba por sentado. Quedó escrito
en el código para que nadie lo vuelva a quitar por la razón equivocada.

### 2 · Ayuno · estadísticas rápidas

Promedio, más largo y racha, en una tira sin iconos debajo de la semana.

Sin iconos **no es estética**: el censo de iconos tiene vetados justo los glifos
que uno elegiría ahí (`stats-chart`, `trending-up`, `bar-chart`, `analytics`,
`flame`, `calendar`). Y sin superficies presionables, que es la doctrina de
contención del propio SPEC.

Las cuentas viven en `src/services/fasting-stats-core.ts`, puro y con prueba.
**La higiene de datos no era opcional:** tu base tiene un ayuno de **263.4 h**
—imposible, la app auto-cierra a 120— y cuatro de 0 h. Con esa basura dentro, el
promedio crudo sale en 23.8 h cuando tu ayuno típico es de 16, y "tu ayuno más
largo" habría dicho 263, que además de falso es irresponsable en una app de
salud. Se filtra antes de contar.

**Una decisión que tomé sin ti y que puedes revertir en una función:** la racha
cuenta días con al menos un ayuno válido, anclada a hoy o a ayer. No usa
"alcanzó su meta" porque esa es justo la pregunta con seis respuestas distintas
en la app, y no quería la séptima. Su salvedad está escrita: "día" es el día en
que el ayuno **empezó**, así que un ayuno de 48 h deja hueco y rompe la racha
mientras literalmente sigues ayunando. Eso se resuelve cuando decidas el día
canónico del ayuno, que sigue pendiente tuyo.

El tope del historial subió de 20 a 200. Con 20, a ti —que llevas 44 ayunos— la
app te habría dicho "tu ayuno más largo" mirando solo el último mes.

### 3 · El selector de hora · dos fallas graves que afectaban a toda la app

No eran de mi cambio, pero mi cambio las ponía en la ruta crítica de un dato de
salud. Las encontró el cuatro ojos y afectan a los **cinco** selectores.

**El selector se reseteaba solo cada 30 segundos.** El efecto de apertura tenía
`initialValue` en las dependencias, y varios llamadores le pasan `new Date()` en
línea: un objeto nuevo en cada render. La pantalla de ayuno re-renderiza cada 30
segundos por el cronómetro, así que el efecto corría **con el modal abierto**,
tiraba tu elección y recorría las tres ruedas solo. Si el tick caía justo antes
de que dieras Aceptar, cerraba con la hora equivocada y sin decir nada.

**Y confirmaba una hora distinta de la que enseñaba.** Los manejadores hacían
`return` cuando la hora caía fuera de rango, pero la rueda ya se había movido y
nadie la regresaba. Caso real: querías "ayer 22:00", la pantalla decía "Ayer
22:00", y Aceptar registraba 16 h en vez de 2.

Ahora se acota hacia adentro del rango y las ruedas se recolocan: **lo que se ve
es siempre lo que se confirma.** Verificado ejecutando 123 aserciones.

### 4 · Emociones · las etiquetas en tema claro

Tu reporte: *"esas no se alcanzan a leer"*. No era percepción, era física.

La etiqueta se pintaba **con el color de su propio cuadrante encima de celdas de
ese mismo color**, sobre un chip translúcido al 62 % cuyo fondo era además un hex
oscuro fijo. Medido contra el lienzo real:

| | tema oscuro | tema claro |
|---|---|---|
| Alta energía agradable | 5.70 | **1.17** |
| Alta energía desagradable | 4.22 | **1.74** |
| Baja energía agradable | 5.25 | **1.30** |

Chip opaco con token de tema y texto del tema: **18.4 en claro, 15.4 en oscuro**.
La identidad del cuadrante se muda a un punto de color, que ya no tiene que
cargar con la legibilidad.

Y aquí me pisé yo mismo: usé `useSurfaceTokens`, que **devuelve el tema oscuro
si el componente no está dentro de un `<ThemeReady>`**, y `checkin` no lo tiene.
Mi chip "claro" salía oscuro. Lo cachó la revisión. Ahora lee el tema real.

### 5 · Recetas · el catálogo, de punta a punta

Las 10 recetas vivían solo en un archivo TS, su función de siembra no la llamaba
nadie, la tabla tenía cero filas, y la pantalla leía de **otra tabla** que ni
siquiera tiene columnas para los pasos.

- **`supabase/migrations/309_recetas_catalogo_publico.sql`**, generada **desde el
  archivo fuente**, no transcrita a mano. `created_by = NULL` a propósito: sin
  dueño, ninguna policy de cliente puede editarlas ni borrarlas.
- Los ingredientes se guardan como `{name, quantity}` y no como
  `{name, amount, unit}`. Con la forma original, la lista de súper habría perdido
  **todas** las cantidades en silencio: `shopping-list-core` solo lee `quantity`.
  No truena, degrada callado, que es peor de encontrar.
- La pantalla ahora une catálogo + tuyas, con la traducción en un núcleo puro con
  prueba, y con candados donde estaba el riesgo real: tocar el corazón de una
  receta del catálogo hacía un UPDATE que afecta cero filas y **no devuelve
  error**, así que el corazón se quedaba pintado sin persistir.

---

## Lo que necesito de ti, en orden

1. **`npx tsc --noEmit` y `npm test`** en la rama. Si sale rojo, pégamelo.
2. **`npx supabase db push`** para la migración 309. No la apliqué yo: tu
   doctrina dice que las migraciones van por ahí, no por el SQL Editor.
3. **La prueba de subir estudios**, que sigue siendo lo único bloqueante y se
   destraba con 30 segundos tuyos: abre Mi Salud, toca subir PDF, elige
   Laboratorios, y pégame lo que salga en la consola. Están puestas cuatro
   migajas de log que separan las tres causas posibles.
4. **Borra los cuatro `MENSAJE_COMMIT_*.txt`** de la raíz cuando termines.

---

## Deuda que dejo dicha, no escondida

- **El detalle de receta es un `Alert`, no una hoja.** Merece tipografía propia.
  Va así porque no había compilador para validar una hoja nueva completa, y un
  Alert correcto vale más que una hoja sin probar.
- **El filtro "Favoritas" deja fuera todo el catálogo** por construcción. Falta
  decidir si merece un tercer chip.
- **La mediana se calcula y no se pinta.** Es el número más honesto cuando hay
  outliers, y hoy solo se ve el promedio.
- **`fitness` y `execution_logs` no se tocaron.** Es el de más impacto visible
  que queda: hoy entrenas tres días y `/progress`, `/history` y la card de
  reportes dicen cero. Necesita compilador para hacerse con seguridad.
- **La racha usa la fecha de inicio del ayuno**, con la consecuencia ya descrita.
- **Súper, protocolo, suplementación, tribu, agenda, ARGOS, mapa funcional y
  ajustes** siguen en el backlog sin empezar.

---

# Segunda mitad de la noche · los visuales y el manual de marca

Leí `docs/MANUAL_DE_MARCA.md` (el actualizado, 1,330 líneas). Su capítulo 14 es
una lista de contradicciones **ya verificadas en código**, así que la tomé como
lista de trabajo en vez de inventar una. Lo que sigue sale de ahí.

## La causa raíz que apareció al medir

El sistema tenía `error` calibrado por tema, pero **no tenía con qué decir
"advertencia" ni "crítico" ni "éxito"**. Esos tres vivían como hexes de la
familia Tailwind escritos a mano por toda la app. Sobre superficie clara dan
entre **1.19 y 3.03** de contraste, o sea que en tema claro sencillamente no se
veían.

Eso explica de golpe tres cosas que parecían separadas: por qué `cycle.tsx`
necesitó una paleta a mano hace dos días, por qué la pantalla del coach usaba
`t.error` para todo (era el único color de estado legible en los dos temas), y
por qué la barra de UV desaparecía en claro.

**Lo que entró:** `exito`, `advertencia` y `critico` en `AppThemeTokens`, y
`ESCALA_NIVEL` + `colorNivel()` para las escalas de grado de cinco pasos. En
tema OSCURO valen exactamente lo que ya valían, así que ese tema no se movió.

## Lo que quedó arreglado, con el número al lado

| Dónde | Qué pasaba | Medido |
|---|---|---|
| `app/solar.tsx` | La barra de UV por hora, el spinner, seis iconos y los dos botones de acción no se veían en claro | 1.19 a 1.73 → todos sobre 4.5 |
| `app/braverman.tsx` | La barra de grado de deficiencia y el filo de la card | 1.43 a 3.22 → sobre 4.5 |
| `AdherenceCalendar` | **"Agosto 2026" era invisible en tema claro**, y el día de hoy también. No se podía saber ni el mes ni el día | 1.38 y 1.14 → 15.75 y 5.56 |
| `reports/domains/labs.tsx` | `atencion` usaba el coral de INTERFAZ, el de un campo mal llenado, para un biomarcador fuera de ventana | ahora `t.critico` |
| `ClientDetailScreen` | 64 sitios pintaban estado con hexes invisibles en claro; el coach veía huecos donde hay semáforo | 1.34 a 1.86 → sobre 4.5 |

Y tres arreglos que no son de contraste sino de significado, que valen más:

1. **La ausencia de dato se pintaba de rojo de alarma.** Un cliente sin presión
   arterial y sin tasa de envejecimiento capturadas hacía que la pantalla del
   coach gritara en rojo, donde el mensaje correcto es "todavía no se sabe".
2. **La tarjeta "Condiciones" tenía el rojo fijo:** seguía roja con cero
   condiciones activas.
3. **Dos rojos distintos, uno al lado del otro,** describiendo el mismo hecho
   clínico dentro de la misma tarjeta.

## El error que cometí y que los cuatro ojos cazaron

Vale la pena que lo leas, porque es la clase de error que se repite.

**Medí la tinta contra el papel, no contra el papel teñido.** Verifiqué los tres
tokens nuevos contra la card limpia (5.22 / 5.07 / 7.11) y di el trabajo por
bueno. Pero en trece sitios el texto va encima de un tinte **del mismo color**,
y eso sube la luminancia del fondo: al 12.5% varios pares caían a 4.28 en claro,
y uno **bajó el tema oscuro** de 5.41 a 4.21, justo lo que mi propio mensaje de
commit decía no haber tocado. Corregido al 6%, donde los tres aguantan en los
dos temas.

Y una peor: puse `t.sinDatos` como color de LETRA en el campo de presión
arterial. Es un color de punto (1.73). Mientras el coach teclea corren 500 ms de
rebote más el guardado, y en todo ese rato **los dígitos que acababa de escribir
eran invisibles**; si el guardado tronaba, se quedaban invisibles hasta salir de
la pantalla. Corregido.

Las dos las encontró un agente revisor, no yo. El commit `103bbe2` es la
corrección completa, con los números.

## Lo que corregí en los documentos

- **`docs/DESIGN_SYSTEM.md`**: nueve filas que el manual denunciaba, más **22
  que nadie había detectado**. La causa raíz es que `ELEVATION` dejó de tener
  hexes: sale de una bandera que se mueve por OTA, así que un documento que
  escriba `ELEVATION[1] = #121212` no puede estar bien nunca más. Le puse en la
  cabecera que los valores viven en el manual y él es el criterio.
- **`docs/MANUAL_DE_MARCA.md`**: marqué 14.5 y 14.8 como trabajadas, **desmentí
  14.7** (el ámbar del delfín no era un segundo color del delfín, era el color de
  advertencia haciendo su trabajo) y **desmentí la explicación de 14.9** (ese
  archivo sí está candado, y por partida doble). Añadí 14.10 y 14.11.
- **Dos erratas del propio manual**, que dejo escritas porque son la prueba de
  por qué un documento no se recomprueba contra otro documento: 14.8 decía
  "las siete filas" y la tabla tiene nueve; y afirmaba que ningún escalón de
  lista usa 40 ms cuando 40 ms es **el más usado**, 15 de 40 sitios.

## Lo que NO hice, y por qué

- **No ensanché los ratchets de literales.** Está medido: llevar el escaneo a
  `app/` completa más `src/components/` daría **125 violaciones en 47 archivos**.
  Un candado que deja la suite roja no protege nada. Hay dos etapas gratis que sí
  caben y las dejo listas: añadir `.ts` a las extensiones (**2 violaciones**:
  `argos-avatar-core.ts` 53 y `logo-atp-geometria.ts` 58) y añadir `src/screens/`
  (**0 violaciones**). Antes de las etapas grandes hace falta una exención de
  superficie editorial, o el candado marcaría a los tres archivos que él mismo
  bendice.
- **No toqué el nido de nutrición** de `ClientDetailScreen` (unos 10 usos de rojo
  para scores de comida y macros). No es un problema de token, es de doctrina:
  hay que decidir si un score de nutrición de 45 merece el mismo rojo que una
  condición cardíaca presente. Yo creo que no, pero esa no es mi decisión y
  cambiarlo sin regla sería sustituir una arbitrariedad por otra.
- **No recalibré los quince colores de dominio.** Los quince fallan el 3:1 como
  icono en tema claro (de 1.17 a 2.90). Van siempre con su título al lado, así
  que no se pierde significado. Recalibrar quince colores de identidad sin poder
  ver un dispositivo, a nueve días de tienda, es exactamente el cambio que no se
  hace de noche.
- **`AgendaMiniCard`** solo necesita nombre (`SUPERFICIE_EDITORIAL` en
  `brand.ts`) y tocar la línea 154 de `mb31b1-ambito.test.ts` en el mismo commit.
  Cero pixeles de cambio. Lo dejo escrito en el manual, sin aplicar, porque toca
  un test y prefiero que corra la suite primero.

## Lo que más me preocupa que revises

**`src/screens/coach` y `src/components/reports` no los mira ningún candado.**
Son de las pantallas más grandes del producto y todo lo de esta noche lo
encontró alguien leyendo, no una máquina. Es la deuda estructural que queda.

## Los comandos de la mañana

```
npx tsc --noEmit
npm test
```

Nada de esta noche pasó por un compilador: en este entorno `tsc` no cabe en el
techo de 45 segundos. Lo que sí hice, en cada pieza, fue pasar el **parser de
TypeScript** (sintaxis limpia en los diez archivos), **ejecutar** la lógica pura
transpilándola, y calcular cada contraste con el `contrastRatio` del propio
repositorio, no con una copia. Suman **212 aserciones ejecutadas, cero fallas**.
Pero eso no es un type check, y lo digo claro: **el primer comando de tu mañana
tiene que ser `npx tsc --noEmit`.**

Si algo truena, el orden de sospecha es este: `ClientDetailScreen.tsx` (64
sustituciones, el cambio más masivo), luego `brand.ts` (tres claves nuevas en
una interfaz que otros archivos anotan), luego el resto.
