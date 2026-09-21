/**
 * LLM Config: configuración de modelos del lado del cliente.
 * 21-sep-2026: QUÉ modelo contesta ya no se decide aquí sino en el servidor
 * (supabase/functions/_shared/ruteo-modelos.ts, por tipo de petición). El
 * modelo que manda el cliente solo cuenta con el ruteo apagado
 * (MODEL_ROUTING=off en argos-proxy).
 */
export const ATP_LLM = {
  PRIMARY_MODEL: 'claude-sonnet-5', // 2026-07-06: upgrade desde claude-sonnet-4-6 (cost-neutral, mejor razonamiento clínico)
  PRIMARY_PROVIDER: 'anthropic' as const,
  FALLBACK_MODEL: 'gemini-2.5-flash',
  FALLBACK_PROVIDER: 'google' as const,
  MAX_TOKENS_DEFAULT: 4000,
  MAX_TOKENS_ESTIMATE: 2000,
  // Timeout del CLIENTE: debe ser mayor que el peor caso del Edge Function
  // para que no aborte una respuesta válida ni cancele un respaldo en curso.
  // 21-sep-2026: el proxy corta a los 110 s (ruteo-modelos.ts, LIMITE_TOTAL_MS;
  // principal 58 s + respaldo 30 s + overhead en el peor caso real), así que
  // el cliente espera 120 s. Antes 90 s.
  TIMEOUT_MS: 120000,
} as const;
