# Ciclo · base documental para ovulación y ventana fértil

> **Corregido el mismo 23-ago tras el cuatro ojos.** La banda de menor
> probabilidad ya NO usa la fórmula de calendario rítmico de la OMS. Esa fórmula
> está diseñada para EVITAR embarazo, es deliberadamente ancha, y por eso metía
> tres días posteriores a la ovulación, en los que Wilcox no registró un solo
> embarazo. Meter días post-ovulación fue una de las razones por las que se mató
> la fórmula anterior: el argumento aplicaba más fuerte a su reemplazo. La versión
> implementada está abajo y en
> `R and D/EXPEDIENTE_CIENCIA_VENTANA_FERTIL_2026-08-23.md`.

Investigado el 23-ago-2026 a pedido de Enrique: *"quiero que tomemos documentación
real, no estar inventando, deben haber fórmulas reales"*. Cada número aquí tiene
fuente. Lo que no la tiene, se dice.

---

## El hallazgo que obliga al cambio

**La fórmula que ATP usa hoy no existe en la literatura.** No hay ninguna guía
clínica, método de planificación familiar ni estudio que ubique la ovulación
dividiendo el ciclo entre dos. Se buscó en OMS, ACOG, ASRM, NICE, CDC, Merck y en
la literatura de métodos basados en el conocimiento de la fertilidad.

Lo documentado es la **fase lútea de duración aproximadamente fija**:

> "The calendar method assumes **the luteal phase is presumed to be approximately
> 14 days**." — ASRM, *Optimizing natural fertility: a committee opinion*

    día de ovulación (día del ciclo) = largo del ciclo − 14        [día 1 = sangrado]

Desviación de la fórmula actual contra la documentada:

| Largo | ATP hoy | `largo − 14` | Error |
|---|---|---|---|
| 24 | día 12 | día 10 | 2 d |
| 28 | día 14 | día 14 | 0 |
| 32 | día 16 | día 18 | 2 d |
| 35 | día 18 | día 21 | 3 d |
| 40 | día 20 | día 26 | **6 d** |
| 45 | día 23 | día 31 | **8 d** |

---

## La ventana fértil: ATP la tiene mal por los dos lados

Wilcox 1995 (n=221 mujeres, 625 ciclos, ovulación por metabolitos hormonales):

> "Conception occurred **only** when intercourse took place during a **six-day
> period that ended on the estimated day of ovulation**."
> "The probability of conception ranged from **0.10 five days before ovulation**
> to **0.33 on the day of ovulation itself**."

**Ventana correcta: −5 … 0.** Seis días, termina EL DÍA de la ovulación.

| | Ventana | Problema |
|---|---|---|
| ATP hoy | −3 … +1 | |
| Documentada | −5 … 0 | |
| Le faltan | días −5 y −4 | días fértiles reales (−5 tiene P≈0.10) |
| Le sobra | día +1 | Wilcox **no registró ni un embarazo** por coito post-ovulación |

La asimetría hacia atrás es fisiológica: el espermatozoide vive hasta 5 días, el
óvulo unas 12 horas (Merck Manual). Cualquier ventana simétrica contradice eso.

Días de mayor probabilidad: los **2 previos** a la ovulación (ASRM).

---

## Cuánta humildad debe tener la pantalla

Esto es lo más importante del documento y hoy la app no lo refleja.

**Johnson 2018** (768 mujeres, ovulación por LH urinaria):
> "Accuracy of ovulation prediction was **no better than 21% by the apps**."
> En ciclos de 28 días el día más probable fue el **16 (21%)**, no el 14 (14%).
> La ovulación real osciló entre el **día 11 y el día 20**.

**Wilcox 2000** (BMJ, 696 ciclos):
> "In **only about 30% of women** is the fertile window entirely within days 10–17."
> Había **≥10% de probabilidad** de estar en ventana fértil **cada día del 6 al 21**.
> Incluso con ciclos regulares, **1–6%** de estar en ventana el día esperado de la regla.
> "**The timing of their fertile window can be highly unpredictable, even if their
> cycles are usually regular.**"

Consecuencias no negociables para la UI:

- Prohibido presentar el día de ovulación como un hecho. Siempre "estimado".
- Prohibido marcar días como "seguros" o "no fértiles". Ninguno lo es.
- Con ciclos irregulares, no mostrar día puntual: sería precisión inventada.

**La fase lútea tampoco es fija.** Bull 2019 (612,613 ciclos, npj Digital Medicine):
fase lútea media 12.4 d, **rango 95%: 7–17 d**; 18% de los ciclos por debajo de 11 d;
solo **13% de los ciclos miden 28 días**. Un estudio prospectivo de 2024 (Human
Reproduction) midió variación **dentro de la misma mujer** de mediana 3.0 días.
Por eso `−14` es una convención de cálculo, no una constante biológica, y por eso
el texto tiene que decirlo.

---

## Implementación propuesta

    L     = promedio de ciclos observados   (ATP ya lo calcula bien: hasta 5, filtrados 20-45, mín 2)
    n     = cuántos ciclos
    varia = máximo − mínimo

    NIVEL:
      n < 2                              -> "sin_datos"
      L < 24 o L > 38                    -> "fuera_de_rango"     [FIGO: ciclo normal 24-38]
      varia > 7                          -> "irregular"          [FIGO: regular si varía ≤7 d]
      26 <= L <= 32 y varia <= 7 y n>=4  -> "alta"               [rango de validez de SDM]
      resto                              -> "media"

    día_ovulación = L − 14                                       [ASRM]
    si día_ovulación < 8: día_ovulación = 8                      [ver salvedad abajo]

    banda alta = [ovulacion - 2 , ovulacion]                      [ASRM]


    banda baja = [ovulacion(minL) - 5 , ovulacion(maxL)]         [Wilcox 1995]
    // La ventana de Wilcox aplicada a TODO el rango de ciclos observado.
    // Se ensancha sola con la variabilidad y NUNCA pasa de la ovulacion.
    // Con ciclos parejos de 28 da 9..14: los seis dias de Wilcox exactos.

    QUÉ MOSTRAR:
      alta       -> día puntual (etiquetado estimado) + ventana + días pico
      media      -> ventana como elemento principal; día puntual atenuado
      irregular  -> SOLO banda baja. Sin dia puntual.
      fuera_de_rango -> nada, con explicación
      sin_datos  -> nada, pedir 2 ciclos

**Salvedad honesta sobre la cota del día 8:** Bull documenta que en ciclos de 15-20
días la fase lútea medida fue de 8.0 días, así que `L − 14` se rompe en ciclos
cortos. Pero **no existe publicada una fórmula por tramos lista para implementar**.
La cota evita mostrar un número absurdo sin fingir precisión inventada. Si se
quiere algo mejor, hace falta otra fuente, no más razonamiento.

**Segunda salvedad:** ATP usa mínimo 2 ciclos. **La OMS exige 6** para el método de
calendario. No propongo subirlo a 6 (mataría el producto), pero el texto tiene que
reconocerlo en vez de ignorarlo.

**Tercera salvedad:** `confidence` ya se calcula en `predecirProximo` y **nadie lo
lee**. Ese campo muerto es exactamente el insumo que necesita el NIVEL de arriba.

---

## Textos, es-MX

**Nivel alta**
> **Día estimado de ovulación: [fecha]**
> Tus días con más probabilidad de embarazo van del **[inicio]** al **[fin]**.
>
> Este cálculo sale del promedio de tus últimos ciclos. Es una estimación, no una
> medición: la ovulación se mueve de un mes a otro, incluso cuando los ciclos son
> parejos. Tómalo como guía, no como dato exacto.

**Nivel media**
> **Tus días con más probabilidad van del [inicio] al [fin].**
> Dentro de ese rango, el día más probable sería alrededor del **[fecha]**.
>
> Tus ciclos varían un poco, así que este rango puede moverse. Entre más ciclos
> registres, mejor se ajusta.

**Nivel irregular**
> **Tus ciclos han variado bastante entre sí ([varia] días de diferencia).**
> Por eso no te mostramos un día puntual: sería darte una precisión que no tenemos.
>
> Con lo que registraste, tus días más probables caerían entre el **[inicio]** y el
> **[fin]**, un rango amplio a propósito.
>
> Si quieres afinarlo, registrar señales de tu cuerpo (temperatura al despertar,
> cambios en el moco cervical) o usar pruebas de ovulación de farmacia da mucha más
> información que el calendario solo.

**Nivel fuera de rango**
> **Por ahora no podemos estimar tus días fértiles.**
> Tus ciclos promedian [L] días, fuera del rango donde este cálculo funciona.
>
> No es un diagnóstico ni quiere decir que algo ande mal, solo que el calendario no
> alcanza aquí. Si te late, platícalo con un profesional de salud.

**Nivel sin datos**
> **Nos faltan datos para estimar tus días fértiles.**
> Registra al menos dos ciclos completos y aquí te aparece.

**Ícono de información, siempre visible**
> **¿Qué tan exacto es esto?**
> Poco, y preferimos decírtelo. Los cálculos por calendario aciertan el día exacto
> de la ovulación **menos de 1 de cada 4 veces**, según estudios que midieron
> hormonas reales. Sirven para orientarte sobre en qué parte del mes estás, no para
> saber con certeza qué día ovulas.
>
> **Esto no sirve para evitar un embarazo.** Ningún día del ciclo es un día seguro.

---

## Aviso de seguridad, obligatorio

Tasas de falla documentadas de los métodos de calendario, **enseñados y con
seguimiento** (ATP no hace ni una cosa ni la otra, así que son una cota optimista):

| Método | Uso correcto | Uso típico | Fuente |
|---|---|---|---|
| Standard Days Method | 4.8 /100 mujeres-año | **12 /100** | Arévalo 2002 |
| Abstinencia periódica (calendario) | — | **~15 /100** | OMS |
| Métodos de fertilidad (todos) | <1% a 5% | **2% a 34%** | Guttmacher |

Texto bloqueante, una vez, en el onboarding de la función:

> **Esto no es un método anticonceptivo.**
> ATP calcula una estimación a partir de fechas. No mide hormonas ni temperatura,
> y no puede saber cuándo ovulas.
>
> Si estás evitando un embarazo, no uses esta función para decidir. Incluso los
> métodos de calendario formales, enseñados por personal capacitado, resultan en
> **alrededor de 12 a 15 embarazos por cada 100 mujeres al año** con uso típico.
> Un cálculo dentro de una app, sin acompañamiento, es menos confiable que eso.

Y algo que vale más que cualquier predicción, para quien busca embarazo:

> "Inform people who are concerned about their fertility that **vaginal sexual
> intercourse every 2 to 3 days optimises the chance of pregnancy**."
> — NICE NG257, rec. 1.5.1

---

## Orden de aplicación

| # | Cambio | Base |
|---|---|---|
| 1 | `round(L/2) − 1` → `L − 14`, en `cycle-phase-core.ts` como `predecirOvulacion` | ASRM |
| 2 | Ventana `−3/+1` → `−5/0` | Wilcox 1995 |
| 3 | Matar las dos copias locales de siguiente regla (`app/cycle.tsx:163` y `:326`) | doctrina de la casa |
| 4 | Niveles de confianza; ocultar día puntual si es irregular | Wilcox 2000, Johnson 2018 |
| 5 | Unificar el promedio del reporte con `cycle-length-core` | doctrina de la casa |
| 6 | Textos estimativos y aviso de no-anticonceptivo | Johnson 2018, SOGC, OMS |
| 7 | Arreglar el ratchet de `cycle-phase-core.test.ts:224` para anclar la FÓRMULA, no el nombre de variable | pasa en verde hoy |

---

## Fuentes

Abiertas y verificadas:

1. Wilcox, Dunson & Baird. *The timing of the "fertile window".* BMJ 2000;321:1259. https://www.bmj.com/content/321/7271/1259
2. Bull JR et al. *Real-world menstrual cycle characteristics of more than 600,000 menstrual cycles.* npj Digital Medicine 2019;2:83. https://www.nature.com/articles/s41746-019-0152-7
3. Johnson, Marriott & Zinaman. *Can apps and calendar methods predict ovulation with accuracy?* Curr Med Res Opin 2018.
4. ASRM. *Optimizing natural fertility: a committee opinion.* https://integration.asrm.org/globalassets/_asrm/practice-guidance/practice-guidelines/pdf/optimizing_natural_fertility.pdf
5. Arévalo, Jennings & Sinai. *Efficacy of the Standard Days Method.* Contraception 2002. https://www.irh.org/wp-content/uploads/2013/04/Efficacy_SDM_2002.pdf
6. OMS / Johns Hopkins. *Family Planning: A Global Handbook for Providers*, cap. 18. https://fphandbook.org/sites/default/files/JHU%20HBk22%20-%20Chapter%2018.pdf
7. *Within-woman variability of follicular and luteal phase lengths.* Hum Reprod 2024;39(11):2565. https://academic.oup.com/humrep/article/39/11/2565/7775370
8. NICE NG257. *Fertility problems.* https://www.nice.org.uk/guidance/ng257
9. CDC. *US MEC Appendix F, Fertility Awareness-Based Methods.*
10. SOGC. *Position Statement on the Natural Cycles App.*
11. Merck Manual Professional. *Fertility Awareness-Based Methods of Contraception.*
12. Guttmacher Institute. *Contraceptive Effectiveness in the United States.*

Citada vía fuente secundaria (original bloqueado por el editor):

13. Wilcox, Weinberg & Baird. *Timing of sexual intercourse in relation to ovulation.* NEJM 1995;333:1517. NEJM devolvió 403 y PubMed CAPTCHA; las citas textuales se tomaron de un espejo académico. **Conviene que alguien abra el PDF original y coteje.**

No se pudo abrir, y por eso NO se cita nada de ahí: ACOG (error 402 en cuatro
intentos), Lenton 1984, Urrutia & Polis 2018, tabla original FIGO 2018.

**Sin investigar, y hace falta:** marco regulatorio y de privacidad (COFEPRIS, FDA,
MDR, LFPDPPP). Eso es asesoría legal, no búsqueda bibliográfica.
