// Banco de pruebas de la jerarquía de fuentes (migraciones 344 y 345) en un
// Postgres en memoria (PGlite). No toca ninguna base real.
// Cómo correrlo, desde la raíz del repo:
//   npm i --no-save @electric-sql/pglite@0.2.17
//   node scripts/banco-jerarquia/run.mjs
// base.sql imita el esquema de producción de sleep_nights y health_os_daily
// (antes de la 344) y los roles de Supabase. Resultado esperado: 23 pasaron, 0 fallaron.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const db = new PGlite();
const U1 = '00000000-0000-0000-0000-000000000001';
let fallas = 0, ok = 0;
const q = (s, p) => db.query(s, p);
const ex = (s) => db.exec(s);
async function como(rol, fn) {
  await ex(`set role ${rol}`);
  if (rol === 'authenticated') await ex(`select set_config('request.jwt.claim.sub', '${U1}', false)`);
  else await ex(`select set_config('request.jwt.claim.sub', '', false)`);
  try { return await fn(); } finally { await ex('reset role'); }
}
function check(nombre, cond, info) { if (cond) { ok++; console.log('  ok   ', nombre); } else { fallas++; console.log('  FALLA', nombre, info ?? ''); } }
process.on('unhandledRejection', e => { console.log('ERROR:', e.message, e.where ?? ''); process.exit(2); });
const hod = async (d) => (await q(`select * from public.health_os_daily where user_id=$1 and date=$2`, [U1, d])).rows[0];
const sn = async (d) => (await q(`select * from public.sleep_nights where user_id=$1 and night_date=$2`, [U1, d])).rows[0];
const upHod = (src, d, cols) => {
  const k = Object.keys(cols);
  return q(`insert into public.health_os_daily (user_id, date, source, ${k.join(',')}) values ($1,$2,$3,${k.map((_, i) => '$' + (i + 4)).join(',')})
            on conflict (user_id, date) do update set source = excluded.source, ${k.map(c => `${c} = excluded.${c}`).join(',')}`, [U1, d, src, ...Object.values(cols)]);
};
const upSn = (src, d, cols) => {
  const k = Object.keys(cols);
  return q(`insert into public.sleep_nights (user_id, night_date, source, ${k.join(',')}) values ($1,$2,$3,${k.map((_, i) => '$' + (i + 4)).join(',')})
            on conflict (user_id, night_date) do update set source = excluded.source, ${k.map(c => `${c} = excluded.${c}`).join(',')}`, [U1, d, src, ...Object.values(cols)]);
};

await ex(readFileSync('scripts/banco-jerarquia/base.sql', 'utf8'));
await ex(readFileSync('supabase/migrations/344_wearables_conexion.sql', 'utf8'));
console.log('344 aplicada');
await ex(readFileSync('supabase/migrations/345_jerarquia_por_dato.sql', 'utf8'));
await ex(readFileSync('supabase/migrations/345_jerarquia_por_dato.sql', 'utf8'));
console.log('345 aplicada dos veces');

check('backfill: noche vieja de sleep_cycle marcada por campo', (await sn('2026-10-01')).field_sources.duration_minutes === 'sleep_cycle');
check('orden por dato sembrado', (await q(`select count(*)::int n from public.health_source_field_priority`)).rows[0].n > 100);

// HRV: Garmin llega primero, luego Oura (gana), luego Garmin otra vez (no pisa)
await como('service_role', async () => {
  await upHod('garmin', '2026-10-05', { hrv_ms: 60 });
  await upHod('oura', '2026-10-05', { hrv_ms: 50 });
  await upHod('garmin', '2026-10-05', { hrv_ms: 61 });
});
let r = await hod('2026-10-05');
check('HRV: Oura manda sobre Garmin', r.hrv_ms === 50 && r.field_sources.hrv_ms === 'oura', JSON.stringify(r.field_sources) + ' ' + r.hrv_ms);

// FC en reposo: Garmin primero, Polar después. En la 344 empataban (se quedaba Garmin); ahora gana Polar.
await como('service_role', async () => {
  await upHod('garmin', '2026-10-06', { resting_hr: 55 });
  await upHod('polar', '2026-10-06', { resting_hr: 52 });
});
r = await hod('2026-10-06');
check('FC reposo: Polar gana a Garmin (antes empataban)', r.resting_hr === 52 && r.field_sources.resting_hr === 'polar', JSON.stringify(r));

// Respiración: Oura primero, WHOOP después -> WHOOP gana (orden por dato distinto al general)
await como('service_role', async () => {
  await upHod('oura', '2026-10-06', { breath_rate: 14.0 });
  await upHod('whoop', '2026-10-06', { breath_rate: 15.0 });
});
r = await hod('2026-10-06');
check('Respiración: WHOOP gana a Oura (por dato)', Number(r.breath_rate) === 15 && r.field_sources.breath_rate === 'whoop', JSON.stringify(r.field_sources));
check('fila con varias fuentes queda mixto', r.source === 'mixto');

// Pasos: el teléfono (HC) primero, Oura después (gana), Garmin al final (gana), WHOOP no entra
await como('authenticated', () => upHod('health_connect', '2026-10-07', { steps: 8000 }));
await como('service_role', async () => {
  await upHod('oura', '2026-10-07', { steps: 9500 });
  await upHod('whoop', '2026-10-07', { steps: 7000 });
});
r = await hod('2026-10-07');
check('Pasos: Oura gana al teléfono; WHOOP (fuera de la lista) no pisa', r.steps === 9500 && r.field_sources.steps === 'oura', JSON.stringify(r));
await como('service_role', () => upHod('garmin', '2026-10-07', { steps: 9100 }));
r = await hod('2026-10-07');
check('Pasos: Garmin gana a Oura', r.steps === 9100 && r.field_sources.steps === 'garmin');
await como('authenticated', () => upHod('health_connect', '2026-10-07', { steps: 8200 }));
r = await hod('2026-10-07');
check('Pasos: el teléfono vuelve a sincronizar y no pisa a Garmin', r.steps === 9100);

// Respaldo: un día sin Oura, Garmin es el dato
await como('service_role', () => upHod('garmin', '2026-10-08', { hrv_ms: 58 }));
check('Respaldo: sin Oura ese día, entra Garmin', (await hod('2026-10-08')).hrv_ms === 58);

// Sueño: la persona usa el Sueño de ATP (cliente) y luego llega Oura
await como('authenticated', () => upSn('sleep_cycle', '2026-10-09', { bed_time: '2026-10-08 23:00-06', wake_time: '2026-10-09 07:00-06', duration_minutes: 470, score: 70 }));
await como('service_role', () => upSn('oura', '2026-10-09', { bed_time: '2026-10-08 23:20-06', wake_time: '2026-10-09 06:50-06', duration_minutes: 420, deep_min: 80 }));
r = await sn('2026-10-09');
check('Sueño: minutos de Oura, horas del Sueño de ATP, etapas de Oura',
  r.duration_minutes === 420 && r.field_sources.duration_minutes === 'oura'
  && r.field_sources.bed_time === 'sleep_cycle' && r.field_sources.wake_time === 'sleep_cycle' && r.deep_min === 80,
  JSON.stringify(r.field_sources));
// Orden inverso: Oura primero, después el Sueño de ATP
await como('service_role', () => upSn('oura', '2026-10-10', { bed_time: '2026-10-09 23:20-06', duration_minutes: 400 }));
await como('authenticated', () => upSn('sleep_cycle', '2026-10-10', { bed_time: '2026-10-09 23:00-06', duration_minutes: 460 }));
r = await sn('2026-10-10');
check('Sueño (orden inverso): igual resultado', r.duration_minutes === 400 && r.field_sources.bed_time === 'sleep_cycle', JSON.stringify(r.field_sources));
check('el score de la sesión propia sigue con el orden general', (await sn('2026-10-09')).field_sources.score === 'sleep_cycle');

// Purga de Oura: cada dato regresa a la mejor fuente que quede, POR DATO
await como('service_role', () => q(`select public.purge_wearable_source($1, 'oura')`, [U1]));
r = await hod('2026-10-05');
check('Purga Oura: HRV regresa a Garmin', r.hrv_ms === 61 && r.field_sources.hrv_ms === 'garmin', JSON.stringify(r));
r = await sn('2026-10-09');
check('Purga Oura: minutos regresan al Sueño de ATP', r.duration_minutes === 470 && r.field_sources.duration_minutes === 'sleep_cycle', JSON.stringify(r));
r = await hod('2026-10-06');
check('Purga Oura: respiración de WHOOP no se toca', Number(r.breath_rate) === 15);

// El teléfono no puede hacerse pasar por una marca
let err = null;
try { await como('authenticated', () => upHod('oura', '2026-10-11', { hrv_ms: 40 })); } catch (e) { err = e.message; }
check('El teléfono no puede escribir como Oura', err && /Solo el servidor/.test(err), err);

// Un vacío no borra
await como('service_role', async () => { await upHod('oura', '2026-10-12', { hrv_ms: 50 }); await upHod('garmin', '2026-10-12', { hrv_ms: 60 }); await upHod('garmin', '2026-10-12', { hrv_ms: null }); });
check('Un null de Garmin no borra el HRV de Oura', (await hod('2026-10-12')).hrv_ms === 50);
await como('service_role', async () => { await upHod('garmin', '2026-10-13', { hrv_ms: 60 }); await upHod('oura', '2026-10-13', { hrv_ms: 50 }); await upHod('oura', '2026-10-13', { hrv_ms: null }); });
r = await hod('2026-10-13');
check('Oura borra lo suyo: regresa Garmin', r.hrv_ms === 60 && r.field_sources.hrv_ms === 'garmin', JSON.stringify(r.field_sources));

// Exclusiones (regla 5): SpO2 de Polar y pasos/temperatura de WHOOP no entran ni como respaldo
await como('service_role', async () => { await upHod('polar', '2026-10-14', { spo2_pct: 93 }); await upHod('whoop', '2026-10-14', { steps: 12000, temp_deviation_c: 0.4 }); });
r = await hod('2026-10-14');
check('Excluidos no son el dato del día', r == null || (r.spo2_pct == null && r.steps == null && r.temp_deviation_c == null), JSON.stringify(r));

// Desempate general (regla 6): readiness Garmin vs Polar, mismo ganador sin importar el orden de llegada
await como('service_role', async () => {
  await upHod('garmin', '2026-10-21', { readiness_score: 70 }); await upHod('polar', '2026-10-21', { readiness_score: 80 });
  await upHod('polar', '2026-10-22', { readiness_score: 80 }); await upHod('garmin', '2026-10-22', { readiness_score: 70 });
});
check('Garmin gana a Polar en datos sin orden propio, llegue quien llegue primero',
  (await hod('2026-10-21')).readiness_score === 70 && (await hod('2026-10-22')).readiness_score === 70);

// Permisos (consulta del Paso 1 de 04_OURA)
const p = (await q(`select bool_or(has_table_privilege(r, t, 'INSERT')) ins from unnest(array['public.wearable_tokens','public.wearable_oauth_states','public.wearable_webhook_events','public.wearable_connections','public.wearable_records','private.health_source_values','public.health_source_field_priority']) t, unnest(array['anon','authenticated']) r`)).rows[0];
check('Nadie del cliente puede insertar en tablas protegidas (incluye la nueva)', p.ins === false);
const a = (await q(`select has_table_privilege('anon','public.health_source_field_priority','SELECT') s`)).rows[0];
check('anon no lee el orden por dato', a.s === false);

console.log(`\n${ok} pasaron, ${fallas} fallaron`);
process.exit(fallas ? 1 : 0);
