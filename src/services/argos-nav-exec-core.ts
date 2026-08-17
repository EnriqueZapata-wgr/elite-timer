/**
 * ARGOS Navegador — decisión y copy (FIX-NOCHE, partido de argos-nav-service).
 *
 * Aquí vive TODO lo que decide si la app se mueve y qué dice ARGOS al hacerlo.
 * Es puro: sin React, sin expo-router, sin red. El navegador entra como
 * parámetro, no como import.
 *
 * POR QUÉ ESTÁ PARTIDO. El service importa `router` de expo-router en el tope
 * del módulo, y eso basta para arrastrar el JSX de expo-router a cualquier
 * prueba que lo toque (vitest no transforma node_modules: la suite entera
 * dejaba de coleccionar con `SyntaxError: Unexpected token '<'`). El test de
 * este módulo ya inyectaba el navegador en todos sus casos, así que nunca
 * necesitó el router de verdad: lo único que lo arrastraba era el import.
 *
 * La regla de la casa, aplicada: la lógica pura va en `*-core.ts` y el I/O en
 * `*-service.ts`. Navegar es el I/O; decidir y redactar no lo son.
 *
 * EL ORDEN IMPORTA, Y ES LA DECISIÓN DE COSTO DE TODO ESTE RUN:
 *   1. Índice local. Gratis, sin red, resuelve la mayoría.
 *   2. Solo si el índice no alcanzó, el modelo (requestType `nav_intent`,
 *      Gemini sin cerebro, 20 H+).
 * Invertir ese orden convertiría "llévame al ayuno" en una llamada de red por
 * cada búsqueda. Navegar es descubrimiento, y cobrar el descubrimiento en una
 * app de 192 pantallas donde el problema DECLARADO es que la gente no encuentra
 * las funciones sería cobrar por resolver un problema que nos hicimos solos.
 */
import {
  resolverDestino,
  validarRutaPropuesta,
  type ResultadoNav,
  type CandidatoNav,
} from './argos-nav-resolver-core';

/** Cómo se mueve la app. Lo pone quien llama: aquí no se importa el router. */
export type Navegar = (ruta: string) => void;

export interface RespuestaNav {
  /** Qué debe decir ARGOS. Copy es-MX listo para mostrar. */
  mensaje: string;
  /** Si ya navegó, a dónde. */
  navegoA?: string;
  /** Si hay que preguntar, entre qué opciones. */
  opciones?: CandidatoNav[];
  /** ¿Conviene preguntarle al modelo? (el índice local no alcanzó) */
  escalarAlModelo: boolean;
}

function listar(candidatos: CandidatoNav[]): string {
  return candidatos.map((c) => `"${c.titulo}"`).join(' o ');
}

/** Traduce un resultado del resolvedor a lo que ARGOS hace y dice. */
export function ejecutarResultado(resultado: ResultadoNav, navegar: Navegar): RespuestaNav {
  switch (resultado.tipo) {
    case 'resuelta':
      navegar(resultado.ruta);
      return {
        mensaje: `Listo, te llevo a ${resultado.titulo}.`,
        navegoA: resultado.ruta,
        escalarAlModelo: false,
      };

    case 'ambigua':
      // El contrato: preguntar, no adivinar.
      return {
        mensaje: `¿Te refieres a ${listar(resultado.candidatos)}?`,
        opciones: resultado.candidatos,
        escalarAlModelo: false,
      };

    case 'requiere_dato':
      // NAV-2: si la plantilla se pudo expandir, esto se comporta como cualquier
      // otra ambigüedad y se PREGUNTA. Antes era un callejón: ARGOS avisaba que
      // le faltaba un dato, no ofrecía ninguno y el turno se acababa ahí.
      if (resultado.opciones && resultado.opciones.length > 0) {
        return {
          mensaje: `¿Te refieres a ${listar(resultado.opciones)}?`,
          opciones: resultado.opciones,
          escalarAlModelo: false,
        };
      }
      return {
        mensaje: `Para abrir ${resultado.titulo} necesito saber cuál en específico.`,
        escalarAlModelo: false,
      };

    case 'bloqueada':
      return {
        mensaje: 'Esa parte de la app no se abre desde aquí.',
        escalarAlModelo: false,
      };

    case 'sin_resultado':
    default:
      return {
        mensaje: 'No encontré esa pantalla. ¿Me dices con otras palabras qué quieres hacer?',
        opciones: resultado.tipo === 'sin_resultado' ? resultado.sugerencias : undefined,
        escalarAlModelo: true,
      };
  }
}

/**
 * Camino 1: intento local. Gratis. Es el que debe atender la mayoría.
 */
export function navegarPorTexto(consulta: string, navegar: Navegar): RespuestaNav {
  return ejecutarResultado(resolverDestino(consulta), navegar);
}

/**
 * Camino 2: el modelo ya propuso una ruta. Se VALIDA contra el catálogo antes
 * de moverse, porque el modelo alucina rutas plausibles que no existen y
 * navegar a una de esas deja al usuario en una pantalla en blanco.
 */
export function navegarPorPropuestaDelModelo(
  ruta: string | null | undefined,
  navegar: Navegar,
): RespuestaNav {
  const r = validarRutaPropuesta(ruta);
  if (r.tipo === 'sin_resultado') {
    return {
      mensaje: 'No encontré esa pantalla. ¿Me dices con otras palabras qué quieres hacer?',
      escalarAlModelo: false, // ya vino del modelo: reintentar sería un bucle
    };
  }
  return ejecutarResultado(r, navegar);
}
