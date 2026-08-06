# 📚 HANDOFF · ATP Science Portal — arranque para un Cowork dedicado

**Para:** una sesión de Cowork nueva, dedicada solo a este proyecto.
**De:** Cowork ATP (sesión de producto) · 2026-07-27
**Objetivo de Enrique:** *"Una mega biblioteca de estudios que respalden ATP. Navegación y resúmenes de cada estudio con enlaces. Que pase de temática robusta a tema específico. Casi como una Wikipedia. Y que sea nuestro firewall de dudas y cuestionamientos."*

---

## 0 · Lo primero que debes hacer
**Lee estos tres documentos del repo antes de tocar nada.** Contienen el análisis ya hecho; no lo repitas.

1. `R and D/SPEC_ATP_SCIENCE_PORTAL_v1.md` — arquitectura de 3 niveles, lógica del firewall, huecos detectados.
2. `R and D/CLAIMS_CATALOGO_VS_RESEARCH_2026-07-21.md` — auditoría de 41 claims (18 ✅ · 21 ⚠️ · 2 ❌).
3. `R and D/AK_EXPEDIENTE_INTERNO.md` — ⛔ **confidencial**, el expediente del abogado del diablo. Léelo para saber dónde somos débiles. **No lo publiques ni lo cites hacia afuera.**

Contexto adicional útil: `docs/edad-atp/RESEARCH_CALCULADORAS_v1.md` y los `R and D/RESEARCH_MAPEO_BATCH_A/B/C_2026-07-14.md`.

---

## 1 · Lo que ya existe (no lo construyas de cero)

| Activo | Dónde | Qué es |
|---|---|---|
| **717 citas estructuradas** | `src/constants/interventions-catalog.ts`, campo `sources[]` | Cada una con `citation`, `paradigm`, `url?`, `industryFunded?`, `paradigmConflict?` |
| **Jerarquía N1-N4** | mismo archivo, tipo `EvidenceLevel` | Explícitamente **NO** es la jerarquía occidental |
| **11 paradigmas tipados** | mismo archivo, tipo `SourceParadigm` | occidental, funcional independiente, MTC, ayurveda, soviético, ruso, indio, chino, latam, mecanístico, tradicional documentado |
| **88 intervenciones** | mismo archivo | Cada una con mecanismo, contraindicaciones, impacto epigenético |
| **Auditoría de claims** | `R and D/CLAIMS_CATALOGO_VS_RESEARCH_2026-07-21.md` | Ya cruzada claim ↔ cita |

**Extracción rápida:**
```
grep -n "citation:" src/constants/interventions-catalog.ts
```
y cruza con el `paradigm:` inmediatamente anterior para clasificar.

---

## 2 · La doctrina que NO se negocia

**a · La evidencia de ATP es multi-paradigma.** PubMed **no** es árbitro único: es el grial de la ciencia que tuvo financiamiento, no de la que sirve. Sesgos que hay que declarar: publicación, financiamiento, idioma (~95% inglés), patrocinio industrial, novedad y reduccionismo. **Nunca reduzcas el respaldo de ATP a literatura biomédica occidental.**

**b · AHA, USDA, Harvard y ADA no son validación para ATP** — son cuerpos con captura industrial documentada. **Y la coherencia es obligatoria: si no valen para contradecirnos, tampoco valen para respaldarnos.** Si los citas a favor, todo el portal se cae.

**c · ATP no cura, optimiza.** Ningún texto del portal puede prometer curar, prevenir o tratar una condición. Lenguaje educativo, nunca terapéutico.

**d · ATP es comida-limpia-céntrica y flexibilidad-metabólica-céntrica.** No es grasa-céntrica ni proteíno-céntrica. Los rangos de macros son **consecuencia** de comer limpio, no la doctrina.

**e · No se publica lo que no está establecido.** Ejemplo vivo: **no existe una hora confirmada de autofagia en humanos.** ATP no publica ese número aunque toda la industria lo haga. Decir la verdad ahí es diferenciador, no debilidad.

**f · La narrativa es negociable, la filosofía no.** Enrique: *"Si los estudios hacen cambiar un poco la narrativa, que así sea. Nos vamos por la ruta más segura sin cambiar de filosofía."* **Esto es lo que hace posible el portal.** Un portal construido para defender una conclusión predeterminada se detecta a kilómetros.

**g · Cero nombres propios de personas en copy de usuario.** Toda recomendación es de ATP o de ARGOS. (Los autores de estudios SÍ se citan como autores; la prohibición es sobre atribuir recomendaciones a personas.)

**h · No matar el placebo.** El placebo es una intervención real. Las controversias existen, se documentan y son accesibles, **pero no se le avientan a quien no preguntó.** De ahí los tres niveles.

---

## 3 · Arquitectura: tres niveles

- **🟢 Nivel 1 · en la app, junto al claim.** Una línea: qué hace y de qué paradigmas viene el respaldo. Sin cifra prometida, sin controversia. *Aquí el placebo queda intacto.*
- **🔵 Nivel 2 · ficha de evidencia.** Nivel N1-N4 con su definición a la vista, fuentes con paradigma visible y marca de financiamiento, mecanismo en lenguaje llano, contraindicaciones.
- **🔴 Nivel 3 · expediente completo.** Se llega **solo preguntando**. Conflictos entre paradigmas, **qué NO sabemos**, por qué rechazamos ciertos cuerpos como validación (con el recibo, no con opinión), y **los claims que ATP retiró o suavizó** — esto último vale oro porque demuestra que el sistema se autocorrige.

**Regla madre del firewall: nunca defiendas un claim escalándolo.** Si el expediente es débil, se dice que es débil.

---

## 4 · La transformación técnica central

**Hoy las 717 citas son strings colgados de cada intervención. Para tener wiki hay que invertir el grafo: el ESTUDIO es el nodo, y muchas afirmaciones apuntan a él.**

Ese es el trabajo real, no la interfaz. Modelo objetivo:

```
Estudio { id · autores · año · revista · doi/url · tipo · cohorte/n ·
          paradigma · industryFunded · resumen_llano · limitaciones }

Claim   { id · texto_user_facing · donde_aparece[] ·
          tipo (mecanismo|asociación|dosis|rango|postura) ·
          nivel_evidencia · estudios[] · conflicto_paradigmas? ·
          lo_que_no_sabemos? · historial[] · validado_por? }

Tema    { id · nombre · subtemas[] · claims[] }   ← la navegación wiki
```

**`historial[]` es lo que convierte el portal en firewall.** Un sistema que muestra que corrigió sus propios claims es mucho más difícil de atacar que uno que siempre tuvo razón. **Ya hay material real para llenarlo**: el 2026-07-27 se retiraron las horas de autofagia, las dosis de suplementos y 23 claims inflados.

---

## 5 · Fases, en orden

**Fase 0 · Cerrar huecos** *(hecho el 2026-07-27, verifícalo)*: fuera las dosis que emitía ATP, corregidos los 2 claims sin respaldo y los 21 inflados. Un portal que se publica con contradicciones vivas se lee como propaganda.

**Fase 1 · La capa `Claim`.** Trazabilidad frase → fuente. Hoy las fuentes cuelgan de la intervención, no de la frase, así que cuando alguien cuestiona *una oración* no podemos ir a ella. **Fundacional, y de paso mejora a ARGOS desde el día uno**, no solo al portal.

**Fase 2 · Extraer y normalizar.** Las 717 citas pasan de string a entidad. Muchas se repiten entre intervenciones: ahí nace la red.

**Fase 3 · Resumen por estudio.** **Aquí está el costo real: son cientos de resúmenes.** Es research, no código. Por lotes, priorizando lo más citado. ⚠️ Requiere aprobaciones de búsqueda web de Enrique — **acota y avísale antes de arrancar un lote grande.**

**Fase 4 · Navegación tema → subtema → estudio.** La Wikipedia.

**Fase 5 · Publicar** con los tres niveles. Enrique lo quiere **público**.

> Las fases 0-2 son semanas. La 3 es el proyecto largo y **no bloquea V2**: puede correr en paralelo.

---

## 6 · Huecos abiertos que el portal debe resolver
Del expediente AK, siguen en amarillo y **necesitan research o decisión clínica**:

1. **Cronotipos sin atribuir.** El modelo de 4 animales es de **Michael Breus, *The Power of When* (2016)** — divulgativo, no validado. Los instrumentos académicos son **MEQ (Horne-Östberg)** y **MCTQ (Roenneberg)**. **Contra fuerte de ATP:** ya corrigió a Breus tratando al delfín como **estado temporal** con cronotipo madre, no como tipo fijo. **Documéntalo como posición propia**, es aportación real.
2. **"7 Sistemas Funcionales"** marcados como framework propio; derivan del modelo tipo IFM. **Atribuir el linaje: deriva bien atribuida es más fuerte que originalidad no verificable.**
3. **Postura anti-bloqueador químico** sin expediente. Es de las más contracorriente: necesita el respaldo más sólido o baja a preferencia declarada.

---

## 7 · Decisiones que solo puede tomar Enrique
- ¿El Nivel 3 es abierto a todos o de Pro? *(Recomendación: abierto. Cobrar por ver tus límites metodológicos es el gesto que un crítico usaría en contra.)*
- Prioridad de lotes de resumen en la Fase 3.
- Toda afirmación clínica nueva pasa por **Mariana Doria** antes de publicarse.

---

## 8 · Cómo trabajar con Enrique
- **Brief con defaults ya decididos**, un solo veto. No le hagas listas de preguntas abiertas.
- **Instrucciones copy-paste** para PowerShell (sin `&&`).
- **Trabaja sin parches.** Nada de MVP con deuda: si algo no cabe completo, se marca y se pospone, no se entrega a medias.
- **Si algo choca con la doctrina, flaguéalo. No lo resuelvas solo.**
- ⚠️ El repo vive en OneDrive: las operaciones de git son lentas y dejan `.git/index.lock` huérfanos cuando algo se corta. Si aparece, verifica que no haya git corriendo y bórralo.
