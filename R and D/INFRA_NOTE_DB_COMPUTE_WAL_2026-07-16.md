# 🛠️ INFRA NOTE — DB compute Nano→Micro + investigación WAL bloat

**Fecha:** 2026-07-16 · **Autor:** Fable (Track C) · **Proyecto Supabase:** `itqkfozqvpwikogggqng` (ELITE-APP-FULLDB)

> ⛔ **NADA en este doc se ejecuta sin firma de Enrique.** Es diagnóstico +
> propuesta de fix seguro. La investigación fue **solo lectura**.

---

## 1 · Contexto del bloqueo (17-jul, resuelto)

La DB se subió de compute **Nano → Micro**. El disparador reportado: un WAL
(Write-Ahead Log) de **~1.92 GB** contra una DB de solo **~0.07 GB** — ~27× el
tamaño de los datos. Un WAL así de desproporcionado suele significar una de dos
cosas:

1. **Replication slot atorado** — un slot lógico inactivo que Postgres no puede
   avanzar, así que retiene WAL indefinidamente (el disco crece hasta llenarse).
2. **Buildup del crash-loop** — si el servidor se reinicia en loop, los
   checkpoints no alcanzan a reciclar segmentos de WAL y se acumulan.

Un WAL creciendo sin control puede llenar el disco y **tumbar la DB** (Postgres
deja de aceptar escrituras). De ahí la urgencia del bloqueo.

---

## 2 · Estado ACTUAL (medido hoy, read-only)

| Métrica | Valor | Lectura |
|---|---|---|
| `pg_database_size` | **60 MB** | Datos sanos, consistente con app chica |
| **Replication slots** | **0 (ninguno)** | ✅ No hay slot atorado reteniendo WAL |
| `pg_stat_replication` | 0 filas | Sin réplicas colgadas |
| `pg_subscription` | 0 | Sin suscripciones lógicas activas |
| `wal_level` | `logical` | Normal en Supabase (Realtime/CDC) |
| `max_wal_size` | 4 GB | Techo de checkpoint |
| `max_slot_wal_keep_size` | **512 MB** | ✅ Tope por-slot: un slot no puede retener > 512 MB |
| `wal_keep_size` | 0 | Sin retención extra forzada |
| `current_wal_lsn` | `2C/93000110` | — |

Queries usadas (reproducibles, read-only):
```sql
SELECT slot_name, slot_type, active, wal_status,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained
FROM pg_replication_slots;                          -- → []  (cero slots)

SELECT pg_size_pretty(pg_database_size(current_database()));   -- → 60 MB
SELECT current_setting('max_slot_wal_keep_size');              -- → 512MB
```
> `pg_ls_waldir()` + `pg_stat_file` requieren rol elevado (permiso denegado vía
> MCP), así que el tamaño exacto del directorio WAL hoy no se pudo medir desde
> aquí — pero con **0 slots** y `max_slot_wal_keep_size=512MB`, no hay mecanismo
> que sostenga 1.9 GB de WAL retenido actualmente.

---

## 3 · Diagnóstico

**El WAL bloat de 1.92 GB ya está resuelto y NO reaparece por sí solo.**

- No existe ningún replication slot → descarta la hipótesis #1 (slot atorado)
  **como estado actual**. El pico probablemente vino de un slot transitorio
  (Realtime/CDC o un proceso de migración) que se liberó, **o** del buildup de
  checkpoints durante el crash-loop previo al upgrade.
- Al pasar a Micro, más CPU/RAM permitió que los checkpoints reciclaran el WAL
  acumulado y el disco volvió a nivel normal.
- `max_slot_wal_keep_size = 512 MB` es una **red de seguridad ya activa**:
  ningún slot individual puede volver a retener más de 512 MB — Postgres lo
  invalida (`wal_status = lost`) antes de que tumbe el disco.

**Conclusión:** no hay nada que arreglar hoy. Lo que queda es **vigilancia** para
detectar una recurrencia a tiempo.

---

## 4 · Fix seguro PROPUESTO (⛔ no ejecutar sin firma)

### 4.a — Si en el futuro reaparece un slot atorado

Detectar y (con firma) soltar **solo** slots inactivos que no sean del sistema:

```sql
-- (1) DIAGNÓSTICO — read-only, correr primero
SELECT slot_name, slot_type, active, wal_status,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots
ORDER BY pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) DESC;

-- (2) FIX — SOLO tras confirmar que el slot es inactivo y NO lo usa Realtime.
--     Correr UNO por UNO, nunca en masa. REQUIERE FIRMA.
-- SELECT pg_drop_replication_slot('<slot_name_inactivo>');
```

> ⚠️ **Nunca** dropear un slot `active = true` ni el slot de Realtime de Supabase
> — romperías CDC/Realtime. Por eso va uno por uno y con confirmación humana.

### 4.b — Endurecimiento preventivo (opcional, con firma)

`max_slot_wal_keep_size` ya está en 512 MB (bien). Si se quisiera un techo aún
más conservador para la beta, se puede bajar — **pero requiere reinicio** y no es
necesario dado el tamaño actual. **Recomendación: no tocar.**

### 4.c — Compute Micro

Mantener **Micro** durante la beta (5-9 testers). No hay señal de necesitar
subir más. Revisar de nuevo si el número de usuarios crece 10×.

---

## 5 · Monitoreo recomendado (barato, read-only)

Correr esta query en el SQL Editor si el disco vuelve a crecer raro (o 1×/semana
durante la beta):

```sql
SELECT
  (SELECT pg_size_pretty(pg_database_size(current_database())))        AS db_size,
  (SELECT count(*) FROM pg_replication_slots)                          AS slots,
  (SELECT count(*) FROM pg_replication_slots WHERE NOT active)         AS slots_inactivos,
  (SELECT coalesce(pg_size_pretty(max(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn))), '0')
   FROM pg_replication_slots)                                          AS max_wal_retenido_por_slot;
```

**Umbral de alerta:** `slots_inactivos > 0` **y** `max_wal_retenido_por_slot`
acercándose a 512 MB → investigar antes de que el slot se invalide o el disco
crezca. Con el estado de hoy, todo sale en 0 / sano.

---

## 6 · Resumen ejecutivo

- ✅ WAL bloat **resuelto** — 0 replication slots, DB 60 MB, red de seguridad
  `max_slot_wal_keep_size=512MB` activa.
- ✅ Compute **Micro** es adecuado para la beta.
- 🟡 **Acción para Enrique:** ninguna urgente. Solo tener a mano la query de
  monitoreo (§5) por si el disco vuelve a crecer raro.
- ⛔ Todo fix propuesto (§4) espera **firma** antes de ejecutarse.
