/**
 * SELLOS NOM-051 y lectura de ingredientes — candados.
 *
 * Los umbrales de aquí NO son opinión nuestra: son la Tabla 6 (numeral 4.5.3)
 * de la modificación a la NOM-051, verificada contra dos fuentes que coinciden
 * exacto (ver la cabecera de sellos-nom051.ts). Si alguien los mueve, esto
 * truena, y con razón: mover un umbral es cambiar la ley, no afinar un
 * parámetro.
 */
import { describe, it, expect } from 'vitest';
import { calcularSellos, type TablaNutrimental } from '@/src/services/nutrition/sellos-nom051';
import { leerIngredientes, separarIngredientes } from '@/src/services/nutrition/etiqueta-ingredientes';

const solido = (o: Partial<TablaNutrimental>): TablaNutrimental => ({
  tipo: 'solido', kcal: 0, azucaresLibresG: 0, grasasSaturadasG: 0,
  grasasTransG: 0, sodioMg: 0, ...o,
});
const liquido = (o: Partial<TablaNutrimental>): TablaNutrimental => ({
  tipo: 'liquido', kcal: 0, azucaresLibresG: 0, grasasSaturadasG: 0,
  grasasTransG: 0, sodioMg: 0, ...o,
});
const ids = (t: TablaNutrimental) => calcularSellos(t).sellos.map((s) => s.id).sort();

describe('exceso de calorías', () => {
  it('sólidos: el límite son 275 kcal por 100 g, y es "mayor o igual"', () => {
    expect(ids(solido({ kcal: 274 }))).not.toContain('calorias');
    expect(ids(solido({ kcal: 275 }))).toContain('calorias');
  });

  it('líquidos: 70 kcal por 100 mL', () => {
    expect(ids(liquido({ kcal: 69 }))).not.toContain('calorias');
    expect(ids(liquido({ kcal: 70 }))).toContain('calorias');
  });

  it('líquidos: también con 8 kcal de azúcar aunque el total sea bajo', () => {
    // Un refresco "light" con 2 g de azúcar por 100 mL: 8 kcal exactas.
    const r = calcularSellos(liquido({ kcal: 8, azucaresLibresG: 2 }));
    expect(r.sellos.map((s) => s.id)).toContain('calorias');
  });
});

describe('los porcentajes de energía', () => {
  it('azúcares: 10 % de la energía total', () => {
    // 100 kcal con 2.5 g de azúcar = 10 kcal = 10 %.
    expect(ids(solido({ kcal: 100, azucaresLibresG: 2.5 }))).toContain('azucares');
    expect(ids(solido({ kcal: 100, azucaresLibresG: 2.4 }))).not.toContain('azucares');
  });

  it('grasas saturadas: 10 % de la energía total, a 9 kcal por gramo', () => {
    // 100 kcal con 1.12 g de saturada = 10.08 kcal.
    expect(ids(solido({ kcal: 100, grasasSaturadasG: 1.12 }))).toContain('grasas_saturadas');
    expect(ids(solido({ kcal: 100, grasasSaturadasG: 1.1 }))).not.toContain('grasas_saturadas');
  });

  it('grasas trans: 1 %, que es diez veces más estricto', () => {
    expect(ids(solido({ kcal: 100, grasasTransG: 0.12 }))).toContain('grasas_trans');
    expect(ids(solido({ kcal: 100, grasasTransG: 0.1 }))).not.toContain('grasas_trans');
  });
});

describe('exceso de sodio', () => {
  it('se prende por los 300 mg', () => {
    expect(ids(solido({ kcal: 1000, sodioMg: 300 }))).toContain('sodio');
  });

  it('y también por 1 mg de sodio por cada kcal, aunque no llegue a 300', () => {
    // 200 kcal y 200 mg: no llega a 300, pero es 1 mg por kcal.
    expect(ids(solido({ kcal: 200, sodioMg: 200 }))).toContain('sodio');
    expect(ids(solido({ kcal: 200, sodioMg: 199 }))).not.toContain('sodio');
  });

  it('una bebida SIN calorías tiene su propio límite: 45 mg', () => {
    // El agua mineral con sales es el caso: cero kcal, sodio que sí cuenta.
    expect(ids(liquido({ kcal: 0, sodioMg: 45 }))).toContain('sodio');
    expect(ids(liquido({ kcal: 0, sodioMg: 44 }))).not.toContain('sodio');
  });
});

describe('lo que la etiqueta no dice, no se inventa', () => {
  it('un nutrimento sin declarar NO se evalúa y se reporta como sin datos', () => {
    // Suponerlo cero sería darle el beneficio de la duda a quien no declaró.
    const r = calcularSellos(solido({ kcal: 400, azucaresLibresG: null, sodioMg: null }));
    expect(r.sinDatos).toContain('azucares');
    expect(r.sinDatos).toContain('sodio');
    expect(r.sellos.map((s) => s.id)).not.toContain('azucares');
    // Las calorías sí se pudieron evaluar y ese sello sí sale.
    expect(r.sellos.map((s) => s.id)).toContain('calorias');
  });
});

describe('cada sello explica con qué número se prendió', () => {
  it('trae el dato que lo disparó, no solo la etiqueta', () => {
    const r = calcularSellos(solido({ kcal: 500 }));
    const s = r.sellos.find((x) => x.id === 'calorias')!;
    expect(s.porque).toContain('500');
    expect(s.porque).toContain('275');
  });
});

describe('leyendas precautorias', () => {
  it('cafeína y edulcorantes se declaran cuando el producto los trae', () => {
    const r = calcularSellos(liquido({ kcal: 0, cafeinaAnadida: true, edulcorantes: true }));
    expect(r.leyendas.map((l) => l.id).sort()).toEqual(['cafeina', 'edulcorantes']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════

describe('separar la lista de ingredientes', () => {
  it('quita el encabezado y corta por comas', () => {
    expect(separarIngredientes('Ingredientes: agua, sal, azúcar.')).toEqual(['agua', 'sal', 'azúcar']);
  });

  it('los subingredientes entre paréntesis se quedan con su padre', () => {
    // Una persona lee "chocolate (azúcar, cacao)" como UN ingrediente.
    const r = separarIngredientes('chocolate (azúcar, cacao, lecitina), harina');
    expect(r).toEqual(['chocolate (azúcar, cacao, lecitina)', 'harina']);
  });

  it('una lista vacía no truena', () => {
    expect(separarIngredientes('')).toEqual([]);
    expect(separarIngredientes('   ')).toEqual([]);
  });
});

describe('marcar lo que no existe en una cocina', () => {
  // EL CASO QUE DIO ORIGEN A ESTO (Enrique, 22-ago): el tocino de empaque que
  // es recorte de carne, agua, almidón y grasa endurecida, pegado y prensado
  // con forma de tocino. La tabla nutrimental puede parecerse a la del tocino
  // de verdad. La lista de ingredientes no se parece en nada.
  const TOCINO_PRENSADO =
    'Ingredientes: carne de cerdo (65%), agua, almidón modificado de maíz, ' +
    'proteína aislada de soya, sal, grasa vegetal parcialmente hidrogenada, ' +
    'transglutaminasa, dextrosa, saborizante idéntico al natural, ' +
    'nitrito de sodio, eritorbato de sodio, rojo 40.';

  it('lo desarma entero', () => {
    const r = leerIngredientes(TOCINO_PRENSADO);
    const cats = [...new Set(r.marcadores.map((m) => m.categoria))].sort();
    expect(cats).toEqual([
      'azucar_disfrazada', 'conservador', 'grasa_modificada',
      'proteina_aislada', 'sabor_color', 'textura',
    ]);
  });

  it('cada marcador dice PARA QUÉ está ahí, no solo que está', () => {
    const r = leerIngredientes(TOCINO_PRENSADO);
    const grasa = r.marcadores.find((m) => m.categoria === 'grasa_modificada')!;
    expect(grasa.paraQue).toContain('endurece');
    expect(grasa.encontrado).toContain('parcialmente');
  });

  it('una lista de comida de verdad no marca nada', () => {
    const r = leerIngredientes('Ingredientes: garbanzo, agua, sal.');
    expect(r.marcadores).toEqual([]);
    expect(r.cuantos).toBe(3);
  });

  it('cuenta las formas de azúcar por separado: repartirlas ES el recurso', () => {
    // Con azúcar, jarabe de maíz y maltodextrina, ninguna encabeza la lista
    // aunque juntas sean lo primero del producto.
    const r = leerIngredientes('harina, azúcar, jarabe de maíz, maltodextrina, sal');
    expect(r.formasDeAzucar.length).toBeGreaterThanOrEqual(3);
  });

  it('los acentos no cambian el resultado', () => {
    const con = leerIngredientes('proteína aislada de soya');
    const sin = leerIngredientes('proteina aislada de soya');
    expect(con.marcadores.length).toBe(sin.marcadores.length);
    expect(con.marcadores.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LO QUE ENCONTRÓ EL CUATRO OJOS (22-ago-2026)
// ═══════════════════════════════════════════════════════════════════════════

describe('4EP GRAVE-2: un dato que falta no puede tranquilizar', () => {
  it('sin energía legible NO se calcula nada y se reportan los cinco', () => {
    // Antes esto caía a kcal = 0 y los tres sellos porcentuales se saltaban en
    // SILENCIO, sin entrar a sinDatos. Un producto con 12 g de azúcar salía
    // con "ninguno" y la pantalla afirmaba que no rebasa los umbrales.
    const r = calcularSellos(solido({ kcal: null, azucaresLibresG: 12, sodioMg: 900 }));
    expect(r.sellos).toEqual([]);
    expect(r.sinDatos.sort()).toEqual(
      ['azucares', 'calorias', 'grasas_saturadas', 'grasas_trans', 'sodio'],
    );
  });

  it('un NaN se trata igual que un dato ausente', () => {
    const r = calcularSellos(solido({ kcal: Number.NaN, azucaresLibresG: 12 }));
    expect(r.sinDatos).toContain('calorias');
    expect(r.sellos).toEqual([]);
  });

  it('un valor negativo no se toma por bueno', () => {
    const r = calcularSellos(solido({ kcal: 100, azucaresLibresG: -5 }));
    expect(r.sinDatos).toContain('azucares');
  });

  it('las leyendas sí se declaran aunque la energía no se sepa', () => {
    // No dependen de ningún cálculo: están o no están en el producto.
    const r = calcularSellos(liquido({ kcal: null, edulcorantes: true }));
    expect(r.leyendas.map((l) => l.id)).toEqual(['edulcorantes']);
  });
});

describe('4EP MEDIO-10: sodio y la energía cero', () => {
  it('una bebida que declara azúcar NO es una bebida sin calorías', () => {
    // Etiqueta que se contradice: dice 0 kcal y declara azúcar. Ahí no se
    // elige el camino más benigno (el umbral de 45 mg es más estricto que el
    // de 300, así que aplicarlo mal es lo de menos; lo que importa es que la
    // regla sea una sola y coherente con el sello de calorías de arriba).
    const r = calcularSellos(liquido({ kcal: 0, azucaresLibresG: 3, sodioMg: 50 }));
    expect(r.sellos.map((s) => s.id)).not.toContain('sodio');
  });

  it('un sólido con 0 kcal y sodio declarado no inventa una división entre cero', () => {
    const r = calcularSellos(solido({ kcal: 0, sodioMg: 100 }));
    expect(r.sinDatos).toContain('sodio');
    expect(r.sellos.map((s) => s.id)).not.toContain('sodio');
  });

  it('pero con 300 mg el sello sale aunque no haya energía que dividir', () => {
    const r = calcularSellos(solido({ kcal: 0, sodioMg: 350 }));
    expect(r.sellos.map((s) => s.id)).toContain('sodio');
  });
});

describe('4EP MEDIO-8: los marcadores no pueden ser ruido', () => {
  it('la lecitina de soya ya no se marca: es un emulsificante, no un relleno', () => {
    // Aparece en casi todo chocolate, incluido uno de cuatro ingredientes, y
    // la explicación de "textura" era falsa para ella: en chocolate BAJA la
    // viscosidad, no retiene agua ni añade peso.
    const r = leerIngredientes('cacao, azúcar, manteca de cacao, lecitina de soya');
    expect(r.marcadores).toEqual([]);
  });

  it('el gluten de trigo y la proteína de soya tampoco: se compran para cocinar', () => {
    // El criterio de este módulo es "algo que no podrías comprar para cocinar
    // en tu casa". El gluten es la base del seitán y la proteína de soya ES el
    // producto en un tofu.
    expect(leerIngredientes('gluten de trigo, agua, sal').marcadores).toEqual([]);
    expect(leerIngredientes('proteína de soya, agua').marcadores).toEqual([]);
  });

  it('pero la proteína AISLADA sí, que es otra cosa', () => {
    const r = leerIngredientes('carne, proteína aislada de soya');
    expect(r.marcadores.map((m) => m.categoria)).toEqual(['proteina_aislada']);
  });

  it('una categoría se reporta UNA vez aunque empaten dos patrones suyos', () => {
    const r = leerIngredientes('aceite parcialmente hidrogenado, grasa interesterificada');
    const grasas = r.marcadores.filter((m) => m.categoria === 'grasa_modificada');
    expect(grasas).toHaveLength(1);
  });

  it('los fosfatos a secas sí se marcan: así vienen impresos en los cárnicos', () => {
    const r = leerIngredientes('carne de cerdo, agua, sal, fosfatos');
    expect(r.marcadores.map((m) => m.categoria)).toContain('textura');
  });
});

describe('4EP MEDIO-9: no acusar de repartir el azúcar por un artefacto', () => {
  it('un solo endulzante cuenta como UNA forma, aunque su nombre sea largo', () => {
    // "jarabe de maíz de alta fructosa" daba DOS coincidencias sobre el texto
    // pegado, y la pantalla afirmaba que estaban repartiendo el azúcar a
    // propósito. Es un ingrediente, no dos.
    const r = leerIngredientes('agua, jarabe de maíz de alta fructosa, ácido fosfórico');
    expect(r.formasDeAzucar).toHaveLength(1);
  });

  it('tres endulzantes distintos sí son tres', () => {
    const r = leerIngredientes('harina, azúcar, jarabe de maíz, maltodextrina, sal');
    expect(r.formasDeAzucar).toHaveLength(3);
  });
});
