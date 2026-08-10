/**
 * HomeIcon (19.1 · 1.2) — LA casita. Un solo glifo y un solo color para todas
 * las superficies que la pintan (flotante, chips de header, top bars).
 *
 * Decisión: `home-outline` en TEXT.primary. El lima es acento (máx 1-2 por
 * vista, regla de marca) y la casita no es el dato heroico de ninguna
 * pantalla. Si mañana cambia el glifo o el color, se cambia AQUÍ y en ningún
 * otro lado: un `<Ionicons name="home*">` suelto fuera de este archivo es
 * regresión (lo vigila home-icon-census.test.ts).
 */
import { Ionicons } from '@expo/vector-icons';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export function HomeIcon({ size = 20 }: { size?: number }) {
  // MB-31A: hereda el color del texto del scope (monocromo, cap. 5 del manual).
  const t = useSurfaceTokens();
  return <Ionicons name="home-outline" size={size} color={t.texto} />;
}

export default HomeIcon;
