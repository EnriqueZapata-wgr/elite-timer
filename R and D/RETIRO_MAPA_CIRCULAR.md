# 🎡 Retiro del mapa circular · y migración de "conocerte" al plano

**Fecha:** 2026-07-29 · **Decisión de Enrique:** el modelo de navegar emociones y de conocerse
queda **sobre el plano 12×12**. El mapa circular se retira por completo y se guarda como
concepto, por si algún día revive.

---

## Por qué no hay carpeta `legacy/`

**El archivo es git, no una carpeta.** Código muerto en `legacy/` se podre: lo agarra el lint,
lo migra alguien a medias, y confunde al siguiente que llegue. Este documento cumple la misma
función mejor: dice qué era cada pieza, por qué se retiró y cómo traerla de vuelta.

**Para recuperar cualquier pieza:**
```
git log --all --oneline -- src/components/checkin/EmotionWheel.tsx
git show <commit>:src/components/checkin/EmotionWheel.tsx > donde/quieras.tsx
```

---

## Qué era cada pieza

| Pieza | Qué hacía | Por qué se retira |
|---|---|---|
| `EmotionWheel.tsx` | Sunburst de 144 sectores con arco proporcional al contenido, tres anillos y zoom por niveles. | **En Android nunca pintó una etiqueta** y el toque directo no respondía. Dos intentos de arreglo, dos fracasos. `react-native-svg` no resuelve texto rotado en este proyecto. |
| `emotion-wheel-core.ts` + `emotion-wheel-config.ts` | Geometría polar: sectores, ángulos medios, modos de etiqueta, transformaciones radiales. | Solo existía para la rueda. |
| `BodyGate.tsx` | Primera versión del mapa corporal, usado como **puerta de entrada** al módulo. | Solo ofrecía estados negativos: pecho apretado, mandíbula, nudo, todo apagado. Si alguien se sentía bien, ninguno aplicaba. **MB-14 lo reemplazó con `BodyCheck`**, que aparece solo con emoción desagradable intensa: ahí sí aplica. |
| `EmotionMap2D.tsx` + `emotion-map-core.ts` | Nube de burbujas con distribución radial por rango. | Las palabras se encimaban y la posición era arbitraria: unas con nombre, otras sin, brillos distintos. **Sigue viva hasta que se migre** (ver abajo). |

## Lo que sí sobrevivió del intento

No todo se tira. Estas decisiones nacieron en la rueda y siguen vigentes:

- **Las 144 emociones con su descripción**, que están bien escritas.
- **El modelo de crisis en dos niveles** y la regla de trayectoria.
- **El descenso por escalones** con herramienta concreta, que es el ejercicio que funciona.
- **La lección de método:** los tres fracasos vinieron de validar en navegador, donde el bug
  no existe. Nada de este módulo se declara listo sin device test.

---

# ✅ YA HECHO (commit de limpieza)

Borrados porque estaban **huérfanos**, cero imports en `app/` y `src/`:

- `src/components/checkin/EmotionWheel.tsx`
- `src/components/checkin/BodyGate.tsx`

Verificado: 0 referencias vivas, `tsc` sin errores.

---

# 🚧 LO QUE FALTA · AWAY RUN MB-16

**Rama:** `feat/mb16-retiro-circular` · worktree propio. Solo JS/TS, sale por OTA.

## ⚠️ Precaución que manda sobre todo lo demás

**`emotion-navigation.tsx` usa `EmotionMap2D` como el lienzo del ejercicio de descenso**
(`centerOnEmotion` en las líneas 101, 195 y 211). **Ese ejercicio es lo que por fin funciona
y lo que Enrique aprobó explícitamente.** Si se rompe, se pierde lo único que ya sirve.

No es una migración cosmética: **es reemplazar el lienzo sin tocar el ejercicio.**

## Pieza 1 · El descenso pasa al plano

En `emotion-navigation.tsx`, cambiar `EmotionMap2D` por `MoodPlane`:

- `MoodPlane` ya acepta `focusEmotion`. Usar eso donde hoy se llama `centerOnEmotion(id, {zoom})`.
- Mantener **idéntico** el resto: los escalones, las herramientas, el recheck, la rama de
  crisis con su banner y su copy de acompañamiento.
- El color de foco sale de la **posición en el plano** (`planeCellColor`), no de
  `colorAtPoint(normX, normY)` de la nube.

**Y aquí se gana algo:** en el plano el descenso **significa** algo. Bajar dos puntos mueve
la cámara visiblemente a la izquierda y hacia abajo, sobre un mapa donde el eje horizontal es
qué tan agradable y el vertical cuánta energía. En la nube de burbujas ese movimiento era
arbitrario. **Vale la pena que la animación de la cámara sea legible: que se vea el trayecto,
no un salto.**

## Pieza 2 · "Conocerte" pasa al plano

`emotion-exploration.tsx` hoy monta la nube y además importa `getWheelLayout`,
`findEmotionSector`, `WHEEL_CORES` y `FAMILY_LABELS` de la rueda. **Se reescribe sobre
`MoodPlane`.**

Es la pantalla de exploración: mismo plano, mismo zoom, pero sin selección para check-in.
Su propósito es recorrer el territorio y leer descripciones, no registrar.

## Pieza 3 · La limpieza final

Solo **después** de que las piezas 1 y 2 estén verificadas en dispositivo:

- Borrar `EmotionMap2D.tsx`, `emotion-wheel-core.ts`, `emotion-wheel-config.ts` y sus tests.
- `emotion-map-core.ts` está importado por diez archivos, incluidos
  `emotion-navigation-core.ts` y `checkin-closing-phrases.ts`. **No lo borres de un golpe:**
  revisa qué exporta que no sea geometría de la espiral (helpers de cuadrante, por ejemplo),
  mueve eso a `emotion-plane-core.ts` y recién entonces bórralo.
- `emotion-history.tsx` y `emotion-profile.tsx` también lo importan: verificar para qué.

### Inventario para la pieza 3 (levantado en MB-16, piezas 1 y 2 ya entregadas)

Qué usa cada importador vivo de `emotion-map-core` después de las piezas 1 y 2:

| Importador | Qué usa | ¿Geometría de la espiral? |
|---|---|---|
| `app/checkin.tsx` | `searchEmotions` (arrastra `normalizeSearch`) | No: búsqueda por nombre. Mover a `emotion-plane-core`. |
| `src/data/checkin-closing-phrases.ts` | `fnv1a` | No: hash determinista. Mover. |
| `src/services/emotion-navigation-core.ts` | `fnv1a` | No. Mover. |
| `app/emotion-history.tsx` | `colorAtPoint`, `emotionGradient`, `normX`, `normY`, `isLightColor` | No: rampa continua de color para el mosaico del historial. |
| `app/emotion-profile.tsx` | lo mismo + `QUADRANT_CENTERS` (hero color del arquetipo) | No: misma rampa. |
| `src/components/checkin/EmotionMap2D.tsx` | todo el layout polar | Sí: muere con la pieza 3. |
| `src/services/emotion-wheel-core.ts` | `colorAtPoint`, `normX`, `normY` | El archivo entero muere en la pieza 3. |
| `src/services/__tests__/emotion-map-core.test.ts` | test del layout | Muere con el archivo. |

**Decisión pendiente para la pieza 3 (historial y perfil):** la rampa continua
(`colorAtPoint` + `mixHex` + `emotionGradient` + `isLightColor` + `normX`/`normY`)
no es geometría de la espiral, es el espacio de color viejo. Dos caminos:
(a) moverla tal cual a `emotion-plane-core` y que historial/perfil sigan igual, o
(b) migrar historial/perfil a `planeAccentColor` (color posicional, ya existe con
test desde MB-16) y retirar la rampa completa. La (b) deja UNA sola fuente de
color en el módulo; requiere ojo en dispositivo porque el mosaico pierde el
degradado por emoción.

## 📦 Entrega

Solo JS y TS, cero dependencias nuevas, cero cambios nativos. `tsc` y Vitest en verde.
Cero em dash en copy de usuario.

**Verificación en dispositivo, obligatoria:**
1. El ejercicio de descenso funciona **igual que hoy**: eliges "Con terror", te ofrece el
   mapa de cuerpo, y luego los escalones con su herramienta.
2. La cámara se mueve sobre el plano y **se ve el trayecto** de un escalón al siguiente.
3. Con señal de crisis sigue apareciendo el acompañamiento con banner, sin frase de cierre.
4. La pantalla de exploración recorre las 144 con sus nombres visibles y sus descripciones.
5. Ninguna pantalla del módulo quedó en blanco ni sin salida.
