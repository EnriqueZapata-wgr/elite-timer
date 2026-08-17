/**
 * Tokens del stack de auth — un solo lugar donde se consulta la bandera.
 *
 * Las pantallas de auth (login, register, forgot-password) NO pueden usar
 * `useSurfaceTokens`: el <ThemeReady> lo abre AuthScreen, que es su HIJO, así
 * que a la altura del componente de pantalla ese scope todavía no existe y
 * `useSurfaceTokens` entregaría el oscuro perpetuo. Estas pantallas poseen su
 * superficie completa, que es justo el caso de `useAppTheme`.
 *
 * La bandera se lee aquí y solo aquí para que apagarla devuelva las cuatro
 * superficies a la vez y no queden inputs claros sobre un gradiente negro.
 */
import { useAppTheme } from '@/src/contexts/theme-context';
import { THEME_DARK, type AppThemeTokens } from '@/src/constants/brand';
import { AUTH_RESPETA_EL_TEMA } from '@/src/constants/flags';

export function useAuthTheme(): AppThemeTokens {
  const { tokens } = useAppTheme();
  return AUTH_RESPETA_EL_TEMA ? tokens : THEME_DARK;
}

/**
 * El acento del stack de auth. El teal de marca (#1ABC9C) tiene 2.06 de
 * contraste en claro: como LETRA es ilegible, y en auth es color de etiquetas
 * y de links. En claro se calibra a `tealTexto`; en oscuro es el de siempre.
 */
export function acentoAuth(t: AppThemeTokens): string {
  return t.tealTexto;
}
