/**
 * Sintetizador sonidos Edad ATP v2 (#139) — spec FABLE_SPRINT_TESTING_FIXES opción A.
 * tick: sine 4kHz ADSR 2/30/0/5 ms — "premium click" tipo Apple Watch
 * chime: C6+E6+G6 ADSR 5/400/0/50 ms + reverb sutil — copa de cristal
 * improve: C5→G5 espaciadas 150ms, ADSR 10/300/0.3/100 ms — logro adulto
 */
const fs = require('fs');
const path = require('path');

const SR = 44100;
const OUT = process.argv[2] || '.';

function writeWav(filename, samples) {
  // normaliza a pico 0.85 para headroom sin clip
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const gain = peak > 0 ? 0.85 / peak : 1;
  const n = samples.length;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i] * gain)) * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);          // PCM chunk size
  header.writeUInt16LE(1, 20);           // PCM
  header.writeUInt16LE(1, 22);           // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);      // byte rate
  header.writeUInt16LE(2, 32);           // block align
  header.writeUInt16LE(16, 34);          // bits
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, filename), Buffer.concat([header, data]));
  console.log(`${filename}: ${(data.length + 44)} bytes, ${(n / SR * 1000).toFixed(0)}ms`);
}

const ms = (x) => Math.round((x / 1000) * SR);

/**
 * Envolvente ADSR con decay/release exponenciales (suenan más "físicos"
 * que lineales — cristal/metal decaen exponencialmente).
 */
function adsr(i, { attack, decay, sustainLevel, sustainMs = 0, release }) {
  const a = ms(attack), d = ms(decay), s = ms(sustainMs), r = ms(release);
  if (i < a) return i / a;
  if (i < a + d) {
    const t = (i - a) / d; // 1 → sustainLevel, curva exponencial
    return sustainLevel + (1 - sustainLevel) * Math.exp(-5 * t);
  }
  if (i < a + d + s) return sustainLevel;
  if (i < a + d + s + r) {
    const t = (i - a - d - s) / r;
    return sustainLevel * Math.exp(-5 * t);
  }
  return 0;
}

function totalLen(env) {
  return ms(env.attack) + ms(env.decay) + ms(env.sustainMs || 0) + ms(env.release);
}

// ── TICK: sine 4kHz, ADSR 2/30/0/5 — click premium ──
{
  const env = { attack: 2, decay: 30, sustainLevel: 0, release: 5 };
  const n = totalLen(env);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = Math.sin(2 * Math.PI * 4000 * i / SR) * adsr(i, env);
  }
  writeWav('tick.wav', out);
}

// ── CHIME: C6+E6+G6, ADSR 5/400/0/50 + reverb sutil — copa de cristal ──
{
  const env = { attack: 5, decay: 400, sustainLevel: 0, release: 50 };
  const noteLen = totalLen(env);
  const tailMs = 350; // espacio para las colas del reverb
  const n = noteLen + ms(tailMs);
  const dry = new Float64Array(n);
  const freqs = [1046.50, 1318.51, 1567.98]; // C6, E6, G6
  const amps = [1.0, 0.75, 0.6];             // el acorde respira, no es un muro
  for (let i = 0; i < noteLen; i++) {
    let v = 0;
    for (let k = 0; k < freqs.length; k++) {
      v += amps[k] * Math.sin(2 * Math.PI * freqs[k] * i / SR);
    }
    dry[i] = v * adsr(i, env);
  }
  // Reverb sutil: 3 taps de delay decayente (60/125/195 ms)
  const out = new Float64Array(n);
  const taps = [[60, 0.28], [125, 0.16], [195, 0.09]];
  for (let i = 0; i < n; i++) {
    let v = dry[i];
    for (const [delayMs, g] of taps) {
      const j = i - ms(delayMs);
      if (j >= 0) v += dry[j] * g;
    }
    out[i] = v;
  }
  writeWav('chime.wav', out);
}

// ── IMPROVE: C5→G5 con 150ms de espacio, ADSR 10/300/0.3(80ms)/100 — logro ──
{
  const env = { attack: 10, decay: 300, sustainLevel: 0.3, sustainMs: 80, release: 100 };
  const noteLen = totalLen(env);
  const offset2 = ms(150);
  const n = offset2 + noteLen;
  const out = new Float64Array(n);
  const notes = [[523.25, 0], [783.99, offset2]]; // C5, G5
  for (const [freq, start] of notes) {
    for (let i = 0; i < noteLen; i++) {
      const idx = start + i;
      if (idx >= n) break;
      // fundamental + 2º armónico suave: cuerpo sin perder lo senoidal
      const v = Math.sin(2 * Math.PI * freq * i / SR)
        + 0.18 * Math.sin(2 * Math.PI * freq * 2 * i / SR);
      out[idx] += v * adsr(i, env) * 0.85;
    }
  }
  writeWav('improve.wav', out);
}
