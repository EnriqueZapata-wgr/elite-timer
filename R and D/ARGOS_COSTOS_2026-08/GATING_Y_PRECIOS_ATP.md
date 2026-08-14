# Gating y precios de ATP
## Tres niveles, cero límites de tokens, cero tiempo individual

**Fecha:** 12 de agosto de 2026
**Decisiones de Enrique que gobiernan este documento:**

> ⛔ **No existe tiempo individual de nadie dentro de la aplicación.** Todo el acompañamiento humano es **grupal**. Cualquier material que diga lo contrario está fuera de alcance y no se hereda.
>
> ⛔ **Se cancela el gating por uso de IA.** Todos los niveles llevan **conversación sin límite**. La evidencia de que el medidor dispara el churn es contundente y no vale la pena discutirla.
>
> ✅ **Tres precios, no uno.** Un precio solo se compara contra nada. Tres precios se comparan entre ellos, y ahí es donde el de en medio se vuelve la respuesta obvia.

---

# 1 · Primero, la pregunta que había que contestar antes de diseñar nada

**¿Cuánto cuesta de verdad "sin límites"?**

Con el ruteo a Gemini y la caché de una hora ya puestos, medido sobre producción:

| Perfil de uso | Costo real al mes |
|---|---|
| Tibio: 5 conversaciones, 15 fotos de comida | **$13.50** |
| Normal: 25 conversaciones, 60 fotos, 2 laboratorios | **$24.75** |
| El usuario más pesado que existe hoy en producción | **$27.29** |
| Intenso: 60 conversaciones, 90 fotos, 4 laboratorios | **$43.52** |
| Extremo: 150 conversaciones al mes | **$90.99** |
| **Absurdo: 300 conversaciones, o sea 10 diarias todos los días** | **$169.01** |

> **Incluso el uso absurdo cuesta $169 al mes contra un precio de $399. Sin límites es sostenible, y el ruteo del que hablamos esta semana es lo que lo hizo posible.**

Antes del ruteo, ese mismo usuario absurdo costaba unos $520 y sí habría sido un problema. **La decisión de quitar los límites descansa sobre un trabajo de ingeniería que ya está hecho y medido.** Ese es el orden correcto: primero se abarata, luego se regala.

## Lo único que sigue existiendo, y no es gating

En los términos, en lenguaje humano, va una cláusula de **uso justo** fijada en unas diez veces el uso del percentil 95. Nunca aparece un contador en pantalla, nunca es argumento de venta, y el 99.9% de la gente jamás la va a ver.

No es un medidor. Es lo que protege a la empresa de un cliente único con un guion automatizado, y es exactamente el error que mató a Forward: prometer ilimitado sobre costo marginal real sin escribir nada.

---

# 2 · 🔴 El problema que nadie ha visto: los H+ son el mismo medidor con otro nombre

Si se quitan los límites de tokens pero la app sigue cobrando **280 H+ por conversación**, no se quitó nada. Se cambió el nombre del taxímetro.

Y está vivo en producción. Estos son los costos que se cobran hoy:

| Acción | H+ que cuesta |
|---|---|
| Conversación con ARGOS | **280** |
| Foto de comida | **245** |
| Leer un laboratorio | **165** |
| Insight diario | **45** |

**Todo eso tiene que irse a cero.** Si no, el usuario sigue sintiendo que cada pregunta le cuesta, que es precisamente el mecanismo que dispara el churn.

## Lo que hago con los H+ en vez de matarlos

> **Los H+ dejan de ser una moneda que se gasta al usar el producto y pasan a ser una moneda que se gana al ser constante.**

| | Antes | **Ahora** |
|---|---|---|
| **Cómo se ganan** | Registros, retos | Igual, y más: rachas, retos, referidos, participación en la comunidad |
| **En qué se gastan** | En usar la app | **En cosas que no son la app** |

**Se van a cero:** conversación, insight, insight semanal, foto de comida, comida por texto, lectura de laboratorio, racional de intervención, escaneo de etiqueta y de suplemento.

**Se quedan como sumideros, porque son extras genuinos y ocasionales:**

| Acción | H+ | Por qué se queda |
|---|---|---|
| Reporte Braverman premium | 1,000 | Es un informe, no una función de uso diario |
| Veredicto Biohacker Approved | 500 | Ídem |
| Regenerar el diagnóstico funcional | 1,000 | Cada nivel trae los suyos incluidos. Este es el extra |
| Entrada a retos de premio | 250 | Ya está diseñado así y funciona |
| **Abrir un pack extra en el nivel A** | **2,000** | 🆕 Lo mejor que se puede hacer con los H+ |
| **Regalar un mes a alguien** | **8,000** | 🆕 Convierte la moneda en crecimiento |

**La de abrir un pack extra es la clave.** Alguien en el nivel de entrada que se aplica todos los días puede **ganarse el segundo frente en vez de pagarlo**. Eso convierte los H+ de impuesto en escalera, y hace que la constancia tenga una recompensa que se siente.

---

# 3 · El eje del gating: cuánto de ti entra

Con tokens fuera y tiempo individual fuera, quedaba encontrar un eje que la persona **sienta** y que además sea honesto.

> **Nivel A: un frente. Nivel B: todo tu cuerpo. Nivel C: tú y los tuyos.**

Y esto no es una limitación inventada. **Trabajar un frente a la vez es exactamente lo que el producto recomienda hacer al entrar.** Las tres preguntas de entrada ya eligen un solo pack. El nivel A no está mutilado: está haciendo lo correcto para alguien que empieza.

---

# 4 · Los tres niveles

## ⚪ GRATIS · el que no es un plan

| | |
|---|---|
| **Tu Edad ATP completa**, con la cinemática | ✅ Una vez, entera, sin tarjeta |
| Los 7 pilares visibles | ✅ |
| Registro de 3 hábitos | ✅ |
| Conversación con ARGOS | **10 en total, de por vida** |
| El muro abierto de la comunidad | ✅ |

**Es el único lugar de todo el producto donde existe un tope, y es de conversión, no de castigo.** Cuesta $0.75 generar una Edad ATP y es el mejor peso de marketing que gasta la empresa.

---

## 🟢 A · un frente · **$399 al mes**

*Para el que quiere empezar por algo, no por todo.*

- **Tu pack completo**, armado con las tres preguntas y acomodado a tu hora real de despertar y dormir
- **Conversación con ARGOS sin límite** ✅
- **Foto de comida sin límite** ✅
- Registro completo: nutrición, ayuno, hidratación, sueño
- Tu **Edad ATP** con recálculo cada tres meses
- **La comunidad completa y tu círculo por perfil**
- Los retos abiertos y los de tu círculo
- Las sesiones grupales en vivo, **en grabación**
- Economía H+ completa

🔒 **Lo que no trae:** los otros nueve packs, la lectura de laboratorios, y el informe mensual.

---

## 🔵 B · todo tu cuerpo · **$799 al mes** ← el que se vende

*Para el que ya entendió que las cosas están conectadas.*

**Todo lo de A, y además:**

- **Los diez packs, abiertos.** Cambias de frente cuando quieras, trabajas dos a la vez si quieres
- 🧪 **Lectura de laboratorios sin límite**, con **histórico y comparación en el tiempo**. Es lo que hace que un número deje de ser un número suelto
- **Edad ATP con recálculo mensual y línea de tiempo**: no solo tu número, sino qué lo movió
- 📄 **Tu informe mensual en PDF**, el que te llevas al médico. Ordenado, con tus tendencias y tus preguntas
- **Biomarcadores avanzados** y protocolos por perfil
- Las sesiones grupales **en vivo**, y **tu pregunta entra a votación**
- ARGOS proactivo: te habla él, no solo cuando le hablas

---

## 🟣 C · tú y los tuyos · **$1,490 al mes**

*Para el que no se optimiza solo.*

**Todo lo de B, para cuatro personas, y además:**

- 👥 **Cuatro lugares.** Tú y tres más, cada uno con su propia app, su propio pack y su propia privacidad
- 🎙️ **ARGOS por voz.** Le hablas y te contesta
- **La sesión de tu perfil**: grupo chico, solo de gente que trae tu mismo frente
- **Acceso anticipado** a todo lo que sale
- **Retos privados**: armas uno para tu gente

### La cuenta que hace obvio el nivel C

> **$1,490 entre cuatro personas son $372 cada una. Menos que el nivel de entrada.**

Y esa es toda la mecánica: **para una persona sola, C es caro y B es la respuesta obvia. Para una familia o una pareja, C es más barato que dos veces A.** No compite con B, captura otra decisión.

---

# 5 · Por qué tres precios, y por qué estos tres

## La regla del escenario central

Con un solo precio, la persona compara ATP contra no comprar nada. Con tres, compara ATP contra ATP, y ahí el de en medio gana solo, porque **la gente evita los extremos**.

Para que funcione hay una condición dura: **el de arriba tiene que ser de verdad deseable para alguien.** Un nivel C de mentira, puesto solo para que B se vea bien, se huele y quema la credibilidad de la página entera. Por eso C es familiar y no es "B con más cosas": es otra decisión, la de meter a tu casa.

## Los saltos

| | Precio | Salto |
|---|---|---|
| A | $399 | |
| B | $799 | **2.0x** |
| C | $1,490 | **1.9x** |

Saltos de dos veces son los más legibles. La persona no tiene que hacer cuentas: ve el doble y entiende el doble.

## Lo que la mezcla produce

| Mezcla | Ingreso promedio por miembro |
|---|---|
| 30% A · 55% B · 15% C | **$783 al mes** |
| 40% A · 50% B · 10% C | **$708 al mes** |
| 50% A · 40% B · 10% C | **$668 al mes** |

Contra el **$479** de la mezcla anterior de 80% Base y 20% Pro. **Aun en el escenario más pesimista sube 39%.**

## Los márgenes, cobrando en web

| Nivel | Precio | Costo de servir | **Margen** | % |
|---|---|---|---|---|
| A | $399 | $22 | **$363** | 91% |
| B | $799 | $30 | **$741** | 93% |
| C | $1,490 | $88, cuatro personas | **$1,350** | 91% |

---

# 6 · Por qué $399 y no $499

El material del consultor señala que **$399 es, al peso, la mensualidad del plan básico de Smart Fit**, y que por eso hay que subir a $499. El argumento de colisión es bueno y la observación es correcta.

**Con tres niveles, el argumento se debilita, y por una razón concreta:**

Cuando había dos precios, $399 era el precio de ATP y colisionar importaba mucho. **Con tres, $399 ya no es el precio de ATP: es el escalón de abajo, el que existe para que $799 se lea como la decisión adulta.** Que alguien piense "cuesta como el gimnasio" del escalón chico no es un problema, es el trabajo del escalón chico.

Y hay una razón de peso a favor de dejarlo: **$399 y $799 son los números que ya están modelados, aprobados y cargados en la página de Founders.** Founder son 36 meses de nivel B, que a $799 son $28,764, que es exactamente el número tachado de la página. **Mover el precio obliga a rehacer la página, el modelo y el argumento de la ronda que se está vendiendo este trimestre.**

⚠️ **Y una nota de honestidad:** no verifiqué el precio de Smart Fit por mi cuenta. Viene del material del consultor. **Antes de decidir, vale una búsqueda de dos minutos**, porque si el número es otro, la discusión se acaba sola.

**Mi voto: $399 / $799 / $1,490 ahora, y se revisa el precio de entrada después de las primeras cien ventas**, con datos propios en vez de con una comparación de mercado.

---

# 7 · Cómo se ve la página de precios

**La regla que no se rompe: el precio se lee después del valor, nunca antes.**

## El orden

**1. Arriba de todo, lo que ATP hace, sin jerga.**
> Toda tu salud en un solo lugar: tu sueño, lo que comes, tus entrenamientos, tus laboratorios y cómo te sientes. ARGOS lo lee todo junto y te dice qué hacer hoy. Y no lo haces solo.

**2. Enseguida, lo que nadie más tiene.**
> 777 fuentes, 88 intervenciones, 13 paradigmas. Y una página pública de lo que quitamos cuando no aguantó la revisión.

**3. Hasta abajo, los tres precios.**

## Cómo se rotula cada uno

| | Rótulo | La frase de una línea |
|---|---|---|
| **A** | *Empieza por uno* | *"Un frente a la vez. Es como se empieza bien."* |
| **B** | **EL MÁS ELEGIDO** | *"Todo tu cuerpo, leído junto."* |
| **C** | *Para tu casa* | *"Cuatro personas. Sale a $372 cada una."* |

**B lleva el distintivo visual y va en medio, más grande.** El distintivo de "el más elegido" solo se pone cuando sea cierto. Si no lo es todavía, el rótulo correcto es *"El recomendado"*, que es una opinión y no un dato.

## Lo que dice cada uno de la conversación con ARGOS

**Los tres dicen exactamente lo mismo, y es a propósito:**

> **Conversación con ARGOS sin límite.**

Que los tres niveles digan lo mismo en ese renglón es **una declaración de producto**: aquí no se cobra por preguntar. Y de paso mata la comparación que tienen todos los competidores.

⚠️ **Nunca la palabra "ilimitado" a secas.** El manual de marca lo prohíbe y el código lo respalda. **"Sin límite" acompañado de la cláusula de uso justo en los términos.** La diferencia entre las dos parece de estilo y es de exposición legal.

---

# 8 · Dónde encaja todo lo demás

| | Nivel |
|---|---|
| **Founder**, $4,990 pago único | **36 meses de B**, o sea $28,764 de lista. **Sin cambios en la página** |
| **Círculo** 10 / 25 / 50 | Sobre **A o B**, al 75% / 70% / 65% de su lista |
| **Empresa** 100 / 200 / 500 | Siempre sobre **A**, al 60% / 55% / 50% |
| **Prueba gratis** | 14 días, **solo en A mensual**. Founder no la lleva |
| **Garantía** | 7 días |

**Founder queda resuelto sin drama:** son 36 meses de B, que es software y comunidad, sin ninguna promesa de tiempo individual. La página no se toca y el número tachado sigue siendo correcto.

---

# 9 · Lo que hay que cambiar en el código

| # | Cambio | Dónde | Riesgo |
|---|---|---|---|
| 1 | **Poner en cero el costo H+** de chat, insight, weekly, food photo, food text, lab, intervention, scans | `proton_action_costs`, es una tabla | Bajo |
| 2 | Agregar los sumideros nuevos: pack extra y regalar un mes | Misma tabla, más lógica de canje | Medio |
| 3 | **Subir `TIER_DAILY_LIMITS` al nivel de uso justo** y quitarlo de la comunicación | `argos-proxy` | Bajo |
| 4 | **Reescribir `PLAN_FEATURES`** con los tres niveles y el eje nuevo | `app/paywall.tsx` | Bajo |
| 5 | Crear los tiers `a`, `b`, `c` en `profiles` | Base de datos. Hoy solo hay `free` y `pro` | Medio |
| 6 | Gate de packs: uno en A, los diez en B | Cliente | Medio |
| 7 | El informe mensual en PDF | **Nuevo.** No existe | **Alto, es la única función que hay que construir** |

**El punto 7 es el único trabajo de producto real de toda esta propuesta.** Todo lo demás es configuración. Y vale la pena construirlo, porque el informe que te llevas al médico es a la vez el mejor argumento de venta de B y la mejor prueba de que ATP no diagnostica: te ayuda a llegar mejor preparado.

---

# 10 · Lo que hay que decidir

1. **¿$399 / $799 / $1,490, o se mueve la entrada a $499?** Mi voto es dejarlo y revisar con datos propios después de cien ventas.
2. **¿Los nombres de los niveles?** Van propuestos como A, B y C con rótulos. Falta bautizarlos.
3. **¿C son cuatro lugares o tres?** A cuatro sale a $372 por persona, debajo del nivel de entrada, y esa cuenta es la que vende el nivel. A tres sale a $497 y el argumento se pierde.
4. **¿El informe mensual entra al alcance de este trimestre o del siguiente?** Es la única función nueva.

---

## Nota

Este documento reemplaza la sección de niveles de `ESTRUCTURA_DE_VALOR_ATP.md`. Las tres capas de valor de aquel documento siguen siendo correctas como marco, y el gating de aquí es la versión que sí se puede entregar: **la capa de gente es grupal, siempre, en los tres niveles.**
