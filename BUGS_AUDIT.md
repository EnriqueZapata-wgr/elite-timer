# ATP — Auditoría de Bugs
Fecha: 2026-03-29
Ejecutado por: Claude Code

## Resumen
- 🔴 Críticos: 3
- 🟠 Importantes: 6
- 🟡 Menores: 5
- 🔵 Mejoras: 6

---

## 🔴 CRÍTICOS (rompen funcionalidad o pierden datos)

### BUG-001: 9 campos con defaultValue + onEndEditing en consultas (pérdida de datos)
- **Archivo**: src/screens/coach/ClientDetailScreen.tsx:1795, 1827-1853
- **Descripción**: Los campos de "Descripción del día", contexto de peso (6 campos), y notas de estudios clínicos usan `defaultValue` + `onEndEditing` que falla silenciosamente en web
- **Impacto**: Mariana pierde datos que escribe en la consulta
- **Campos afectados**: day_description, weight_highest_kg, weight_highest_year, weight_lowest_kg, weight_lowest_year, weight_ideal_kg, weight_ideal_notes, coach_notes (estudios)
- **Fix sugerido**: Reemplazar con inputs controlados (value + onChangeText) + botón Guardar explícito, igual que se hizo para SOAP y Objetivos

### BUG-002: EditableField (línea 1454) usa defaultValue
- **Archivo**: src/screens/coach/ClientDetailScreen.tsx:1391-1406
- **Descripción**: El componente genérico `EditableField` usa `defaultValue` + `onEndEditing`. Se usa en múltiples partes de la consulta
- **Impacto**: Cualquier campo que use EditableField pierde datos en web
- **Fix sugerido**: Convertir a input controlado con value + onChangeText

### BUG-003: 20+ Supabase queries sin error handling
- **Archivo**: Múltiples archivos en src/services/
- **Descripción**: 20 llamadas a Supabase usan `const { data } = await supabase...` sin destructurar `error`. Si falla silenciosamente, el usuario ve datos vacíos sin saber por qué
- **Impacto**: Errores de red/permisos pasan desapercibidos
- **Fix sugerido**: Agregar `const { data, error } = ...` y lanzar error o mostrar feedback

---

## 🟠 IMPORTANTES (funcionalidad degradada)

### BUG-004: Tablas usadas en código que no están en migraciones
- **Archivos**: src/services/
- **Descripción**: 5 tablas referenciadas en código no tienen migración: `blocks`, `exercise_logs`, `exercises`, `profiles`, `routine_shares`
- **Impacto**: Si el entorno se reconstruye, estas tablas no se crearían. `profiles` es creada por Supabase dashboard, las demás podrían ser de un setup anterior
- **Fix sugerido**: Crear migraciones retroactivas para estas tablas

### BUG-005: Tablas creadas en migraciones pero no usadas en servicios
- **Descripción**: 4 tablas existen en migraciones pero ningún servicio las usa: `daily_protocols`, `protocol_completions`, `protocol_items`, `quiz_templates`
- **Impacto**: quiz_templates SÍ se usa (vía quiz-service.ts con select directo). Las demás son tablas de protocolo que aún no tienen servicio
- **Fix sugerido**: Crear protocol-service o marcar como futuro

### BUG-006: Settings usa AsyncStorage en vez de SecureStore
- **Archivo**: src/contexts/settings-context.tsx:13
- **Descripción**: Preferencias del usuario se guardan en AsyncStorage (no encriptado). No es datos sensibles, pero inconsistente con la política de seguridad
- **Impacto**: Bajo — son preferencias no sensibles (idioma, sonido, etc.)
- **Fix sugerido**: Migrar a SecureStore o mantener en AsyncStorage (es apropiado para preferencias)

### BUG-007: Imágenes de labs se comprimen a 80% pero estudios clínicos no comprimen
- **Archivo**: app/my-health.tsx:62 (quality: 0.8) vs src/services/clinical-study-service.ts
- **Descripción**: Las fotos de labs se comprimen al 80%, pero el servicio de estudios clínicos sube raw sin compresión
- **Impacto**: Archivos grandes = subidas lentas + más storage cost
- **Fix sugerido**: Agregar quality: 0.7 al ImagePicker del flujo de estudios

### BUG-008: Pantalla quiz/chronotype no tiene screen file (usa carpeta)
- **Descripción**: La ruta quiz/chronotype está registrada en _layout pero el archivo está en app/quiz/chronotype.tsx (como carpeta). Expo Router maneja esto, pero podría causar problemas con typedRoutes
- **Impacto**: Funciona pero genera warnings de TypeScript (se usa `as any`)
- **Fix sugerido**: Es una limitación de Expo Router typedRoutes, `as any` es el workaround correcto

### BUG-009: 15 catch blocks silenciados en servicios
- **Archivo**: Múltiples servicios
- **Descripción**: `catch { /* */ }` o `catch {}` en 15 lugares, 2 con `/* silenciar */`
- **Impacto**: Errores de red, permisos o datos pasan completamente desapercibidos
- **Fix sugerido**: Al menos logear con `if (__DEV__) console.error`

---

## 🟡 MENORES (cosméticos o edge cases)

### BUG-010: Textos de Alert en mix español/inglés
- **Archivos**: app/builder.tsx, app/log-exercise.tsx, app/programs.tsx
- **Descripción**: Los títulos de Alert usan 'Error' (inglés) en vez de 'Error' (igual en español, pero 'Cancel' debería ser 'Cancelar')
- **Impacto**: Cosmetico — los textos principales SÍ están en español, solo el Button text 'Cancel' es del sistema
- **Fix sugerido**: No es urgente, Alert.alert usa textos del sistema en móvil

### BUG-011: Migración 023 (biomarkers_in_measurements) puede no estar ejecutada
- **Archivo**: supabase/migrations/023_biomarkers_in_measurements.sql
- **Descripción**: Agrega columnas de biomarcadores a body_measurements. Si no se ejecutó, las mediciones de biomarcadores no se guardarían en esa tabla
- **Impacto**: Los biomarcadores se guardan en client_profiles (funciona), pero body_measurements no tendría las columnas
- **Fix sugerido**: Verificar ejecutando `SELECT column_name FROM information_schema.columns WHERE table_name = 'body_measurements' AND column_name = 'grip_strength_kg'`

### BUG-012: Duplicate seed posible en quiz_templates
- **Descripción**: Si la migración 025 se ejecuta dos veces, el INSERT de chronotype fallará por UNIQUE constraint en slug
- **Impacto**: Solo afecta re-ejecución de migraciones, no al runtime
- **Fix sugerido**: Usar ON CONFLICT (slug) DO NOTHING

### BUG-013: Condición duplicada posible — keys no validados cross-zone
- **Archivo**: src/data/condition-catalog.ts
- **Descripción**: No hay validación de que los keys sean únicos entre zonas
- **Impacto**: Si dos zonas tuvieran el mismo key, el toggle afectaría ambas
- **Fix sugerido**: Agregar test que valide uniqueness de keys

### BUG-014: seed_chronotype.sql en raíz del proyecto
- **Archivo**: ./seed_chronotype.sql
- **Descripción**: Archivo temporal generado para resolver problema de encoding. Debería borrarse o moverse a supabase/
- **Impacto**: Ninguno — es solo un archivo suelto
- **Fix sugerido**: Borrar o agregar a .gitignore

---

## 🔵 MEJORAS SUGERIDAS

### IMP-001: Centralizar error handling en servicios
- Crear un wrapper `supabaseCall()` que siempre chequee error y lance
- Eliminaría BUG-003 y BUG-009 de un solo golpe

### IMP-002: Agregar pull-to-refresh en todas las tabs del coach
- ClientDetailScreen no tiene pull-to-refresh
- Los datos se recargan solo al montar, no al hacer pull

### IMP-003: Skeleton loaders en tab Yo y panel coach
- Actualmente muestra ActivityIndicator (spinner genérico)
- Skeletons darían mejor UX al cargar

### IMP-004: Validación de fecha en campos de nacimiento
- El campo date_of_birth acepta texto libre ("AAAA-MM-DD")
- Debería tener un date picker o al menos validación de formato

### IMP-005: Compresión de imágenes en estudios clínicos
- Agregar ImagePicker quality: 0.7 para estudios clínicos
- Reducir tamaño de upload significativamente

### IMP-006: Implementar protocolo de retry en llamadas a IA
- Si la Edge Function falla, no hay retry automático
- Agregar 1 retry con backoff exponencial

---

## Archivos revisados
123 archivos .ts/.tsx en el proyecto
18 servicios en src/services/
24 migraciones SQL
26 pantallas en app/
15+ componentes en src/components/

## Estado de compilación
- `npx tsc --noEmit`: ✅ 0 errores
- API keys expuestas: ✅ Ninguna
- Llamadas directas a Anthropic: ✅ Ninguna (todo via proxy)
- Console.log sin __DEV__: ✅ Limpio

## Migraciones SQL pendientes de verificar
Ejecutar en Supabase para verificar que todas las tablas existen:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Comparar con las 22 tablas esperadas del código.

## Comandos para verificar fixes
```bash
# TypeScript
npx tsc --noEmit

# Buscar defaultValue en coach panel (debe ser 0 eventualmente)
grep -c "defaultValue=" src/screens/coach/ClientDetailScreen.tsx

# Buscar catch silenciados
grep -c "catch {" src/services/*.ts

# Buscar queries sin error handling
grep -c "const { data } = await supabase" src/services/*.ts
```
