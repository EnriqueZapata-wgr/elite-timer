# ⏳ Fases metabólicas del ayuno · research con fuentes primarias

**Fecha:** 2026-07-26 · **Autor:** Cowork · **Para:** cerrar el Track F.1 de MB-8 (pastilla de etapa metabólica en vivo).
**Estado:** ⚠️ **PROPUESTA. Enrique cierra las ventanas, Mariana valida el lenguaje clínico.** No publicar sin ese paso.

---

## 🎯 El hallazgo que importa más que las fases

**Toda la industria de apps de ayuno publica gráficas del tipo "autofagia empieza a la hora 16 / 18 / 24". Eso no está establecido en humanos.**

Lo que dice la literatura:
- **No hay una hora confirmada en humanos.** El flujo autofágico (autophagic flux) es **técnicamente muy difícil de medir en personas vivas**.
- Las cifras que circulan vienen de **estudios en animales o de marcadores extrapolados**, no de medición directa en humanos.
- El momento probablemente **varía por órgano, edad y salud metabólica**.
- Sí hay trabajo humano emergente (ensayo cruzado aleatorizado combinando ejercicio depletor de glucógeno con ayuno prolongado, 2024), pero no fija una hora universal.

### Por qué esto es una oportunidad, no un problema

Zero y todas las demás publican el número con confianza. **ATP puede ser la que diga la verdad**, y eso es exactamente el firewall funcionando:

> *"La autofagia aumenta con el ayuno. La hora exacta en la que empieza en humanos no está establecida: se mide muy difícil en personas vivas y la mayoría de las cifras que circulan vienen de animales. Te decimos lo que sí sabemos y lo que no."*

Esa frase es **más creíble que un número inventado**, protege legalmente, y es imposible de atacar. Es el tipo de honestidad que convierte escrutinio en confianza.

**Decisión tomada (Enrique, 2026-07-27):** ATP **no publica una hora de autofagia**. Pero tampoco se queda en "no se sabe": **dice cómo se sabe de verdad.**

---

## 🩸 La posición ATP sobre autofagia · decirlo como ES

> **Corrección de Enrique:** *"Las personas con flexibilidad metabólica entran antes, y los que no la tienen tardan más. Hay requisitos para entrar: ATP/AMPK, cetosis, glucólisis, niveles de insulina, proteínas en flujo. Lo que se usa como proxy es glicemia y la proporción glicemia/cetonemia."*

Esto es más honesto **y más preciso** que la hora inventada de la competencia. La autofagia no se dispara por un reloj: se dispara por un **estado metabólico**, y ese estado tiene condiciones de entrada (relación AMP/ATP y activación de AMPK, insulina baja, glucógeno agotado, disponibilidad de sustrato).

**El reloj es un mal proxy. El proxy bueno es la sangre.**

### El índice que ya tiene publicación: GKI
**GKI (Glucose Ketone Index)** = glucosa (mmol/L) ÷ cetonas (mmol/L).
Publicado por **Meidenbauer, Mukherjee & Seyfried (2015)**, Boston College, como métrica única para seguir profundidad del estado cetogénico.

| GKI | Lectura |
|---|---|
| < 1 | Estado cetogénico máximo |
| 1-3 | Cetosis profunda |
| 3-6 | Cetosis moderada |
| > 6 | Predominio glucolítico |

⚠️ **Honestidad obligatoria:** el GKI se desarrolló y se usa en **terapia metabólica oncológica**, NO como lectura de autofagia. ATP lo usa como **indicador de profundidad del cambio metabólico**, y NO debe afirmar "GKI X = autofagia activa". Decir "estás en cetosis profunda" es defendible; decir "estás en autofagia" no lo es.
⚠️ Si la glucosa se captura en mg/dL (estándar en México), convertir dividiendo entre **18.016** antes de calcular.

### 🚀 Por qué esto es el diferenciador más grande del pilar
**ATP ya tiene la infraestructura:** `glucose_logs` (migración 040) y `ketones_logs` (078, β-hidroxibutirato en mmol/L con contexto `fasting`), más `ketones_sources` (204). **No hay que construir la captura, hay que usarla.**

Eso permite algo que ninguna app de ayuno hace:

| | Lo que dicen todas | Lo que puede decir ATP |
|---|---|---|
| Base | El reloj | Tu sangre |
| Mensaje | "Hora 16: autofagia" | "Tu GKI dice cetosis profunda" |
| Personalización | Ninguna, es el mismo reloj para todos | Individual y medida |
| Honestidad | Afirma lo que no está establecido | Afirma solo lo que midió |

Y cierra el círculo de doctrina: **la velocidad con la que bajas tu GKI ES tu flexibilidad metabólica.** El mismo ayuno, en dos personas, produce dos curvas distintas. Esa curva es la lectura fisiológica que conecta el pilar de Nutrición con Edad ATP.

**Implicación de producto:** la pastilla de fase debería tener dos modos. **Sin datos de sangre**, muestra la fase estimada por tiempo, declarada como estimación. **Con glucosa y cetonas capturadas**, muestra el estado real medido. El segundo modo es el que vale, y es el gancho para que el usuario mida.

---

## 📊 Fases propuestas (con respaldo primario)

Fuentes base: **Cahill GF Jr. 2006, *Annual Review of Nutrition*** (canónica de metabolismo en ayuno) y **de Cabo R & Mattson MP. 2019, *NEJM* 381(26):2541-2551** (ya citada en el catálogo de ATP).

| # | Fase | Ventana | Qué pasa | Respaldo |
|---|---|---|---|---|
| 1 | **Alimentado** | 0-4 h | Digestión y absorción. Insulina alta, la energía viene de la comida. | Cahill 2006 |
| 2 | **Post-absortivo** | 4-12 h | Cae la insulina. El hígado empieza a soltar su glucógeno. | Cahill 2006 |
| 3 | **Cambio metabólico** | 12-18 h | El glucógeno hepático se agota sustancialmente y empieza la lipólisis y la producción de cetonas. **de Cabo & Mattson ubican la depleción de glucógeno a partir de las 10-14 h.** | de Cabo & Mattson 2019 |
| 4 | **Cetosis** | 18-48 h | Las cetonas suben y se vuelven combustible relevante para cerebro y músculo. La **cetosis nutricional** (β-hidroxibutirato ≥0.5 mmol/L) suele establecerse **después de ~24 h** en la mayoría de adultos. | de Cabo & Mattson 2019 · Cahill 2006 |
| 5 | **Ayuno prolongado** | 48-72 h+ | La grasa domina como combustible y aparece el **ahorro de proteína** (hallazgo central de Cahill). **Requiere supervisión.** | Cahill 2006 |

⚠️ **Las ventanas son orientativas, no relojes.** La literatura es explícita en que el momento del cambio depende de la dieta previa, la actividad física, la última comida y la salud metabólica.

---

## 💡 El giro que hace esto ATP y no una copia

Aquí está el ángulo propietario, y sale directo de tu corrección de doctrina:

> **La velocidad a la que cambias de fase ES un marcador de flexibilidad metabólica.**

Alguien metabólicamente flexible entra en el cambio antes y más suave. Alguien rígido tarda, y la pasa mal (hambre, irritabilidad, bajón). **Zero te dice en qué hora vas. ATP te puede decir qué tan bien cambias de combustible**, que es la métrica que de verdad importa y que además es **el centro de la doctrina que acabas de precisar**.

Eso convierte la pastilla de fase de un adorno educativo en **una lectura de tu fisiología**. Y conecta el pilar de ayuno con Edad ATP.

**Respaldo del concepto:** Goodpaster BH & Sparks LM. 2017, *Cell Metabolism*, "Metabolic Flexibility in Health and Disease" (la revisión canónica) · más una revisión en *Mayo Clinic Proceedings* 2022 sobre flexibilidad metabólica y desenlaces de salud.

Esto es importante para el portal: **la flexibilidad metabólica no es lenguaje de biohacker, es un constructo fisiológico establecido con literatura primaria.** Tu corrección de doctrina es defendible en términos académicos, no solo filosóficos.

---

## 🐬 Bonus: el hueco de cronotipos, y una corrección que ATP ya hizo bien

El modelo de 4 animales (león, oso, lobo, delfín) que vive en `src/services/quiz-service.ts` **no tiene atribución en el repo**. Es de **Michael Breus, PhD, *The Power of When* (2016)**. Distribución que él reporta: oso ~55%, lobo y león ~15-20% cada uno, delfín ~10%.

**Honestidad necesaria:** es un **modelo clínico-divulgativo, no un instrumento académico validado.** Hay investigadores que describen tres cronotipos y otros que describen siete; el de cuatro es una propuesta entre varias. Los instrumentos validados en la academia son el **MEQ (Horne-Östberg)** y el **MCTQ (Roenneberg)**.

**Y aquí lo bueno:** ATP ya trata al **delfín como estado temporal**, no como tipo fijo, y le dice al usuario cuál es su cronotipo madre para que lo resuelva. **Breus lo trata como tipo permanente.** Eso no es un hueco: **es una corrección original de ATP sobre el modelo**, clínicamente más sensata, y debería documentarse como posición propia en el portal en vez de quedarse escondida en el código.

---

## ✅ Qué hacer con esto

1. **Enrique:** cierra las ventanas de la tabla (o confirma las propuestas). Son tu protocolo.
2. **Mariana:** valida el lenguaje clínico antes de que salga a usuario.
3. **Decisión de doctrina:** ¿ATP publica hora de autofagia? **Mi recomendación fuerte es que no**, y que la honestidad se use como diferenciador explícito.
4. **Track F.1 de MB-8:** CC ya tiene instrucción de dejar las fases parametrizadas en un solo lugar y marcarlas como provisionales. Esta tabla es el default informado que puede usar mientras tanto.
5. **Cronotipos:** atribuir a Breus, declarar que es modelo divulgativo, y **documentar la corrección del delfín como posición ATP**.

---

## 📚 Fuentes
- Cahill GF Jr. "Fuel Metabolism in Starvation." *Annual Review of Nutrition* 2006;26:1-22. PMID 16848698.
- de Cabo R, Mattson MP. "Effects of Intermittent Fasting on Health, Aging, and Disease." *NEJM* 2019;381(26):2541-2551. PMID 31881139.
- Goodpaster BH, Sparks LM. "Metabolic Flexibility in Health and Disease." *Cell Metabolism* 2017;25(5):1027-1036.
- "Metabolic Flexibility and Its Impact on Health Outcomes." *Mayo Clinic Proceedings* 2022.
- "Investigating the Impact of Glycogen-Depleting Exercise Combined with Prolonged Fasting on Autophagy and Cellular Health in Humans: A Randomised Controlled Crossover Trial." PMC11677747.
- Breus M. *The Power of When.* Little, Brown Spark, 2016. *(paradigma: functional_independent)*
