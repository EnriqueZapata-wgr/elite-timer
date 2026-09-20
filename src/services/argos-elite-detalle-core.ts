/**
 * Detalle de la evaluacion Elite para ARGOS (20-sep-2026). Puro: sin I/O.
 *
 * POR QUE EXISTE: el `resumen_argos` de elite-v3-core (tope 1,800) dice quien
 * es la persona, que marcadores piden accion, los cruces por titulo, las
 * palancas y el plan de suplementos. Omite lo que un cliente Elite pregunta
 * el dia uno: que como y que evito, como entreno, que dice mi genetica, que
 * score tiene cada sistema y POR QUE. El cerebro cacheado pesa 82k; este
 * bloque cabe diez veces. Aqui va lo que falta, con tope de 6,000 caracteres
 * para que ningun cliente con evaluacion larga se coma el turno.
 *
 * NO toca el resumen actual: es un segundo bloque, aparte, con su propio
 * encabezado (traeBloqueElite no lo confunde con el primero).
 *
 * Solo reordena texto que ya paso el validador de elite-v3-core (sin palabras
 * rojas, sin em dashes). Las frases propias de este modulo son de armado
 * ("Sistemas", "Por qué") y no afirman nada de salud. Cuando una lista no
 * cabe, se dice "(+N más)" en vez de cortar a media frase, y el pie manda a
 * la pantalla de la evaluacion por lo que no cupo.
 */
import {
  marcadoresDe,
  type EliteEstado,
  type EliteMarcador,
  type EliteRango,
  type EliteV3,
} from './elite/elite-v3-core';

export const DETALLE_ELITE_MAX = 6000;

export const ENCABEZADO_DETALLE_ELITE =
  'Detalle de la evaluación Elite (mismo equipo; de aquí sale el porqué de cada indicación; orientación de salud funcional, no una conclusión médica):';

export const PIE_DETALLE_ELITE =
  'Lo que no cupo aquí está completo en la pantalla de su evaluación Elite en la app: si preguntan por algo que no ves, dilo y mándalos ahí.';

/**
 * Presupuesto por seccion, en orden de valor para el dia uno. Con el ejemplo
 * de Omar (10 sistemas, 22 hallazgos geneticos, 6 cruces, 34 marcadores) el
 * texto completo pesa unos 20,000 caracteres; aqui cabe la alimentacion y el
 * entrenamiento ENTEROS (es lo que mas se pregunta), todos los scores, el
 * porque de los sistemas que piden accion y una muestra de lo demas. Una
 * seccion corta le deja su sobrante a las siguientes. Para que quepa mas,
 * se sube DETALLE_ELITE_MAX y estos topes: es un cambio de constantes.
 */
export const DETALLE_TOPES = {
  sello: 400,
  sistemas: 1500,
  alimentacion: 1350,
  entrenamiento: 1100,
  genetica: 800,
  cruces: 450,
  marcadores: 400,
} as const;

const ESTADO_TEXTO: Readonly<Record<EliteEstado, string>> = {
  att: 'pide acción',
  sub: 'en rango, no en su mejor punto',
  opt: 'donde lo queremos',
};

function estadoTexto(e: EliteEstado | null): string {
  return e ? ESTADO_TEXTO[e] : 'sin estado';
}

function rangoTexto(r: EliteRango | null): string {
  if (!r) return '';
  if (r.min !== null && r.max !== null) return `${r.min} a ${r.max}`;
  if (r.max !== null) return `hasta ${r.max}`;
  if (r.min !== null) return `desde ${r.min}`;
  return '';
}

function valorTexto(m: EliteMarcador): string {
  if (m.valor === null) return 'sin valor';
  return m.unidad ? `${m.valor} ${m.unidad}` : String(m.valor);
}

function limpio(s: string | null | undefined): string {
  return typeof s === 'string' ? s.trim() : '';
}

/** Cierra con punto una frase que no lo trae; asi dos sublistas seguidas no se pegan. */
function conPunto(t: string): string {
  return !t || /[.!?]$/.test(t) ? t : `${t}.`;
}

/** Quita el punto final de un item que va dentro de una lista con "; ". */
function sinPuntoFinal(t: string): string {
  return t.replace(/\.$/, '');
}

/** "prefijo item; item (+N más)" metiendo elementos mientras quepan en `max`. */
export function listaConTope(prefijo: string, items: string[], separador: string, max: number): string {
  const armar = (n: number) => {
    const restantes = items.length - n;
    return `${prefijo}${items.slice(0, n).join(separador)}${restantes ? `${separador}(+${restantes} más)` : ''}`;
  };
  let n = 0;
  while (n < items.length && armar(n + 1).length <= max) n += 1;
  return n === 0 ? '' : armar(n);
}

/** Sello de vigencia: version, fecha de toma, generada, firma y la vigencia que escribio el equipo. */
export function seccionSello(e: EliteV3, max: number): string {
  const c = e.cliente;
  const firma = `${e.interpretado_por.evaluacion}${e.interpretado_por.genetica ? `; genética: ${e.interpretado_por.genetica}` : ''}`;
  const programa = e.inicio.programa_semanas !== null ? ` Programa de ${e.inicio.programa_semanas} semanas.` : '';
  let s = `Vigencia: versión ${e.version}, toma de muestra ${c.fecha_toma}, generada ${e.generado_en}. Firma: ${firma}.${programa}`;
  const vig = limpio(e.cierre.vigencia);
  if (vig && (s.length + vig.length + 1) <= max) s += ` ${vig}`;
  return s.length <= max ? s : '';
}

/**
 * Todos los sistemas con score y estado (compacto, siempre completo si cabe)
 * y despues el porque de cada uno, primero los que piden accion.
 */
export function seccionSistemas(e: EliteV3, max: number): string {
  if (!e.sistemas.length) return '';
  // Codigos cortos en la lista compacta (el encabezado los explica) para que
  // el presupuesto se vaya al porque y no a repetir "pide acción" diez veces.
  const compacto = listaConTope(
    'Sistemas (score de 0 a 100; att = pide acción, sub = en rango pero no en su mejor punto, opt = donde lo queremos): ',
    e.sistemas.map((s) => `${s.nombre} ${s.score !== null ? s.score : 'sin score'} ${s.estado ?? 'sin estado'}`),
    '; ',
    max,
  );
  if (!compacto) return '';
  const orden: Record<string, number> = { att: 0, sub: 1, opt: 2 };
  const conPorQue = e.sistemas
    .filter((s) => limpio(s.por_que))
    .sort((a, b) => (orden[a.estado ?? 'opt'] ?? 3) - (orden[b.estado ?? 'opt'] ?? 3));
  const porQue = listaConTope(
    'Por qué, en palabras de su equipo: ',
    conPorQue.map((s) => `${s.nombre}: ${limpio(s.por_que)}`),
    ' | ',
    max - compacto.length - 2,
  );
  return porQue ? `${compacto}.\n${porQue}` : `${compacto}.`;
}

export function seccionAlimentacion(e: EliteV3, max: number): string {
  const a = e.alimentacion;
  const prefijo = 'Alimentación (plan de su equipo). ';
  const partes: string[] = [];
  let restante = max - prefijo.length;
  const meter = (x: string) => {
    const t = conPunto(x);
    if (t && t.length + 1 <= restante) { partes.push(t); restante -= t.length + 1; }
  };
  meter(a.ventana ? `Ventana de alimentación: ${a.ventana.inicio} a ${a.ventana.fin}.` : 'Ventana de alimentación: el plan no fija una.');
  // Un caracter de margen en cada sublista para el punto que agrega `meter`.
  if (a.horarios.length) meter(listaConTope('Horarios: ', a.horarios.map((h) => sinPuntoFinal(`${h.momento}: ${h.que}`)), '; ', restante - 2));
  if (a.prioriza.length) meter(listaConTope('Prioriza: ', a.prioriza.map(sinPuntoFinal), '; ', restante - 2));
  if (a.evita.length) meter(listaConTope('Evita: ', a.evita.map(sinPuntoFinal), '; ', restante - 2));
  if (a.notas.length) meter(listaConTope('Notas: ', a.notas, ' ', restante - 2));
  return partes.length ? `${prefijo}${partes.join(' ')}` : '';
}

export function seccionEntrenamiento(e: EliteV3, max: number): string {
  const t = e.entrenamiento;
  const prefijo = 'Entrenamiento (plan de su equipo). ';
  const partes: string[] = [];
  let restante = max - prefijo.length;
  const meter = (x: string) => {
    const y = conPunto(x);
    if (y && y.length + 1 <= restante) { partes.push(y); restante -= y.length + 1; }
  };
  const base = limpio(t.base);
  if (base) meter(`Base: ${base}`);
  if (t.sesiones.length) {
    const items = t.sesiones.map((s) => {
      const datos = [s.frecuencia_semana, s.duracion, s.intensidad].map(limpio).filter(Boolean).join(', ');
      const nota = sinPuntoFinal(limpio(s.nota));
      return `${s.tipo}${datos ? ` (${datos})` : ''}${nota ? `: ${nota}` : ''}`;
    });
    meter(listaConTope('Sesiones: ', items, '; ', restante - 2));
  }
  if (t.descanso.length) meter(listaConTope('Descanso: ', t.descanso.map(sinPuntoFinal), '; ', restante - 2));
  if (t.notas.length) meter(listaConTope('Notas: ', t.notas, ' ', restante - 2));
  return partes.length ? `${prefijo}${partes.join(' ')}` : '';
}

/** Hallazgos geneticos agrupados por tema: titulo, que significa y que hacer. */
export function seccionGenetica(e: EliteV3, max: number): string {
  const g = e.genetica;
  if (!g.hallazgos.length) return '';
  // Agrupados por tema (el tema se escribe una vez, cuando cambia) pero con un
  // item por hallazgo: asi "(+N más)" cuenta hallazgos y no temas enteros.
  let temaAnterior = '';
  const items = g.hallazgos.map((h) => {
    const queHacer = limpio(h.que_hacer);
    const tema = h.tema !== temaAnterior ? `[${h.tema}] ` : '';
    temaAnterior = h.tema;
    return `${tema}${h.titulo}: ${conPunto(limpio(h.implicacion) || limpio(h.hallazgo))}${queHacer ? ` Qué hacer: ${conPunto(queHacer)}` : ''}`;
  });
  return listaConTope('Genética (no cambia; explica lo demás): ', items, ' | ', max);
}

/** El porque de los marcadores comentados (nota del clinico), primero los que piden accion. */
export function seccionMarcadores(e: EliteV3, max: number): string {
  const orden: Record<string, number> = { att: 0, sub: 1, opt: 2 };
  const conNota = marcadoresDe(e)
    .filter((m) => limpio(m.nota))
    .sort((a, b) => (orden[a.estado ?? 'opt'] ?? 3) - (orden[b.estado ?? 'opt'] ?? 3));
  if (!conNota.length) return '';
  const items = conNota.map((m) => {
    const obj = rangoTexto(m.objetivo);
    const paren = obj ? `objetivo ${obj}, ${estadoTexto(m.estado)}` : estadoTexto(m.estado);
    return `${m.nombre} ${valorTexto(m)} (${paren})${m.estimado ? ' [estimado, no medido]' : ''}: ${limpio(m.nota)}`;
  });
  return listaConTope('Marcadores, el porqué de cada uno: ', items, ' | ', max);
}

/** El porque de cada cruce (el hallazgo: los numeros que lo dispararon), en el orden del documento. */
export function seccionCruces(e: EliteV3, max: number): string {
  if (!e.cruces.lista.length) return '';
  const items = e.cruces.lista.map((x, i) => `${i + 1}) ${x.titulo}: ${limpio(x.hallazgo)}`);
  return listaConTope('Cruces, el porqué: ', items, ' | ', max);
}

/**
 * El bloque completo: encabezado, secciones en orden de valor y pie. Nunca
 * pasa de DETALLE_ELITE_MAX; si una seccion no cabe ni con un elemento, se
 * omite entera (mejor ausente que a medias).
 */
export function construirBloqueEliteDetalle(e: EliteV3): string {
  const secciones: string[] = [];
  const fijo = ENCABEZADO_DETALLE_ELITE.length + 1 + PIE_DETALLE_ELITE.length + 1;
  let restante = DETALLE_ELITE_MAX - fijo;
  const meter = (armar: (max: number) => string, tope: number) => {
    const max = Math.min(tope, restante);
    if (max <= 0) return;
    const s = armar(max);
    if (s && s.length <= max) { secciones.push(s); restante -= s.length + 1; }
  };
  meter((m) => seccionSello(e, m), DETALLE_TOPES.sello);
  meter((m) => seccionSistemas(e, m), DETALLE_TOPES.sistemas);
  meter((m) => seccionAlimentacion(e, m), DETALLE_TOPES.alimentacion);
  meter((m) => seccionEntrenamiento(e, m), DETALLE_TOPES.entrenamiento);
  meter((m) => seccionGenetica(e, m), DETALLE_TOPES.genetica);
  meter((m) => seccionCruces(e, m), DETALLE_TOPES.cruces);
  meter((m) => seccionMarcadores(e, m), DETALLE_TOPES.marcadores);
  if (secciones.length === 0) return '';
  return `${ENCABEZADO_DETALLE_ELITE}\n${secciones.join('\n')}\n${PIE_DETALLE_ELITE}`;
}

/** ¿Este texto ya trae el bloque de detalle? Para no duplicarlo. */
export function traeDetalleElite(texto: string | null | undefined): boolean {
  return typeof texto === 'string' && texto.includes(ENCABEZADO_DETALLE_ELITE);
}
