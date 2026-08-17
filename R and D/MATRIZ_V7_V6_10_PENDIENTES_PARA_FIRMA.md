# Matriz de salud funcional V7 y V6 · Diez pendientes para revisión y firma

**Documento para la Chief Science Officer. Fecha: 16 de agosto de 2026.**

**Qué se pide en este documento:** una decisión clínica por cada uno de los diez
casos. No se propone ningún rango nuevo. Donde el problema es de captura y no de
criterio, se dice explícitamente para que se pueda firmar en dos minutos.

**Qué NO se hizo:** no se tocó un solo valor de la matriz. La matriz V7 (hombres)
y V6 (mujeres) sigue exactamente como está. Este documento solo describe lo que
ya está escrito ahí y lo que ese contenido produce cuando la app lo usa.

---

## Resumen ejecutivo

Se auditaron diez casos anotados en el código contra la matriz real. **Los diez
existen y están correctamente descritos.** Dos estaban subestimados (se explica
en cada ficha) y se encontró un caso nuevo que nadie había anotado.

**Reparto por dirección de la falla:**

| Tipo | Casos | Claves |
|---|---|---|
| Falso negativo (tranquiliza sin motivo) | 2 | `t3_libre`, `apolipoproteinas_b` |
| Bidireccional (falla en ambos sentidos según el valor) | 2 | `testosterona_total`, `acido_urico` |
| Falso positivo (alarma donde no la hay) | 1 | `ldh` |
| Etiqueta de unidad inexistente que sí llega a la pantalla | 2 | `homocisteina`, `insulina` |
| Etiqueta inconsistente dentro de la matriz, hoy compensada por el código | 3 | `hba1c`, `hematocrito`, `rdw_cv` |
| **Total** | **10** | |

**Los tres que urgen:**

1. **`t3_libre`.** Es el único que le dice a alguien que está bien cuando no lo
   está, y además lo dice con un párrafo escrito que afirma: *"Estás produciendo
   y convirtiendo bien. Es el número que más se correlaciona con cómo te sientes."*
   Una T3 libre en el piso de su rango, reportada en pmol/L, cae dentro de la
   ventana por coincidencia numérica y recibe 100 de 100.

2. **`ldh` en mujeres.** El dominio de inflamación de la matriz de mujeres trae
   copiada la banda del NLR (0.1 a 1.5). Como la LDH se mide en U/L y nunca baja
   de 50, **toda mujer que suba una LDH recibe 0 de 100 y la etiqueta "Pide
   atención"**, sin excepción, aunque el valor sea perfectamente normal. Es el de
   mayor volumen de personas afectadas.

3. **`apolipoproteinas_b`.** Es el parámetro de mayor peso del dominio
   cardiovascular (0.15) y su segundo corte es un cero. Además de dejar muerta la
   banda de 25 puntos (que es lo que estaba anotado), el cero hace que **todo el
   intervalo de 0 a 39 mg/dL puntúe 50**, o sea que una ApoB implausiblemente baja
   se reporta como "Aceptable" en vez de crítica.

**Hallazgo nuevo (no estaba anotado):** `edad_corporal` en el dominio de sueño
tiene los cortes fuera de orden igual que `apolipoproteinas_b`, y contradice al
mismo parámetro en composición corporal. Se documenta en el anexo.

---

## Nota de urgencia: la ficha por biomarcador cambió el costo del error

Hasta hace poco, un rango mal escrito se traducía en un número y un color dentro
de una lista. Ahora existe una **ficha por biomarcador**: al tocar un renglón de
ATP Labs se abre una pantalla que explica el marcador con párrafos escritos a
mano, y **elige cuál párrafo mostrar según de qué lado de la ventana cayó el
valor**. Hay tres versiones de cada texto: por debajo, dentro y por arriba.

Eso significa que hoy un rango mal escrito ya no produce un número raro: produce
una explicación completa, coherente y convincente de algo que no está pasando.
El mecanismo exacto es este: si el valor queda por debajo del corte inferior de
la ventana óptima se muestra el texto de "bajo"; si queda por arriba, el de
"alto"; si no, el de "dentro".

Consecuencia práctica de la lista de abajo: `t3_libre` y `apolipoproteinas_b`
tienen texto escrito, y ese texto es tranquilizador justo en la dirección en que
fallan. `ldh` todavía no tiene texto escrito, así que hoy solo muestra la ventana
y la etiqueta, pero en cuanto se le escriba heredará el problema.

---

## Cómo leer los números de este documento

La matriz define **ocho cortes** por parámetro, que arman nueve bandas. Los dos
cortes centrales (el cuarto y el quinto) son la **ventana óptima**, la que vale
100 puntos. Hacia afuera la puntuación baja: 80, 50, 25 y 0.

Cómo se traduce la puntuación a lo que ve la persona en pantalla:

| Puntuación | Etiqueta en la app |
|---|---|
| 100 | En tu ventana |
| 80 o 50 | Aceptable |
| 25 o 0 | **Pide atención** |

Un detalle que importa para varios casos: **cuando un mismo parámetro está en dos
dominios, el motor lo puntúa dos veces, una con cada ventana, y las dos entran a
la Edad ATP.** La pantalla, en cambio, muestra solo la primera que encuentra
(gana el dominio que aparece primero en el orden de la matriz: cardiovascular,
composición corporal, hábitos, inflamación, inmunidad, metabolismo, renal,
hormonal, sueño, vitalidad). Por eso hay casos donde la pantalla tranquiliza
mientras la Edad ATP penaliza, o al revés.

---

# GRUPO A · Falsos negativos

Estos son los que pueden hacer daño: le dicen a alguien que está bien cuando no
lo está.

---

## A1 · `t3_libre` · T3 libre

### Dónde vive en la matriz
Un solo dominio: **Sistema hormonal**, en hombres y en mujeres, con peso 0.10 en
ambos. Las bandas son idénticas para los dos sexos.

### Qué dice la matriz hoy

| | Valor |
|---|---|
| Etiqueta de unidad | `ng/dl` |
| Los ocho cortes | 2.2 · 2.5 · 2.8 · **3.2** · **4.2** · (vacío) · (vacío) · (vacío) |
| Ventana óptima | 3.2 a 4.2 |
| Unidad en que la base de datos guarda este parámetro | **pg/mL** |

La inconsistencia interna: en ng/dL la T3 libre normal ronda 0.2 a 0.5. La
ventana escrita (3.2 a 4.2) es un orden de magnitud mayor. Esas cifras
corresponden a **pg/mL**, que es la unidad en la que la base efectivamente guarda
este parámetro y la que el laboratorio suele reportar en México.

### Qué produce ese error en la práctica

El riesgo no es el desajuste en sí, sino una **coincidencia numérica** con una
tercera unidad. La T3 libre se reporta también en pmol/L, con rango de referencia
aproximado de 3.5 a 6.5 pmol/L. La equivalencia es 1 pmol/L = 0.651 pg/mL, así
que 3.5 a 6.5 pmol/L equivale a 2.28 a 4.23 pg/mL. Ese intervalo cae casi encima
del intervalo completo de la matriz (2.2 a 4.2), pero **desplazado**.

Caso concreto de una persona con T3 libre en el piso de su rango:

| | |
|---|---|
| Resultado del laboratorio | **3.5 pmol/L** (piso del rango de referencia, sospecha de conversión periférica pobre) |
| Equivalente real | 2.28 pg/mL |
| Puntuación que da la app hoy | **100 de 100** (3.5 cae dentro de 3.2 a 4.2) |
| Etiqueta que muestra | **En tu ventana** |
| Puntuación que corresponde leyendo la ventana en pg/mL | **25 de 100** (2.28 cae entre 2.2 y 2.5) |
| Etiqueta que corresponde | **Pide atención** |

Y el texto que la ficha por biomarcador muestra hoy junto a ese 100:

> *"Estás produciendo y convirtiendo bien. Es el número que más se correlaciona
> con cómo te sientes."*

El error se invierte y se vuelve alarma si alguien captura de verdad en ng/dL:
una T3 libre de 0.35 ng/dL, perfectamente normal, queda por debajo del primer
corte y puntúa **0 de 100**, con el texto de "bajo".

### Dirección de la falla
**Falso negativo.** Tranquiliza a quien no debería estar tranquilo. Es el más
peligroso de los diez por eso.

### A qué le pega (verificado en el código)
- **ATP Labs** (`app/edad-atp/labs.tsx`): renglón, color y ventana impresa.
- **Ficha por biomarcador** (`app/edad-atp/lab/[key].tsx`): elige el párrafo de
  "dentro" y lo muestra como afirmación.
- **Edad ATP**, sub edad hormonal, con peso 0.10 del dominio.
- **Contexto de ARGOS** (`src/services/argos-labs-core.ts`): al asistente le llega
  la línea completa, con valor, ventana y el estado "en tu ventana". ARGOS
  razona sobre esa afirmación.
- **Reportes**, dominio LABS.
- **Cómo te leo** (`app/salud/mi-lectura/index.tsx`).
- **Panel del coach** (detalle de cliente).

### Decisión que se necesita

Este NO es un caso de captura: hay que decidir la unidad de referencia del
parámetro y, si cambia, revisar los cinco cortes.

- [ ] **Opción 1.** Las bandas están bien y la etiqueta está mal: corregir solo el
      texto de `ng/dl` a `pg/mL` y dejar los cortes 2.2 / 2.5 / 2.8 / 3.2 / 4.2 tal cual.
- [ ] **Opción 2.** La unidad de referencia debe ser otra. Indicar cuál y con qué cortes.
- [ ] **Opción 3.** Otra:

**Nota adicional para la decisión:** los tres cortes superiores están vacíos, así
que hoy **no existe banda de exceso**. Una T3 libre francamente alta cae en
"fuera de rango" (0 puntos) sin gradación. Si eso es intencional, conviene
dejarlo escrito.

**Firma / fecha:** ______________________

---

## A2 · `apolipoproteinas_b` · Apolipoproteína B

### Dónde vive en la matriz
Un solo dominio: **Cardiovascular**, en hombres y en mujeres, con **peso 0.15**,
que es el peso más alto de todo ese dominio. Bandas idénticas para ambos sexos.

### Qué dice la matriz hoy

| | Valor |
|---|---|
| Etiqueta de unidad | `mg/dl` (correcta) |
| Los ocho cortes | **30 · 0** · 40 · 50 · 99 · 110 · 125 · 150 |
| Ventana óptima | 50 a 99 mg/dL |

El segundo corte es un **cero**. Los cortes tienen que ir en orden ascendente y
el 0 rompe ese orden entre el 30 y el 40.

### Qué produce ese error en la práctica

Dos efectos, no uno. El segundo es el que estaba subestimado en la anotación
original.

**Efecto 1 (el que ya estaba anotado): la banda de 25 puntos queda muerta.**
Esa banda pide que el valor sea "mayor o igual a 30 y menor que 0", que es
imposible. Nadie puede sacar 25 puntos en ApoB.

**Efecto 2 (no estaba anotado, y es el que hace daño): la banda de 50 puntos se
traga todo el intervalo de 0 a 39 mg/dL.** Al quedar el 0 en esa posición, la
banda de 50 puntos pasa a pedir "mayor o igual a 0 y menor que 40", que cubre
absolutamente todos los valores bajos.

| Resultado del laboratorio | Puntuación hoy | Etiqueta hoy | Lo que corresponde con cortes en orden |
|---|---|---|---|
| ApoB **15 mg/dL** (implausiblemente baja, obliga a descartar malabsorción o hipobetalipoproteinemia) | **50** | Aceptable | **0**, crítica |
| ApoB **25 mg/dL** | **50** | Aceptable | **0**, crítica |
| ApoB **35 mg/dL** | **50** | Aceptable | **25**, pide atención |
| ApoB 70 mg/dL | 100 | En tu ventana | 100, correcto |

Y el texto que la ficha muestra hoy para ese 15 mg/dL:

> *"Menos partículas circulando se lee bien."*

### Dirección de la falla
**Falso negativo** en todo el extremo bajo. Ningún valor bajo de ApoB puede
disparar alarma hoy.

### A qué le pega (verificado en el código)
- **ATP Labs** y **ficha por biomarcador** (tiene texto escrito completo).
- **Edad ATP**, sub edad cardiovascular, con el peso más alto del dominio (0.15).
- **Contexto de ARGOS**.
- **Reportes**, dominio LABS. **Cómo te leo**. **Panel del coach**.

### Decisión que se necesita

**Este caso parece ser puramente de captura, no de criterio clínico.** Todo apunta
a que la celda del segundo corte quedó vacía en el Excel original y se leyó como
cero. Los otros siete cortes son coherentes entre sí. Lo único que hace falta es
el número que va entre 30 y 40.

- [ ] **Opción 1 (captura).** El segundo corte debe ser un valor entre 30 y 40.
      Indicar cuál: ____________
- [ ] **Opción 2.** No hay banda intermedia ahí y la posición debe quedar vacía
      (sin banda), no en cero.
- [ ] **Opción 3.** Otra:

**Firma / fecha:** ______________________

---

# GRUPO B · Bidireccionales

Fallan en los dos sentidos según el valor y según la pantalla. Contienen una cara
de falso negativo, por eso van antes que los falsos positivos puros.

---

## B1 · `testosterona_total` · Testosterona total

### Dónde vive en la matriz
**Dos dominios en cada sexo**, con ventanas incompatibles entre sí:

| Sexo | Dominio | Etiqueta | Ventana óptima | Peso |
|---|---|---|---|---|
| Hombres | Sistema hormonal | `ng/ml` | **7 a 12** | 0.12 |
| Hombres | Sueño | `ng/dl` | **7 a 13** | 0.07 |
| Mujeres | Sistema hormonal | `ng/ml` | **0.2 a 0.55** | 0.05 |
| Mujeres | Sueño | `ng/dl` | **7 a 13** | 0.07 |

La base de datos guarda este parámetro en **ng/dL** (por ejemplo 993). La app ya
aplica una conversión en la lectura, dividiendo entre 100 los valores por arriba
de 20, para poder compararlos contra la ventana escrita en ng/mL. Esa conversión
ya está en producción y funciona bien para hombres.

### Qué dice la matriz hoy, y qué está mal

**Problema 1: el dominio de sueño está etiquetado en ng/dL pero sus cifras son de
ng/mL.** Los cortes de sueño (3 · 4 · 5 · 7 · 13 · 15 · 20 · 25) son magnitudes
de ng/mL, iguales a las de sistema hormonal. En ng/dL de verdad, 13 sería una
testosterona de castración.

**Problema 2, el grave: en mujeres, el dominio de sueño repite la ventana
masculina.** Sistema hormonal dice 0.2 a 0.55 (que corresponde a 20 a 55 ng/dL, un
rango femenino correcto). Sueño dice 7 a 13, que corresponde a 700 a 1300 ng/dL,
un rango masculino. La diferencia dentro del mismo sexo es de **factor 23 a 35**,
no de factor 20 como se había anotado.

### Qué produce ese error en la práctica

**Caso femenino, el de mayor volumen:**

| | |
|---|---|
| Mujer con testosterona total | **40 ng/dL** (normal) |
| Valor después de la conversión | 0.4 ng/mL |
| Dominio Sistema hormonal | **100 de 100**, "En tu ventana". Correcto. |
| Dominio Sueño | **0 de 100** (0.4 queda por debajo del primer corte, que es 3) |
| Lo que ve en pantalla | "En tu ventana" (gana sistema hormonal, que va primero) |
| Lo que le pasa a su Edad ATP | El dominio de sueño se penaliza con un cero de peso 0.07, sin que nada en la pantalla lo explique |

Esto le pasa a **toda mujer que suba una testosterona total**.

**Caso masculino, la cara de falso negativo:**

| | |
|---|---|
| Hombre con testosterona total | **18 ng/dL** (hipogonadismo severo, nivel de castración) |
| Valor después de la conversión | 18 (no se convierte: la conversión solo actúa por arriba de 20) |
| Dominio Sueño | **50 de 100**, etiqueta **"Aceptable"** (18 cae entre los cortes 15 y 20) |
| Dominio Sistema hormonal | 0, correcto |

O sea que en el dominio de sueño, una testosterona de castración se lee como
aceptable.

**Hallazgo adicional que no estaba anotado: el umbral de conversión de 20 no
sirve para mujeres.** El rango femenino real de testosterona total va
aproximadamente de 15 a 70 ng/dL. Los valores reales de 15 a 20 ng/dL quedan por
debajo del umbral y no se convierten, así que se comparan como si fueran ng/mL:

| | |
|---|---|
| Mujer con testosterona total | **18 ng/dL** (bajo normal) |
| Lo que hace la app | No lo convierte, lo compara como 18 ng/mL |
| Puntuación hoy | **0 de 100**, "Pide atención" |
| Puntuación con la conversión aplicada (0.18 ng/mL) | **80 de 100**, "Aceptable" |

El umbral de 20 se calibró sobre magnitudes masculinas. En hombres nadie tiene 20
ng/dL salvo en un rango que la ventana ya marca como bajo, así que ahí funciona.
En mujeres, ese umbral parte el rango normal por la mitad.

### Dirección de la falla
**Bidireccional.** Falso positivo masivo en mujeres (dominio de sueño y umbral de
conversión) y falso negativo puntual pero grave en hombres con hipogonadismo
severo.

### A qué le pega (verificado en el código)
- **ATP Labs** y **ficha por biomarcador** (tiene texto escrito).
- **Edad ATP**: dos dominios a la vez, hormonal (0.12 en hombres, 0.05 en mujeres)
  y sueño (0.07 en ambos), con la sub edad de sueño penalizada sin explicación.
- **Contexto de ARGOS**. **Reportes**. **Cómo te leo**. **Panel del coach**.

### Decisión que se necesita

Hay que decidir **cuál de las dos ventanas manda por sexo**, y confirmar la unidad
de referencia.

- [ ] **Opción 1.** La ventana de sistema hormonal manda en los dos sexos, y el
      dominio de sueño debe usar la misma ventana de su propio sexo (corrigiendo
      también la etiqueta a `ng/mL`).
- [ ] **Opción 2.** El dominio de sueño tiene criterio propio y distinto. Indicar
      la ventana correcta para mujeres: ____________
- [ ] **Opción 3.** Otra:

**Decisión aparte, sobre el umbral de conversión (esta sí es técnica, pero
necesita el dato clínico):** ¿cuál es el valor de testosterona total en ng/dL por
debajo del cual ya no es plausible encontrar a una mujer? Ese número reemplaza al
20 actual para mujeres. Valor: ____________

**Firma / fecha:** ______________________

---

## B2 · `acido_urico` · Ácido úrico

### Dónde vive en la matriz
**Dos dominios en cada sexo**: Inflamación y Renal y micronutrientes.

| Sexo | Dominio | Ventana óptima | Peso |
|---|---|---|---|
| Hombres | Inflamación | **4 a 6** mg/dL | 0.06 |
| Hombres | Renal y micronutrientes | **3.5 a 5.5** mg/dL | 0.10 |
| Mujeres | Inflamación | 3.6 a 5 mg/dL | 0.06 |
| Mujeres | Renal y micronutrientes | 3.6 a 5 mg/dL | 0.10 |

**En mujeres las dos ventanas coinciden y no hay problema.** La contradicción es
solo en hombres.

### Qué dice la matriz hoy
Hombres, Inflamación: (vacío) · (vacío) · 3 · **4** · **6** · 7 · 8 · 9
Hombres, Renal: (vacío) · (vacío) · 3 · **3.5** · **5.5** · 6.5 · 7.5 · 8

La ventana de inflamación está corrida medio punto hacia arriba respecto a la
renal, en los dos extremos.

### Qué produce ese error en la práctica

El motor puntúa las dos ventanas y las dos entran a la Edad ATP con pesos
distintos. La pantalla muestra solo la de inflamación, porque ese dominio va
antes en el orden de la matriz.

| Hombre con ácido úrico | Inflamación (lo que ve) | Renal (lo que pesa más) | Efecto |
|---|---|---|---|
| **5.8 mg/dL** | **100**, "En tu ventana" | **80**, "Aceptable" | La pantalla tranquiliza mientras la Edad ATP renal se descuenta |
| **3.8 mg/dL** | **80**, "Aceptable" | **100**, "En tu ventana" | La pantalla exige de más sobre un valor que el propio dominio renal considera óptimo |
| 5.0 mg/dL | 100 | 100 | Coinciden |

### Dirección de la falla
**Bidireccional**, según de qué lado de la ventana caiga el valor. Ninguna de las
dos direcciones es catastrófica por sí sola, pero **la app se contradice consigo
misma**: el mismo número recibe dos veredictos distintos en la misma sesión, uno
en la ficha y otro implícito en la sub edad renal.

### A qué le pega (verificado en el código)
- **ATP Labs** y **ficha por biomarcador** (tiene texto escrito): siempre con la
  ventana de inflamación.
- **Edad ATP**: dos dominios, con el renal pesando casi el doble (0.10 contra 0.06).
- **Contexto de ARGOS**: le llega solo la ventana de inflamación.
- **Reportes**. **Cómo te leo**. **Panel del coach**.

### Decisión que se necesita

- [ ] **Opción 1.** Es un solo criterio y debe unificarse en los dos dominios de
      hombres, como ya está en mujeres. Ventana que manda: ____________
- [ ] **Opción 2.** Son criterios distintos a propósito (la lectura inflamatoria
      del ácido úrico no es la lectura renal) y deben quedarse separados. En ese
      caso hay que decidir cuál se muestra en la ficha.
- [ ] **Opción 3.** Otra:

**Firma / fecha:** ______________________

---

# GRUPO C · Falsos positivos

Alarman donde no hay nada. No hacen el daño de un falso negativo, pero destruyen
la confianza en el panel y mandan gente a consulta sin motivo.

---

## C1 · `ldh` · Deshidrogenasa láctica

### Dónde vive en la matriz
**Cuatro ventanas para el mismo parámetro**, dos por sexo, todas etiquetadas
`Ratio` cuando la LDH se mide en **U/L**:

| Sexo | Dominio | Los ocho cortes | Ventana óptima | Peso |
|---|---|---|---|---|
| Hombres | Inflamación | 109 · 120 · 135 · **167** · **187** · 205 · 220 · 246 | 167 a 187 | 0.05 |
| Hombres | Inmunidad | 5 · 10 · 15 · **20** · **200** · 300 · 400 · 500 | 20 a 200 | 0.05 |
| Mujeres | Inflamación | (vacío) · (vacío) · (vacío) · **0.1** · **1.5** · 2 · 2.2 · 2.5 | **0.1 a 1.5** | 0.05 |
| Mujeres | Inmunidad | 5 · 10 · 15 · **20** · **200** · 300 · 400 · 500 | 20 a 200 | 0.05 |

**La fila de mujeres, inflamación, es idéntica renglón por renglón a la del NLR
(relación neutrófilos sobre linfocitos) que está tres filas más arriba en el mismo
dominio.** Es una copia de celda, no un criterio.

### Qué produce ese error en la práctica

**En mujeres el fallo es total, no parcial.** Como la LDH se mide en U/L y el
valor más bajo que se ve en la práctica ronda 100, **ningún valor real de LDH
puede caer dentro de 0.1 a 1.5**. La consecuencia es absoluta:

| | |
|---|---|
| Mujer con LDH | **180 U/L** (perfectamente normal) |
| Dominio Inflamación (el que se muestra) | **0 de 100** |
| Etiqueta en pantalla | **Pide atención** |
| Ventana impresa junto al valor | "0.1 a 1.5 Ratio" |
| Dominio Inmunidad (el que no se ve) | **100 de 100**, "En tu ventana" |
| Lo que le llega a ARGOS | "LDH 180 Ratio ventana 0.1 a 1.5 pide atención" |

Esto le pasa a **toda mujer que suba una LDH, sin excepción**. El valor no
importa: 120, 180 o 400 dan todos cero.

**En hombres el problema es distinto y más leve, pero real.** Las dos ventanas
difieren en anchura por casi un orden de magnitud: 20 U/L de ancho en inflamación
contra 180 U/L en inmunidad. El mismo valor recibe veredictos opuestos:

| Hombre con LDH | Inflamación (lo que ve) | Inmunidad (lo que no ve) |
|---|---|---|
| 150 U/L | **80**, "Aceptable" | **100**, "En tu ventana" |
| 250 U/L | **0**, "Pide atención" | **80**, "Aceptable" |

### Dirección de la falla
**Falso positivo**, sistemático y del 100% en mujeres.

### A qué le pega (verificado en el código)
- **ATP Labs**: renglón en rojo con la ventana "0.1 a 1.5 Ratio" impresa al lado.
- **Ficha por biomarcador**: **la LDH todavía no tiene texto explicativo escrito**,
  así que hoy la ficha muestra la ventana y el estado pero no un párrafo. En
  cuanto se le escriba el contenido, heredará el problema y pasará a explicar con
  prosa una LDH elevada que no existe.
- **Edad ATP**: dos dominios, inflamación e inmunidad, con 0.05 de peso cada uno y
  puntuaciones opuestas.
- **Contexto de ARGOS**: recibe la línea con la ventana falsa y el estado "pide
  atención", y razona sobre eso.
- **Reportes**. **Cómo te leo**. **Panel del coach**.

### Decisión que se necesita

Hay dos cosas distintas que decidir.

**Decisión 1, que parece ser puramente de captura:** la fila de mujeres en
inflamación está copiada del NLR. Basta con reemplazarla por la ventana correcta.

- [ ] **Opción 1a.** Usar en mujeres la misma ventana de inflamación que hombres
      (167 a 187), es decir que era una fila que se sobreescribió por accidente.
- [ ] **Opción 1b.** Mujeres tienen ventana propia de LDH en inflamación. Cuál: ____________

**Decisión 2, que sí es clínica:** ¿la LDH debe tener ventanas distintas en
inflamación y en inmunidad, o es un solo criterio?

- [ ] Un solo criterio, misma ventana en los dos dominios. Cuál: ____________
- [ ] Dos criterios distintos a propósito. En ese caso hay que decidir cuál se
      muestra en la ficha (hoy gana inflamación por orden de declaración).

**Decisión 3, de etiqueta:** la unidad `Ratio` debería decir `U/L`. Confirmar.

**Firma / fecha:** ______________________

---

# GRUPO D · Etiquetas de unidad que no existen como unidad

Estos cinco **no cambian ninguna puntuación hoy**. Los números de las bandas
coinciden con lo que la base guarda, así que el cálculo sale bien. El problema es
otro: son exactamente el mismo tipo de descuido con el que se coló el error de la
testosterona, y dos de ellos sí se imprimen tal cual en la pantalla de la
persona.

Se dividen en dos subgrupos porque no tienen la misma gravedad.

---

## D1 · Etiquetas inexistentes que SÍ llegan a la pantalla

La app imprime la etiqueta de unidad de la matriz tal cual, sin filtro. Estas dos
se ven hoy en ATP Labs y en la ficha por biomarcador.

### `homocisteina` · Homocisteína

| | |
|---|---|
| Dominio | Inflamación (hombres y mujeres), **peso 0.15**, el más alto de ese dominio junto con PCR |
| Etiqueta en la matriz | **`mcmol/ml`** |
| Los ocho cortes | 1 · 2 · 4 · **5** · **9** · 12 · 14 · 17 |
| Unidad que guarda la base | µmol/L |

`mcmol/ml` no existe como unidad. Las bandas 5 a 9 son µmol/L, que es lo que
reporta el laboratorio y lo que la base guarda. **La puntuación sale correcta.**

Lo que sí pasa: una persona con homocisteína de 7 ve en la ficha *"7 mcmol/ml,
ventana 5 a 9 mcmol/ml"*. El número es correcto y la unidad es inventada.

### `insulina` · Insulina

| | |
|---|---|
| Dominio | Metabolismo (hombres y mujeres), peso 0.07 |
| Etiqueta en la matriz | **`mgUI/ml`** |
| Los ocho cortes | (vacío) · (vacío) · (vacío) · **2** · **6** · 8 · 10 · 15 |
| Unidad que guarda la base | µUI/mL |

Mismo caso. `mgUI/ml` no existe. Las bandas 2 a 6 son µUI/mL. La puntuación sale
correcta y la etiqueta impresa es inventada.

### Dirección de la falla
**Ninguna en el cálculo.** El daño es de credibilidad y de riesgo futuro: una
etiqueta inventada es lo que impide detectar el día en que las bandas sí se
escriban en otra unidad.

### A qué le pega
**ATP Labs** y **ficha por biomarcador** (las dos tienen texto escrito), donde la
etiqueta se imprime literal. **Edad ATP**, **ARGOS**, **Reportes**, **Cómo te
leo** y **Panel del coach** usan el número, que está bien.

### Decisión que se necesita

**Los dos parecen ser puramente de captura.** Solo hay que confirmar la unidad.

- [ ] `homocisteina`: la etiqueta correcta es **µmol/L**. Confirmar: ______
- [ ] `insulina`: la etiqueta correcta es **µUI/mL**. Confirmar: ______

**Firma / fecha:** ______________________

---

## D2 · Etiquetas inconsistentes dentro de la matriz, hoy compensadas por el código

Estas tres tienen la etiqueta `%` mientras que sus bandas están escritas como
fracción decimal. Hay que ser preciso sobre el estado actual: **la app ya
convierte estos tres a porcentaje antes de mostrarlos**, así que lo que la
persona ve en pantalla es correcto (5.1 %, no 0.051 %). La inconsistencia vive
dentro del documento de la matriz, no en la pantalla.

### `hba1c` · Hemoglobina glucosilada

| | |
|---|---|
| Dominio | Metabolismo (hombres y mujeres), **peso 0.14**, el más alto del dominio |
| Etiqueta | `%` |
| Los ocho cortes | 0.01 · 0.025 · 0.035 · **0.049** · **0.052** · 0.056 · 0.058 · 0.06 |
| Ventana óptima leída como porcentaje | 4.9 % a 5.2 % |

Ejemplo: HbA1c de 5.1 %. La app la guarda como 0.051, la puntúa contra 0.049 a
0.052, obtiene **100 de 100** y la muestra como "5.1 %, ventana 4.9 a 5.2 %".
Todo correcto.

### `hematocrito` · Hematocrito

| | |
|---|---|
| Dominio | Cardiovascular, peso 0.02 |
| Etiqueta | `%` |
| Cortes hombres | 0.33 · 0.34 · 0.36 · **0.38** · **0.44** · 0.49 · 0.52 · 0.54 |
| Cortes mujeres | 0.32 · 0.321 · 0.36 · **0.38** · **0.43** · 0.45 · 0.48 · 0.481 |

Nota: la anotación original decía "0.38 a 0.44" sin distinguir sexo. En mujeres la
ventana es 0.38 a 0.43. No cambia el diagnóstico del pendiente.

### `rdw_cv` · RDW-CV

| | |
|---|---|
| Dominio | Cardiovascular, peso 0.04 |
| Etiqueta | `%` |
| Los ocho cortes (iguales en ambos sexos) | 0.03 · 0.04 · 0.05 · **0.06** · **0.125** · 0.135 · 0.145 · 0.155 |
| Ventana óptima leída como porcentaje | 6 % a 12.5 % |

### Dirección de la falla
**Ninguna hoy.** El riesgo es de mantenimiento: la compensación vive en el código,
no en la matriz. Si mañana alguien agrega un cuarto parámetro con bandas en
fracción y no lo declara en esa lista, se rompe en silencio y de la misma manera
en que se rompió la testosterona.

### A qué le pega
Todas las pantallas usan el valor convertido a porcentaje. El cálculo es
correcto en las siete superficies.

### Decisión que se necesita

**Puramente cosmético y de documentación de la matriz.** No cambia ninguna
puntuación.

- [ ] Dejar la matriz como está (bandas en fracción, etiqueta `%`) y documentarlo
      dentro del propio Excel para que quien lo herede no lo lea mal.
- [ ] Reescribir las bandas de los tres en porcentaje (4.9 en vez de 0.049) para
      que la matriz sea legible por sí sola.
- [ ] Otra:

**Firma / fecha:** ______________________

---

# Anexo · Lo que se encontró de más

## Verificación de las diez anotaciones

Los diez casos anotados en el código **existen y están correctamente descritos
contra la matriz real**. Ninguno resultó ser falsa alarma. Dos correcciones de
precisión:

1. **`apolipoproteinas_b` estaba subestimado.** La anotación decía solo que la
   banda de 25 puntos queda inalcanzable. Lo que no decía, y es lo que produce el
   falso negativo, es que la banda de 50 puntos absorbe todo el intervalo de 0 a
   39 mg/dL. Se documentó en A2.

2. **`testosterona_total`, el factor está mal calculado.** La anotación decía
   "factor 20 de diferencia en mujeres". El factor real es de 23 a 35 según el
   extremo que se compare (0.55 contra 13 da 23.6; 0.2 contra 7 da 35). No cambia
   la naturaleza del problema.

3. **`hematocrito`, precisión menor.** La anotación citaba la ventana 0.38 a 0.44
   sin distinguir sexo. En mujeres es 0.38 a 0.43.

## Caso nuevo que nadie había anotado

### `edad_corporal` en el dominio de sueño · cortes fuera de orden

Es el mismo tipo de defecto que `apolipoproteinas_b` y **no está en la lista de
pendientes**. Aparece en hombres y en mujeres.

| Dominio | Los ocho cortes | Ventana óptima |
|---|---|---|
| **Sueño** | **0 · 0 · 0 · -10** · **-1** · 0 · 5 · 10 | -10 a -1 |
| Composición corporal | (vacío) · (vacío) · (vacío) · **-15** · **-1** · 0 · 5 · 10 | -15 a -1 |
| Vitalidad | (vacío) · (vacío) · (vacío) · **-10** · **-1** · 0 · 5 · 10 | -10 a -1 |

El parámetro mide la diferencia entre edad corporal y edad cronológica, así que un
número negativo es lo bueno. En el dominio de sueño los tres primeros cortes son
ceros donde los otros dos dominios tienen celdas vacías, y eso deja una banda
inalcanzable igual que en ApoB.

Efecto concreto, una persona con edad corporal **12 años por debajo de la
cronológica** (o sea, un resultado excelente):

| Dominio | Puntuación hoy | Etiqueta |
|---|---|---|
| Composición corporal | **100** | En tu ventana |
| Sueño | **0** | **Pide atención** |
| Vitalidad | **0** | **Pide atención** |

Es un falso positivo que castiga justo al usuario que mejor va, y es
contradictorio dentro de la misma pantalla de Edad ATP. Aparece en las sub edades,
no en ATP Labs, porque no es un parámetro de laboratorio.

**Decisión que se necesita:**
- [ ] Los tres dominios deben usar la misma ventana. Cuál: ____________
- [ ] El piso de la ventana de sueño debe ser más profundo que -10. Cuál: ____________
- [ ] Los tres ceros iniciales del dominio de sueño deben ser celdas vacías.
- [ ] Otra:

**Firma / fecha:** ______________________

## Observación adicional sobre `ldh` en hombres

La anotación original registraba la ventana de hombres en inflamación (167 a 187)
como un hecho, sin marcarla como problema. Al verificarla se ve que es una ventana
de 20 U/L de ancho contra una de 180 U/L en inmunidad. No es un error de captura
evidente, pero sí una diferencia de criterio de casi un orden de magnitud dentro
del mismo parámetro y el mismo sexo. Vale la pena que quede confirmada o
corregida junto con el resto del caso `ldh`.

---

# Qué pasa si esto no se corrige

**Lo clínico, en orden de gravedad:**

1. Una persona con conversión periférica de T3 comprometida recibe un 100 de 100
   y un párrafo que le dice que está produciendo y convirtiendo bien. Es el único
   caso de los diez que puede retrasar una consulta que sí hacía falta.

2. Una ApoB implausiblemente baja, que obliga a descartar malabsorción o
   hipobetalipoproteinemia, se reporta como "Aceptable" con el texto *"Menos
   partículas circulando se lee bien"*. El extremo bajo de este marcador es
   invisible para la app.

3. Un hombre con testosterona total en nivel de castración recibe "Aceptable" en
   el dominio de sueño.

**Lo de confianza, que es lo que se pierde primero:**

4. Toda mujer que suba una LDH ve un renglón rojo con la leyenda "Pide atención"
   y una ventana de "0.1 a 1.5 Ratio" que no corresponde a nada. No es un caso
   raro ni un percentil: es el 100% de ellas. Es el defecto que más rápido se
   detecta desde afuera y el que más caro cuesta explicar.

5. Toda mujer que suba una testosterona total ve su sub edad de sueño penalizada
   con un cero sin ninguna explicación visible en pantalla.

6. La app se contradice consigo misma en ácido úrico y en edad corporal: el mismo
   número recibe dos veredictos distintos en la misma sesión.

**Lo estructural, que es lo que garantiza que vuelva a pasar:**

7. Quedan cinco etiquetas de unidad que no describen lo que hay en la celda de al
   lado, y dos de ellas ya se imprimen a la persona. Eso es exactamente el
   mecanismo por el que se coló el error de la testosterona: nadie mira la
   etiqueta porque el número, en ese momento, funcionaba.

**Lo que cambió el costo de todo lo anterior:** ya no estamos hablando de un
número en una lista. La ficha por biomarcador convierte cada uno de estos rangos
en una explicación en prosa, escrita con seguridad, que elige qué decir según de
qué lado de la ventana cayó el valor. Un rango mal escrito hoy no se ve como un
error: se lee como un diagnóstico.

---

**Este documento no propone ningún rango. Todos los valores clínicos quedan
pendientes de la firma de la Chief Science Officer.**
