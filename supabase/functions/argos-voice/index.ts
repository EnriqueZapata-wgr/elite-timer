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
 * Secrets requeridos (Supabase → Edge Function secrets):
 *   ELEVENLABS_API_KEY, ELEVENLABS_VOICE_MASCULINA, ELEVENLABS_VOICE_FEMENINA, GEMINI_API_KEY
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Modelo ElevenLabs de baja latencia con soporte multilingüe (español MX).
const ELEVENLABS_MODEL = "eleven_flash_v2_5";
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";
// Gemini para STT (audio-input). Flash = rápido y barato.
const GEMINI_STT_MODEL = "gemini-2.5-flash";

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
    const detail = await resp.text().catch(() => "");
    return json({ error: "tts_failed", status: resp.status, detail: detail.slice(0, 200), fallback: "text" }, 502);
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
    const detail = await resp.text().catch(() => "");
    return json({ error: "stt_failed", status: resp.status, detail: detail.slice(0, 200) }, 502);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("").trim() ?? "";
  return json({ text });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  try {
    if (body.action === "tts") return await handleTts(body);
    if (body.action === "stt") return await handleStt(body);
    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    return json({ error: "internal", detail: String(e).slice(0, 200), fallback: "text" }, 500);
  }
});
