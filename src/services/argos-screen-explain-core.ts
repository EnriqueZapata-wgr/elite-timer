/**
 * ARGOS Explica la pantalla — lógica pura (NOCHE-ARGOS Pieza 2).
 *
 * "¿Qué hace esta pantalla?" es la segunda mitad del problema de navegación: no
 * basta con llevarte, ARGOS tiene que saber dónde estás parado y para qué sirve
 * lo que ves.
 *
 * LA MATERIA PRIMA Y SU TRAMPA: las 192 descripciones de app-routes.generated
 * se cosecharon de los docblocks de cada archivo. Están escritas por y para
 * quien programa: traen códigos de ticket, nombres de archivo, notas de
 * arquitectura y decisiones de implementación. Son excelente CONTEXTO para el
 * modelo y pésimo COPY para el usuario.
 *
 * Por eso aquí no se devuelve la descripción para pintarla en pantalla. Se
 * devuelve un bloque de system prompt que le da a ARGOS el material para que él
 * lo explique con sus palabras. La regla dura está en la directriz que se
 * inyecta: prohibido citar códigos internos.
 *
 * Esto REEMPLAZA en resolución a buildScreenContextInjection (que solo conocía
 * 9 pilares gruesos: "el usuario está en Nutrición"). Aquel sigue vivo para el
 * caso en que la ruta exacta no esté catalogada.
 */
import { APP_ROUTE_DESCRIPTIONS, APP_ROUTES, APP_ROUTES_DYNAMIC } from '@/src/constants/app-routes.generated';
import { limpiarDescripcion, tituloDe, rutaVetada } from './argos-nav-resolver-core';
import { screenFromPath, buildScreenContextInjection, type ArgosScreen } from '@/src/hooks/argos-screen-context-core';

export interface ContextoPantalla {
  /** Ruta canónica ya normalizada. */
  ruta: string;
  /** Título de usuario. Seguro para pintar. */
  titulo: string;
  /** Pilar grueso, para heredar el tono del pilar. */
  pilar: ArgosScreen;
  /** Descripción limpia. CONTEXTO para el modelo, NO copy de usuario. */
  resumen: string | null;
  /** ¿El catálogo conoce esta ruta? */
  conocida: boolean;
}

/**
 * Normaliza un pathname de expo-router a una ruta del catálogo.
 * Quita query, hash, diagonal final y el grupo `(tabs)`, que nunca aparece en
 * las rutas generadas pero sí puede venir en el pathname en runtime.
 */
export function normalizarPathname(pathname: string | null | undefined): string {
  if (!pathname) return '/';
  let p = pathname.split('?')[0].split('#')[0];
  p = p.replace(/\((?:[^)]+)\)\//g, '').replace(/\/\((?:[^)]+)\)/g, '');
  p = p.replace(/\/+$/, '');
  if (!p || p === '') return '/';
  return p.startsWith('/') ? p : '/' + p;
}

/**
 * Resuelve una ruta dinámica real (`/packs/hormonal`) contra su plantilla
 * (`/packs/[packKey]`). Sin esto, cualquier pantalla con parámetro cae en
 * "no conocida" y ARGOS se queda mudo justo en las pantallas de detalle.
 */
export function plantillaDe(ruta: string): string | null {
  if (APP_ROUTES.includes(ruta)) return ruta;
  const partes = ruta.split('/').filter(Boolean);
  // Se busca contra APP_ROUTES_DYNAMIC y NO contra las descripciones: el
  // generador solo cosecha descripción de las rutas estáticas, así que ninguna
  // plantilla con [param] aparece ahí y la búsqueda no encontraba nunca nada.
  for (const candidata of APP_ROUTES_DYNAMIC) {
    const cp = candidata.split('/').filter(Boolean);
    if (cp.length !== partes.length) continue;
    let calza = true;
    for (let i = 0; i < cp.length; i++) {
      if (cp[i].startsWith('[')) continue;
      if (cp[i] !== partes[i]) { calza = false; break; }
    }
    if (calza) return candidata;
  }
  return null;
}

export function contextoDePantalla(pathname: string | null | undefined): ContextoPantalla {
  const ruta = normalizarPathname(pathname);
  const plantilla = plantillaDe(ruta);
  const desc = plantilla ? APP_ROUTE_DESCRIPTIONS[plantilla] : undefined;
  const limpio = desc ? limpiarDescripcion(desc) : null;
  return {
    ruta,
    titulo: tituloDe(plantilla ?? ruta),
    pilar: screenFromPath(ruta),
    resumen: limpio && limpio.length > 0 ? limpio : null,
    conocida: Boolean(plantilla),
  };
}

/**
 * Bloque de system prompt con lo que ARGOS sabe de la pantalla actual.
 *
 * Devuelve cadena vacía cuando no hay nada útil que decir, para no gastar
 * tokens en un bloque hueco. Si la ruta no está catalogada, cae al contexto
 * grueso por pilar, que al menos ubica al usuario.
 */
export function construirInyeccionPantalla(pathname: string | null | undefined): string {
  const ctx = contextoDePantalla(pathname);

  if (!ctx.conocida || !ctx.resumen) {
    return buildScreenContextInjection(ctx.pilar);
  }

  return [
    '',
    '',
    '## PANTALLA ACTUAL',
    `El usuario está viendo "${ctx.titulo}" (${ctx.ruta}).`,
    `Para qué sirve: ${ctx.resumen}`,
    '',
    'Si pregunta qué hace esta pantalla o cómo usarla, explícale con TUS palabras,',
    'en español de México, en dos o tres frases. La descripción de arriba es una',
    'nota interna de desarrollo: NUNCA cites códigos de ticket, nombres de archivo',
    'ni jerga del repositorio. Habla de lo que el usuario puede hacer aquí.',
  ].join('\n');
}

/**
 * ¿La pantalla actual da contexto suficiente para que ARGOS la explique?
 * Lo usa la UI para decidir si ofrecer el atajo "¿qué es esto?".
 */
export function puedeExplicar(pathname: string | null | undefined): boolean {
  const ctx = contextoDePantalla(pathname);
  return ctx.conocida && ctx.resumen !== null && !rutaVetada(ctx.ruta);
}
