/**
 * probar-ruteo.mjs: prueba de humo del ruteo de modelos de argos-proxy
 * (21-sep-2026), DESPUES de `npx supabase functions deploy argos-proxy`.
 *
 * Manda cuatro peticiones minimas (una por clase, y la foto) y dice que modelo
 * contesto. Cuesta centavos. Con tu JWT (scripts/elite/obtener-jwt.md):
 *
 *   $env:ATP_JWT = "<tu JWT>"
 *   node scripts/probar-ruteo.mjs
 *
 * Esperado:
 *   nav_intent           gemini-3.5-flash-lite   (principal)
 *   food_estimate_text   gemini-3.8-flash        (principal)
 *   food_estimate_photo  gemini-3.8-flash        (principal; la foto SI llega)
 *   chat                 claude-sonnet-5         (principal)
 * "respaldo" en vez de "principal" = el principal fallo y contesto el otro
 * proveedor: funciona, pero mira argos_logs.error_message.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL_BASE = process.env.SUPABASE_URL || 'https://itqkfozqvpwikogggqng.supabase.co';
let anon = process.env.SUPABASE_ANON_KEY || '';
if (!anon) {
  try {
    const env = fs.readFileSync(path.join(RAIZ, '.env'), 'utf8');
    const m = env.match(/^EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)$/m);
    if (m) anon = m[1].trim().replace(/^["']|["']$/g, '');
  } catch { /* sin .env */ }
}
const jwt = process.env.ATP_JWT || '';
if (!anon) { console.error('Falta SUPABASE_ANON_KEY (o EXPO_PUBLIC_SUPABASE_ANON_KEY en .env).'); process.exit(2); }
if (!jwt) { console.error('Falta ATP_JWT. Ver scripts/elite/obtener-jwt.md'); process.exit(2); }

// Cuadro rojo de 8x8: basta para confirmar que la imagen viaja hasta Gemini.
const PNG_ROJO = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGO4o6GBFTEMLQkAe3tLAfuiUfAAAAAASUVORK5CYII=';

const CASOS = [
  { tipo: 'nav_intent', esperado: 'gemini-3.5-flash-lite', max_tokens: 60,
    messages: [{ role: 'user', content: 'Responde solo con la palabra: ajustes' }] },
  { tipo: 'food_estimate_text', esperado: 'gemini-3.8-flash', max_tokens: 200,
    messages: [{ role: 'user', content: 'Una manzana mediana. Responde solo con un JSON {"kcal": numero}.' }] },
  { tipo: 'food_estimate_photo', esperado: 'gemini-3.8-flash', max_tokens: 60,
    messages: [{ role: 'user', content: [
      { type: 'text', text: 'Responde con una sola palabra: de que color es esta imagen?' },
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: PNG_ROJO } },
    ] }] },
  { tipo: 'chat', esperado: 'claude-sonnet-5', max_tokens: 30,
    messages: [{ role: 'user', content: 'Prueba tecnica del equipo. Responde solo: ok' }] },
];

let fallas = 0;
for (const c of CASOS) {
  const t0 = Date.now();
  let linea;
  try {
    const r = await fetch(`${URL_BASE}/functions/v1/argos-proxy`, {
      method: 'POST',
      headers: { apikey: anon, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: c.tipo, messages: c.messages, max_tokens: c.max_tokens }),
    });
    const d = await r.json().catch(() => ({}));
    const texto = (d?.content?.[0]?.text ?? d?.error?.message ?? JSON.stringify(d)).toString().replace(/\s+/g, ' ').slice(0, 60);
    // Anthropic puede devolver el id con fecha (claude-sonnet-5-2026...): se compara por prefijo.
    const esElEsperado = typeof d?.model === 'string' && d.model.startsWith(c.esperado);
    const rol = d?._degraded ? 'DEGRADADO' : d?._fallback || !esElEsperado ? 'respaldo' : 'principal';
    if (!r.ok || d?._degraded || !esElEsperado) fallas++;
    linea = `${c.tipo.padEnd(20)} ${String(d?.model ?? 'sin modelo').padEnd(26)} ${rol.padEnd(10)} ${String(Date.now() - t0).padStart(6)} ms  HTTP ${r.status}  "${texto}"`;
  } catch (e) {
    fallas++;
    linea = `${c.tipo.padEnd(20)} ERROR ${e?.message || e}`;
  }
  console.log(linea);
}
console.log(fallas === 0 ? '\nTodo contesto con su principal.' : `\n${fallas} caso(s) no contestaron con el principal esperado. Pegame esta salida.`);
process.exitCode = fallas === 0 ? 0 : 1;
