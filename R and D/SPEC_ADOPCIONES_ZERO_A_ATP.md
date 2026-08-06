# 🔬 SPEC · Qué adoptamos de Zero (y qué NO)

**Fuente:** 6 capturas de Zero Fast enviadas por Enrique (2026-07-26). **Criterio:** tomar la función y la decisión de UX, **nunca la estética ni el modelo de negocio**. Zero es claro, blanco, aireado y agresivamente freemium. ATP es oscuro, editorial y de degradados. Se adopta el *qué*, se traduce el *cómo*.

---

## 🥇 LO MEJOR QUE VI · Etapa metabólica en vivo durante el ayuno

En la pantalla de ayuno activo, bajo el contador, hay una pastilla que dice **"Anabolic"**. No es decoración: **nombra en qué fase fisiológica estás** en este momento del ayuno, y va cambiando conforme avanza.

**Por qué esto es de ATP más que de Zero:** convierte una cuenta regresiva en una **narrativa de lo que está pasando en tu cuerpo**. Es literalmente el lenguaje de la medicina funcional, que es nuestro terreno. Zero lo tiene detrás de su paywall; para nosotros es contenido que ya dominamos.

**Adopción ATP:** la pastilla nombra la fase según horas transcurridas, con el detalle a un toque de distancia (qué pasa en tu cuerpo ahora, qué esperar después). Las fases y sus ventanas salen de la doctrina ATP de ayuno, **no de las de Zero**.

⚠️ **Enrique define las ventanas horarias de cada fase.** Es su protocolo. No inventarlas.

---

## ✅ ADOPTAR — ayuno *(cabe en MB-8, es el mismo pilar)*

| Qué | Por qué |
|---|---|
| **Etapa metabólica en vivo** | Lo de arriba. La joya. |
| **Editar inicio y meta desde el propio timer** ("Edit Start" / "Edit 16h Goal") | Se te olvidó arrancar el timer y lo arreglas sin salir. Es *guiado, no prisionero*: la app se adapta a la vida real, no al revés. |
| **Estado vacío que informa** ("Time since last fast · 91 days") | En vez de un anillo vacío y triste, un dato real. **Nos importa muchísimo porque los pilares de ATP son nuevos y casi todo va a estar vacío la primera semana.** Un vacío que informa es la diferencia entre "esto no sirve" y "esto ya me conoce". |
| **Tira de la semana con anillo por día** | Consistencia de un vistazo, sin abrir otra pantalla. |
| **Marcador de progreso sobre el anillo** (el punto que viaja) | Lee mejor que solo el relleno: ves *dónde vas*, no solo cuánto falta. |
| **Meta editable en la misma vista** | Cambiar de 16h a 18h sin ir a ajustes. |

## ✅ ADOPTAR — pero es otro pilar *(NO cabe en MB-8)*

| Qué | Dónde vive en ATP |
|---|---|
| **Calendario con puntos de colores por métrica** (ayuno, proteína, agua, sueño, actividad) | HOY / perfil. Adherencia densa y legible de un vistazo. |
| **Barras con "meta cumplida / no cumplida"** por color | Transversal. Se entiende sin leer la leyenda. |
| **Gráficas personalizables** (reordenar y prender/apagar) | Perfil. *Guiado no prisionero* aplicado a los datos: cada quien mira lo que le importa. |
| **Stats de identidad** (total de ayunos, racha más larga, ayuno más largo) | Perfil. Alimenta la narrativa de progreso. |
| **Retos por categoría** (ayuno, sueño, journal, movimiento) con gente activa | ATP **ya tiene** `challenges` y `join_challenge`. Esto es expandir lo que existe, no construir de cero. |
| **Toggle Semana / Mes / Año** en tendencias | Transversal. |

---

## ❌ NO ADOPTAR — y por qué

**1. El "Protein Score". Es un choque de doctrina, no una diferencia de gusto.**
Toda la propuesta premium de Zero gira alrededor de un macro: *"Meet your Protein Score — the fuel gauge for optimized body composition"*.

**ATP no es proteíno-céntrica ni grasa-céntrica. ATP es comida-limpia-céntrica y flexibilidad-metabólica-céntrica.** Los rangos (carbos 0-25%, grasas 50-75%, proteína 20-35%) son **consecuencia** de comer limpio, no la doctrina en sí.

Por eso el problema no es que Zero elija la proteína en vez de otro macro: **el problema es el marco entero.** Reducir la nutrición a una aguja de un solo macro no puede expresar ni la calidad de la comida ni la capacidad de tu cuerpo de usar los dos combustibles, que es exactamente lo que a ATP le importa. Un usuario puede clavar un "protein score" de 94 comiendo basura ultraprocesada.

Si algún día hay un medidor estrella en ATP, mide **limpieza y flexibilidad**, no gramos de un macro.

**2. La densidad de upsell.** Zero mete tarjeta de pago en Today, en el perfil, en las métricas ("Avg. Ketosis 🔒" con candado), y una pestaña entera. Nuestro modelo es otro (Base/Pro + H⁺) y esa agresividad es contraria al tono de ATP. **Adoptamos la UX, no la caja registradora.**

**3. El hub de contenido editorial (Explore / Learn con artículos y autores).** ATP ya tiene un lugar para eso y no es la app. Construir un CMS de artículos dentro del producto es una superficie enorme por un valor que hoy vive mejor afuera.

**4. Onzas.** Somos México. Métrico.

**5. El estilo visual.** Zero es blanco con tarjetas y mucho aire. ATP es oscuro editorial con degradados. **ATP todavía no tiene tema claro**, y este no es el momento de abrirlo.

---

---

# 🕹️ ANATOMÍA DE LA INTERACCIÓN *(lo que hace que se sienta fácil)*

Esto es lo que de verdad hay que copiar. No son features, es **contención**.

### 📊 El dato que lo dice todo

| | Elementos presionables en la pantalla de ayuno |
|---|---|
| **Zero** | **4** (Start/End · badge de meta · Editar inicio · Editar fin) · **y solo 1 es primario** |
| **ATP hoy** | **30** |

`app/fasting.tsx` tiene 1,343 líneas y 30 superficies de decisión. **No es un problema de estilo, es un problema de contención.** Ninguna barrida de degradados arregla eso.

### 1 · El botón NO se mueve entre estados *(el corazón del asunto)*
"Start Fasting" y "End Fast" ocupan **la misma posición, el mismo tamaño y la misma forma**. Lo único que cambia es el **peso visual**:
- **Iniciar** = relleno sólido, texto blanco. Máximo énfasis: *haz esto*.
- **Terminar** = relleno tenue, texto de color. Bajo énfasis: *está disponible, pero es deliberado*.

Terminar un ayuno antes de tiempo es la acción que no quieres que pase por accidente. Zero **no la esconde ni te avienta un diálogo de confirmación**: solo le baja el jalón visual. Y como el botón vive en el mismo lugar siempre, **tu pulgar ya sabe dónde ir** sin mirar.

### 2 · El anillo tampoco se mueve
Mismo lugar, mismo tamaño en ambos estados. **Solo cambia lo que vive adentro.** Cero salto de layout al iniciar o terminar. La pantalla no se reconstruye, se transforma.

### 3 · El número es el héroe
El dato grande (`91 days`, `15:59:44`) es por mucho lo más grande de la pantalla. **Se lee a un metro de distancia, de reojo, sin enfocar.** Todo lo demás se subordina.

### 4 · Tres niveles de texto, siempre los mismos
- **Etiqueta:** chiquita, gris, MAYÚSCULAS espaciadas (`STARTED`, `GOAL`)
- **Valor:** negrita, alto contraste (`Wed, 3:40 PM`)
- **Acción:** mediana, en color de marca (`Edit Start`)

Tres niveles, sin excepciones. Por eso se escanea sin leer.

### 5 · Se edita donde se ve
`Edit Start` está **justo debajo** de la hora de inicio. `Edit 16h Goal` justo debajo de la meta. El control vive pegado a lo que modifica: **cero viajes a ajustes.** Si necesitas una etiqueta para explicar qué hace un control, el control está en el lugar equivocado.

### 6 · La meta vive en el anillo
El badge chiquito de `16` arriba a la derecha, presente en **ambos** estados. Tu meta siempre visible y a un toque de cambiarla.

### 7 · El estado se anuncia con palabras
El encabezado pasa de `Zero` a **`You're fasting!`**. Sabes en qué estado estás **antes** de leer un solo número.

### 8 · Una sola acción primaria por estado
Nunca dos botones compitiendo. Todo lo demás en la pantalla es secundario y se ve secundario.

### 🎯 Lo que esto significa para ATP
**Adoptar esto no es agregar, es quitar.** El pilar de ayuno de ATP necesita bajar de 30 decisiones a un puñado: un anillo que no se mueve, un número héroe, **un botón que vive siempre en el mismo lugar y solo cambia de peso**, y todo lo editable pegado a lo que edita. Lo demás se pliega, se agrupa o se va.

---

## 🧭 Secuencia recomendada
1. **MB-8 de esta noche** absorbe el bloque de ayuno completo (es el mismo pilar, entra limpio).
2. **El bloque transversal** (calendario, tendencias, stats, retos) es el material natural del run de **HOY / perfil**, que ya era candidato. Queda specificado aquí y listo para disparar.

Partirlo así no es recortar: es que cada mitad caiga en su pilar y salga completa, en vez de dos mitades a medias en una noche.
