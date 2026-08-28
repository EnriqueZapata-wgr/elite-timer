# 🔴 Expediente Nivel 3 · Ventana fértil y día de ovulación

**Fecha:** 2026-08-23 · **Estado:** implementado en la app, listo para exponerse en ATP Science
**Implementación:** `src/services/cycle/cycle-phase-core.ts`, función `predecirOvulacion`
**Pruebas que lo amarran:** `src/services/cycle/__tests__/cycle-phase-core.test.ts`

Escrito para el Nivel 3 del portal (expediente completo). El Nivel 1 (junto al
claim) y el Nivel 2 (ficha de evidencia) se derivan de aquí, no al revés.

---

## 1 · El claim exacto que hace ATP

> **Día estimado de ovulación: [fecha].** Tus días con más probabilidad de
> embarazo van del [inicio] al [fin]. Estas son estimaciones calculadas a partir
> de tus ciclos registrados, de acuerdo con la literatura.

Y lo que ATP **no** dice, por decisión explícita: no dice "estás ovulando", no
marca ningún día como seguro, y no se presenta como método anticonceptivo.

---

## 2 · Qué había antes, y por qué se cambió

La app calculaba `ovulación = inicio + round(largo / 2) − 1`, con ventana fértil
de −3 a +1 días alrededor de ese punto.

**Esa fórmula no existe en la literatura.** Se buscó explícitamente en OMS, ACOG,
ASRM, NICE, CDC, Merck y en la literatura de métodos basados en el conocimiento
de la fertilidad. Ninguna fuente ubica la ovulación dividiendo el ciclo entre dos.
Coincide con lo documentado solo en el caso particular de 28 días.

| Largo del ciclo | Fórmula vieja | Documentado | Error |
|---|---|---|---|
| 24 | día 12 | día 10 | 2 días |
| 28 | día 14 | día 14 | 0 |
| 32 | día 16 | día 18 | 2 días |
| 35 | día 18 | día 21 | 3 días |
| 40 | día 20 | día 26 | **6 días** |
| 45 | día 23 | día 31 | **8 días** |

Con una ventana fértil de 5 días, un error de 3 a 6 días la deja completamente
fuera. Esto se corrigió el 23-ago-2026.

---

## 3 · Lo que ATP calcula hoy, con la fuente de cada pieza

### 3.1 · El día más probable de ovulación

    día de ovulación = largo del ciclo − 14        [día 1 = primer día de sangrado]

**Fuente:** ASRM, *Optimizing natural fertility: a committee opinion* —
> "The calendar method assumes **the luteal phase is presumed to be approximately
> 14 days**."

**Excepción para ciclos cortos.** En ciclos de 15 a 20 días, Bull 2019 midió una
fase lútea de **8.0 días**, no 14. Con la convención, un ciclo de 18 daría el día
4, que es fisiológicamente absurdo. ATP usa 8 en ese tramo.

**Lo que NO hacemos, y por qué:** no interpolamos para el tramo de 21 a 23 días.
Bull publica el tramo 15-20 y el 36-50, no los intermedios. Inventar un valor
intermedio sería fabricar precisión. Esos ciclos caen por debajo del mínimo normal
de FIGO (24 días) y entran automáticamente al nivel de confianza baja.

### 3.2 · La banda de mayor probabilidad

    mayor probabilidad = ovulación − 2 … ovulación

**Fuente:** ASRM — la probabilidad máxima ocurre en los dos días previos a la
ovulación, con el pico el día anterior.

### 3.3 · La banda de menor probabilidad

    menor probabilidad = ovulación(ciclo más corto) − 5 … ovulación(ciclo más largo)

Es la ventana de Wilcox aplicada a todo el rango de ciclos que esa persona ha
registrado. Se ensancha sola cuando sus ciclos varían.

**Fuente:** Wilcox, Weinberg & Baird, NEJM 1995 (n=221 mujeres, 625 ciclos,
ovulación determinada por metabolitos hormonales urinarios) —
> "Conception occurred **only** when intercourse took place during a **six-day
> period that ended on the estimated day of ovulation**."
> "The probability of conception ranged from **0.10** five days before ovulation
> to **0.33** on the day of ovulation itself."

Con ciclos parejos de 28 días esto da los días 9 a 14: exactamente los seis días
de Wilcox. **Cero días posteriores a la ovulación.**

**Por qué la asimetría hacia atrás.** El espermatozoide sobrevive hasta 5 días en
el tracto reproductivo; el óvulo es fertilizable unas 12 horas (Merck Manual).
Cualquier ventana simétrica contradice esa fisiología.

**Un error que cometimos y corregimos el mismo día.** La primera versión usó la
fórmula de calendario rítmico de la OMS (`minLargo − 18` a `maxLargo − 11`) para
esta banda. Está mal usada: esa fórmula está diseñada para **evitar** embarazo,
es deliberadamente ancha por seguridad, y por eso se extiende tres días más allá
de la ovulación, en los que Wilcox no registró un solo embarazo. Se queda
documentado porque es el tipo de error que se repite si no se escribe.

### 3.4 · El nivel de confianza

| Condición | Nivel |
|---|---|
| Menos de 2 ciclos registrados | baja |
| Largo fuera de 24-38 días | baja |
| Variación entre ciclos mayor a 7 días | baja |
| Largo 26-32, variación ≤7, y ≥4 ciclos | alta |
| Resto | media |

**Fuentes:** rango normal 24-38 días y regularidad ≤7 días de variación, sistema
FIGO. Rango 26-32 días, ensayo de eficacia del Standard Days Method (Arévalo,
Jennings & Sinai, *Contraception* 2002, Institute for Reproductive Health,
Georgetown).

---

## 4 · Firewall: los cuatro ataques y su respuesta

### Ataque 1 · "El −14 no es real, la fase lútea varía"

**Es correcto, y ATP lo dice.** Bull 2019, con 612,613 ciclos, midió fase lútea de
media **12.4 días, rango del 95% entre 7 y 17**; el 18% de los ciclos por debajo
de 11 días. Un estudio prospectivo de 2024 (*Human Reproduction* 39(11):2565)
midió variación **dentro de la misma mujer** de mediana 3.0 días, hasta 7.9.

**Respuesta:** el −14 es una convención de cálculo declarada como tal por la ASRM,
no una constante biológica. Por eso ATP nunca presenta el día como un hecho, y por
eso la banda ancha existe: la incertidumbre no se comunica con un texto, se
comunica con el ancho de la banda.

### Ataque 2 · "Las apps de calendario no aciertan"

**Es correcto, y el número es peor de lo que la gente cree.** Johnson, Marriott &
Zinaman (*Curr Med Res Opin* 2018, 768 mujeres, ovulación por LH urinaria):
> "Accuracy of ovulation prediction was **no better than 21% by the apps**."

En ciclos de 28 días, el día más probable resultó ser el **16 (21%)**, no el 14
(14%), y la ovulación real osciló entre el día **11 y el 20**.

**Respuesta:** ATP no compite con esa realidad, la asume. Por eso muestra siempre
las dos cosas, rango y punto, y por eso el punto se etiqueta como estimación. La
alternativa honesta a un punto impreciso no es esconderlo: es acompañarlo del
rango y decir qué tan preciso es.

### Ataque 3 · "Están dando información que puede llevar a un embarazo no deseado"

**Respuesta:** ATP no marca ningún día como seguro ni como no fértil, y esa
decisión tiene base: Wilcox 2000 (BMJ, 696 ciclos) encontró **al menos 10% de
probabilidad de estar en la ventana fértil en cada día del 6 al 21** del ciclo, y
entre 1 y 6% incluso el día en que se esperaba la siguiente regla, en mujeres con
ciclos regulares. El producto solo habla de "mayor" y "menor" probabilidad; nunca
de ausencia de probabilidad. La app no se presenta como método anticonceptivo.

### Ataque 4 · "Su rango de 'días fértiles' no coincide con lo que dice mi médico"

**Respuesta:** las guías clínicas suelen citar los días 10 a 17 para un ciclo de
28. Wilcox 2000 puso a prueba exactamente esa banda y encontró que **solo en
alrededor del 30% de las mujeres** la ventana fértil cae completamente ahí. ATP
calcula la banda con los ciclos registrados de esa persona en lugar de usar la
banda genérica, y por eso puede diferir. Los dos números están en la literatura;
el nuestro es individual, el de la guía es poblacional.

---

## 5 · Lo que declaramos que NO sabemos

El portal es un firewall, y un firewall que oculta huecos se cae al primer
empujón. Estos son los nuestros, escritos:

1. **No existe fórmula publicada por tramos de largo de ciclo** lista para
   implementar. Bull da los insumos (fase lútea por tramo) pero no la fórmula.
   Nuestro manejo de ciclos cortos usa un solo tramo publicado y no interpola.
2. **Las probabilidades intermedias día por día de Wilcox 1995** (días −4, −3, −2,
   −1) no las pudimos verificar contra el PDF original: NEJM devolvió 403 y PubMed
   bloqueó con CAPTCHA. Solo los extremos (0.10 y 0.33) están citados
   textualmente desde un espejo académico. **No usamos los intermedios en el
   producto.**
3. **No hay umbral publicado explícito** del tipo "si la desviación supera X días,
   el calendario deja de ser válido". Nuestros umbrales son una composición
   razonada de tres criterios citables (FIGO, SDM, OMS), no una regla tomada de
   una guía.
4. **La OMS exige un mínimo de 6 ciclos** para el método de calendario rítmico.
   ATP opera con 2. Es una decisión de producto consciente, no un descuido, y por
   eso el nivel de confianza baja lo refleja.
5. **No se investigó el marco regulatorio ni de privacidad** aplicable (COFEPRIS,
   FDA, MDR, LFPDPPP). Eso requiere asesoría legal, no búsqueda bibliográfica.
6. **ACOG no se pudo abrir** (error 402 en cuatro intentos), así que no se cita
   nada de ACOG en este expediente aunque era una fuente buscada.

---

## 6 · Fuentes, con la metadata del portal

| # | Fuente | Paradigma | Nivel | Financiada por industria | Verificada |
|---|---|---|---|---|---|
| 1 | Wilcox, Weinberg & Baird. *Timing of sexual intercourse in relation to ovulation.* NEJM 1995;333:1517 | occidental | N1 | no | vía espejo académico (original 403) |
| 2 | Wilcox, Dunson & Baird. *The timing of the fertile window.* BMJ 2000;321:1259 | occidental | N1 | no | sí |
| 3 | Bull JR et al. *Real-world menstrual cycle characteristics of more than 600,000 menstrual cycles.* npj Digital Medicine 2019;2:83 | occidental / datos de app | N2 | **sí** (Natural Cycles) | sí |
| 4 | Johnson, Marriott & Zinaman. *Can apps and calendar methods predict ovulation with accuracy?* Curr Med Res Opin 2018 | occidental | N2 | **sí** (SPD Swiss Precision Diagnostics) | sí |
| 5 | ASRM Practice Committee. *Optimizing natural fertility.* | guía profesional | N1 | no | sí |
| 6 | Arévalo, Jennings & Sinai. *Efficacy of the Standard Days Method.* Contraception 2002 | occidental | N1 | no | sí |
| 7 | OMS / Johns Hopkins CCP. *Family Planning: A Global Handbook for Providers*, cap. 18 | guía OMS | N1 | no | sí |
| 8 | *Within-woman variability of follicular and luteal phase lengths.* Hum Reprod 2024;39(11):2565 | occidental | N2 | no | sí |
| 9 | NICE NG257. *Fertility problems: assessment and treatment.* | guía profesional | N1 | no | sí |
| 10 | CDC. *US MEC Appendix F.* | guía gubernamental | N1 | no | sí |
| 11 | SOGC. *Position Statement on the Natural Cycles App.* | guía profesional | N1 | no | sí |
| 12 | Merck Manual, Professional Edition. *Fertility Awareness-Based Methods.* | referencia clínica | N2 | no | sí |
| 13 | FIGO, parámetros de normalidad del ciclo (vía StatPearls) | guía profesional | N1 | no | parcial: la tabla original de FIGO devolvió 403 |

**Nota de conflicto de interés, obligatoria:** las fuentes 3 y 4 son las dos que
dan los números más duros sobre la imprecisión de las apps de calendario, y ambas
tienen financiamiento de industria. La 3 viene de Natural Cycles, que vende un
método competidor basado en temperatura; la 4 de un fabricante de pruebas de
ovulación. **Ese conflicto empuja en la misma dirección que nuestro claim**
(ambas tienen incentivo para mostrar que el calendario solo no basta), así que
citarlas para justificar humildad es consistente, pero no se pueden usar para
afirmar que otro método es mejor.

---

## 7 · Para los niveles 1 y 2 del portal

**Nivel 1**, junto al claim, una línea:
> Estimación calculada con tus ciclos registrados, según fase lútea de 14 días
> (ASRM) y ventana fértil de 6 días (Wilcox 1995). Ver evidencia.

**Nivel 2**, ficha de evidencia: secciones 3 y 4 de este expediente.

**Nivel 3**, expediente completo: este archivo.
