# Consolidado ATP · comunicación, mercado y estructura
## Qué manda sobre qué, dónde coinciden todos, y las cinco cosas que chocan

**Fecha:** 12 de agosto de 2026
**Consolida:** siete documentos de tres consultorías distintas, más el trabajo de esta sesión, más la base de datos de producción.
**Regla de este documento:** no revuelvo. Cada tema tiene **una sola fuente que manda**, y donde dos fuentes se contradicen lo digo en voz alta con el número, no lo acomodo.

---

# 0 · El mapa: qué documento manda sobre qué

| Tema | La fuente que manda | Por qué |
|---|---|---|
| **Costos de IA, ruteo de modelos, caché** | `RUTEO_MODELOS_ATP.md` + `INGENIERIA_DE_CACHE_ATP.md` | Medidos en 1,273 llamadas reales de producción y código leído completo |
| **Precios de la app, Círculos y Empresa** | `ATP_Modelo_Monetizacion.xlsx` | Aprobado, con revisión automática y piso comercial |
| **Mercado B2B mexicano, NOM-035, datos personales** | `B2B_EMPRESAS_ATP.md` | Fuentes primarias oficiales: STPS, DOF, Ensanut, AMIS, WTW |
| **Los 10 packs y las tres preguntas de entrada** | `CASOS_DE_USO_10_PERFILES.md` y `packs.ts` | Es el código. Es lo que la app hace de verdad |
| **Motor de retos y comunidad en la app** | `RETOS_LISTOS_PARA_ENCENDER.md` + `COMUNIDAD_EN_LA_APP.md` | Esquema de producción leído |
| **Voz, tono, qué nunca se dice** | `ATP_narrativas_y_pitches.md`, sección VI | Es lo mejor escrito que hay de todo el material |
| **Perfiles de comprador y eje de segmentación** | `ATP_arquitectura_por_niveles.md`, partes 0 a 2 | El argumento del eje de delegación es correcto y está bien sostenido |
| **Restricciones legales de publicidad** | `BRIEFATPMARKETINGCONSOLIDADO.md`, sección 6 | COFEPRIS, Meta, TikTok, YouTube |
| **Cómo se graba contenido** | `ATPPREPRODUCCION.md` + `ATPSESIONLITERAL.md` | No choca con nada. Se adopta tal cual |
| **Stack técnico de contenido** | `ATPSTACKTECNICO.md` | Idem |

⛔ **Y una que queda descartada:** la escalera con Tribu, Protocolo, Clínico y Núcleo. **Está construida sobre consulta individual y revisión personal de laboratorios, que no existen en ATP y no se van a construir.** Ese archivo se envió por error. No se cita ni se hereda. Detalle en la sección 3.

---

# 1 · Donde tres consultorías llegaron a lo mismo sin hablarse

Esto vale más que cualquier hallazgo individual, porque son análisis independientes que convergen.

## 🟢 El centro de gravedad es cansancio, sueño y estrés

| Fuente | Qué dice |
|---|---|
| El catálogo científico | Sueño es la categoría más grande con 16 intervenciones. Estrés crónico es la causa raíz más frecuente, en 26 |
| El código de la app | Los tres primeros packs son *"No puedo apagar la cabeza"*, *"Duermo ocho horas y amanezco cansado"*, *"A media tarde me apago"* |
| Los perfiles de comprador | Andrea: *"Hago todo bien y sigo cansada"*. Regina: cuarto mes sin dormir bien |
| Mi investigación de mercado | 62% de trabajadores mexicanos con estrés moderado a severo, tercer lugar del mundo, pico en 35 a 44 años con 71% |

**Cuatro caminos distintos apuntando al mismo lugar. La puerta de entrada de ATP no hay que inventarla, hay que dejar de esconderla detrás de la palabra biohacking.**

## 🟢 Nunca "ilimitado"

Tres fuentes independientes:
- **El manual de marca:** siempre "acceso extendido".
- **El código:** `TIER_DAILY_LIMITS` da 150 al día a Pro, no infinito.
- **El caso Forward:** levantó 660 millones de dólares prometiendo "ilimitado" sobre costo marginal real, y cerró.

## 🟢 El costo de la IA se administra por ingeniería, no por precio

El consultor de estructura de valor dice, textual: *"Administra el costo por ingeniería, no por precio. Enruta a modelos baratos las tareas simples, cachea lo repetitivo."*

**Eso es literalmente lo que hicimos esta semana.** El ruteo a Gemini y la caché de una hora bajan el costo de servir de $38 a $18 al mes por usuario sin tocar la página de precios. **Su recomendación ya está ejecutada y medida.**

## 🟢 La comunidad no se separa de la app

*"La app le da a la comunidad algo que leer. La comunidad le da a la app alguien que lea."* Eso coincide exactamente con las tres capas de la estructura de valor: herramienta, tribu, gente. Y con lo que encontré en la base de datos: `activity_feed` y `challenges` construidas y vacías, esperando ese puente.

## 🟢 Lo que falta es lo mismo en todos los documentos

Tres consultorías distintas terminan pidiendo lo mismo: **cómo se siente usar ATP el día uno.** Las capturas reales. Nadie más que tú lo tiene.

---

# 2 · La corrección más importante del material nuevo

El argumento de que **cobrar por tokens es el peor eje de precio posible** está bien construido y hay que aceptarlo. Los datos:

- El costo de IA es entre 1% y 4% de la estructura de costos. **En nuestro caso medido: $18 de costo contra $399 de precio, o sea 4.5%.** El consultor tenía razón en el orden de magnitud.
- El costo de inferencia cae unas 10 veces al año. Anclar un precio a eso es anclarlo a un commodity en deflación.
- Los usuarios que chocan contra un medidor **se van entre 340% y 1,040% más** que los demás.
- Y en un producto de adherencia, **el uso es el tratamiento**: alguien que se contiene de preguntarle a ARGOS para no gastar tokens está racionando su propio cuidado.

**Consecuencia directa para lo que ya teníamos:** el `paywall.tsx` dice hoy *"ARGOS proactivo y sin límites"* como el diferenciador titular de Pro. **Eso hay que quitarlo del titular.** No porque sea falso, sino porque es el eje equivocado.

> **El eje correcto: ARGOS lee tus datos → alguien que sabe lee tus datos.**

Y aquí es donde la cuota de H+ encuentra su lugar correcto: no como argumento de venta, sino como límite técnico invisible, fijado en unas diez veces el uso del percentil 95, escrito en los términos y nunca en pantalla.

---

# 3 · 🔴 El choque grande: una escalera propuesta que no aplica

Uno de los documentos del material nuevo propone una escalera de precios distinta a la aprobada, con niveles construidos sobre **consulta individual y revisión personal de laboratorios**.

> ⛔ **ESO NO EXISTE Y NO SE VA A CONSTRUIR.** Enrique lo confirmó el 12 de agosto: **no hay tiempo individual de nadie dentro de la aplicación. Todo el acompañamiento humano es grupal.** Ese archivo se envió por error junto con los demás.
>
> **Queda descartado como fuente. No se cita, no se hereda, no se usa como referencia de precio, y ningún documento posterior lo retoma.** Cualquier propuesta que aparezca más adelante con consulta 1:1, revisión personal de laboratorios, canal directo o cupo por profesional está fuera de alcance por decisión de producto.

**Lo que sí se rescata de ese material, porque no depende de la parte descartada:**

- El argumento de por qué **cobrar por tokens es el peor eje de precio posible**. Va completo en la sección 2 y es la corrección más importante de todo el material.
- El **eje de delegación** en lugar del nivel socioeconómico. Va en la sección 5.
- La observación de que **$399 colisiona con la mensualidad del gimnasio**. Va en la sección 5.
- **La puerta de atrás al corporativo** a través de una directora. Va en la sección 5.
- Y la frase que mejor resume el producto: *"ATP no es una app con comunidad. Es una tribu con un instrumento muy bueno."*

**La escalera de precios de la app se rediseña desde cero**, sin tiempo individual, sin límites de tokens y con tres niveles. Va en `GATING_Y_PRECIOS_ATP.md`.

---

# 4 · Los otros cuatro choques

## 🔴 El material de pitches atribuye recomendaciones a una persona, y la regla lo prohíbe

Los pitches están construidos sobre la credencial de una persona con nombre. El mecanismo que citan es correcto en abstracto: **el precio se lee después de la credencial, nunca antes.**

Pero la regla vigente es firme y no se mueve: **ninguna recomendación dentro del producto se atribuye a una persona real. Todo viene de ATP o de ARGOS.**

La razón no es de estilo. **Una recomendación firmada por alguien con cédula es un acto profesional regulado**, y la app no es el lugar donde se ejerce.

| | Quién habla |
|---|---|
| Dentro de la app, cualquier nivel | **Siempre ATP o ARGOS.** Nunca una persona. **Esto no se toca** |
| Sesiones grupales en vivo | Las personas se presentan como quienes son, y ahí hablan como personas |
| Bios y página de quiénes somos | Nombres, sí |
| Contenido de marca y video | Nombres, sí |

**La credencial se usa como respaldo de la marca, no como firma de una indicación.**

## 🟠 `COMUNIDAD_FIRMADA` sigue en false

El acompañamiento humano de ATP es **grupal**: sesiones en vivo, preguntas votadas, protocolo por perfil. Nada individual.

Aun así, **cualquier compromiso de tiempo o de presencia tiene que estar peloteado y autorizado antes de salir a una página.** La bandera sigue en false y por buenas razones.

## 🟠 El brief nuevo repite el error de las 100 plazas

Sigue diciendo *"100 plazas Founder del primer tramo a 4,990 = 499,000"*. La página tiene tramos escalonados: **50 a $4,990 y 50 a $5,990**. La meta de medio millón se alcanza en la **plaza 92**, con $501,080, y son 18 horas menos de conversaciones. Ya está en el modelo, hoja `Trimestre1`.

## 🟡 Dos cifras de inflación médica, las dos reales

El material nuevo dice **14.8%** citando a Aon. Mi investigación dice **13.5%** citando el estudio de tendencias médicas de WTW. Son dos consultoras midiendo lo mismo con metodologías distintas y las dos son fuentes legítimas.

**Para vender, usa la de WTW, 13.5%**, porque es más conservadora y porque el argumento aguanta igual. Si alguien te discute el número, tener la cifra baja te deja mejor parado que tener la alta.

---

# 5 · Lo que el material nuevo aporta y hay que adoptar tal cual

## 🥇 El eje de delegación, en vez del nivel socioeconómico

Es el mejor argumento de todo el material.

> **Lo que separa a tus clientes no es cuánto pueden pagar. Es cuánto del trabajo quieren hacer ellos mismos.**

Y la prueba es concreta: Diego es de ingreso alto y jamás va a comprar el nivel de arriba porque quiere hacerlo él. Andrea es de ingreso menor y sí lo compraría porque lo que no tiene es tiempo. **Mismo producto, la de menor ingreso paga más.**

Esto además ya tiene su lugar en el producto: **la segunda pregunta del onboarding.** *"¿Dame los datos y yo decido, o dime qué hacer?"* Eso configura la máscara y de paso activa el efecto de lo que uno mismo arma, que sube la disposición a pagar.

## 🥈 La puerta de atrás al corporativo

*"Regina también es tu puerta al corporativo. Si le funciona a ella, va a preguntar si se lo puedes dar a su equipo directivo. Sin ciclo de venta de nueve meses."*

**Eso es mejor que mi ruta de venta B2B.** Mi documento describe el camino formal: Recursos Humanos, Finanzas, Legal, Compras, ocho semanas de seguridad de la información. Ese camino existe y hay que saberlo. **Pero el camino rápido es venderle a una directora, personalmente, y esperar la pregunta.**

Se adoptan los dos, en este orden: primero la puerta de atrás, y el kit formal para cuando la conversación escale.

## 🥉 El precio de $399 colisiona con el gimnasio

$399 es, al peso, la mensualidad del plan básico de Smart Fit. **Es un número que un mexicano de clase media ya sabe qué compra, y no es ATP.** $499 queda debajo del plan alto del gimnasio y fuera de la zona muerta.

⚠️ **No verifiqué el precio de Smart Fit por mi cuenta**, viene del material del consultor. Vale la pena confirmarlo antes de mover el precio, porque si es cierto es un argumento suficiente por sí solo, independiente de toda la discusión de la escalera.

## Y tres cosas más que se adoptan sin discusión

**El candado de evidencia para contenido.** Ningún dato entra a un guion si no está en el corpus con su nivel. La auditoría del portal encontró que 83% de las afirmaciones del campo de mecanismo eran impublicables. Sin ese filtro, el video reintroduce lo que ya se limpió, y el video no se puede editar después.

**La restricción de Meta.** El perfil personal de Enrique está restringido para publicidad desde el 6 de septiembre de 2022 y la restricción sigue a la persona. **Meta es solo orgánico, lo administra Mariana con su identidad, y nada se publica desde el perfil personal como administrador.** Esto es información nueva y cambia el plan del trimestre 2.

**La lista de lo que ATP nunca dice.** Es doctrina, está bien escrita y no le falta nada. En particular *"ATP nunca le echa la culpa al usuario, ni de refilón, ni en broma, ni con cariño"*.

---

# 6 · El panorama consolidado de comunicación

## Las dos capas de segmentación, y no se mezclan

Aquí es donde es más fácil revolverse, así que va explícito:

| | **Los 7 perfiles de comprador** | **Los 10 packs de la app** |
|---|---|---|
| Qué son | Quién compra y con qué argumento | Qué configura la app al entrar |
| De dónde salen | Investigación de mercado | El código, `packs.ts` |
| Ejemplos | Andrea, Ricardo, Diego, Regina, Alejandro, la pareja, Paola | Bajar revoluciones, Dormir mejor, Energía estable |
| Para qué sirven | Campañas, landings, guiones de venta | Onboarding, contenido de producto, retos |
| Dónde viven | Marketing | Producto |

**Una persona tiene un perfil de comprador y un pack. No son lo mismo y no se corresponden uno a uno.** Andrea puede entrar por *Energía estable* o por *Dormir mejor*. Ricardo puede entrar por *Cuidar mi glucosa*.

## El posicionamiento

> **Todo mundo te dice qué hacer con tu cuerpo. Nadie te dice de dónde lo sacó.**

Línea de marca: *"Así sabemos lo que sabemos."*
Para conferencia: *"No te decimos qué hacer. Te decimos de dónde salió."*
La frase que resume la narrativa: *"Tu cuerpo lleva años diciéndote algo. Aquí por fin hay alguien que lo lee."*

**El principio que no se negocia: la agresión va en el contraste con la industria, nunca en la promesa de resultado.**

## Los tres tonos, y cuándo va cada uno

| Tono | Quién | Dónde |
|---|---|---|
| **A · El clínico cálido** | Mariana al frente | Producto, clínico, ATP Diagnóstico |
| **B · El compañero directo** | Enrique al frente | Adquisición, redes, ganchos |
| **C · El que nombra lo que nadie dice** | Voz de marca, sin persona | Hero de landing, video de marca. **Con racionamiento** |

La advertencia del consultor es correcta: **el tono C es el que mejor suena leído una vez y el que peor envejece.** Después del tercer post, la gente sospecha que atrás no hay nadie.

## Las cinco puertas de entrada, un solo posicionamiento

| Perfil | La frase que lo abre |
|---|---|
| Andrea | *"Hago todo bien y sigo cansada"* |
| Ricardo | *"Salí mal, ¿qué tan mal?"* |
| Diego | *"Cinco años de datos, cero conclusiones"* |
| Regina | *"Tu chequeo anual no es un evento. Es un punto de una línea"* |
| Alejandro | *"Tienes los mejores médicos de México. Ninguno habla con otro"* |
| Paola | *"Ve lo que tu paciente hace entre consulta y consulta"* |

## La producción de contenido

Dos horas a la semana de Enrique. **Se graba en módulos, no en videos:** 20 aperturas, 12 bloques, 8 cierres, 15 reacciones sin hablar y 10 tomas de b-roll. Todo menos los bloques se acumula en un banco, así que la segunda sesión baja de 90 a 45 minutos.

El formato ancla de contenido largo es **la sesión de estudios**: tres papers abiertos en pantalla, y qué dicen **y qué no dicen**. Es la propuesta de valor ejecutada, no descrita. Y el momento que da los mejores clips es cuando dice *"esto no dice lo que la gente cree que dice"*.

Nada de esto choca con nada. Se adopta completo.

---

# 7 · Lo que hay que decidir, en orden de urgencia

| # | Decisión | Por qué corre prisa |
|---|---|---|
| **1** | **Los tres niveles, sus precios y su gating** | Va en `GATING_Y_PRECIOS_ATP.md`. Bloquea la página, el modelo y el pitch |
| **2** | **Qué pasa con la economía H+** | Si no hay límite de tokens, cobrar H+ por chatear es el mismo medidor con otro nombre. Está vivo en producción |
| **3** | **¿Founder son 36 meses de cuál nivel?** | Se están por vender 92 plazas y el nivel tiene que estar definido antes de la primera |
| **4** | **¿$399 o $499 de entrada?** | Verificar primero el precio de Smart Fit. Si colisiona, es argumento suficiente solo |
| 5 | Quitar "sin límites" del titular de Pro en `paywall.tsx` | Es el eje equivocado, y con tokens libres ya ni siquiera es el diferenciador |
| 6 | ¿Quién es la cara? Enrique, el dúo, o la marca sola | Cambia todo el copy |

---

# 8 · Lo que ya no está en duda

- **El ruteo de modelos y la caché.** Ejecutado, medido, y validado de forma independiente por el consultor de estructura de valor.
- **La meta del trimestre son 92 plazas, no 100.**
- **El cobro es en web al 3.5%.**
- **Sonnet 5 se queda en precio de introducción.**
- **Los diez retos están escritos y el motor está terminado.**
- **La comunidad dentro de la app está construida y vacía.**
- **El mercado B2B mexicano**, con fuentes primarias y el argumento del aumento del seguro.
- **La voz, los tonos y la lista de lo que nunca se dice.**

---

## Nota sobre el método

Consolidé sin promediar. Donde dos fuentes decían números distintos, no saqué el punto medio: dije cuál manda y por qué. Y donde el material nuevo me corrigió, lo dije con todas sus letras, incluido el caso donde **la corrección obliga a cambiar una página que yo mismo construí**.

Lo único que no consolidé es la escalera de precios, y no por falta de criterio sino porque **es una decisión de negocio, no de análisis**: depende de cuánto tiempo va a dar Mariana, y eso solo lo sabe ella.
