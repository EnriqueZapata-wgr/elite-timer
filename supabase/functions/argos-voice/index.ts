/**
 * argos-voice — edge function de VOZ de ARGOS (MB-4 J5).
 *
 * Dos acciones:
 *   · action: 'tts'  → texto + voz (masculina/femenina) → audio (ElevenLabs, base64 mp3)
 *   · action: 'stt'  → audio base64 → texto (Gemini audio-input · JAMÁS OpenAI/Whisper)
 *
 * Doctrina dura:
 *   - Voice IDs y API keys SOLO aquí (Deno.env), NUNCA en el bundle del cliente.
 *   - STT = Gemini (feedback_no_openai_preferencia). Sin OpenAI en ninguna capa.
 *   - TTS = modelo de BAJA LATENCIA (Flash) — el <2s manda sobre la máxima fidelidad.
 *   - Fallback: si ElevenLabs falla/sin key → 503 con {fallback:'text'}; el cliente
 *     degrada a texto, nunca a una voz robótica del sistema.
 *
 * Seguridad (fix B1 auditoría pre-merge MB-4):
 *   - Auth REAL: getUser() del JWT entrante — la anon key sola NO pasa (401).
 *   - Rate limit per-user diario (conteo en argos_logs, mismo reset UTC del proxy).
 *   - Cobro H+ server-side de TTS/STT (voice_tts / voice_stt, gated por
 *     LAB_ECONOMY_ENABLED — mismo flag que argos-proxy). TTS/STT nunca gratis
 *     con economía ON; refund si el provider falla.
 *   - Telemetría: cada llamada TTS/STT se loguea en argos_logs con costo estimado
 *     (antes la voz solo instrumentaba el tramo LLM).
 *
 * Secrets requeridos (Supabase → Edge Function secrets):
 *   ELEVENLABS_API_KEY, ELEVENLABS_VOICE_MASCULINA, ELEVENLABS_VOICE_FEMENINA, GEMINI_API_KEY
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Modelo ElevenLabs de baja latencia con soporte multilingüe (español MX).
const ELEVENLABS_MODEL = "eleven_flash_v2_5";
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";
// Gemini para STT (audio-input). Flash = rápido y barato.
const GEMINI_STT_MODEL = "gemini-2.5-flash";

// PREMIUM (16-ago-2026): aquí vivían STT_DAILY_LIMIT (200), TTS_DAILY_LIMIT
// (1200) y DEFAULT_HPLUS_COST. Se fueron con el cobro y el corte por cuota.
// El techo antiabuso del producto vive en argos-proxy y es uno solo; poner
// otro aquí sería volver a repartir el acceso por la puerta de atrás.

// Estimados USD para telemetría (argos_logs.estimated_cost_usd). Aproximados:
// ElevenLabs Flash v2.5 ≈ 0.5 créditos/char; Gemini audio-input ≈ 32 tok/s.
const TTS_USD_PER_CHAR = 0.00011;
const STT_USD_PER_SEC = 0.000032;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Voz seleccionada → voice ID de ElevenLabs (de env, nunca hardcoded). */
function voiceIdFor(voice: string): string | null {
  const v = (voice ?? "").toLowerCase();
  if (v === "femenina") return Deno.env.get("ELEVENLABS_VOICE_FEMENINA") ?? null;
  // default masculina (ARGOS es nombre masculino) — el sexo del user NO decide la voz.
  return Deno.env.get("ELEVENLABS_VOICE_MASCULINA") ?? null;
}

/** Uint8Array → base64 (chunked para no reventar el stack con audios grandes). */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function handleTts(body: any): Promise<Response> {
  const text = String(body.text ?? "").trim();
  if (!text) return json({ error: "empty_text" }, 400);

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  const voiceId = voiceIdFor(body.voice);
  if (!apiKey || !voiceId) {
    // Sin config de voz → el cliente degrada a texto (nunca voz mala).
    return json({ error: "voice_unavailable", fallback: "text" }, 503);
  }

  const resp = await fetch(`${ELEVENLABS_BASE}/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "accept": "audio/mpeg",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL,
      // Mentor cálido con autoridad: estabilidad media, similarity alta, sin exagerar estilo.
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
    }),
  });

  if (!resp.ok) {
    // El detail del provider va a logs, NO al cliente (re-auditoría: podría
    // ecoar URLs con key en query string; al cliente no le sirve de nada).
    const detail = await resp.text().catch(() => "");
    console.error("tts provider failed:", resp.status, detail.slice(0, 300));
    return json({ error: "tts_failed", status: resp.status, fallback: "text" }, 502);
  }

  const audio = new Uint8Array(await resp.arrayBuffer());
  return json({ audio_base64: toBase64(audio), mime: "audio/mpeg" });
}

async function handleStt(body: any): Promise<Response> {
  const audioBase64 = String(body.audio_base64 ?? "");
  const mime = String(body.mime ?? "audio/mp4");
  if (!audioBase64) return json({ error: "empty_audio" }, 400);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "stt_unavailable" }, 503);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_STT_MODEL}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mime, data: audioBase64 } },
          { text: "Transcribe este audio literalmente en español de México. Devuelve SOLO la transcripción, sin comillas ni comentarios." },
        ],
      }],
      generationConfig: { temperature: 0 },
    }),
  });

  if (!resp.ok) {
    // Detail a logs, no al cliente (la URL de Gemini lleva la key en query).
    const detail = await resp.text().catch(() => "");
    console.error("stt provider failed:", resp.status, detail.slice(0, 300));
    return json({ error: "stt_failed", status: resp.status }, 502);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("").trim() ?? "";
  return json({ text });
}

/** Telemetría de voz en argos_logs (B1.3): la voz por fin instrumenta su costo real. */
async function logVoiceCall(supabase: any, params: {
  user_id: string;
  request_type: "voice_tts" | "voice_stt";
  provider: string;
  model: string;
  chars: number;
  latency_ms: number;
  success: boolean;
  error_message?: string;
  estimated_cost_usd: number;
}) {
  try {
    await supabase.from("argos_logs").insert({
      user_id: params.user_id,
      tier: "unknown",
      provider: params.provider,
      model: params.model,
      request_type: params.request_type,
      // Convención voz: input_tokens ≈ chars de texto (TTS) / bytes÷1000 de audio (STT).
      input_tokens: params.chars,
      latency_ms: params.latency_ms,
      success: params.success,
      error_message: params.error_message,
      estimated_cost_usd: params.estimated_cost_usd,
    });
  } catch (e) {
    console.error("argos_logs voice insert failed:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const action = body.action === "tts" || body.action === "stt" ? body.action : null;
  if (!action) return json({ error: "unknown_action" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ─── B1.1: auth REAL del user. La anon key es un JWT válido pero getUser() con
  // ella NO devuelve user → 401. Sin user no hay TTS/STT (la función estaba abierta
  // al mundo: cualquiera con la anon key del bundle quemaba ElevenLabs/Gemini).
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  let userId: string | null = null;
  if (jwt) {
    try {
      const { data, error } = await supabase.auth.getUser(jwt);
      if (!error && data?.user?.id) userId = data.user.id;
    } catch (_) { /* userId queda null → 401 */ }
  }
  if (!userId) return json({ error: "unauthorized" }, 401);

  const requestType = action === "tts" ? "voice_tts" as const : "voice_stt" as const;
  const startTime = Date.now();

  // PREMIUM (16-ago-2026): aquí había dos muros y se fueron los dos.
  //
  // 1) El corte diario por conteo (200 STT / 1200 TTS) devolvía un 429 y
  //    empujaba a texto. Ya no corta: hablarle a ARGOS viene con la membresía.
  // 2) El cobro en H+ (5 por TTS, 15 por STT) con su 402 y su reembolso.
  //    Los protones dejaron de existir; spend_protons y award_protons siguen
  //    en la base con todo el historial, simplemente ya no se llaman.
  //
  // Lo que SÍ se queda es logVoiceCall más abajo, con caracteres, latencia y
  // costo estimado por llamada. Sin esa medición no hay forma de decidir los
  // límites suaves que vienen después (bajar el nivel de modelo, nunca cortar),
  // y la voz es la interacción más cara del producto.

  try {
    const resp = action === "tts" ? await handleTts(body) : await handleStt(body);

    // Un STT 200 con transcripción vacía (silencio o ruido) se sigue
    // detectando: ya no para un cobro, pero marca la llamada como fallida en
    // la telemetría, que es de donde sale el costo real por turno de voz.
    let sttEmpty = false;
    if (action === "stt" && resp.ok) {
      try {
        sttEmpty = !String((await resp.clone().json())?.text ?? "").trim();
      } catch { /* body ilegible → tratar como éxito normal */ }
    }

    const chars = action === "tts"
      ? String(body.text ?? "").length
      : Math.round(String(body.audio_base64 ?? "").length / 1000);
    const estUsd = !resp.ok ? 0 : action === "tts"
      ? chars * TTS_USD_PER_CHAR
      // bytes ≈ base64_len·3/4; AAC ~8KB/s → segundos ≈ bytes/8000.
      : (String(body.audio_base64 ?? "").length * 0.75 / 8000) * STT_USD_PER_SEC;
    await logVoiceCall(supabase, {
      user_id: userId,
      request_type: requestType,
      provider: action === "tts" ? "elevenlabs" : "google",
      model: action === "tts" ? ELEVENLABS_MODEL : GEMINI_STT_MODEL,
      chars,
      latency_ms: Date.now() - startTime,
      success: resp.ok,
      error_message: !resp.ok ? `status_${resp.status}` : sttEmpty ? "empty_transcript" : undefined,
      estimated_cost_usd: Math.round(estUsd * 1e6) / 1e6,
    });

    return resp;
  } catch (e) {
    return json({ error: "internal", detail: String(e).slice(0, 200), fallback: "text" }, 500);
  }
});
