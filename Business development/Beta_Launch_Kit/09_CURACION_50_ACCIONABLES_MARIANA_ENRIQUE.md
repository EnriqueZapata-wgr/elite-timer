# 📋 Catálogo de Accionables ATP — Mariana + Enrique

**Uso:** llenar en reunión viernes 2026-07-11 8am.  
**Deadline:** viernes mediodía (para que Fable use en Sprint MOTOR PROTOCOLOS MVP).  
**Formato:** lista libre en este mismo doc (o en papel + foto — cualquier medio que fluya).

---

## 🩺 La doctrina en 2 párrafos (leer antes de arrancar)

En ATP, **el médico de cabecera del usuario es el nutriólogo clínico, no el médico general.** Todo lo que curamos aquí es medicina/nutrición funcional. NO fármacos convencionales. Ese es el trabajo del médico cuando el nutriólogo lo indica.

Y siguiendo la enseñanza de Humby: **la gente se pierde con 100 recomendaciones. Se compromete con 5.** Este catálogo no es "TODO lo que sabemos". Es la biblioteca de cosas específicas y accionables que Argos elige por perfil — Mariana cura la biblioteca, el algoritmo elige los 5 de cada persona.

---

## 🎯 Filtro único no-negociable

Antes de escribir cada accionable, la pregunta:

> **"¿Esto es medicina/nutrición funcional?"**

Si sí → va al catálogo.  
Si es fármaco convencional → se queda con el médico.

Ejemplos:
- ✅ Magnesio glicinato 400mg antes de dormir → **funcional**
- ❌ Ibuprofen diario → **fármaco convencional**
- ✅ Curcumina + omega 3 + eliminar procesados → **funcional**
- ❌ Antihistamínicos crónicos → **fármaco convencional**
- ✅ Ayuno IF 16:8 con carbos densos en cena → **funcional**
- ❌ Metformina → **fármaco convencional**

---

## 🖊️ Cómo escribir cada accionable

Los 5 campos por cada uno. **NO importa el formato exacto** — con que estén los 5, Cowork lo convierte a código después.

| Campo | Ejemplo |
|---|---|
| **Nombre corto** (lo que ve el user) | "Magnesio glicinato 400mg noche" |
| **Cómo se hace** (1 línea) | "400mg de magnesio glicinato 30-60 min antes de dormir" |
| **Beneficio** (por qué) | "Mejora sueño, relajación muscular, reduce ansiedad" |
| **Categoría** (dónde clasifica) | Sueño / Energía / Digestión / Movimiento / Ansiedad / Nutrición / Hidratación / Suplementación / Ritual / Hormonas |
| **¿Cuándo se lo asignamos?** | "Persona con problemas de sueño, tensión muscular, o magnesio bajo en labs" |

**El "cuándo se lo asignamos"** es la parte CLAVE. Mariana lo describe en lenguaje clínico normal — Cowork lo traduce después a código para el motor. Ejemplos de cómo describirlo:

- "Persona sedentaria que trabaja sentada"
- "Mujer en menopausia con calores"
- "Adulto con inflamación crónica silenciosa"
- "Hombre con testosterona baja"
- "Persona con reflujo constante"
- "Estudiante con estrés académico"

Mientras más específico el "cuándo", mejor el motor asigna.

---

## 📋 Los accionables — escribir aquí

**Sin cuota. Sin orden fijo.** Escribe lo que te fluya de la práctica. Si son 25 excelentes, perfecto. Si son 80, también. Si terminas la reunión con 40 y son buenos, es sano — el resto se agrega en v1.5.

**Categorías a cubrir (referencia, no obligación):**

- 🌙 Sueño
- ⚡ Energía / Fatiga
- 🌱 Digestión / Intestino
- 🏃 Movimiento
- 🧘 Ansiedad / Estrés
- 🥗 Nutrición (probablemente la más rica — es tu especialidad)
- 💧 Hidratación
- 💊 Suplementación funcional
- 🎯 Ritual / Hábitos
- ♀️ Ciclo / Hormonas (si aplica)

---

### ✏️ Escribe aquí libremente (Mariana + Enrique):

**Ejemplo lleno (para referencia):**

**Nombre:** Magnesio glicinato 400mg noche  
**Cómo:** 400mg de magnesio glicinato 30-60 min antes de dormir  
**Beneficio:** Mejora calidad del sueño, relajación muscular, reduce ansiedad  
**Categoría:** Sueño / Suplementación  
**Cuándo asignarlo:** Persona con dificultad para dormir, tensión muscular crónica, o magnesio bajo en labs

---

**Segundo ejemplo (para referencia):**

**Nombre:** Pausas activas cada hora  
**Cómo:** Levantarse cada hora y hacer 2 min de estiramiento y puntitas  
**Beneficio:** Reduce dolor lumbar y cervical de sedentarismo  
**Categoría:** Movimiento / Ritual  
**Cuándo asignarlo:** Persona que trabaja sentada más de 6h al día, con dolor lumbar o cervical

---

**Tercer ejemplo (para referencia):**

**Nombre:** Curcumina + omega 3 diario  
**Cómo:** 500mg de curcumina liposomal + 2g de omega 3 EPA/DHA con comida principal  
**Beneficio:** Reduce inflamación silenciosa sistémica  
**Categoría:** Suplementación / Nutrición  
**Cuándo asignarlo:** Persona con PCR-us elevada, dolor articular crónico, o dieta alta en procesados

---

### 👇 Empiezan a llenar aquí

**1.**  
**Nombre:**  
**Cómo:**  
**Beneficio:**  
**Categoría:**  
**Cuándo asignarlo:**  

---

**2.**  
**Nombre:**  
**Cómo:**  
**Beneficio:**  
**Categoría:**  
**Cuándo asignarlo:**  

---

**3.**  
**Nombre:**  
**Cómo:**  
**Beneficio:**  
**Categoría:**  
**Cuándo asignarlo:**  

---

*(seguir agregando hasta donde fluya)*

---

## 📤 Después de la reunión

1. **Enrique** manda este doc lleno a Cowork (foto, screenshot, o el mismo archivo)
2. **Cowork** convierte cada uno al formato TypeScript e inyecta en `src/constants/actionables-catalog.ts`
3. **Fable** ejecuta Sprint MOTOR PROTOCOLOS MVP con el catálogo real (viernes tarde/noche)
4. **Enrique** ve el resultado en device sábado AM

---

## 💛 Nota final para Mariana

Mariana, esto es el ADN clínico de ATP. Cada accionable que curas aquí va a ser una de las **"5 cosas que hoy te muevo la aguja"** para alguien en el mundo.

**Piensa así:**
> "Si tuviera 5 minutos con una persona específica que me llega a consulta con [problema X], ¿qué 5 cosas concretas le diría que haga esta semana?"

Cada accionable del catálogo es UNA de esas 5 posibles para ALGUIEN.

Los "cuándo asignarlo" son la regla clínica traducida — descríbelos como se los explicarías a un colega, no en clave técnica. Cowork mapea todo después.

**Sin prisa. Sin cuota. Calidad > cantidad.**

— Cowork
