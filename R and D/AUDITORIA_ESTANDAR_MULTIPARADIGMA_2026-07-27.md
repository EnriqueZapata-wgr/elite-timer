# 🌏 Auditoría · El estándar multi-paradigma de ATP vs. el corpus real

**Fecha:** 2026-07-27 · **Autor:** Cowork Science Portal · **Estado:** hallazgo, enmienda las §1 y §2 del `PLAN_FASE1_CAPA_CLAIM_2026-07-27.md`.
**Disparador:** Enrique — *"No nos conformamos con solo ver la ciencia occidental. También validamos y usamos ciencia del resto del mundo que también usa conocimiento milenario como MTC o ayurveda y la consolida con métodos modernos de validación científica."*

---

## 1 · Sí, tengo el estándar. Está tipado en el código, no solo escrito

No es doctrina suelta: vive en `src/constants/interventions-catalog.ts` como tipos de TypeScript, lo cual significa que **el compilador lo hace obligatorio**. Eso ya es más de lo que casi nadie tiene.

**La jerarquía — explícitamente NO la occidental:**

| | Definición literal en el código |
|---|---|
| **N1** | Multi-paradigma convergente (**≥3 paradigmas coinciden** en efecto principal) |
| **N2** | Occidental sólida **independiente de industria** + apoyo funcional o tradición |
| **N3** | Un paradigma sólido + dos convergentes (ej. MTC + funcional + mecanismo · **aunque falte RCT**) |
| **N4** | Mecanismo biológico plausible + observación clínica funcional + no evidencia de daño |

**Los 11 paradigmas de origen**, con `industryFunded` y `paradigmConflict` obligatorios por cita.

Y la consecuencia lógica del estándar, que es lo que lo hace defendible: **la convergencia entre paradigmas independientes es una forma de replicación.** Que la MTC y la fisiología occidental lleguen al mismo sitio por caminos que no se hablan entre sí es *más* fuerte que un RCT único, no menos — porque no comparten sesgo de financiamiento. Ese argumento es bueno y hay que poder sostenerlo con datos.

---

## 2 · Lo que encontré al medir el corpus contra su propio estándar

### 🟢 Primero lo bueno, y es más fuerte de lo que esperaba

**Ninguna de las 88 intervenciones se sostiene solo en tradición y divulgación. Cero.** Todas tienen al menos un ancla occidental o mecanística. Justo lo que la spec promete en la respuesta a *"MTC y ayurveda son pseudociencia"*: la tradición nunca va sola. **Eso ya está implementado y es verificable por cualquiera con el catálogo en la mano.** Es la respuesta más fuerte que tenemos y hoy no la estamos usando porque nadie la ha medido.

**20 de las 21 intervenciones N1 sí cumplen su propia definición** de ≥3 paradigmas convergentes sin contar divulgación. La excepción es `pantallas_off_90min` (solo 2).

### 🔴 Y ahora lo que duele: el estándar es más ambicioso que el corpus

Tu frase clave es **"ciencia del resto del mundo que consolida el conocimiento milenario con métodos modernos de validación"**. Esa es la tercera pata, y en el código tiene nombre: `indian_academic`, `chinese_academic`, `russian_academic`, `latam_academic`.

**Conteo real de las 716 citas:**

| Paradigma | # | Con URL | Con año |
|---|---|---|---|
| western_academic | **298** | 245 | 290 |
| functional_independent | **188** | 10 | 80 |
| ayurveda | 87 | **0** | 2 |
| traditional_documented | 60 | 3 | 13 |
| tcm | 56 | **0** | 2 |
| soviet_sports | 17 | 0 | 6 |
| mechanistic | 8 | 2 | 3 |
| **russian_academic** | **1** | 0 | 1 |
| **latam_academic** | **1** | 0 | 1 |
| **indian_academic** | **0** | — | — |
| **chinese_academic** | **0** | — | — |

**Los cuatro paradigmas que literalmente codifican tu estándar suman 2 citas de 716. El 0.3%.**
**Y el corpus es 68% de origen occidental** (298 académicas + 188 de divulgación = 486 de 716).

### Por qué esto importa y no es un tecnicismo

Las 143 citas de MTC y ayurveda son **textos clásicos**: Charaka Samhita, Huangdi Neijing, Hatha Yoga Pradipika, Bhavaprakasha. Cero URL, cero año.

Eso es **tradición documentada legítima** — y está bien etiquetada como tal, sin fingir otra cosa. Pero **no es "consolidada con métodos modernos de validación"**. Es la mitad de la frase. La otra mitad —los RCT de acupuntura de CNKI, la investigación clínica de ashwagandha de los institutos AYUSH, los estudios rusos de adaptógenos— **no está en el catálogo**.

Y ahí está el flanco real, que no es el que yo había marcado:

> **→ AK-13 (nuevo): "Dicen que no se conforman con la ciencia occidental, y su bibliografía es 68% occidental. El 'resto del mundo' que citan son libros de hace dos mil años, no ciencia."**

Ese ataque hoy **nos gana**, y duele más porque la postura es correcta. No es que el estándar esté mal. Es que **el corpus todavía no lo alcanza**, y el portal lo va a publicar todo a la vez.

---

## 3 · El segundo hallazgo: la jerarquía N1-N4 no discrimina

Si N1 significa "≥3 paradigmas convergen", el número de paradigmas debería subir con el nivel. Medido:

| Nivel | # intervenciones | Media de paradigmas duros | Rango |
|---|---|---|---|
| N1 | 21 | **3.4** | 2 – 5 |
| N2 | 39 | **3.3** | 2 – 5 |
| N3 | 27 | **3.4** | 1 – 6 |
| N4 | 1 | 3.0 | 3 |

**Los cuatro niveles son estadísticamente el mismo número.** Hay un N3 con **un solo** paradigma y varios N2/N3 con más paradigmas que algunos N1.

El nivel se está asignando por criterio experto, que probablemente es buen criterio — pero **la definición es pública y la fórmula no cuadra**. Un crítico con el catálogo abierto reproduce esta tabla en diez minutos.

> **→ AK-12 (nuevo): "Publican la fórmula de su jerarquía y sus propios datos no la cumplen."**

Se vence de una de dos formas, y **la decisión es tuya**: o el nivel se vuelve **computado** (el código lo deriva de las fuentes y el compilador impide mentir), o la definición se reescribe para decir la verdad — que N1-N4 combina convergencia **con** juicio clínico sobre calidad, no solo conteo. **La primera es más defendible; la segunda es más honesta si el juicio de Mariana es realmente parte del criterio.** Las dos son mejores que la de hoy.

---

## 4 · Corrección a mi §2 de ayer — importante, porque casi digo lo contrario de lo que quiero decir

Ayer marqué las **178 fuentes de divulgación** (Huberman 42, Attia 18, Kresser 11, Rhonda Patrick 11…) como un flanco.

**Quiero ser explícito en que eso no es un ataque a la posición multi-paradigma. Es lo opuesto.**

Esas 178 fuentes **son occidentales**. Son podcasters y autores estadounidenses. No son "ciencia del resto del mundo" — son **divulgación del mismo mundo occidental**, solo que del lado alternativo. Contarlas como paradigma propio infla la apariencia de diversidad del corpus **sin agregar ni una perspectiva no occidental**.

Y son el eslabón que un crítico usa **para desacreditar por asociación todo lo demás**: entra por "citan a un podcaster", y sale diciendo que entonces las citas de ayurveda tampoco valen. **Depurar esas 178 es lo que protege a las 143 de MTC y ayurveda**, no lo que las amenaza.

El estándar duro sigue siendo tuyo y no lo toco: **ninguna intervención se sostiene solo en tradición.** Yo solo propongo el gemelo obvio: **ninguna se sostiene solo en divulgación secundaria.** Que ya se cumple en los hechos —cero intervenciones lo violan— así que solo estamos escribiendo la regla que ya obedecemos.

---

## 5 · Lo que esto le hace al plan: aparece la pata que faltaba

La Fase 3 dejó de ser "resumir los estudios que ya tenemos". Ahora tiene una misión que **sí es el diferenciador que buscas**:

> **Ir a buscar la ciencia no occidental moderna que valida lo que la tradición ya sabía, y traerla al catálogo con DOI, año y cohorte — al mismo nivel de trazabilidad que exigimos a PubMed.**

Eso es lo que ninguna app de salud tiene. Todas citan PubMed. Las alternativas citan tradición sin evidencia. **Nadie citó a CNKI.**

**Bases candidatas** (las conozco de mi entrenamiento; **no he verificado su acceso actual y no voy a buscar en la web sin tu aprobación**, según la regla del handoff):

| Región | Bases | Qué esperaría encontrar |
|---|---|---|
| China | CNKI · Wanfang · VIP | Volumen grande de ensayos clínicos de MTC, acupuntura, fitoterapia |
| India | AYUSH Research Portal · DHARA · IndMED | Investigación clínica de ashwagandha, triphala, prácticas de dinacharya |
| Rusia | eLibrary.ru · CyberLeninka | Adaptógenos, crioterapia, escuela de deporte — el respaldo de nuestras 17 citas soviéticas, que hoy son de memoria |
| LatAm | SciELO | Y es la que más te conviene por idioma y por origen de ATP |
| Japón/Corea | J-STAGE · KoreaMed | Kampo, bosque (shinrin-yoku), termalismo |

**Barreras reales que hay que aceptar de entrada:** idioma (mucho no está en inglés), calidad heterogénea, y un sesgo documentado de resultados positivos en algunas de estas bases. **Eso se declara en el portal, no se esconde** — es exactamente el mismo trato que le damos al sesgo de financiamiento occidental, y aplicarlo en ambas direcciones es lo que hace creíble la regla. Si solo declaramos los sesgos del otro lado, es propaganda.

**Y el premio:** cada vez que una cita de CNKI o AYUSH aterrice junto a una de MTC o ayurveda que ya tenemos, esa intervención pasa de "tradición + occidental" a **convergencia real de tres paradigmas independientes con evidencia moderna en dos de ellos**. Ahí el N1 deja de ser una etiqueta y se vuelve un hecho verificable.

---

## 6 · Qué cambia en lo inmediato

**Enmienda a la Fase 1** — tres cosas, sin alterar el resto del plan:

1. **1.1 se amplía:** además de `sourceType`, marcar qué intervenciones tienen la pata no occidental moderna **vacía**. Son candidatas prioritarias de Fase 3. Hoy solo **19 de 88** tienen alguna fuente académica no occidental, y 17 de esas son las citas soviéticas sin URL.
2. **1.3 gana un campo:** `nivel_evidencia` **computado** además del declarado, para que el lint detecte cuándo no coinciden (§3).
3. **1.4, el lint,** agrega la regla gemela: ningún claim se sostiene solo en divulgación secundaria.

**Lo que NO cambia:** la filosofía. Nada de esto la mueve. La narrativa sí — y según tu propia regla de oro, eso está permitido.

---

## 7 · Lo que necesito de ti

Sigue pendiente **el veto de ayer** (las 178 de divulgación → `secondary_divulgation`). Se suman dos, y las tres se contestan en una línea cada una:

1. **Divulgación secundaria** → aplico la regla gemela. *(Default: sí)*
2. **Jerarquía N1-N4** → ¿nivel **computado** por el código, o **redefinir** la fórmula para incluir el juicio clínico? *(Default: computado, con override de Mariana que queda registrado)*
3. **Bases no occidentales** → ¿te traigo un **piloto acotado** —5 intervenciones donde ya tenemos MTC o ayurveda fuerte, buscando su validación moderna— para ver qué tan buena es la cosecha antes de comprometer un lote grande? *(Default: sí, y te aviso el alcance exacto antes de gastar una sola búsqueda)*
