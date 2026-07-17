# 🔧 Migration repair — alinear historial 202 + 203

**Fecha:** 2026-07-16 · **Proyecto:** `itqkfozqvpwikogggqng`
**Estado:** ✅ **EJECUTADO Y VERIFICADO** el 2026-07-16 — ver §"Estado" al final.

## El problema

Las migraciones **202** (`user_symptoms`) y **203** (`user_master_quiz` +
vista `user_phenotype`) se aplicaron por **SQL Editor**, no por el CLI. Resultado:

- Las **tablas SÍ existen** en el remoto (verificado: `user_master_quiz`,
  `user_prescribed_interventions`, vista `user_phenotype` → todas presentes).
- Pero el **historial de migraciones** (`supabase_migrations.schema_migrations`)
  llega solo hasta **201**. Le faltan los registros de 202 y 203.

Si no se arregla, el próximo `supabase db push` intentará **re-aplicar** 202 y 203
→ error `already exists` (son idempotentes en su mayoría, pero el historial
desalineado provoca ruido y puede bloquear pushes futuros).

## El fix (documentado — correr cuando la conexión CLI esté sana)

`migration repair` NO toca el esquema: solo escribe en la tabla de historial que
esas versiones ya están aplicadas.

```bash
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
supabase migration repair --status applied 202 203
```

Verificar que quedó alineado:

```bash
supabase migration list
# Local y Remote deben coincidir hasta 203, sin huecos en 202/203.
```

> **Nota:** el brief original pedía reparar solo la 203. Al inspeccionar el
> historial remoto se encontró que **202 también falta** (misma causa: se aplicó
> por SQL Editor). Por eso el repair incluye ambas.

## Si la conexión CLI sigue mal (no bloquear el launch)

El repair es **cosmético para el historial** — no afecta el runtime de la app
(las tablas ya existen y funcionan). Si el CLI no conecta el día del launch:

1. **NO bloquea la beta.** La app corre igual; esto solo importa para el próximo
   `db push` de una migración nueva (204+).
2. Alternativa vía SQL directo (SQL Editor / MCP `execute_sql`), equivalente a lo
   que hace `migration repair`:

   ```sql
   INSERT INTO supabase_migrations.schema_migrations (version, name)
   VALUES ('202', 'user_symptoms'), ('203', 'user_master_quiz')
   ON CONFLICT (version) DO NOTHING;
   ```

   (Idempotente: re-correr no duplica.)

3. Dejar registrado que se hizo por SQL para que el siguiente `db push` no choque.

## Estado — ✅ HECHO (2026-07-16)

La conexión CLI **sí funcionó**. Ejecutado:

```
$ supabase migration repair --status applied 202 203
Initialising login role...
Connecting to remote database...
Repaired migration history: [202 203] => applied
Finished supabase migration repair.
```

Verificado en `supabase_migrations.schema_migrations`:

| version | name |
|---|---|
| 201 | user_prescribed_interventions |
| 202 | user_symptoms |
| 203 | user_master_quiz |

- [x] `supabase migration repair --status applied 202 203` corrido ✅
- [x] Historial remoto alineado hasta 203 (sin huecos) ✅
- [x] El próximo `db push` (204+) ya no chocará con 202/203 ✅

> El fallback SQL de la sección anterior queda documentado **por si acaso**, pero
> NO fue necesario.

**Relacionado:** `07_RUNBOOK_LAUNCH_DAY_v2_2026-07-13.md` (invariante de pre-flight).
