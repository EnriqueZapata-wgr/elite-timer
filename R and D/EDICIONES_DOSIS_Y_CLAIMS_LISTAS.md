# ✂️ Ediciones listas · barrido de dosis + 32 claims

**Fecha:** 2026-07-27 · **Autor:** Cowork · **Asignado por Enrique** (barrido de dosis + los 21 a suavizar + los 2 sin respaldo).
**Estado:** ⏸️ **PREPARADO, NO APLICADO.** CC tiene el working tree tomado en `feat/mb9-espiral`. Se aplica en cuanto aterrice, sobre rama propia `feat/claims-y-dosis` desde `main`.
**Fuente del análisis:** `R and D/CLAIMS_CATALOGO_VS_RESEARCH_2026-07-21.md` + correcciones de doctrina de Enrique (2026-07-27).

---

## ⚠️ UNA DECISIÓN QUE NECESITO ANTES DE APLICAR

El barrido de dosis tiene dos profundidades posibles:

**A · Solo quitar las cifras** → *"Vitamina D3 + Omega 3 + Magnesio glicinato"*. Deja de prescribir dosis pero **sigue recomendando qué tomar**.
**B · Quitar sustancia y dosis** → *"Registra tus suplementos de la mañana"*. El bloque se vuelve **recordatorio de registro**, no prescripción.

**Mi lectura es B**, porque tu instrucción fue *"barrer todo"* y porque la doctrina del catálogo dice *"en ATP NO se recomiendan suplementos"* y la migración 194 dice *"suplementos son REGISTRO, no recomendación"*. Con A, la contradicción de AK-01 sigue viva a medias.
**Abajo está escrito en B. Si prefieres A, es cambiar el texto de reemplazo, no el plan.**

---

# 💊 BLOQUE 1 · DOSIS · `src/data/seed-protocols.ts` — 9 cadenas

| # | Línea | ANTES (`instructions`) | DESPUÉS |
|---|---|---|---|
| 1 | 20 | `Vitamina D3 5000IU + Omega 3 2g + Magnesio glicinato 400mg` | `Registra tus suplementos de la mañana` |
| 2 | 31 | `Magnesio glicinato 400mg + Ashwagandha 600mg + L-teanina 200mg` | `Registra tus suplementos de la noche` |
| 3 | 64 | `Zinc 30mg + Boro 6mg + Vit D3 5000IU + Ashwagandha KSM-66 600mg` | `Registra tus suplementos de la mañana` |
| 4 | 67 | `Magnesio glicinato 400mg + Tongkat Ali 400mg` | `Registra tus suplementos de la noche` |
| 5 | 100 | `Omega-3 3g + Curcumina 1g + Vit D3 5000IU` | `Registra tus suplementos de la mañana` |
| 6 | 108 | `Mg glicinato 400mg + L-glutamina 5g` | `Registra tus suplementos de la noche` |
| 7 | 126 | `Zinc 30mg + Boro 6mg + Vit D3 5000IU + Ashwagandha 600mg` | `Registra tus suplementos de la mañana` |
| 8 | 152 | `Mg glicinato 400mg + L-teanina 200mg + Glycina 3g` | `Registra tus suplementos antes de dormir` |
| 9 | 175 | `Berberina 500mg + Cromo 200mcg + Canela Ceylon 1g` | `Registra tus suplementos con la cena` |

**Nota:** los nombres de bloque (`Suplementos AM`, `Stack hormonal AM`, `Suplementos metabólicos`) **también sugieren contenido**. Propuesta: renombrar a `Suplementos · mañana`, `Suplementos · noche`, etc. **Tu veto.**
**Después de aplicar:** re-correr el grep `[0-9]+ ?(mg|mcg|IU|UI)` sobre `src/` y `app/` y confirmar que lo que quede sean **unidades de laboratorio o entrada del usuario**, nunca emisión de ATP.

---

# ❌ BLOQUE 2 · LOS DOS SIN RESPALDO

### 2.1 · Separadores de dedos — **con tu corrección**
Tú corregiste: *"son para caminar descalzo mientras los usas y así ejercitar los músculos de los pies, y ESO es lo que puede prevenir los juanetes. Pero también requiere cambiar de calzado. No es un estímulo aislado."*

**Línea 7725 · `benefit`**
- **ANTES:** `...mejora arco funcional, propriocepción plantar, previene juanetes (hallux valgus), reduce fascitis plantar via mejor loading del antepié.`
- **DESPUÉS:** `...mejora arco funcional y propriocepción plantar. Su efecto real viene de caminar descalzo con ellos puestos: así se reactiva la musculatura intrínseca del pie. Requiere además cambiar a calzado con espacio para los dedos — como estímulo aislado no basta.`

**Línea 7759 · `mechanismSummary`**
- **ANTES:** `...propriocepción y bloqueando la deformidad hallux valgus por vía mecánica · mejora cascada ascendente...`
- **DESPUÉS:** `...y propriocepción. El trabajo activo (caminar descalzo con ellos) más el cambio de calzado son las condiciones sin las cuales el separador solo no hace el trabajo · mejora cascada ascendente...`

**Línea 7728 · `assignRule`:** quitar `juanetes incipientes` como criterio de asignación clínica.
**Línea 7747 · biomarcador `ángulo hallux valgus (grados)`:** retirar. **Prometer mover un ángulo estructural es el claim de mayor exposición del catálogo.**

> ✅ Así deja de ser un gadget que promete prevenir una deformidad y pasa a ser **un protocolo con sus condiciones**. Más honesto, menos atacable, y **más útil**, porque el usuario que solo se los pone y sigue con zapato estrecho ahora sabe que no le va a funcionar.

### 2.2 · Minimalismo digital
**Línea 10148 · `benefit`**
- **ANTES:** `Restaura dopamina baseline (reset tolerancia hedónica), mejora atención (Kraus + Hansen), reduce comparación social...`
- **DESPUÉS:** `Rompe el ciclo de refuerzo variable de las redes, mejora atención (Kraus + Hansen), reduce comparación social...`
- Y quitar `reset tolerancia hedónica` / `dopamina baseline` del `mechanismSummary`.

---

# ⚠️ BLOQUE 3 · SUPERLATIVOS (4)

| Línea | ANTES | DESPUÉS |
|---|---|---|
| 4797 | `La intervención con mejor evidencia de reducción de mortalidad cardiovascular en humanos (KIHD cohort · 4-7 sesiones/sem → 50-63% menor riesgo)` | `Una de las intervenciones con evidencia observacional más consistente en salud cardiovascular: en la cohorte KIHD, 4-7 sesiones/sem se asociaron con 50-63% menor riesgo de mortalidad cardiovascular (Laukkanen 2015)` |
| 7460 | `grip · predictor #1 mortalidad Rantanen 1999` | `la fuerza de agarre se asocia con longevidad (Rantanen 1999)` |
| 7529 | `Marker independiente de longevidad.` | `Se asocia con marcadores de longevidad.` |
| 7936 | `VO2max = predictor #1 de mortalidad por todas las causas.` | `El VO2max es uno de los predictores más fuertes de mortalidad por todas las causas (asociación dosis-respuesta, Mandsager 2018).` |
| 7978 | `el predictor #1 de longevidad decisional` | `uno de los predictores más fuertes de longevidad` |
| 8057 | `Intervención #1 anti-sarcopenia + declive metabólico` | `Intervención de primera línea contra la sarcopenia y el declive metabólico` |

---

# ⚠️ BLOQUE 4 · CIFRAS SIN CITA (7)

| Línea | ANTES | DESPUÉS |
|---|---|---|
| 1105 | `reducción de supresión melatonina de ~50% a ~15%` | `mayor protección de la melatonina que la versión corta` |
| 1199 | `máxima protección de melatonina (supresión residual <5%)` | `máxima protección de la melatonina` |
| 1298 | `sueño profundo N3 aumenta 20-30%` | `apoya mayor sueño profundo N3` |
| 1409 | `suficiente para 85-95% del beneficio` | `cubre la mayor parte del beneficio del blackout ambiental` |
| 2172 | `Reduce glucosa postprandial 20-50% vía captación muscular` | `Baja la glucosa postprandial vía captación muscular insulina-independiente (Reynolds 2016, DiPietro 2013)` |
| 5625 | `bradicardia 10-25% en <30 seg` | `bradicardia refleja en segundos` |
| 6335 | `(Wunsch & Matuschka 2014 · +30-40% densidad colágeno en 12 semanas)` | `(Wunsch & Matuschka 2014, que documentó mayor densidad de colágeno dérmico)` |
| 7936 | `Aumenta 7-9% en 8 semanas.` | `Mejora medible del VO2max en semanas.` ⚠️ *o mantener la cifra si Mariana valida Helgerud 2007 como cita* |
| 7978 | `resultan en aumento de VO2max 7-9% en 8 semanas` | `resultan en mejora medible del VO2max en semanas` |

---

# ⚠️ BLOQUE 5 · VERBOS TERAPÉUTICOS (7)

| Línea | ANTES | DESPUÉS |
|---|---|---|
| 2875 | `elimina Valsalva excesivo, previene hemorroides, mejora vaciamiento` | `reduce el esfuerzo (Valsalva) al evacuar, mejora vaciamiento` |
| 2892 | `presión venosa hemorroidal (previene hemorroides)` | `presión venosa hemorroidal` |
| 6457 | `previene fatiga acomodativa, reduce miopía adquirida por near work crónico` | `ayuda a aliviar la fatiga acomodativa por trabajo de cerca prolongado` |
| 6562 | `restaura película lagrimal, previene ojo seco crónico, ojo rojo vespertino` | `ayuda a mantener la película lagrimal y a reducir molestias oculares por pantalla` |
| 7000 | `Reduce mortalidad asociada a sedentarismo (Chastin meta-analysis)` | `El menor tiempo sedentario se asocia con mejores marcadores de salud (Chastin)` |
| 7638 | `respiración funcional (favorece nasal), prevención bruxismo, mejora postura` | `respiración funcional (favorece nasal), tono muscular facial, mejora postura` |
| 7670 | `beneficios adicionales: fuerza masticatoria, prevención bruxismo, respiración nasal` | `beneficios adicionales: fuerza masticatoria, tono muscular facial, respiración nasal` |
| 9811 | `Herramienta cognitiva estructurada para trabajo demandante y prevención de declive.` | `Herramienta cognitiva estructurada para entrenar la memoria de trabajo.` |
| 8057 | `...densidad ósea, control glucémico, mortalidad.` | `...densidad ósea, control glucémico y marcadores asociados a longevidad.` |

---

## 🧾 Cómo se aplica
Rama `feat/claims-y-dosis` desde `main`, **después de que MB-9 aterrice** para no chocar con el working tree de CC.
Todo es `str_replace` quirúrgico, cero reescritura de archivo. `npx tsc --noEmit` + tests. Sin migraciones. **Es OTA-able.**

## ✅ Qué cierra esto en el expediente AK
- **AK-01** (contradicción de suplementos) → 🟢 si eliges la opción B.
- **AK-02** (separadores) → 🟢 con tu corrección, que además lo vuelve un claim mejor.
- **AK-03** (dopamina baseline) → 🟢.
- **AK-04** (21 claims inflados) → 🟢.

Quedarían abiertos solo los 🟡 que necesitan research o decisión clínica: cronotipos, 7 sistemas funcionales y bloqueador químico.
