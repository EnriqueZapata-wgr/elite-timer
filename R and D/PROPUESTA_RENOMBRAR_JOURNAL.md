# Propuesta · rebautizar "Journal"

**Fecha:** 15 de agosto de 2026 · run DEUDA
**Estado:** PROPUESTA. No se cambió ningún nombre en el código. La decisión es de Enrique.

---

## Antes del nombre: la premisa no se sostiene

El encargo decía que "Journal" no comunica que ahí también viven **las emociones
y el check-in**. Fui a verificarlo antes de proponer nombres, y no es así.

`/journal` (`app/journal.tsx`) contiene exactamente esto:

- Un selector de cuatro prácticas de escritura: Gratitud, Visión, Estoico, Descarga.
- El formulario de cada una.
- Una escala de ánimo 1-10 antes y después de escribir (`mood_before` / `mood_after`).
- El switch del recordatorio diario con su hora.
- Las entradas recientes y un botón al historial.

El check-in emocional **no está ahí**. Vive entero en `app/checkin.tsx`: el plano
12x12, el mapa corporal, el contexto, el cierre, la rama de crisis y la
sub-máquina de navegación emocional. Su hub es `/emotions` y su reporte es
`/reports/emociones`, que lee otra tabla (`emotional_checkins`). Ese dominio ni
siquiera lee `journal_entries`.

La escala 1-10 del journal no es un check-in: no hay emociones nombradas, ni
cuadrantes, ni contexto. Es un termómetro para medir cuánto te movió escribir.

**Entonces, ¿por qué se siente que las emociones están metidas ahí? Porque una
parte sí lo está, mal etiquetada.** Cuando alguien deja nota en el check-in, esa
nota se guarda como fila en `journal_entries` con `journal_type: 'checkin'`, y
aparece en `/reports/journal`. Pero `JOURNAL_TYPE_META` no tenía la llave
`checkin`, así que caía al fallback y se pintaba como **"Libre"**, sin chip para
filtrarla. Notas del check-in dentro del journal, sin nombre y sin puerta.

**Eso ya se arregló en este mismo commit** (una línea en
`src/constants/journal-types.ts`): ahora esas entradas dicen **"Check-in"** y
tienen su propio chip de filtro, con el acento del dominio Emociones.

Vale la pena mirar la app con ese arreglo puesto antes de decidir el nombre. Es
posible que la molestia fuera esa y no la palabra.

---

## Si aun así se rebautiza: tres candidatos

Criterios que apliqué: español de México, una sola palabra si se puede (va en
una card de la sala y en un tab de reportes), que no prometa lo que no hay, y
que no choque con nombres ya tomados en la app (Emociones, Mente, Check-in,
Respirar, Meditar).

### 1 · Bitácora

**A favor.** Es la palabra que ya usa ARGOS como sinónimo para llegar aquí
(`argos-nav-resolver-core.ts:235` lista `bitacora`). Suena a registro
disciplinado, no a diario adolescente, y le va bien al avatar de ATP: un
profesional de alto rendimiento no lleva un diario, lleva bitácora. Cubre bien
las cuatro prácticas, incluida Descarga, que de "diario" tiene poco. Es palabra
de ingeniería y de navegación, que es el vocabulario de la casa.

**En contra.** Es la más larga de las tres (nueve letras) y en la card de la
sala compite por ancho. Puede leerse fría para las prácticas de Gratitud y Visión.

### 2 · Escribir

**A favor.** Es la única que nombra el ACTO en vez del objeto, y eso la alinea
con los vecinos del pilar Mente, que ya son verbos: Respirar, Meditar. Puestos
en fila se leen como un sistema: *Respirar · Meditar · Escribir · Check-in*. No
promete contener nada, así que no vuelve a pasar lo del malentendido: si mañana
entra una quinta práctica de escritura, el nombre sigue siendo cierto. Es la
palabra más corta y la que menos explicación pide.

**En contra.** Es genérica: no dice que haya historial, ni rachas, ni cuatro
puertas distintas. Y como etiqueta de un dominio de REPORTES ("Escribir") suena
raro: los otros dominios son sustantivos (Emociones, Adherencia, Ciclo). Habría
que aceptar que la app se llama Escribir y el reporte se llama distinto, o
forzar un sustantivo feo.

### 3 · Mi Registro

**A favor.** El posesivo hace el trabajo emocional que "Journal" no hace: es
tuyo. "Registro" es neutro y aguanta cualquier contenido, así que si algún día
sí se absorben las notas del check-in de verdad, el nombre no miente. Sirve
igual como app y como dominio de reportes.

**En contra.** Son dos palabras, y el molde de la sala ATP es de una. "Registro"
ya carga sentido en la app (registrar comida, registrar agua), así que puede
leerse como captura de datos y no como escritura. Y roza a "Mis Datos", que es
una pantalla distinta: dos nombres parecidos para dos cosas distintas es
exactamente el problema que las olas de consolidación vinieron a resolver.

---

## Mi lectura, sin decidir

Si el objetivo es que el nombre no vuelva a prometer de más: **Escribir**, y que
el dominio de reportes se llame **Escritura**.

Si el objetivo es que suene a ATP: **Bitácora**, y ya la usa ARGOS.

**Mi Registro** la dejo listada porque estaba en el rango, pero choca con
"Mis Datos" y no la recomendaría.

---

## Dónde habría que cambiarlo (lista completa)

Verificado archivo por archivo. **Ninguno de estos cambios se hizo.**

### Copy que ve el usuario (esto es lo que se cambia)

| Archivo | Línea | String |
|---|---|---|
| `app/journal.tsx` | 396 | `Journal` (título del hero) |
| `app/journal.tsx` | 408 | `Tu diario ATP` (título del popup de ayuda) |
| `src/services/reports/report-domain-core.ts` | ~174 | `title: 'Journal'` (título del dominio de reportes) |
| `src/components/reports/domains/journal.tsx` | 284 | `title="JOURNAL"` (card resumen en el hub de reportes) |
| `src/components/reports/domains/mente.tsx` | 24, 40 | `label="journal"` y `'entradas de journal'` |
| `src/services/reports/report-domain-core.ts` | ~169 | subtítulo de Mente: `Respiración, meditación, journal y check-ins.` |
| `app/reports.tsx` | 118 | `journal: 'Journal'` (nombre de sección en el hub y el reordenador) |
| `src/constants/electrons.ts` | 51 | `name: 'Journal'` (nombre del electrón) |
| `src/constants/app-registry.ts` | 83-84 | `label: 'Journal'` + su descripción + `alias: ['diario','escribir','gratitud']` |
| `app/hoy-habitos.tsx` | 42 | `journal: 'Journal'` |
| `src/services/mente-streaks-core.ts` | 30-32 | `label: 'Journal'` |
| `src/components/mente/mente-hub-core.ts` | 29 | `label: 'Journal'` |
| `src/services/economy/tx-labels.ts` | 37 | `journal: 'Journal'` (historial de electrones) |
| `src/services/hero-recommendation-service.ts` | 287 | `cta: 'Journal'` |
| `src/data/emotion-navigation.ts` | 136 | `Journal de gratitud` |
| `src/services/argos-nav-resolver-core.ts` | 141-142 | `'/journal': 'Journal'`, `'Historial del journal'` |
| `src/services/argos-nav-resolver-core.ts` | 235 | sinónimos: agregar el nombre nuevo, **conservar los viejos** |
| `src/constants/app-registry.ts` | 95 | descripción de Rachas: `Tus rachas de journal, respiración…` |
| `src/constants/categories.ts` | 29 | `Meditación, respiración, journaling, enfoque` |
| `app/checkin.tsx` | 934 | `Respóndelo aquí si quieres: se guarda en tu journal` |
| `src/constants/legal-texts.ts` | 30 | aviso de privacidad: `(journal, check-ins)` |
| `app.json` | 21, 105 | permiso de voz iOS: `…y notas de journal hablando…` **(requiere build, no OTA)** |

### Ruta

Renombrar `/journal` arrastra: `app/journal.tsx`, el redirect
`app/journal-history.tsx`, `app-registry.ts:83`, `score-coaching-core.ts:24`,
`hero-recommendation-service.ts:288`, `notification-actions-core.ts:123`,
`emotion-navigation.ts:104,136,172`, `argos-nav-resolver-core.ts:141-142,235`,
`.maestro/rutas.json` (4 entradas) y `app-routes.generated.ts` (que se
**regenera**, no se edita a mano: `npm run tipos:rutas`).

Si se renombra la ruta hay que **dejar `/journal` como redirect legacy** y
anotarlo en `scripts/censo-permitidas.json`, o se rompen los deep links y los
builds OTA viejos. Es la misma regla que siguieron todas las olas.

### NO se renombra (nombres internos)

Tocar esto no cambia nada que el usuario vea y sí rompe datos:

- Tabla `journal_entries` y todas sus columnas. Migración 033.
- Valores de `journal_type`: `free | gratitude | vision | stoic | work_dump | checkin`.
- Clave del electrón `'journal'` (`electrons.ts`, `electron-app-bridge.ts`,
  `day-booleans.ts`, `awardBooleanElectron`).
- `ReportDomainKey = 'journal'` y la llave de sección del hub. `app/reports.tsx`
  ya documenta que **no se renombran**: están persistidas en AsyncStorage
  (`@atp/reports_sections`) y cambiarlas le borra el orden de secciones a quien
  ya lo acomodó.
- `AvisoAppKey = 'journal'` y la fila `app_key: 'journal'` en la DB.
- Claves AsyncStorage `@atp/journal_reminder*`.
- Evento de analítica `journal_entry_created`.
- Acción de notificación `open_journal`, identificador `aviso_journal`.
- Constantes de comunidad `'journal_entry'` y `'journal'`.
- Nombre lógico del icono `'journal'` y `assets/icons/journal.svg`.
- Nombres de archivo (`journal-service.ts`, `journal-logic.ts`, etc.). Renombrarlos
  es ruido de diff sin beneficio para el usuario.

### Falsos positivos, no tocar

`journals.plos.org` y `Biomedical Journal` en `interventions-catalog.ts`, las
citas académicas de `app/mente/nback/saber-mas.tsx`, `Journaling` en
`seed-protocols.ts`, y las intervenciones `Journal AM` / `Journal PM` del
catálogo, que son contenido clínico y no la sección.

---

## Recomendación de orden

1. Ver la app con el arreglo del chip "Check-in" puesto.
2. Si la molestia sigue, elegir nombre.
3. Cambiar **solo el copy** primero (una sola pasada, es OTA y se revierte con un revert).
4. La ruta, solo si después de vivir con el nombre nuevo sigue valiendo la pena:
   es la parte cara y la que puede romper deep links.
