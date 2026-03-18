# ELITE Performance App — Contexto del Proyecto

## Quién soy
Enrique Zapata — Ingeniero en automatización, coach de rendimiento humano, Guinness World Record en pull-ups. Mi esposa Mariana es nutricionista con PhD en ciencias biomédicas.

## Visión
App móvil (iOS + Android) para coaches y atletas de alto rendimiento. El puente digital entre el conocimiento de ELITE Legacy y los atletas/pacientes.

## Stack
React Native + Expo + TypeScript. Sin backend todavía (Fase 1).

## Fase actual: Fase 1 — Timer MVP

## Pantallas a construir (en orden)
1. Splash / Bienvenida — logo ELITE, botón Entrar
2. Home / Dashboard — 4 cards: Mis Programas, El Programa de Hoy, Mi Progreso, Programas Estándar
3. Mis Programas — lista + botón Crear nuevo
4. Crear Programa — nombre, descripción, añadir rutinas
5. Crear Rutina/Timer — bloques: Ejercicio / Descanso / Transición / Final
6. Timer Activo — círculo animado, bloque actual, siguiente, controles
7. Resumen de Sesión — tiempo total, bloques completados
8. Programas Estándar — Tabata, HIIT, 30s, 60s, 90s, Personalizado
9. Mi Progreso — historial, racha, tiempo acumulado

## Lógica del timer
- Bloques configurables: Ejercicio / Descanso / Transición / Final
- Sonido + vibración al cambiar bloque y al finalizar
- Botones: Start / Pause / Reset / Saltar bloque
- Preview del siguiente bloque en pantalla

## Diseño
- Colores: negro #000000 + verde neón #a8e02a
- Tipografía: Poppins Bold
- Estilo premium, industrial, oscuro. NADA genérico.
- Animaciones fluidas 60fps

## Reglas de trabajo
- Explicar cada cambio antes de ejecutarlo
- Un componente a la vez
- Comentar el código en español
- Probar en dispositivo después de cada cambio
- Entender cada línea, no solo copiar y pegar

## Roadmap futuro (no construir aún)
- Fase 2: ELITE Health Card (perfil de atleta)
- Fase 3: Backend + Supabase + Auth
- Fase 4: Análisis de sangre con OCR
- Fase 5: Diagnóstico con IA (Claude API)
- Fase 6: Análisis genético
