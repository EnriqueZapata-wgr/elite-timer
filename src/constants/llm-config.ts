/**
 * LLM Config — Configuración centralizada de modelos LLM.
 * Cambiar aquí afecta toda la app.
 */
export const ATP_LLM = {
  PRIMARY_MODEL: 'claude-sonnet-4-6',
  PRIMARY_PROVIDER: 'anthropic' as const,
  FALLBACK_MODEL: 'gemini-2.5-flash',
  FALLBACK_PROVIDER: 'google' as const,
  MAX_TOKENS_DEFAULT: 4000,
  MAX_TOKENS_ESTIMATE: 2000,
  // Timeout del CLIENTE — debe ser mayor que el peor caso del Edge Function
  // (Anthropic 58s + Gemini 25s + overhead) para que no aborte una respuesta
  // válida ni cancele un fallback en curso. 90s da margen real.
  TIMEOUT_MS: 90000,
} as const;
