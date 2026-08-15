/**
 * ARGOS Navegador — I/O (NOCHE-ARGOS Pieza 4).
 *
 * Une el resolvedor puro con expo-router. Toda la decisión vive en
 * argos-nav-resolver-core; aquí solo se navega y se arma el copy.
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
import { router } from 'expo-router';
import {
  resolverDestino,
  validarRutaPropuesta,
  type ResultadoNav,
  type CandidatoNav,
} from './argos-nav-resolver-core';

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

/** Navega de verdad. Aislado para poder testear el core sin expo-router. */
function irA(ruta: string): void {
  router.push(ruta as never);
}

function listar(candidatos: CandidatoNav[]): string {
  return candidatos.map((c) => `"${c.titulo}"`).join(' o ');
}

/**
 * Traduce un resultado del resolvedor a lo que ARGOS hace y dice.
 * Puro salvo por `navegar`, que se inyecta para poder testearlo.
 */
export function ejecutarResultado(
  resultado: ResultadoNav,
  navegar: (ruta: string) => void = irA,
): RespuestaNav {
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
export function navegarPorTexto(consulta: string, navegar: (ruta: string) => void = irA): RespuestaNav {
  return ejecutarResultado(resolverDestino(consulta), navegar);
}

/**
 * Camino 2: el modelo ya propuso una ruta. Se VALIDA contra el catálogo antes
 * de moverse, porque el modelo alucina rutas plausibles que no existen y
 * navegar a una de esas deja al usuario en una pantalla en blanco.
 */
export function navegarPorPropuestaDelModelo(
  ruta: string | null | undefined,
  navegar: (ruta: string) => void = irA,
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
