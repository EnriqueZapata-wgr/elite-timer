# Mapa de datos — Pilar Nutrición

## Tablas

| Tabla | Qué guarda | Cuándo se escribe | Cómo se consulta |
|-------|-----------|-------------------|-----------------|
| food_logs | Cada alimento registrado | Al guardar manual (food-text) o scan (food-scan) | nutrition.tsx (resumen), reportes (gráficas), food-register (lista del día) |
| hydration_logs | Agua diaria (total_ml + entries[]) | Cada tap +250ml/+500ml en nutrition.tsx | nutrition.tsx (card inline), reportes, HOY (electrón cuantitativo) |
| fasting_logs | Sesiones de ayuno (start/end/status) | Al iniciar/romper en fasting.tsx | fasting.tsx (historial), reportes, electron_logs |
| glucose_logs | Mediciones de glucosa en sangre | Al registrar en glucose-log.tsx | glucose-log.tsx (historial), reportes (gráfica) |
| daily_nutrition_scores | Score nutricional diario | Calculado al registrar comida | nutrition.tsx (hero), YO (sub-score), reportes |
| electron_logs | Electrones ganados por nutrición | Al completar electrón booleano/cuantitativo | HOY (tablero), YO (acumulado) |

## Flujos de datos

1. Usuario registra comida: food-register → food-scan/food-text → INSERT food_logs → nutrition.tsx recarga macros
2. Usuario toma agua: nutrition.tsx tap +250ml → UPSERT hydration_logs (total_ml + entries[])
3. Usuario inicia ayuno: fasting.tsx → INSERT fasting_logs(status=active) → timer en vivo
4. Usuario rompe ayuno: fasting.tsx → UPDATE fasting_logs(status=completed, actual_hours) → Alert
5. Usuario registra glucosa: glucose-log.tsx → INSERT glucose_logs con contexto y valor

## Pantallas del pilar

| Pantalla | Archivo | Acceso desde |
|----------|---------|-------------|
| Hub Nutrición | nutrition.tsx | Kit → ATP NUTRICIÓN |
| Registrar comida | food-register.tsx | nutrition.tsx → "Registrar comida" |
| Escanear comida | food-scan.tsx | food-register → "Escanear con cámara" |
| Registrar manual | food-text.tsx | food-register → "Registrar manual" |
| Ayuno | fasting.tsx | nutrition.tsx → "Ayuno" |
| Glucosa | glucose-log.tsx | nutrition.tsx → "Glucosa" |
| Analizar productos | food-scan.tsx | nutrition.tsx → "Analizar productos" |
