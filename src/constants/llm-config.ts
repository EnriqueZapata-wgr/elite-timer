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
  TIMEOUT_MS: 8000,
} as const;
