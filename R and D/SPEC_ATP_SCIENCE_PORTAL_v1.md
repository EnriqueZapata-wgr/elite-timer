# 📚 ATP SCIENCE PORTAL · Arquitectura v1

**Fecha:** 2026-07-26 · **Autor:** Cowork · **Estado:** spec, pendiente de veto de Enrique y validación científica de Mariana.
**Encargo de Enrique:** *"Una mega biblioteca de estudios que respalden ATP, un portal al que se pueda mandar cualquier duda, que sea nuestro firewall de cuestionamientos. Recuerda TODAS las fuentes que usamos, no solo NCBI."*

---

## 0 · La noticia buena: esto ya está medio construido

No hay que inventar el portal. Hay que **exponer lo que ya existe**.

| Lo que ya hay | Dónde |
|---|---|
| **717 citas estructuradas** con paradigma etiquetado | `src/constants/interventions-catalog.ts`, campo `sources[]` |
| **Jerarquía de evidencia propia N1-N4** (explícitamente NO la occidental) | mismo archivo, `EvidenceLevel` |
| **11 paradigmas de origen** tipados | mismo archivo, `SourceParadigm` |
| **Flag obligatorio `industryFunded`** por cita | interfaz `ScientificSource` |
| **Campo `paradigmConflict`** cuando los paradigmas se contradicen | interfaz `ScientificSource` |
| **Auditoría de claims ya hecha** (41 claims: 18 ✅ · 21 ⚠️ · 2 ❌) | `R and D/CLAIMS_CATALOGO_VS_RESEARCH_2026-07-21.md` |
| Research de respaldo por lotes | `R and D/RESEARCH_MAPEO_BATCH_A/B/C_2026-07-14.md` |
| 30 calculadoras de edad biológica evaluadas con autor y cohorte | `docs/edad-atp/RESEARCH_CALCULADORAS_v1.md` |

**El portal no es una base de datos nueva. Es la capa de lectura de esto.**

---

## 1 · El posicionamiento: la transparencia ES el producto

Casi toda app de salud hace una de dos cosas: **no cita nada**, o **finge ser PubMed puro**.

ATP hace una tercera, y es defendible precisamente porque es incómoda:

> **ATP declara cómo sabe lo que sabe.** Cruza paradigmas, etiqueta el origen de cada fuente, marca cuándo un estudio lo pagó la industria interesada, y **cuando los paradigmas se contradicen lo dice en voz alta en lugar de esconderlo.**

Eso no es una debilidad frente al escrutinio: **es la respuesta al escrutinio**. Un crítico no puede acusarnos de esconder la metodología cuando la metodología está publicada, incluidos sus límites.

**Corolario incómodo pero necesario:** el portal debe documentar también **lo que no sabemos**. Un expediente que solo tiene evidencia a favor se lee como propaganda. Uno que declara sus huecos se lee como ciencia.

---

## 2 · Arquitectura: tres niveles de profundidad

Un portal que le avienta todas las controversias a todo el mundo **rompe el efecto placebo**, que es una intervención real y poderosa. Por eso la profundidad se **pide**, no se impone.

### 🟢 Nivel 1 · Junto al claim, dentro de la app
Una línea. Qué hace y de dónde viene el respaldo, sin número prometido y sin controversia.

> *"Respaldo: occidental independiente + tradición documentada."* → toca para ver.

Aquí **el placebo queda intacto**. El usuario que solo quiere hacer su protocolo, lo hace.

### 🔵 Nivel 2 · Ficha de evidencia de la intervención
Se llega con un toque. Contiene:
- Nivel N1-N4 **con su definición a la vista** (nadie sabe qué es N2 sin explicación).
- Lista de fuentes, **cada una con su paradigma visible** y su marca de financiamiento si aplica.
- El mecanismo en lenguaje llano: *qué le pasa a tu cuerpo*.
- Contraindicaciones.

### 🔴 Nivel 3 · Expediente completo
Se llega **solo preguntando**. Es el firewall:
- Conflictos entre paradigmas, explícitos.
- **Qué NO sabemos** y qué haría falta para saberlo.
- Por qué ATP no acepta a ciertos cuerpos como validación (con el recibo del financiamiento, no con opinión).
- Los claims que ATP **retiró o suavizó** y por qué. *(Esto vale oro: demuestra que el sistema se autocorrige.)*

> Esto implementa la doctrina de placebo: las controversias existen, están documentadas y son accesibles, **pero no se airean a quien no preguntó.**

---

## 3 · El firewall: cómo se responde un cuestionamiento

**Regla madre: nunca se defiende un claim escalándolo.** Si alguien empuja, se responde con el expediente, no con más promesa. Si el expediente es débil, **se dice que es débil**.

### Los cuatro ataques que el portal tiene que sobrevivir

**1. "¿Dónde está el RCT?"**
Respuesta: ausencia de RCT no es ausencia de efecto. El nivel N3 existe justo para eso: un paradigma sólido más dos convergentes. Y se agrega el dato que incomoda del otro lado: **los RCT existen donde hubo dinero para pagarlos.** No hay RCT de fase III de la respiración nasal porque nadie la puede patentar.

**2. "Eso contradice a la ADA / AHA / USDA / Harvard."**
Respuesta: correcto, y está declarado. No se responde con desprecio ni con teoría de conspiración: **se responde con el recibo**, el registro de financiamiento y los conflictos de interés documentados de esa guía específica. Si no tenemos el recibo a la mano, **no usamos ese argumento**.

**3. "MTC y ayurveda son pseudociencia."**
Respuesta: en ATP no entran como autoridad mística sino como **observación clínica documentada a escala de siglos**, y solo cuentan **convergiendo** con mecanismo o con literatura occidental. Ninguna intervención de ATP se sostiene únicamente en tradición. Ese es el punto del N1: **convergencia entre paradigmas independientes**, que es una forma de replicación.

**4. "¿Esto me va a curar X?"**
Respuesta: no, y ATP no lo afirma. **ATP no cura enfermedades, optimiza función.** Este es el firewall más importante porque es el de exposición legal.

### Prohibiciones del firewall
- ❌ Citar autoridad capturada **a nuestro favor** cuando nos conviene. Si AHA no vale para contradecirnos, tampoco vale para respaldarnos. **Coherencia o se cae todo.**
- ❌ Responder una crítica metodológica con testimonios.
- ❌ Afirmar "está demostrado" donde el respaldo es asociativo.
- ❌ Nombres propios de personas en el copy de usuario. Todo es de ATP o de ARGOS.

---

## 4 · Estructura del dato

Ya existe `ScientificSource`. El portal necesita **una capa de reclamo** encima, porque hoy las fuentes cuelgan de la intervención pero **no del claim específico**. Ese es el eslabón que falta para el firewall: cuando alguien cuestiona *una frase*, hay que poder ir a *esa frase*.

```
Claim {
  id
  texto_user_facing          // la frase exacta que ve el usuario
  donde_aparece[]            // pantalla/archivo — trazabilidad
  tipo                       // mecanismo | asociación | dosis | rango | postura
  nivel_evidencia            // N1-N4
  fuentes[]                  // ScientificSource ya existente
  conflicto_paradigmas?      // texto
  lo_que_no_sabemos?         // honestidad explícita
  historial[]                // suavizado/retirado + fecha + por qué
  validado_por?              // Mariana + fecha
}
```

**`historial[]` es la pieza que convierte el portal en firewall.** Un sistema que muestra que corrigió sus propios claims es mucho más difícil de atacar que uno que siempre tuvo razón.

---

## 5 · 🔴 Los huecos que HOY romperían el firewall

Esto es lo más accionable de este documento. Salieron del inventario del repo.

| # | Hueco | Riesgo | Propuesta |
|---|---|---|---|
| **1** | **Contradicción de doctrina en suplementos.** `interventions-catalog.ts` declara *"En ATP NO se recomiendan suplementos ni fármacos"* y la migración 194 dice *"suplementos son REGISTRO, no recomendación"*. Pero `src/data/seed-protocols.ts` **sí prescribe dosis activas** (D3 5000 IU, Ashwagandha 600mg, Berberina 500mg, Tongkat Ali 400mg…). | 🔴 **Alto. Legal y de credibilidad.** Es la contradicción más fácil de encontrar para un crítico, y prescribir dosis es exposición regulatoria real. | **Enrique y Mariana deciden cuál manda.** Si la doctrina es registro-no-recomendación, los seeds se reencuadran como plantillas de registro, no como prescripción. |
| **2** | **Cronotipos sin fuente.** El modelo de 4 animales (león/oso/lobo/delfín) vive en `src/services/quiz-service.ts` con horarios específicos y **cero atribución** en todo el repo. Es el modelo de **Michael Breus, *The Power of When* (2016)**. | 🟡 Medio. Es un modelo popular, no académico. Sin cita, un cuestionamiento nos deja mudos. | Atribuir a Breus como `functional_independent`, y respaldar la parte cronobiológica con literatura circadiana real (Panda ya está citado en el catálogo). Declarar qué parte es modelo divulgativo y qué parte es cronobiología. |
| **3** | **Dos claims sin ningún respaldo.** `separadores_dedos_pies` → *"previene juanetes (hallux valgus)"* y `digital_minimalism_1dia_semana` → *"restaura dopamina baseline"*. | 🔴 El primero es **claim médico de prevención** = exposición legal. El segundo es pop-neuro sin estudio humano. | **Retirar ambas frases.** No suavizar: retirar. Ya están marcadas ❌ en la auditoría del 21-jul y siguen vivas. |
| **4** | **Rangos de macros sin estudio citado.** 0-25/50-75/20-35 atribuidos a "Filosofía nutricional ATP". | 🟡 Medio, **pero se disuelve con el encuadre correcto.** ATP es comida-limpia-céntrica y flexibilidad-metabólica-céntrica; **los rangos son consecuencia, no meta.** Presentados como resultado esperado de comer limpio, la carga de prueba baja muchísimo. | Reencuadrar en copy + respaldar la *flexibilidad metabólica* (que sí tiene literatura), no los porcentajes. |
| **5** | **"7 Sistemas Funcionales" sin atribución.** `src/constants/functional-systems.ts` los marca como "framework Mariana". Es una adaptación del modelo de medicina funcional tipo IFM. | 🟡 Medio. Presentarlo como original cuando deriva de un marco existente es atacable. | Atribuir el linaje (IFM) y declarar qué es adaptación propia. **Deriva bien atribuida es más fuerte, no más débil.** |
| **6** | **Postura anti-bloqueador químico sin respaldo citado.** Vive como instrucción de producto en `uv-service.ts` y en el prompt de ARGOS, sin estudio adjunto. | 🟡 Medio. Es de las posturas más contracorriente que tenemos. | Necesita expediente propio o bajar a preferencia declarada ("ATP prioriza protección física") en vez de postura implícitamente científica. |
| **7** | **21 claims a suavizar siguen vivos** desde la auditoría del 2026-07-21 (superlativos "#1", cifras sin cita como melatonina 50%→15%, N3 +20-30%). | 🟡 Acumulativo: cada uno es chico, juntos son el perfil de riesgo. | Ejecutar la auditoría que ya está escrita. **El trabajo de análisis ya se hizo; falta aplicarlo al código.** |

---

## 6 · Qué NO debe ser el portal

- ❌ **Un muro de abstracts.** Nadie lo lee y no convence a nadie. Lo que convence es el mecanismo explicado en lenguaje llano más la trazabilidad a la fuente.
- ❌ **Una defensa.** Un portal que solo justifica se lee como propaganda. El que declara sus huecos se lee como ciencia.
- ❌ **Una promesa de más.** El portal **no habilita claims más fuertes**. Al contrario: al obligar a que cada frase tenga expediente, va a hacer que varias frases se encojan. Eso es éxito, no fracaso.
- ❌ **Un CMS de artículos.** Eso ya vive fuera de la app.

---

## 7 · Secuencia propuesta

1. **Cerrar los huecos 1 y 3 ya** (contradicción de suplementos + los dos claims sin respaldo). Son los de exposición legal y no requieren investigación nueva.
2. **Aplicar al código la auditoría del 21-jul** (los 21 a suavizar). Trabajo de análisis ya hecho.
3. **Construir la capa `Claim`** con trazabilidad frase→fuente.
4. **Research dirigido** para los huecos 2, 5 y 6 (cronotipos, sistemas funcionales, bloqueadores) — esto sí requiere salir a buscar, con aprobaciones.
5. **Exponer los tres niveles** en la app y decidir con Enrique si el Nivel 3 vive también fuera (web/Skool).
6. **Validación de Mariana** sobre todo lo que quede marcado como afirmación clínica.

---

## 8 · Decisiones que necesito de Enrique
1. **Suplementos: ¿registro o recomendación?** (hueco 1). Todo lo demás depende de esto.
2. **¿El portal es solo interno/in-app, o también público?** Público = activo de marketing y de credibilidad, pero también superficie de ataque y de escrutinio legal.
3. **¿El Nivel 3 lo ve cualquiera, o es de Pro?** Yo lo abriría a todos: cobrarle a alguien por ver tus límites metodológicos es exactamente el gesto que un crítico usaría en contra.
4. **Los 21 claims a suavizar: ¿los aplico yo al código o van a un batch de CC?**
