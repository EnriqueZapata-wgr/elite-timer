# Wearables · Bloque A · entrega

**Fecha:** 13-oct-2026 · **Commit:** `fcf1566` en `main` · **Deploy:** ninguno (sin OTA, sin build)

## 1. Qué quedó, parte por parte

1. **Migración 344.** `supabase/migrations/344_wearables_conexion.sql`, copia exacta de `02_344_wearables_conexion.sql` (617 líneas). El 344 seguía libre: 340 a 343 son de cuestionarios.
2. **Contrato de fuentes.** `sleep-source-contract.test.ts` lee todas las migraciones en orden y toma el check vigente de cada tabla. Entiende `IN (...)` y `= any (array[...])`.
   - Prueba que todo lo que manda el código está permitido y que la lista de la base es igual a la del código, en los dos sentidos.
   - Prueba que solo `sleep_cycle`, `health_connect` y `healthkit` son escribibles por el teléfono, y que ninguna marca lo es.
   - Se conservaron RLS, UNIQUE y las reglas de quién pisa a quién.
3. **Fuentes nuevas** (`oura`, `whoop`, `garmin`, `polar`, `mixto`):
   - `fuenteDeMaquina`, `esDeMaquina` y `etiquetaFuente` en `health-read-core.ts`.
   - `fuenteDeSleepNight` y `etiquetaFuenteNoche` en `sueno-unificado-core.ts`.
   - `FuenteFcReposo` en `cardio-perfil-service.ts` y su etiqueta en `app/fitness-cardio.tsx`.
4. **Lector unificado.**
   - `procedencia-core.ts`, puro, da para cada campo:
     - la fuente, leída de `field_sources` o, si no está, del source de la fila;
     - el método (`rmssd` / `sdnn`);
     - `aplicaRangoCasa`;
     - el tramo más reciente de una sola fuente.
   - Noches: cada `Noche` trae `fuentes` por campo y las etapas (`deepMin`, `lightMin`, `remMin`, `awakeMin`, `latencyMin`, `efficiency`).
   - Días: `vitales-core.ts` y `vitales-service.ts` leen HRV RMSSD, HRV SDNN, FC en reposo, respiración, temperatura, SpO2 y readiness. Cada uno sale con su procedencia y su tendencia, calculada solo dentro de la misma fuente.
   - ARGOS:
     - Sueño: la tendencia se calcula solo en el tramo de la misma fuente. Si se cortó, lo dice.
     - El promedio de horas dice de qué fuentes viene.
     - La calma de ATP usa solo noches del Sueño de ATP. El score de cada marca va aparte y no se promedia con otras.
     - Bloque nuevo de vitales, detrás del mismo candado de consentimiento.
     - El método y el rango viajan como dato en el texto; no se agregó ninguna regla al prompt.
   - Pantalla de Sueño: la etiqueta de calma solo aparece con el score del Sueño de ATP. Un score de marca dice "Score de sueño de Oura · 88".
5. **Cabecera de `health-platform-service.ts`** con la decisión del 12-oct. No promete código que todavía no existe.

**Antes de la 344:** todo sigue funcionando.
- Si una columna nueva no existe, se cae al select viejo.
- `base-344-estado.ts` recuerda eso 10 minutos para no gastar una petición fallida en cada lectura.
- Una columna que no es de la 344, una tabla faltante o un permiso siguen siendo error de lectura ("no se pudo leer"), nunca "no hay datos".

## 2. Qué decidí distinto a los briefs y por qué

1. **Rango de la casa en lista blanca.** Solo HRV RMSSD de noche completa (más de 50 ms) lleva `aplicaRangoCasa = true`. Todo lo demás sale "sin rango de la casa", para que ARGOS no invente rangos que la casa no tiene escritos. El brief solo pedía false para SDNN y ventana parcial; esto es más estricto.
2. **WHOOP cuenta como HRV de ventana parcial**, igual que Polar. Es un supuesto: su ayuda pública dice que pondera el último tramo de sueño profundo. **Enrique, confírmalo o lo quito.**
3. **'mixto' en un campo es "fuente sin identificar".** Así lo marca el trigger cuando el teléfono escribe sin decir fuente. En consecuencia:
   - no paga premio de evidencia;
   - no aplica rango;
   - corta tendencias.
4. **`esFuenteDeMaquina` (lo que el import del teléfono puede completar) se queda en Health Connect y HealthKit.** Una noche de Oura no la completa el teléfono.
5. **Tendencia con menos de 4 noches o días del mismo tramo: "no se calcula".** Antes salía "estable".
6. **No usé `git worktree`.** En la carpeta montada git no puede borrar archivos. Trabajé en una copia aislada fuera del repo y copié de vuelta después de verificar que nadie había cambiado esos archivos.
7. **Score de marca.** La 344 reutiliza `sleep_nights.score` para el score de la marca. Por eso la pantalla y ARGOS distinguen la calma de ATP del score de una marca. Esto no estaba en el brief del bloque A; lo encontró la revisión en frío.

## 3. Qué no cerré

- **Necesita a Enrique:**
  - aplicar la 344 y correr la consulta de permisos de `04_OURA.md` Paso 1;
  - confirmar el supuesto de WHOOP.
- **Pendiente:**
  - La pantalla de Sueño todavía no pinta etapas ni HRV. Los datos ya llegan; las pantallas son del bloque B.
  - `health-read-service.leerFilasDelDia` sigue mostrando un fallo de permiso o red como "sin dato" en HOY. Ya era así antes; arreglarlo cambia el contrato con `day-compiler`, `useWearableToday` y `lectura-service`.
  - "Fuente externa" en ARGOS también aparece sobre el Sueño de ATP. Ya era así antes.
- **Pruebas que este runner no corre completas** (correr `npm test` en tu máquina):
  - `argos-hub-noche`: le falta `expect.arrayContaining`;
  - `voice-conversation`;
  - `braverman-premium-service`;
  - `hardening-prelaunch`.
  - `sleep-services` falla 3 pruebas de `guardarNochePropia` igual en la base anterior; lo comprobó un revisor sobre `d4115d1` limpio.

## 4. Evidencia

```
procedencia-core, health-read-core, lectura-344, vitales-core, vitales-service, sleep-source-contract
115 pasaron, 0 fallaron
sueno-unificado-core, sueno-unificado-service, sleep-copy-honesto, sleep-core, sleep-import-core, health-metrics-core, health-import-source-contract, cardio-core
191 pasaron, 0 fallaron
argos-context-bloques-nuevos, argos-context-core, argos-memoria-core, argos-consent-gate
93 pasaron, 0 fallaron
sleep-source-contract en el checkout real (con 340-343 presentes): 21 pasaron, 0 fallaron
tsc --noEmit: exit=0
```

Las pruebas nuevas sí distinguen: corridas contra el código anterior, fallan 43. Hubo dos revisores en frío, uno de correctitud y otro de doctrina y ARGOS. Sus bloqueantes quedaron resueltos: el score de marca presentado como calma, y el `aplica_rango_casa` crudo en el prompt.

## 5. Checklist en el teléfono

Este bloque no sale por OTA. Se prueba cuando salga la siguiente, ya con la 344 en producción.

1. **Sueño:** la noche medida con el Sueño de ATP muestra su calma ("Noche serena · score N") igual que antes.
2. **Sueño:** una noche importada de Health Connect dice "Importada de Health Connect".
3. **Cardio:** la FC en reposo del teléfono dice "de Health Connect" o "de Salud de Apple".
4. **ARGOS:** "¿cómo he dormido esta semana?" responde con las horas y dice de qué fuente vienen. No nombra enfermedades.
5. **Antes de aplicar la 344:** Sueño, HOY y Cardio cargan igual que hoy, sin "no se pudo leer".
