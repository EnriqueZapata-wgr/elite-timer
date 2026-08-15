/**
 * ARGOS Navegador — respaldo con modelo, I/O (NOCHE-ARGOS Pieza 8).
 *
 * Cierra el ciclo que el run anterior dejó abierto: `escalarAlModelo` existía y
 * nadie lo consumía, así que una petición de navegación que el índice local no
 * resolvía terminaba en el chat completo. 280 H+, el cerebro entero y Sonnet
 * para averiguar dónde está un botón.
 *
 * AQUÍ CUESTA 20 H+ (action_key `nav_intent`, migración 267). El proxy lo rutea
 * a Gemini Flash, no arrastra el cerebro y no lee un solo dato clínico. La IA
 * que acomoda la app no es la IA que interpreta tu salud, y el precio lo dice.
 *
 * SOBRE LA CUOTA DIARIA: esta llamada SÍ gasta una de las 5 del tier gratis,
 * porque el proxy cuenta una unidad por request sin mirar el requestType. Es
 * deliberado que se quede así. Lo que había que proteger era el caso común, y
 * ese ya no toca el proxy: la resolución local atiende la mayoría con 0 H+ y 0
 * cuota. Perdonar además este camino dejaría una llamada a un modelo sin ningún
 * techo de tasa, que es peor que el problema que arregla.
 *
 * NO REINTENTA. Si el modelo tampoco encuentra, ARGOS lo dice y pide otras
 * palabras. Caer al chat después de esto sumaría 300 H+ al mismo turno.
 */
import { callAnthropic, extractResponseText } from './anthropic-client';
import { getArgosCallMetadata } from './argos-service';
import { validarRutaPropuesta } from './argos-nav-resolver-core';
import { construirPromptNav, extraerRutaDeRespuesta, catalogoNavegable } from './argos-nav-model-core';
import { turnoDesdeResultado, type TurnoNav } from './argos-nav-intent-core';

/** Techo de la respuesta: se espera una ruta, no un párrafo. */
const MAX_TOKENS_NAV = 40;

/**
 * Segundo camino. Devuelve un TurnoNav igual que el resolvedor local, para que
 * el llamador no tenga que distinguir de dónde vino la respuesta.
 *
 * `accion: 'chat'` de vuelta significa que tampoco el modelo supo: el llamador
 * decide qué decir, pero NO debe volver a escalar.
 */
export async function resolverConModelo(consulta: string): Promise<TurnoNav> {
  const meta = await getArgosCallMetadata({ requestType: 'nav_intent' });
  const data = await callAnthropic(
    [{ role: 'user', content: consulta }],
    MAX_TOKENS_NAV,
    undefined,
    construirPromptNav(catalogoNavegable()),
    { ...meta, requestType: 'nav_intent' },
  );
  const propuesta = extraerRutaDeRespuesta(extractResponseText(data));
  // El modelo alucina rutas plausibles que no existen. Se valida SIEMPRE contra
  // el catálogo antes de mover la app.
  const resultado = validarRutaPropuesta(propuesta);
  if (resultado.tipo === 'sin_resultado') return { accion: 'chat', escalable: false };
  return turnoDesdeResultado(resultado);
}
