# Propuesta de limpieza de `fasting_logs` · 31-ago-2026 · NO APLICADA

**Estado: PROPUESTA. Ninguna fila se tocó. La decide Enrique.** Toca filas con
dueño (regla 1 de la casa), así que no va en `supabase/migrations/` hasta que
él diga qué sí y qué no. Lo que sí entró como migración es la guardia de
esquema `313_fasting_logs_fin_despues_de_inicio.sql` (schema only, `NOT VALID`,
no toca datos).

## Lo que se midió contra la base real (solo SELECT)

59 filas, 3 usuarios: 54 `completed`, 4 `cancelled`, 1 `active` (26 h al medir,
meta 16: es un ayuno vivo y legítimo, no se toca).

| Pregunta del backlog | Resultado |
|---|---|
| ¿Filas duplicadas por cerrar dos veces el mismo ayuno? | **0**. `breakFast` actualizaba por id (UPDATE), así que un segundo cierre no creaba fila: **pisaba** `fast_end`/`actual_hours` de la misma. No hay forma de saber desde la base cuántas veces pasó. Desde hoy el servicio filtra `status = 'active'` y el segundo intento no escribe. |
| Mismo `user_id` + mismo `fast_start` más de una vez | 0 grupos |
| Dos `completed` con el mismo `date` | 3 grupos, pero **no son duplicados**: son dos ayunos distintos (uno de anoche y otro de esta noche) que compartían `date` por el bug viejo de fecha (AY-G2, ya corregido). |
| `completed` que se solapan en el tiempo (mismo usuario) | **3 pares**, abajo. |
| `fast_end < fast_start` | **1** |
| `completed` sin `fast_end` | **1** |
| `completed` con 0 h | **4** (uno es el de fin < inicio) |
| `actual_hours > 120` (la app auto-cierra a 120) | **1** (263.4 h) |

## Las filas raras (ids recortados a 8)

| id | usuario | motivo | detalle |
|---|---|---|---|
| `2a0898a4` | `6ac686b1` | fin antes de inicio, 0 h | 2026-04-09 16:04:36 → 16:04:00 |
| `500c9e02` | `6ac686b1` | 0 h (3 segundos) | 2026-04-12 |
| `e0d2bad5` | `7503a669` | 0 h (2 segundos) | 2026-04-01 |
| `fb4f6b69` | `90a55e74` | 0 h (2 segundos) | 2026-03-29 |
| `789007af` | `90a55e74` | 263.4 h | 2026-03-30 → 2026-04-10, meta 16 |
| `f8771969` | `90a55e74` | completed sin fin | 2026-04-24, 10.9 h registradas |

Pares solapados (`completed` contra `completed`, mismo usuario):

| usuario | A | B |
|---|---|---|
| `90a55e74` | `6161e2ac` 2026-04-13 04:27 → 04-14 01:35 (21.1 h) | `9fcd7d4f` 2026-04-14 00:36 → 04-14 17:05 (16.5 h) |
| `90a55e74` | `9cf203d1` 2026-06-04 14:00 → 06-06 02:18 (36.3 h) | `85a496b4` 2026-06-06 01:00 → 06-06 17:30 (16.5 h) |
| `6ac686b1` | `0a577a70` 2026-08-26 01:30 → 08-26 16:10 (14.7 h) | `ce3955b2` 2026-08-26 14:15 → 08-27 15:17 (25 h) |

Los solapes de una hora parecen "empecé antes" capturado con generosidad; el
de agosto (2 h) es el más reciente. Ninguno es claramente basura: **no se
propone tocarlos**, solo que Enrique los mire.

## Cómo los trata la app HOY sin tocar la base

- Estadísticas rápidas (`fasting-stats-core`): filtran 0 h y > 120 h antes de
  contar. La media, la mediana y el más largo ya son honestos.
- Calendario de adherencia y fila del historial: el de 263 h se pinta como
  "cumplido" (263 ≥ 16). Es falso y se ve.
- El `completed` sin fin cae a su día de inicio por `diaCanonico` y se cuenta
  con sus 10.9 h.

## SQL propuesto (para cuando Enrique diga que sí)

Idempotente, por id, sin DELETE. Marca en `notes` para poder revertir.

**Orden importa (4EP):** la 313 deja un CHECK `fast_end > fast_start` NOT VALID.
NOT VALID no revisa lo existente, pero SÍ revisa cualquier UPDATE sobre una
fila, y `2a0898a4` tiene fin < inicio: un UPDATE que no corrija el fin viola
el CHECK y tira el statement entero. Por eso esa fila va primero y con el fin
corregido a inicio + 1 segundo (sigue siendo 0 h y queda cancelada).

```sql
-- 1) La fila con fin < inicio: primero se arregla el fin, o el CHECK de 313
--    rechaza cualquier otro UPDATE sobre ella.
UPDATE fasting_logs SET fast_end = fast_start + interval '1 second',
  status = 'cancelled',
  notes = coalesce(notes || ' | ', '') || 'limpieza 2026-08-31: fin < inicio, 0 h'
WHERE id::text LIKE '2a0898a4%' AND fast_end < fast_start;

-- 2) 0 h: no fueron ayunos. Se cancelan, no se borran.
UPDATE fasting_logs SET status = 'cancelled',
  notes = coalesce(notes || ' | ', '') || 'limpieza 2026-08-31: 0 h'
WHERE id::text LIKE ANY (ARRAY['500c9e02%', 'e0d2bad5%', 'fb4f6b69%'])
  AND status = 'completed';

-- 263.4 h: imposible (la app cierra a 120). Se cancela, no se recorta a 120:
-- recortar seria inventar un ayuno de 120 h que nadie hizo.
UPDATE fasting_logs SET status = 'cancelled',
  notes = coalesce(notes || ' | ', '') || 'limpieza 2026-08-31: 263 h, imposible'
WHERE id::text LIKE '789007af%' AND status = 'completed';

-- completed sin fin: el fin se deriva de las horas que si registro.
UPDATE fasting_logs SET fast_end = fast_start + (actual_hours || ' hours')::interval,
  notes = coalesce(notes || ' | ', '') || 'limpieza 2026-08-31: fin derivado de actual_hours'
WHERE id::text LIKE 'f8771969%' AND status = 'completed' AND fast_end IS NULL;
```

Después de eso, la constraint de 313 se puede validar del todo:

```sql
ALTER TABLE fasting_logs VALIDATE CONSTRAINT fasting_logs_fin_despues_de_inicio;
```

## Lo que NO se propone

- Reescribir `date` al día de fin. La decisión 15.1 (día canónico = fin) se
  aplica en los lectores con `diaCanonico`; la columna sigue siendo inicio
  local y no hace falta migrarla.
- Borrar nada.
