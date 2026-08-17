/**
 * ARGOS Navegador — respaldo con modelo, I/O (NOCHE-ARGOS Pieza 8).
 *
 * Cierra el ciclo que el run anterior dejó abierto: `escalarAlModelo` existía y
 * nadie lo consumía, así que una petición de navegación que el índice local no
 * resolvía terminaba en el chat completo: el cerebro entero y Sonnet para
 * averiguar dónde está un botón.
 *
 * Este camino usa el action_key `nav_intent`: el proxy lo rutea a Gemini Flash,
 * no arrastra el cerebro y no lee un solo dato clínico. La IA que acomoda la
 * app no es la IA que interpreta tu salud.
 *
 * PREMIUM (16-ago-2026): este bloque explicaba el precio (20 H+ aquí contra 280
 * en el chat) y cómo esta llamada gastaba una de las 5 diarias del plan gratis.
 * Ya no se cobra ni se raciona, pero la separación se queda intacta: sigue
 * siendo la diferencia entre una llamada barata y una cara para ATP, y sigue
 * siendo correcto que el navegador no toque el expediente.
 *
 * NO REINTENTA. Si el modelo tampoco encuentra, ARGOS lo dice y pide otras
 * palabras. Caer al chat después de esto sería dos llamadas al modelo por la
 * misma pregunta.
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
