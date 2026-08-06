# 🌙 AWAY RUN NOCTURNO · tres tramos en orden

**Rama:** `feat/nocturno` desde `main` (con MB-19.1 mergeado) · worktree propio.
**Un commit por pieza, en el orden escrito.** Nunca dos piezas en un commit.

## ⚠️ LA REGLA QUE MANDA SOBRE TODO

**Esto corre sin nadie mirando.** Si una pieza no se puede hacer limpia, **NO la fuerces**:
sáltala, escribe por qué en el reporte, y sigue con la siguiente. **Un tramo incompleto y
honesto vale mil veces más que uno completo y roto.**

`tsc`, Vitest y `npm run censo` en verde **antes de cada commit**. Si algo se pone rojo y no se
arregla en dos intentos, revierte esa pieza y sigue.

**Cero em dash en copy de usuario. Cero nombres propios.**

---

# TRAMO A · Lo que protege todo lo demás

## A1 · El guardián se monta en la puerta

**Ningún test corre en CI.** `.github/workflows/typecheck.yml` solo ejecuta `npx tsc --noEmit`.
El censo de rutas de MB-19 y el ratchet de iconos de MB-19.2 **solo se disparan si alguien se
acuerda de escribirlos a mano.** Dos runs seguidos construyeron guardianes que nadie montó.

Agregar al workflow, después del typecheck:

```yaml
      - run: npm test
      - run: npm run censo
```

## A2 · Los dos huecos del ratchet

`src/constants/__tests__/icon-censo.test.ts`, ambos comprobados con experimento real:

**Hueco 1 · los glifos viejos no están en la lista.** `GLIFOS_DE_FUNCION` (línea 139) lista los
rellenos actuales del mapa, no los que dibujaban esas mismas funciones antes. Un archivo nuevo
usando `timer-outline` (que era Ayuno) **pasa verde**. Faltan por lo menos: `timer-outline`,
`document-outline`, `calendar-outline`, `eye-outline`, `sparkles-outline`, `journal-outline`,
`flash-outline`, `bicycle`, `partly-sunny`, y los rellenos `restaurant`, `barbell`, `leaf`,
`medkit`, `moon`, `water`, `sunny`.

**Hueco 2 · deduplica por par archivo-glifo** (línea 161), así que un segundo uso del mismo
glifo en un archivo ya inventariado es invisible. Contar usos, no pares.

⚠️ **Y el problema de fondo:** `GLIFOS_DE_FUNCION` es una copia a mano del mapa. **Derívala de
`ICON_MAP`**, o el día que lleguen los SVG y desaparezcan los `ion(...)` el ratchet deja de
proteger en silencio y nadie se entera.

## A3 · El quinto registro paralelo

`src/components/mente/mente-hub-core.ts:20-25` tiene cuatro divergencias más, y una es fea:
Respiración usa `leaf-outline`, que en el mapa significa Grounding.

Hoy nadie lo renderiza, así que no se ve. **Migrarlo a nombres lógicos igual**, porque el día
que alguien enchufe ese hub nacen cuatro divergencias y el ratchet solo ve una.

## A4 · Residual: Ajustes dibujado a mano

`app/(tabs)/yo.tsx:212` usa `settings-outline` para ir a `/settings`, que es exactamente la app
`ajustes` del registro. Es la misma clase de divergencia que MB-19.2 mató. Una línea.

## A5 · Las imágenes · el arreglo que más se ve

**56 MB en 167 archivos. 96 pasan de 300 KB y varios rozan el mega.** Son PNG, que es formato
para gráficos con transparencia, no para fotos.

Esto causa tres cosas a la vez: los 5 segundos de carga en meditación, **las imágenes que
desaparecen en HOY** (20 cards decodificando bitmaps enormes, Android vacía el caché bajo
presión), y 56 MB de peso de descarga en las tiendas.

**Qué hacer:**
- Convertir a **WebP** todas las fotos de `assets/images/` (calidad 82-85 es indistinguible).
- **Redimensionar**: ninguna card necesita más de 1200 px de ancho.
- Actualizar los `require()` a las extensiones nuevas.
- Ya existe `scripts/optimize-images.js`: úsalo o extiéndelo, no escribas otro.

⚠️ **Los iconos SVG de `assets/icons/` NO se tocan.** Esto es solo fotos.
⚠️ **Reporta el antes y el después en MB.** Si no bajó por lo menos a la mitad, algo salió mal.

---

# TRAMO B · Los bugs del recorrido

Todos verificados en código. **Uno por commit.**

## B1 · El import de cardio nunca ha funcionado

Error real que ve el usuario: `new row for relation "cardio_sessions" violates check constraint
"cardio_sessions_source_check"`.

```
036_fitness_deep.sql:  CHECK (source IN ('manual','wearable','strava','garmin'))
health-import-core.ts:19   HealthSource = 'health_connect' | 'healthkit'
```

**Ninguno de los dos valores está permitido. Falla siempre, para todos, en las dos plataformas**,
y como es un solo insert, los 71 entrenamientos se caen juntos.

Migración **idempotente** que agregue `'health_connect'` y `'healthkit'` a la restricción.
**Y un test que cruce los valores que el código puede mandar contra los que la tabla acepta**,
porque este error es de una familia que vuelve.

## B2 · El import se traga las caminatas

No hay **ningún** filtro: todo lo que Health Connect devuelva como sesión entra, y lo que no
está en el mapa cae como "Otro". Por eso la lista es una pared de "Otro" con entradas de 10
minutos y 0.01 km.

- **Duración mínima 5 minutos.**
- **Si la disciplina cae en "otro" Y no trae distancia, no se importa.**
- El usuario **puede desmarcar antes de importar**, no después.

## B3 · Copy del conector

La pantalla dice Google Health, Samsung Health y Garmin. **El código sí lee HealthKit**
(`leerIOS`). Agregar Apple Health.

## B4 · Hidratación dice NUTRICIÓN

`app/hydration.tsx:93` lo tiene escrito a mano. Debe decir HIDRATACIÓN.

## B5 · Box Breathing: los ciclos no son segundos

El menú muestra `18 s` donde son **18 ciclos**. Quitar la unidad de esa fila.

## B6 · Emociones: dos puertas, un destino

"¿Cómo estás?" y "Explorar el territorio" llevan al mismo lugar y hacen lo mismo.

**Deben ser distintas:** "¿Cómo estás?" es **registrar** (check-in, selecciona y guarda).
"Explorar el territorio" es **recorrer sin registrar**: mismo plano, mismo zoom, se leen
descripciones y no se guarda nada. Esa era la intención original y se perdió en la migración.

## B7 · Tipo de comida en el registro

No se puede elegir desayuno, comida, cena ni colación. **`meal_type` YA EXISTE en la base** con
sus seis valores (`046_frequent_foods.sql:6`) y `food-scan.tsx:321` ya acepta `mealType` como
parámetro. **Es cablear, no construir.** Con default sensato según la hora.

## B8 · La meditación se empalma y no se puede adelantar

Dos bugs del mismo reproductor:

**Al salir con atrás el audio sigue sonando** y no hay forma de verlo ni detenerlo. Al volver a
entrar **arranca otra vez y se empalman dos reproducciones.**
→ Mínimo: que al salir se detenga, o que exista una sola instancia. **Nunca dos audios.**

**Tocar la barra de progreso reinicia** en vez de adelantar.
→ Que se pueda mover a cualquier punto. Y esto explica lo de Rachas: completar al 100% sin
brincar sí registra, brincando no.

⚠️ **El reproductor en segundo plano con control desde la notificación del sistema NO es de este
run:** es cambio nativo y necesita build. Solo dejarlo escrito.

## B9 · Amarillos legacy en HIIT

Colores que no van con la paleta de Fitness. Cambiar a los tokens de `brand.ts`. **Si no está
claro cuál corresponde, no lo inventes: repórtalo y sáltalo.**

---

# TRAMO C · MB-20, el día

**Solo si los tramos A y B quedaron limpios.** Si alguno quedó a medias, **para aquí** y reporta.

Ejecutar `R and D/AWAY_RUN_MB20_EL_DIA.md` completo, con sus cuatro piezas y su pieza 4.4 de
presencia única de ARGOS.

⚠️ **Lo que NO entra aunque el documento lo roce:** la migración de protocolos a packs de
hábitos. Toca rachas, contexto de ARGOS y el panel de coach, y **eso no se hace sin nadie
mirando.** Queda para su propio run.

---

# 📦 REPORTE FINAL

Al terminar, un solo documento en `R and D/` con:

1. **Qué se hizo, por tramo y por commit.**
2. **Qué se saltó y por qué.** Esta sección importa más que la primera.
3. **El antes y después del peso de imágenes en MB.**
4. **Qué necesita ojos humanos** antes del merge.
5. **Lo que quedó rojo**, si algo quedó rojo.
