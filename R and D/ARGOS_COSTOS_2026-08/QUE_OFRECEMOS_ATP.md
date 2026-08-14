# Qué ofrece ATP
## La oferta armada con lo que existe. Nada más.

**Fecha:** 14 de agosto de 2026

**La regla de este documento, y la puedes usar para cacharme:**

> **Nada entra aquí si no lo puedo señalar en el repo, en la base de datos, o en algo que tú dijiste.** Cada renglón trae de dónde salió. Si algo no tiene fuente, está inventado y hay que borrarlo.

**Lo que ATP vende:** una app y una tribu. No hay consultas, no hay laboratorios incluidos, no hay coordinación, no hay genética. Eso no existe y no entra.

---

# 1 · Primero, una buena noticia que cambia la conversación

Fui a leer tu propio `ARGOS_PRO_PRICING_MODEL_2026-07-06.md`. Ahí llegaste a **$1,499** y la cuenta era correcta **con los datos que tenías en julio**.

| | Julio, supuesto | **Hoy, medido en 1,273 llamadas reales** |
|---|---|---|
| Chat del usuario promedio | 15 **al día** | El más pesado hace 30 **al mes** |
| Costo de ARGOS al mes | **$343 a $549** | **$18 a $27** |
| Comisión de plataforma | 30% | **3.5%, cobrando en web** |

> **El costo estaba sobreestimado entre 13 y 30 veces. El precio de $1,499 se construyó sobre un costo que no existe.**

**Y eso es una liberación, no un problema.** En julio el costo te obligaba a un precio. Hoy no. **El precio ya no lo decide el costo, lo decide el valor y la psicología**, que es exactamente lo que me estás pidiendo.

---

# 2 · La segunda buena noticia: matar los Protones no mata el juego

Esto lo verifiqué en producción y me alegró:

| Moneda | Transacciones | Qué es |
|---|---|---|
| **Electrones** | **687**, más 129 días registrados y **6 rangos** | Lo que **ganas** por constancia. Rachas, rangos, retos |
| **Protones H+** | 207 | Lo que **gastas** para usar la app |

**Son dos sistemas distintos.** El que dispara el churn es el segundo, porque le pone taxímetro a preguntar. **El primero se queda entero:** los electrones, los rangos, las rachas y los retos siguen vivos y siguen siendo el motor de hábito.

> **Se quita el peaje. Se queda el juego.**

Los Protones no se borran: **dejan de cobrarse por usar la app** y quedan solo para extras ocasionales, que van al final.

---

# 3 · El gating ya está escrito en tu código, y no lo habíamos usado

Esto es lo que se me pasó todo este tiempo. Fui a `src/constants/packs.ts`:

**Hay 8 packs.** Cada uno **instala módulos**. Y en total el producto tiene **23 módulos distintos**:

| | Módulos que instala |
|---|---|
| Bajar revoluciones | respirar · meditar · emociones · journal · sueño |
| Dormir mejor | sueño · meditar · respirar · sol · suplementos |
| Energía estable | comida · glucosa · ayuno · sueño · sol · labs |
| Foco y claridad | nback · meditar · sueño · ayuno · comida · emociones |
| Cumplir años sin envejecer | edad-atp · labs · protocolos · sol · ayuno · cetonas · entrenar · sueño |
| Cuidar mi glucosa | glucosa · comida · ayuno · cetonas · labs · entrenar · reportes |
| Entender lo que siento | síntomas · mapa-funcional · cuestionario · padecimientos · protocolos |
| Mi salud en orden | historia-clínica · padecimientos · labs · evaluaciones · reportes |

> **El eje del gating no hay que inventarlo. Es cuántos módulos tienes encendidos, y eso es literalmente cómo está construida la app.**

Un pack enciende alrededor de 6 de los 23. Los ocho packs encienden los 23.

---

# 4 · El gatillo psicológico, y es honesto

**Nadie tiene un solo problema.**

El que llega por "duermo ocho horas y amanezco cansado" también trae estrés y también trae la caída de las cuatro de la tarde. El que llega por glucosa también trae sueño. **Un pack nunca alcanza, y la persona lo sabe antes de que se lo digas.**

Y hay algo mejor: **el producto mismo hace el argumento por ti.** La Edad ATP entrega **sub-edades**. Cuando alguien ve que su sub-edad de sueño está mal **y** la metabólica también, ya no hace falta vender nada. **El upgrade se lo dice su propio número, no tú.**

Eso es un gatillo real, no un truco. No estás creando una carencia artificial: **estás mostrando una que ya existía y que nadie le había enseñado.**

---

# 5 · La oferta

## ⚪ La prueba · 14 días, todo abierto

Todo. Los ocho packs, los 23 módulos, ARGOS, la comunidad. Sin versión chica.

**Por qué todo abierto y no una versión capada:** una vez que algo se siente tuyo, entregarlo cuesta más que lo que costaba adquirirlo. Y 14 días de alguien nuevo cuestan **unos $10 de servir**.

*Fuente: `argos_logs`, costo medido. El trial de 14 días ya estaba en el paywall.*

---

## 🟢 **UN FRENTE** · $399 al mes · $3,990 al año

*Para empezar por algo, no por todo.*

| Trae | De dónde sale |
|---|---|
| **1 pack a tu elección**, con sus ~6 módulos | `packs.ts` |
| Sus horarios acomodados a tu hora real de despertar y dormir | Las tres preguntas de entrada |
| **ARGOS sin límite:** chat, insight diario, foto de comida | `argos_logs`, costo real $22 |
| Tu **Edad ATP**, con recálculo trimestral | `edad_atp_calculations` |
| **Electrones, rangos y rachas** | `electron_ranks`, 6 rangos vivos |
| **La comunidad completa y tu círculo por perfil** | `activity_feed`, `community_presence` |
| **Los retos** | `challenges`, motor terminado |
| Las sesiones grupales, **en grabación** | Lo que ya das |

---

## 🔵 **TODO TU CUERPO** · $799 al mes · $7,990 al año ⭐

*Porque tu cuerpo no viene en un solo frente.*

**Todo lo de Un frente, y además:**

| Trae | De dónde sale |
|---|---|
| **Los 8 packs y los 23 módulos, abiertos** | `packs.ts` |
| 🧪 **Laboratorios:** lectura, histórico y comparación en el tiempo | `lab_uploads`, `lab_results`, `lab_values`, `lab-clinical-ranges.ts` |
| **Edad ATP mensual, con línea de tiempo y sub-edades** | `SubEdadConstellation.tsx`, `RecalculateDiff.tsx` |
| **Mi Diagnóstico Funcional** y sus actualizaciones | `functional_dx`, `argos_dx_memory` |
| **Protocolos y mapa funcional** | `protocol_templates`, 10 vivos |
| **Historia clínica, padecimientos y evaluaciones** | `historia_clinica`, `padecimientos`, `mobility_assessments` |
| **Glucosa y cetonas** | `glucose_logs`, `ketones_logs` |
| **Tests completos:** Braverman premium, N-back, cinemáticos | `braverman_premium_reports`, `nback_sessions`, `fitness_kinematic_tests` |
| **Matriz completa de entrenamiento** | 214 combinaciones, 110 bloques, 80 ejercicios |
| **La biblioteca de Mente completa** | 34 piezas de audio |
| 📄 **Reportes y exportación** | `ai_reports`, `user_reports`, `user_data_exports` |
| 🎙️ **ARGOS por voz** y ARGOS proactivo | edge function `argos-voice` |
| **Insight semanal** | `weekly_insights` |
| Las sesiones **en vivo**, y tu pregunta entra a votación | Lo que ya das |

---

## 🟣 **TU CASA** · $1,490 al mes · $14,900 al año

*Cuatro personas. Sale a $372 cada una.*

**Todo lo de Todo tu cuerpo, para cuatro.** Cada quien con su app, su pack y su privacidad.

Más lo que solo tiene sentido cuando son varios:
- **Compañero de ciclo** → `cycle_companions`, ya existe
- **Ver la racha de los tuyos**, nunca sus datos de salud → `friendships`, `activity_feed`

**Y DÚO, $1,090, para dos.** Sale a $545 cada uno.

---

# 6 · Por qué estos tres precios y no otros

## El de en medio gana porque es el único que dice la verdad

$399 es un frente. $799 son ocho. **La persona que ya vio sus sub-edades sabe cuál necesita**, y no se lo dijiste tú.

## Los saltos

| | |
|---|---|
| $399 a $799 | **2.0 veces.** El único múltiplo que no obliga a hacer una cuenta |
| $799 a $1,490 | 1.9 veces, y son cuatro personas |

## La cuenta que vende Casa sola

> **$1,490 entre cuatro son $372. Menos que el plan de entrada.**

Para uno solo, Casa es caro y **Todo tu cuerpo** es la respuesta obvia. Para una casa, cuesta menos que dos individuales y trae cuatro. **No compite, captura otra decisión.**

Y retiene mejor que cualquier otra cosa: **quien mete a su pareja o a sus hijos ya no cancela solo.**

## Y $799 no se mueve por una razón práctica

**36 meses de Todo tu cuerpo son $28,764, que es el número tachado que ya está publicado en la página de Founders.** Mover ese precio obliga a rehacer la página, el modelo y el argumento de la ronda que estás vendiendo. No vale la pena.

---

# 7 · Sobre no abusar, y un anclaje que sí puedes defender

## El test que puedes decir en voz alta

| Plan | Precio | Costo real | **Costo como % del precio** |
|---|---|---|---|
| Un frente | $399 | $22 | **5.5%** |
| Todo tu cuerpo | $799 | $27 | **3.4%** |
| Casa | $1,490 | $108 | **7.2%** |

Cualquier app de suscripción del mundo está entre 5% y 15%. **Estás dentro de lo normal.** Lo que evita que sea abuso no es el margen, es qué haces con él, y eso se ve en el producto o no se ve.

## 🔴 Lo que NO te recomiendo, aunque estaba en tu documento de julio

**El precio tachado de $2,999.** Si nunca cobraste $2,999, ese tachado es un anclaje falso, y en salud la confianza es el único activo que tienes. Además tu propio manual de marca prohíbe los patrones oscuros.

## El anclaje honesto que sí funciona

**La suma de las partes.** ATP reemplaza una app de sueño, una de comida, una de entrenamiento, una de meditación, la lectura de laboratorios y una comunidad de pago. **Cada una de esas tiene un precio de mercado verificable.**

⚠️ **No lo pongo con números porque no los verifiqué.** Son veinte minutos de revisar precios públicos y te lo armo. Ese anclaje sí lo puedes defender si alguien lo cuestiona, porque cualquiera puede ir a comprobarlo.

---

# 8 · Qué pasa con los Protones

**Se van a cero en todo lo que sea usar la app:** conversación, insight, foto de comida, lectura de laboratorio, escaneos.

**Se quedan solo para extras ocasionales**, y aquí sí tienen sentido porque no son de uso diario:

| | H+ | De dónde sale |
|---|---|---|
| Reporte Braverman premium | 1,000 | `proton_action_costs`, ya existe |
| Veredicto Biohacker Approved | 500 | Ya existe |
| Entrada a retos con premio | 250 | Ya existe, y el motor está terminado |
| **Abrir un pack extra en Un frente** | **2,000** | 🆕 |

**La última es la buena.** Alguien en el plan de entrada que se aplica todos los días **se gana el segundo frente en vez de pagarlo.** Los Protones dejan de ser impuesto y se vuelven escalera.

---

# 9 · Lo único que hay que construir

| | Estado |
|---|---|
| Todo lo de Un frente | **Ya existe** |
| Todo lo de Todo tu cuerpo | **Ya existe** |
| Gate de packs: 1 contra 8 | Falta el candado, no la función |
| Plazas de Casa y Dúo | **Falta.** Es lo único de verdad nuevo |
| Tiers en `profiles` | Hoy solo hay `free` y `pro` |
| Poner en cero los costos H+ | Es una tabla |

**No hay una sola función que inventar.** Lo que falta son candados y plazas.

---

# 10 · Lo que queda por decidir

1. **¿$399, $799 y $1,490?** Mi voto es sí, porque $799 mantiene intacta la página de Founders.
2. **¿Armo el anclaje de la suma de las partes?** Veinte minutos de verificar precios públicos.
3. **¿Dúo entra desde el día uno o después de Casa?**
4. **Los nombres.** "Un frente", "Todo tu cuerpo" y "Tu casa" son de trabajo y salieron del producto, no de un catálogo.

---

## Nota

Cada renglón de la oferta trae de dónde salió: una tabla, un archivo o algo que ya das. **Si encuentras uno que no puedas rastrear, está mal y lo quito.**
