/**
 * SELLOS DE ADVERTENCIA NOM-051 — el criterio oficial mexicano, calculado aquí.
 *
 * POR QUÉ ESTE ARCHIVO EXISTE
 * La pantalla de Súper lee etiquetas con la cámara. El modelo hace UNA cosa:
 * transcribir lo que dice el empaque (tabla nutrimental y lista de
 * ingredientes). El juicio NO lo hace el modelo: lo hace este archivo, con la
 * regla escrita, en código puro y probado. Así el resultado es el mismo
 * siempre, se puede auditar renglón por renglón y no depende de que un
 * proveedor esté de buenas.
 *
 * DE DÓNDE SALEN LOS NÚMEROS
 * De la Tabla 6 (numeral 4.5.3) de la MODIFICACIÓN a la NOM-051-SCFI/SSA1-2010,
 * que es la norma vigente de etiquetado frontal en México. No se inventó ni un
 * umbral.
 *
 * La fuente que manda es la publicación en el Diario Oficial de la Federación
 * del 27 de marzo de 2020, Tabla 6:
 *   https://www.dof.gob.mx/nota_detalle.php?codigo=5590668&fecha=27/03/2020
 * Los valores de abajo se cotejaron contra dos reproducciones que coinciden
 * exacto entre sí y con la Tabla 6:
 *  · Documento del INSP alojado por la Universidad de Guadalajara:
 *    https://www.cucs.udg.mx/sites/default/files/adjuntos/nom051.inhu_.pdf
 *  · Curso de la modificación, versión en inglés:
 *    https://www.incredibleegg.org/wp-content/uploads/2023/07/NOM_051_PresentacionCursoEng_comprimido.pdf
 *
 * PENDIENTE DECLARADO (4EP): la norma condiciona parte de estos criterios a
 * que el nutrimento sea AÑADIDO. Por eso la leche entera sin azúcar no lleva
 * sello de grasas saturadas y aquí sí se lo pondríamos. La pantalla lo
 * compensa comparando contra los sellos que de verdad vienen impresos en el
 * empaque, y lo dice cuando no coinciden. Cerrarlo bien exige leer el texto
 * del DOF renglón por renglón; está anotado en la estación de lanzamiento.
 *
 * Los valores de abajo son los DEFINITIVOS (la norma se implementó por fases;
 * la última entró en octubre de 2025 y es la que rige hoy).
 *
 * LO QUE ESTO NO ES
 * No es un veredicto de salud ni un consejo clínico. Es la misma cuenta que
 * hace la autoridad para decidir si un empaque lleva sellos, hecha sobre lo
 * que dice ese empaque. Un producto sin sellos no es "sano" y uno con sellos
 * no es "veneno": la etiqueta describe composición, no destino.
 */

export type TipoProducto = 'solido' | 'liquido';

export type SelloId =
  | 'calorias'
  | 'azucares'
  | 'grasas_saturadas'
  | 'grasas_trans'
  | 'sodio';

export type LeyendaId = 'cafeina' | 'edulcorantes';

/**
 * Lo que se lee de la tabla nutrimental, SIEMPRE por 100 g (sólidos) o por
 * 100 mL (líquidos), que es la base sobre la que la norma decide.
 */
export interface TablaNutrimental {
  tipo: TipoProducto;
  /**
   * Energía total. null = no se pudo leer.
   *
   * 4EP GRAVE-2: esto era `number` y se caía a 0. Con energía ilegible, los
   * tres sellos que la norma expresa como porcentaje de la energía se
   * saltaban en silencio y NO se reportaban como faltantes: un producto con
   * 12 g de azúcar declarados salía con "ninguno" y la pantalla afirmaba que
   * no rebasa los umbrales. Un dato que falta no puede producir una
   * afirmación tranquilizadora.
   */
  kcal: number | null;
  /** Azúcares AÑADIDOS y los de jugos/mieles/jarabes. No los de la fruta entera. */
  azucaresLibresG: number | null;
  grasasSaturadasG: number | null;
  grasasTransG: number | null;
  sodioMg: number | null;
  /** El producto declara cafeína añadida. */
  cafeinaAnadida?: boolean;
  /** El producto declara edulcorantes no calóricos. */
  edulcorantes?: boolean;
}

export interface Sello {
  id: SelloId;
  etiqueta: string;
  /** Por qué se prendió, con el número que lo prendió. */
  porque: string;
}

export interface LecturaSellos {
  sellos: Sello[];
  leyendas: Array<{ id: LeyendaId; etiqueta: string }>;
  /** Datos que faltaban en la etiqueta y por eso NO se pudo evaluar. */
  sinDatos: SelloId[];
}

/** Energía por gramo, para pasar gramos de nutrimento a kcal. */
const KCAL_POR_G_AZUCAR = 4;
const KCAL_POR_G_GRASA = 9;

/** Redondeo a un decimal, para que el "porque" no enseñe 9.999999. */
const r1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Calcula los sellos de un producto a partir de su tabla nutrimental.
 *
 * Un nutrimento que la etiqueta no declara NO se evalúa y se reporta en
 * `sinDatos`. Suponerlo cero sería inventar: la respuesta honesta a "no sé"
 * es decir que no se sabe, no dar el beneficio de la duda.
 */
export function calcularSellos(t: TablaNutrimental): LecturaSellos {
  const sellos: Sello[] = [];
  const sinDatos: SelloId[] = [];
  const porCada = t.tipo === 'solido' ? '100 g' : '100 mL';

  // Energía utilizable: null si no se leyó, si no es finita o si es negativa.
  // Sin energía no se puede calcular NADA de lo que la norma expresa como
  // porcentaje, ni la regla de sodio por kcal.
  const kcal = (t.kcal != null && Number.isFinite(t.kcal) && t.kcal >= 0) ? t.kcal : null;
  if (kcal == null) {
    return {
      sellos: [],
      leyendas: leyendasDe(t),
      sinDatos: ['calorias', 'azucares', 'grasas_saturadas', 'grasas_trans', 'sodio'],
    };
  }

  // ── EXCESO CALORÍAS ──────────────────────────────────────────────────────
  // Sólidos: ≥275 kcal por 100 g.
  // Líquidos: ≥70 kcal por 100 mL, O ≥8 kcal provenientes de azúcares libres.
  if (t.tipo === 'solido') {
    if (kcal >= 275) {
      sellos.push({ id: 'calorias', etiqueta: 'EXCESO CALORÍAS', porque: `${r1(kcal)} kcal por ${porCada} (el límite son 275)` });
    }
  } else {
    const kcalDeAzucar = (t.azucaresLibresG != null && t.azucaresLibresG >= 0)
      ? t.azucaresLibresG * KCAL_POR_G_AZUCAR
      : null;
    if (kcal >= 70) {
      sellos.push({ id: 'calorias', etiqueta: 'EXCESO CALORÍAS', porque: `${r1(kcal)} kcal por ${porCada} (el límite son 70)` });
    } else if (kcalDeAzucar != null && kcalDeAzucar >= 8) {
      sellos.push({ id: 'calorias', etiqueta: 'EXCESO CALORÍAS', porque: `${r1(kcalDeAzucar)} kcal vienen del azúcar por ${porCada} (el límite son 8)` });
    }
  }

  // ── EXCESO AZÚCARES LIBRES: ≥10 % de la energía total ────────────────────
  if (t.azucaresLibresG == null || t.azucaresLibresG < 0) {
    sinDatos.push('azucares');
  } else if (kcal > 0) {
    const pct = (t.azucaresLibresG * KCAL_POR_G_AZUCAR * 100) / kcal;
    if (pct >= 10) {
      sellos.push({ id: 'azucares', etiqueta: 'EXCESO AZÚCARES', porque: `el ${r1(pct)} % de su energía es azúcar libre (el límite es 10 %)` });
    }
  }

  // ── EXCESO GRASAS SATURADAS: ≥10 % de la energía total ───────────────────
  if (t.grasasSaturadasG == null || t.grasasSaturadasG < 0) {
    sinDatos.push('grasas_saturadas');
  } else if (kcal > 0) {
    const pct = (t.grasasSaturadasG * KCAL_POR_G_GRASA * 100) / kcal;
    if (pct >= 10) {
      sellos.push({ id: 'grasas_saturadas', etiqueta: 'EXCESO GRASAS SATURADAS', porque: `el ${r1(pct)} % de su energía es grasa saturada (el límite es 10 %)` });
    }
  }

  // ── EXCESO GRASAS TRANS: ≥1 % de la energía total ────────────────────────
  if (t.grasasTransG == null || t.grasasTransG < 0) {
    sinDatos.push('grasas_trans');
  } else if (kcal > 0) {
    const pct = (t.grasasTransG * KCAL_POR_G_GRASA * 100) / kcal;
    if (pct >= 1) {
      sellos.push({ id: 'grasas_trans', etiqueta: 'EXCESO GRASAS TRANS', porque: `el ${r1(pct)} % de su energía es grasa trans (el límite es 1 %)` });
    }
  }

  // ── EXCESO SODIO ─────────────────────────────────────────────────────────
  // Regla general: ≥1 mg de sodio por kcal, O ≥300 mg.
  // Bebidas sin aporte calórico: ≥45 mg.
  // 4EP MEDIO-10: "bebida sin aporte energético" es UNA condición y tiene que
  // ser coherente con el sello de calorías de arriba. Si la etiqueta declara
  // azúcar, la bebida no está sin aporte energético aunque diga 0 kcal: eso es
  // una etiqueta que se contradice, y ahí no se elige el camino más benigno.
  const bebidaSinEnergia =
    t.tipo === 'liquido' && kcal === 0 && (t.azucaresLibresG == null || t.azucaresLibresG === 0);

  if (t.sodioMg == null || t.sodioMg < 0) {
    sinDatos.push('sodio');
  } else if (bebidaSinEnergia) {
    if (t.sodioMg >= 45) {
      sellos.push({ id: 'sodio', etiqueta: 'EXCESO SODIO', porque: `${r1(t.sodioMg)} mg de sodio por ${porCada} en una bebida sin calorías (el límite son 45)` });
    }
  } else if (t.sodioMg >= 300) {
    sellos.push({ id: 'sodio', etiqueta: 'EXCESO SODIO', porque: `${r1(t.sodioMg)} mg de sodio por ${porCada} (el límite son 300)` });
  } else if (kcal > 0) {
    const porKcal = t.sodioMg / kcal;
    if (porKcal >= 1) {
      sellos.push({ id: 'sodio', etiqueta: 'EXCESO SODIO', porque: `${r1(porKcal)} mg de sodio por cada kcal (el límite es 1)` });
    }
  } else {
    // Con 0 kcal, la regla de 1 mg por kcal es una división entre cero, no un
    // cero. No se evalúa, y se dice.
    sinDatos.push('sodio');
  }

  return { sellos, leyendas: leyendasDe(t), sinDatos };
}

/** Las leyendas no dependen de la energía, así que se calculan aparte. */
function leyendasDe(t: TablaNutrimental): Array<{ id: LeyendaId; etiqueta: string }> {
  const leyendas: Array<{ id: LeyendaId; etiqueta: string }> = [];
  if (t.cafeinaAnadida) leyendas.push({ id: 'cafeina', etiqueta: 'CONTIENE CAFEÍNA · EVITAR EN NIÑOS' });
  if (t.edulcorantes) leyendas.push({ id: 'edulcorantes', etiqueta: 'CONTIENE EDULCORANTES · NO RECOMENDABLE EN NIÑOS' });
  return leyendas;
}
