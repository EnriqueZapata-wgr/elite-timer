# COWORK_TASK — Sprint 2+3: Copy + Navegación + Persistencia + Contenido

**Origen:** beta test de Mariana — 11 puntos de fricción de UX/copy/navegación/contenido (los 5 graves del parser ya van en Sprint 1 separado).

**Branch:** `fix/ux-copy-persistencia` desde `main` (después de mergear Sprint 1).
**Estimado:** 7-9h CC.
**SQL:** ❌ ninguna nueva.
**Deploy:** ❌ NO merge, NO OTA — Enrique valida con Mariana antes.

---

## DECISIONES DE COPY ya tomadas por Enrique (no negociar)

| Antes | Después |
|---|---|
| "MEJORA TU EVALUACIÓN" (header sección) | **"Datos por capturar"** |
| "Ir a mejorar" (CTA botón) | **"Agregar datos"** |
| Tramos Disciplina ATP (En racha / Constante / Retomando / Arrancando) | **mantener tal cual** |
| "Biomarcadores (captura manual)" en Mis Labs | **mantener tal cual** |

---

## FASE 2 — Copy + Navegación (4h)

### 1. Renombrar "MEJORA TU EVALUACIÓN" → "Datos por capturar" (30 min)

Buscar globalmente en el repo `MEJORA TU EVALUACIÓN` (mayúsculas, en strings de texto) y reemplazar por `Datos por capturar`. Archivos probables:
- `app/my-health.tsx`
- `app/edad-atp/result-preview.tsx` o equivalente
- Cualquier card que muestre params pendientes

Después de cambiar el texto, revisar si las variables/styles relacionadas tienen nombres que también merecen renombre (ej. `improveCard`, `improveItems`). NO obligatorio, pero limpio.

### 2. Renombrar CTA "Ir a mejorar" → "Agregar datos" (15 min)

Buscar globalmente `Ir a mejorar` y reemplazar por `Agregar datos`. Aplica al botón verde grande dentro de cada drill-down de sub-edad (ej. captura de Mariana mostró "Acción ATP: Trabaja composición..." + botón "Ir a mejorar").

**Importante:** si la "Acción ATP" tiene un texto sugiriendo un protocolo (ej. "Trabaja composición: fuerza progresiva + proteína suficiente"), eso se mantiene. Solo cambia el CTA. La acción es la recomendación clínica, el botón te lleva a CAPTURAR los datos pendientes de esa área.

### 3. Tap en "Datos por capturar" navega al param EXACTO (1.5h)

**Síntoma actual** (Mariana #16): tap en "Presión arterial" de "Datos por capturar" NO navega al input de presión arterial; lleva a otra pantalla.

**Fix:** cada card de "Datos por capturar" debe tener una ruta concreta al param. Probable mapping:

```typescript
// src/constants/data-capture-routes.ts (NUEVO)
export const DATA_CAPTURE_ROUTES: Record<string, string> = {
  presion_arterial: '/edad-atp/vitals?focus=blood_pressure',
  vo2max: '/edad-atp/tests/cooper',
  cintura_cadera: '/edad-atp/composition?focus=waist',
  grasa_corporal: '/edad-atp/composition?focus=body_fat_pct',
  // ... resto de params que aparezcan en "Datos por capturar"
};
```

Y en las pantallas destino, si llega con `?focus=X`, hacer scroll/highlight al input correspondiente.

### 4. Sección PERFIL accesible desde YO (1h)

**Síntoma actual** (Mariana #1): nombre/edad/sexo/cronológica NO se encuentran. No está en config, no está en YO obvio.

**Fix:**
- Agregar tap en el header de YO (donde sale "YO" + nombre/inicial) → navega a `/profile`.
- Si `/profile` no existe, crearlo con: nombre, fecha de nacimiento (calcula cron auto), sexo biológico, foto opcional.
- Persistir a `client_profiles` (`first_name`, `last_name`, `date_of_birth`, `biological_sex`).
- **VERIFICAR** que ya no haya "edad cronológica inventada" (Mariana #2 — captura mostró cron 38 cuando debería ser otro). Si el bug es de lectura desde `client_profiles`, arreglarlo.

### 5. Multi-select de fotos al subir labs (45 min)

**Síntoma actual** (Mariana #9): al subir labs por foto, solo deja escoger una a la vez.

**Fix:**
- En `expo-image-picker`, usar `allowsMultipleSelection: true` + `selectionLimit: 10`.
- Después de seleccionar varias, mostrarlas en un carrusel/lista antes de mandar al parser.
- El parser procesa cada una en paralelo y consolida resultados.

### 6. Input numérico acepta `.` y `,` para decimales (30 min)

**Síntoma actual** (Mariana #10): "Horas de sueño 6" — Mariana quería poner 6.5 pero el teclado/parser no aceptaba.

**Fix:** en todos los inputs numéricos con decimal (sueño, HbA1c, %grasa, FFMI, etc.):
- `keyboardType="decimal-pad"` en React Native
- Normalizar input antes de parsear: `parseFloat(value.replace(',', '.'))`
- Validar rango después de parsear

---

## FASE 3 — Persistencia + Contenido (4h)

### 7. Datos persisten entre pantallas (1.5h)

**Síntoma actual** (Mariana #11, #15): meto datos en una pantalla, navego a otra, regreso → los datos ya no están.

**Causa probable:** componentes con `useState` local sin sincronizar con DB / contexto global. Cuando se desmonta, se pierde el state.

**Fix:**
- Identificar las pantallas que pierden estado (probable: composición, cuestionarios, captura inline).
- Usar `useFocusEffect` para refrescar de DB al entrar.
- Si la captura es transitoria (aún no guardada), usar `AsyncStorage` con clave `draft:<screen>:<user_id>` para que sobreviva navegación.
- Persistir a DB en `onBlur` o `onSubmit`, no solo en navegación final.

### 8. Horarios de comida desde config del usuario (1h)

**Síntoma actual** (Mariana #14): pantalla "¿Qué comida registras?" muestra horarios hardcoded (Desayuno 7-9, Snack AM 10-11, etc.) que ignoran la configuración del usuario.

**Fix:**
- En `client_profiles` o `nutrition_settings`, leer los horarios que el usuario configuró (si existen).
- Si no existen, mantener los defaults pero PERMITIR editarlos desde un settings de nutrición.
- La pantalla "¿Qué comida registras?" usa los horarios reales del usuario, no los hardcoded.

### 9. Quitar/agregar captura de cadera (45 min)

**Síntoma actual** (Mariana #13): "Medidas corporales: Ratio cintura/cadera = marcador cardiovascular" pero solo te pide cintura.

**Decisión a tomar (CC propone, yo confirmo):**

**Opción A — Agregar captura de cadera:**
- Input nuevo en `/edad-atp/composition` para `hip_cm`
- Calcular ratio cintura/cadera automáticamente
- Mostrar el ratio como param en composición

**Opción B — Quitar la mención de cadera del subtexto:**
- Cambiar "Ratio cintura/cadera = marcador cardiovascular" → "Cintura = marcador cardiovascular"
- Más simple, menos captura

**Voto sugerido:** **Opción A** (agregar cadera) porque el ratio cintura/cadera SÍ es marcador cardiovascular validado clínicamente (Yusuf 2005, INTERHEART). 5 min más de captura, 1 marcador más sólido.

### 10. Card "Sale en vacío" investigar (45 min)

**Síntoma actual** (Mariana captura screenshot 4): pantalla YO después de "Disciplina ATP" + "VER REPORTES" muestra "COMPOSICIÓN CORPORAL" con valores vacíos (`--` `--`) cuando ya hay datos capturados.

**Fix:**
- Esta card "Composición corporal" en YO (snapshot rápido) debe leer de `health_measurements` la última medición.
- Si no hay datos → card no se muestra (no "vacío feo").
- Si hay datos → muestra solo los que existen (no mostrar `--` para campos faltantes).

---

## EXIT CRITERIA

- [ ] `npx tsc --noEmit` → 0 errores.
- [ ] `npx vitest run` → tests pasan, incluyendo cualquier test nuevo.
- [ ] Push a `origin/fix/ux-copy-persistencia`.
- [ ] **NO merge, NO OTA**.
- [ ] `COWORK_REPORT.md` con tabla item-por-item + smoke checklist.

---

## SMOKE TEST POST-OTA (con Mariana de nuevo)

1. [ ] "MEJORA TU EVALUACIÓN" ya no existe; ahora dice "Datos por capturar"
2. [ ] El botón "Ir a mejorar" ahora dice "Agregar datos"
3. [ ] Tap en "Presión arterial" de la lista de datos por capturar → navega DIRECTO al input de presión
4. [ ] Tap en header de YO (nombre/inicial) → abre pantalla PERFIL con nombre, fecha nacimiento, sexo, cronológica
5. [ ] Subir 3 fotos de labs al mismo tiempo → procesa todas
6. [ ] Input de "Horas de sueño promedio" acepta `6.5` Y `6,5`
7. [ ] Capturar % grasa en composición, navegar a YO, regresar → el % grasa sigue ahí
8. [ ] Pantalla "¿Qué comida registras?" muestra horarios configurados, no defaults
9. [ ] Composición ahora tiene input de cadera, calcula ratio cintura/cadera automático
10. [ ] Card de YO "COMPOSICIÓN CORPORAL" sin `--` `--` cuando hay datos

---

## FLAGS PERMITIDOS

1. **Si una ruta de captura no existe** (ej. no hay pantalla dedicada para "Presión arterial"): documenta y crea un draft, NO improvises ruta.
2. **Si los horarios de comida no están en settings actual**: agregar campo nuevo en `client_profiles` o `user_settings`. SI requiere migration → flag y para; no crear SQL sin aprobar.
3. **NO TOCAR** el motor v2, el parser AI (eso va en Sprint 1 paralelo), las matrices, ni los tests.
4. **Si descubres más bugs no listados** durante el sprint: documenta en `COWORK_REPORT.md`, no auto-fixees. Enrique decide.
5. **Si la "edad cronológica inventada" (Mariana #2)** resulta ser un bug de auth/DB y no de UI: para y reporta. NO improvises arreglos en auth.

---

**Adelante. 11 puntos limpios para que Mariana sienta que escuchamos.**
