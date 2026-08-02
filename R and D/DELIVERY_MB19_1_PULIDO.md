# 📦 DELIVERY MB-19.1 · Pulido de device test

**Rama:** `feat/mb19-1-pulido` (worktree propio, desde `main` con MB-19).
**Solo JS/TS, cero migraciones, cero deps nativas → sale por OTA.**
Un commit por pieza; `tsc`, Vitest (2458) y `npm run censo` en verde en cada uno.

| Pieza | Commit | Qué cambió |
|---|---|---|
| 1 · Casita | `9dec9d0` | 30 pantallas registran nav propia + BackButton registra solo + HomeIcon único (home-outline, TEXT.primary) + test-censo que lo hace ley |
| 2 · Orbe | `b651a6a` | Amplitud ×2 en 5 estados, mismos breathMs; ORB_TAB_SIZE 46→42 y sin marginTop; tests honestos |
| 3 · Hub Mente | `abd28c0` | Se borra `app/mente.tsx` + entrada del registro; entra `Rachas` → `/mente/progreso` al final de Mente |
| 4 · Mosaicos | `9fbfce8` | Color por sección (fondo 10% · borde 22% · icono 100%), etiqueta gris, encabezado al 100% |
| 5 · Rebote | `1d345df` | `useSystemReducedMotion` compartido (orbe + cuadrícula + Mi orden); reduce motion → transición lisa |
| 6 · Recorrido corto | `b3220da` | `npm run censo -- --cambiadas <ref>`: solo las rutas cuya puerta cambió, antes → ahora |

## Pieza 3 · Inventario de rutas de app/mente.tsx (las 248 líneas, ANTES de borrar)

Cada `route` que vivía dentro del hub, con la puerta que le queda:

| Ruta | Dónde estaba en el hub | Puerta restante |
|---|---|---|
| `/mente/progreso` | trofeo del banner (línea 138) | **rescatada**: app `Rachas` en el registro |
| `/meditation` | card Meditación (press + CTA) | app `Meditar` de la sala ATP |
| `/breathing` | card Respiración (press + CTA) | app `Respirar` |
| `/mente/nback` | card N-Back (press + CTA) | app `N-Back` |
| `/journal` | card Journal (CTA "Nueva entrada") | app `Journal` |
| `/journal-history` | card Journal (press) | dentro de `/journal` (journal.tsx:422) |
| `/emotions` | card Emociones (press) | app `Emociones` |
| `/checkin` | card Emociones (CTA) | `/emotions` + otros 6 sitios (HOY, exploración, perfil emocional) |
| `router.back()` | banner | n/a (no es destino) |

El censo cerró **sin huérfanas nuevas** tras el borrado: el hub no tenía ningún
destino que nadie vio. `--cambiadas main` lo confirma por segunda vía (9 rutas
tocadas, todas con puerta restante). Ningún componente del hub quedó muerto:
MenteHubCard, MenteHero, mente-hub-core y CommunityPresence tienen otros
consumidores.

## Notas que no están en el brief

- **Pieza 1:** no existe un contenedor que las 30 usen, así que el camino (a)
  se aterrizó en dos piezas: el hook directo en las 30 + registro automático en
  `BackButton` (cubre a GlobalTopBar y a toda pantalla futura que lo use). El
  test `nav-presence-census.test.ts` es el candado: flecha a mano sin registro
  = suite roja. Cómo registrar está documentado en `useOwnNavPresence.ts`.
- **Pieza 2:** el test viejo "alerta se nota por brillo, no por tamaño" pasaba
  afirmando algo falso; ahora compara contra idle y dice la decisión real
  (alerta sí crece más que idle; escuchando sigue siendo el más abierto).
- **Pieza 4:** contraste verificado sobre `#0A0A0A`: mind 5.27:1, fitness 9.04,
  nutrition 6.69, metrics 5.85, sistema 5.58. Todos ≥ 4.5:1 → el morado NO
  necesitó aclararse (no hay variante nueva en brand.ts).
- **Pieza 6:** contra el commit previo a MB-19 salen **57** rutas cambiadas de
  184, no las ~27 estimadas: la remodelación movió más puertas de lo que el
  brief calculaba. Sigue siendo una lista que se camina en una sesión.
- **Screenshot:** `SCREENSHOT_MB19_1_CUADRICULA.png` es un **mockup fiel a
  tokens** (registro, colores y glifos Ionicons leídos del código real de esta
  rama), no una captura de device: este entorno no corre la app en dispositivo.
  La aprobación visual de Enrique es sobre esto + el device test.

## Verificación en dispositivo (pendiente, gate del merge)

1. La casita ya no tapa nada en las 30. Probar mínimo: ranking, supplements,
   solar, fasting, braverman.
2. Todas las casitas mismo glifo (`home-outline`) y mismo color (blanco).
3. La orbe respira visiblemente y no se sale de la barra (idle y alerta).
4. Mente ya no está en la cuadrícula; **Rachas sí**, y abre progreso con medallas.
5. Cinco secciones distinguibles por color de un vistazo, sin confeti.
6. Con "reducir movimiento" (iOS) la cuadrícula y Mi orden reordenan sin rebote,
   y la orbe queda en pulso quieto.
7. `npm run censo -- --cambiadas main` imprime la lista corta y legible.
