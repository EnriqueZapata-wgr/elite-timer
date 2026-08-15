# Expediente: el portal de consultoría contra la app

**NOCHE-3 · agosto 2026 · rama `noche3-argos`**

El portal que se entrega a cada cliente de consultoría es el listón de calidad al que
tiene que subir la sección de expediente y diagnóstico de la app. Este documento dice,
sección por sección, qué se trae, qué ya existe en otro lado y solo hay que enlazar, y
qué no aplica todavía porque la app no captura ese dato.

---

## 1. La conclusión primero

El portal tiene 19 secciones. La app ya tiene el **contenido** de 14 de ellas repartido en
pantallas que funcionan. Lo que no tenía, y era justo lo que el cliente paga, es **la
lectura**: la sección que no lista datos sino que los interpreta y los jerarquiza.

> "Tu química interna es buena. Lo que empuja tu edad biológica es la composición. Pero por
> encima de todo hay un pilar que ordena tu plan."

Esa frase no es un dato. Es el producto. El resto del portal es el material de apoyo.

**Por eso la reinvención no fue rehacer pantallas: fue construir la capa que faltaba.**
La app tenía inventario sin lectura. Ahora tiene lectura, y el inventario queda donde ya
estaba, enlazado.

---

## 2. Tabla de correspondencia

| # | Sección del portal | Estado en la app | Decisión |
|---|---|---|---|
| 1 | Cómo te leo | **No existía** | **CONSTRUIDA** en `/salud/mi-lectura` |
| 2 | Score de Longevidad Funcional | `EdadAtpHeroCard` + `/edad-atp/result-preview` | Enlazar |
| 3 | Edad biológica desglosada (sangre vs físico) | `edad_atp_calculations` tiene `phenoage` y `edad_corporal` | **Se usa** en la síntesis |
| 4 | Desglose por dominio (10 sistemas) | Motor v2 + `CE_DOMAINS`, mismos 10 dominios | Enlazar |
| 5 | Tus marcadores de salud | `/edad-atp/labs` con la matriz V7/V6 | Enlazar (y subir de nivel: NOCHE-7) |
| 6 | Composición corporal | `health_measurements` + `/medidas` | Enlazar, y **alimenta** los cruces |
| 7 | Tu química natural (4 naturalezas y déficits) | `braverman_results` + `/braverman-premium` | Enlazar, y **alimenta** un cruce |
| 8 | Lo que llevas en los genes | **La app no captura genética** | **NO APLICA** (ver §4) |
| 9 | Contexto e Historia | `historia_clinica`, `padecimientos`, `user_symptoms` | Enlazar |
| 10 | **Cómo se conecta todo en ti** | **No existía** | **CONSTRUIDA**: el catálogo de cruces |
| 11 | Tres palancas en paralelo | `/salud/intervenciones` (protocolo) | Enlazar; los cruces apuntan ahí |
| 12 | Tu reloj manda | `/my-chronotype` + `user_chronotype` | Enlazar, y **alimenta** un cruce |
| 13 | Tu día optimizado | Agenda + `intervention-agenda-core` | Enlazar |
| 14 | Cómo comes | Pilar Nutrición | Enlazar |
| 15 | Cuándo comes (ayuno) | Pilar Nutrición, ayuno | Enlazar |
| 16 | Cómo te hidratas | Pilar Nutrición, hidratación | Enlazar |
| 17 | Lo que tu cuerpo espera (ancestrales) | Intervenciones (grounding, sauna, frío, sol) | Enlazar |
| 18 | Tu stack con razón | `/supplements` + intervenciones | Enlazar, **sin dosis** (ver §5) |
| 19 | Cómo te mueves | Pilar Fitness | Enlazar |
| 20 | Evolución | `/reports` + series de `lab_values` | Enlazar |
| 21 | Pregúntale a ARGOS | ARGOS | Enlazar |

**Resumen: 2 construidas, 17 a enlazar, 1 no aplica.**

---

## 3. Lo que se construyó y por qué así

### 3.1 El motor es determinista, no un LLM

`src/services/salud/lectura-core.ts` es puro y sin I/O. Cada valor se evalúa contra la
**matriz funcional V7/V6** usando el mismo `score9Bands` que el motor de Edad ATP. Nunca se
inventa un rango: un parámetro que no está en la matriz simplemente no produce señal.

Se eligió determinista sobre LLM por tres razones:

1. **Cuesta cero.** No consume H+ ni cuota de ARGOS. La lectura se recalcula cada vez que
   la persona abre la pantalla, sin pagar por ello.
2. **Es auditable.** Cuando la lectura dice algo, se puede señalar exactamente qué señales
   lo dispararon. Un LLM no da esa trazabilidad.
3. **No alucina un hallazgo.** Es el riesgo más caro en una app de salud.

ARGOS entra después, encima de esta base, para redactar más natural. Queda pendiente.

### 3.2 La convergencia es obligatoria

**Ningún cruce se enciende con una sola señal.** Un marcador suelto en amarillo no es una
lectura, es ruido. Este es exactamente el error que comete la competencia al inflar el
conteo de hallazgos: la crítica más consistente a Superpower es que marca como anormales
ratios sin significado clínico, y un análisis citado en prensa estima ~10 falsos positivos
por consumidor sano en su panel más grande.

El catálogo tiene 10 cruces. Cada uno declara señales candidatas, un mínimo de
convergencia (nunca menor a 2), y algunos un **ancla** obligatoria: la homocisteína alta es
condición necesaria del cruce de vitaminas B; sin ella no hay historia que contar.

### 3.3 La estructura del portal, respetada

Cada cruce trae los cinco bloques del portal: **hallazgo · lógica · convergencia · regla ·
bandera**. La bandera es lo que sale de la app y entra a una consulta ("el hierro se ajusta
con tu profesional, nunca por cuenta propia").

### 3.4 Un dato vive en un solo lugar

La pantalla **no pinta un solo valor crudo**. Cada cruce termina en un enlace al lugar donde
ese dato ya vive: ATP Labs, Mis Medidas, Glucosa, Tu Cronotipo. El expediente interpreta;
no vuelve a listar.

### 3.5 Tres estados, todos honestos

| Situación | Qué ve la persona |
|---|---|
| Sin ninguna fuente | Qué falta, por qué importa cada pieza, y un botón que lleva ahí |
| Con datos y sin patrón | "Nada pide prioridad hoy. Prefiero decírtelo a inventarte un hallazgo." |
| Con cruces | La síntesis, los cruces en orden de impacto, y qué falta al final |

El servicio es **fail-soft por fuente**: si labs truena, la lectura sigue con lo demás y la
persona ve honestamente que faltan labs. Una fuente caída nunca tumba la pantalla. Esto es
respuesta directa a las dos pantallas colgadas en "Cargando..." de esta semana.

---

## 4. Lo que NO se construyó, y por qué

### Genética: no aplica todavía

El portal dedica su sección más larga a nutrigenética, motor atlético, metilación,
neurotransmisores, cronotipo genético, terreno autoinmune y longevidad. **La app no captura
un solo dato genético.** No hay tabla, no hay ingesta, no hay parser.

No se construyó nada de esto. Inventar una sección de genética vacía habría sido peor que
no tenerla. Cuando exista la ingesta, el motor ya está preparado: `FuenteTag` admite una
fuente nueva y las reglas de cruce son declarativas.

Ojo con el tamaño real de ese trabajo: la genética no es "una pantalla más". Es ingesta de
archivo, mapa de SNP a rasgo, y una doctrina de comunicación sobre predisposiciones que
todavía no está escrita.

### El plan de acción con dosis: fuera a propósito

El portal prescribe dosis exactas ("10,000 UI de D3 + 100 mcg de K2"). **Eso no puede vivir
en copy de usuario de la app.** Hay disclaimers médicos por pantalla y guidelines de tienda
que lo impiden. Las reglas de los cruces son hábitos y conversaciones: "sol directo a media
mañana", "vuelve a medir en unos meses", "lleva esta lectura a tu consulta". Nunca una
dosis, nunca un fármaco, nunca un nombre de enfermedad. Hay un test que lo verifica sobre
todo el catálogo.

### El día optimizado y el plan de entrenamiento: ya existen

Son la agenda y el pilar Fitness. Duplicarlos en el expediente habría roto la doctrina de un
dato, un lugar.

---

## 5. Lo que queda pendiente

| Pendiente | Por qué importa |
|---|---|
| **ARGOS redacta encima del motor** | La base determinista ya produce la jerarquía; falta la voz. El costo debe ser cacheado, no por apertura de pantalla. |
| **Ingesta de genética** | Es la sección más larga del portal y la app no tiene nada. Trabajo mayor, no una pantalla. |
| **Fase del ciclo persistida en `lab_values`** | Hoy la fase se deriva de "hoy", no de la fecha de la muestra. Para leer bien un panel hormonal de hace tres meses hace falta guardar la fase junto al valor. |
| **Más cruces** | El catálogo tiene 10. La matriz tiene ~148 parámetros por sexo: hay espacio para el doble. |
| **Verificación visual** | No corrí la app. La pantalla necesita `eas update --branch preview` y pantallazos. |

---

## 6. Nota sobre las dos fuentes de rangos

Al mapear labs apareció deuda que conviene registrar: hay **dos definiciones paralelas de
rangos funcionales** en el repo.

- `src/constants/edad-atp-matriz-v7-v6.ts`: 9 bandas por parámetro, por sexo. **Es la
  canónica**: la usa ATP Labs y el motor v2. Es la que usa la lectura.
- `src/data/functional-health-engine.ts`: 8 umbrales por parámetro. **Legacy**, solo la
  consume la pantalla del coach vía `lab-rating.ts`.

Nada nuevo debe colgarse de la segunda. Consolidarla o marcarla explícitamente como legacy
es trabajo aparte.
