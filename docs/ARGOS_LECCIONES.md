# Bitácora ARGOS — Lecciones de campo para sprint #73 (aterrizaje contexto)

Doc vivo. Cada vez que ARGOS responde algo que muestra una limitación de aterrizaje al contexto real (no solo lectura de datos), se documenta aquí. Esto alimenta el sprint dedicado de prompt engineering ARGOS.

---

## 2026-06-22 — Caminata sin sol

**Contexto:**
- Hora: 8:20 PM (ya oscuro)
- Usuario: Enrique
- Query: "Si me siento cansado qué puede ser?"

**Lo que ARGOS hizo BIEN (lectura):**
- Leyó labs reales (Glucosa 80, HbA1c 5.4%, Ferritina 166, TSH 2.32, Vitamina D 51.6)
- Detectó deficiencia GABA del perfil Braverman
- Leyó mood 7d: 0/10
- Leyó ayuno actual: 1.5h de 16h
- Leyó ejercicio: 0 sesiones esta semana
- Detectó LDL 183.7 / Colesterol 255 como flag para próxima revisión

**Lo que ARGOS NO aterrizó:**
- Recomendó "caminata 20-30 min a luz natural" — el sol ya se metió, no aplicable AHORA
- "¿Cómo dormiste anoche?" es buena pregunta pero podría haber leído data de sueño si existe

**Lección:**
ARGOS no tiene `timeContext` explícito (hora local + posición del sol/sunset). Las recomendaciones de "luz natural", "exposición solar AM", "ejercicio matutino", etc. necesitan validación contra hora actual antes de sugerirse.

**Fix propuesto para sprint #73:**
1. Inyectar en system prompt: hora local, día semana, sunset/sunrise calculados por geolocation
2. Regla suave: "NO recomendar exposición solar si hour > sunset OR hour < sunrise"
3. Regla suave: "Si es tarde/noche, las recomendaciones de movimiento deben ser indoor o sustituibles"
4. Alternativa para cansancio nocturno: ritual pre-sleep (no luz solar), respiración, magnesio, etc.

---

## [Próxima observación va aquí]
