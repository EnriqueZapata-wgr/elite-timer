/**
 * El barrido visual tenía un agujero del tamaño de las pantallas nuevas.
 *
 * Solo fotografiaba rutas estáticas, así que los 14 dominios de reportes, el
 * motor único de cuestionarios, los packs y las fichas del centro nunca habían
 * salido en una captura. Ahora los valores de cada ruta con parámetro se sacan
 * del código (ver scripts/ejemplos-rutas.js), y lo que se fija aquí es
 * justamente lo que hace que eso no se pudra:
 *
 *   - que ninguna ruta con parámetro se quede sin fuente en silencio,
 *   - que los valores salgan de verdad de la fuente de verdad,
 *   - que dos pantallas nunca escriban el mismo png,
 *   - y que las exclusiones peligrosas sigan puestas.
 *
 * No se prueba contra un teléfono: todo esto es lo que se decide ANTES de que
 * adb abra el primer deep link.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(here, '..', '..');

const ejemplos = require_(resolve(RAIZ, 'scripts', 'ejemplos-rutas.js'));
const { ejemplosDe, variantesDe, valoresDe, FUENTES, SIN_FUENTE } = ejemplos;

/** Las rutas con parámetro que hay hoy en app/, según el mapa generado. */
function rutasJson() {
  return JSON.parse(readFileSync(resolve(RAIZ, '.maestro', 'rutas.json'), 'utf8'));
}

describe('ninguna ruta con parámetro se queda fuera en silencio', () => {
  it('toda ruta dinámica tiene fuente de valores o razón documentada', () => {
    // gen-mapa-rutas no exporta nada (correrlo escribiría archivos), así que la
    // lista viva de rutas con parámetro se lee del archivo que ya genera.
    const dinamicas: string[] = [];
    const generado = readFileSync(
      resolve(RAIZ, 'src', 'constants', 'app-routes.generated.ts'),
      'utf8'
    );
    const bloque = generado.match(/APP_ROUTES_DYNAMIC[^=]*= \[([\s\S]*?)\];/);
    expect(bloque, 'APP_ROUTES_DYNAMIC cambió de forma').toBeTruthy();
    for (const m of bloque![1].matchAll(/"([^"]+)"/g)) dinamicas.push(m[1]);
    expect(dinamicas.length).toBeGreaterThan(0);

    // Si una ruta nueva no tuviera fuente, ejemplosDe revienta. Eso es el punto.
    expect(() => ejemplosDe(RAIZ, dinamicas)).not.toThrow();
  });

  it('una ruta dinámica nueva sin registrar detiene el generador', () => {
    expect(() => ejemplosDe(RAIZ, ['/inventada/[loQueSea]'])).toThrow(
      /rutas dinámicas que el barrido no sabe abrir/
    );
  });

  it('lo que queda fuera está explicado, no simplemente ausente', () => {
    for (const razon of Object.values(SIN_FUENTE)) {
      expect(typeof razon).toBe('string');
      expect((razon as string).length).toBeGreaterThan(20);
    }
    for (const f of FUENTES) {
      if (f.tope !== undefined) expect(f.porQue, `${f.plantilla} tiene tope sin por qué`).toBeTruthy();
    }
  });
});

describe('los valores salen de la fuente de verdad, no de una lista a mano', () => {
  const todos = ejemplosDe(RAIZ, []);

  it('los 14 dominios de reportes, con los cuatro que nacieron al final', () => {
    const dominios = todos['/reports/[dominio]'].valores;
    expect(dominios).toHaveLength(14);
    // Los cuatro últimos en llegar son los que más importa que se fotografíen.
    expect(dominios).toEqual(
      expect.arrayContaining(['entrenamiento', 'glucosa', 'labs', 'expediente'])
    );
  });

  it('el motor de cuestionarios solo emite familias vivas', () => {
    const ids: string[] = todos['/tests/q/[id]'].valores;
    expect(ids).toEqual(expect.arrayContaining(['sleep_functional'])); // funcionales
    expect(ids).toEqual(expect.arrayContaining(['cronotipo'])); // los sueltos
    // hc-* y edad-* NO entran: sus familias no tienen live:true en el registry
    // y sus 25 rutas de motor pintaban "Evaluación no encontrada" (barrido del
    // 19-ago-2026, grupo G01). Cuando prendan live, se restaura su FUENTE y
    // este candado se reapunta.
    expect(ids.some((i) => i.startsWith('hc-'))).toBe(false);
    expect(ids.some((i) => i.startsWith('edad-'))).toBe(false);
    // Braverman NO pasa por el motor: tiene pantalla propia.
    expect(ids).not.toContain('braverman');
  });

  it('un catálogo de cuestionarios con prefijo nuevo revienta el generador', () => {
    // El prefijo vive en el registry, no en ejemplos-rutas. El centinela compara
    // los que el registry USA contra los que el barrido DECLARA.
    const registry = resolve(RAIZ, 'src', 'constants', 'assessments', 'registry.ts');
    const texto = readFileSync(registry, 'utf8');
    const prefijos = new Set<string>();
    for (const m of texto.matchAll(/\/tests\/q\/([a-z-]*)\$\{/g)) prefijos.add(m[1]);
    const declarados = new Set(
      FUENTES.filter((f: { plantilla: string }) => f.plantilla === '/tests/q/[id]').map(
        (f: { prefijo?: string }) => f.prefijo || ''
      )
    );
    // Espejo exacto del centinela: un prefijo vale si tiene FUENTE o si está
    // declarado como excluido CON razón (PREFIJOS_EXCLUIDOS). Sin ninguna de
    // las dos = catálogo nuevo sin registrar, y eso sigue reventando.
    for (const p of Object.keys(ejemplos.PREFIJOS_EXCLUIDOS)) declarados.add(p);
    for (const p of prefijos) expect(declarados.has(p), `prefijo "${p}" sin catálogo`).toBe(true);
  });

  it('packs y centro salen de sus registros y no vienen vacíos', () => {
    expect(todos['/packs/[packKey]'].valores.length).toBeGreaterThanOrEqual(5);
    expect(todos['/centro/[appKey]'].valores.length).toBeGreaterThanOrEqual(20);
  });

  it('una fuente que se movió falla ruidoso, no devuelve lista vacía', () => {
    expect(() =>
      valoresDe(RAIZ, { archivo: 'src/no/existe.ts', patron: /x/g, plantilla: '/x/[y]' })
    ).toThrow(/No encuentro/);
    expect(() =>
      valoresDe(RAIZ, {
        archivo: 'src/constants/packs.ts',
        patron: /^ {4}estoNoExiste: '([^']+)'/gm,
        plantilla: '/packs/[packKey]',
      })
    ).toThrow(/no encontró nada/);
  });
});

describe('las pestañas también se fotografían', () => {
  it('/cocina entrega sus tres pestañas', () => {
    const rutas = variantesDe(RAIZ, []).map((v: { ruta: string }) => v.ruta);
    expect(rutas).toEqual(
      expect.arrayContaining([
        '/cocina?tab=recetas',
        '/cocina?tab=lista',
        '/cocina?tab=preferencias',
      ])
    );
  });

  it('ninguna variante mete un & en la URL', () => {
    // Un & dentro de lo que recibe `adb shell am start` se lo come el shell y la
    // ruta llega partida. Un solo parámetro por variante, a propósito.
    for (const v of variantesDe(RAIZ, [])) expect(v.ruta).not.toContain('&');
  });
});

describe('el recorrido que se le entrega a adb', () => {
  const mapa = rutasJson();

  it('trae rutas concretas: el script de PowerShell no sabe de parámetros', () => {
    for (const r of mapa.rutas) expect(r.ruta).not.toMatch(/\[|\]/);
  });

  it('dos pantallas nunca escriben el mismo png', () => {
    const vistos = new Set<string>();
    const choques: string[] = [];
    for (const r of mapa.rutas) {
      if (vistos.has(r.slug)) choques.push(r.slug);
      vistos.add(r.slug);
    }
    expect(choques).toEqual([]);
  });

  it('/reports/nutricion y /reports/labs no comparten captura', () => {
    const slugs = mapa.rutas.filter((r: { ruta: string }) => r.ruta.startsWith('/reports/'));
    expect(new Set(slugs.map((r: { slug: string }) => r.slug)).size).toBe(slugs.length);
  });

  it('cubre bastante más que solo las estáticas', () => {
    expect(mapa.resumen.dinamicas).toBeGreaterThan(80);
    expect(mapa.resumen.variantes).toBeGreaterThan(5);
  });
});

describe('las exclusiones peligrosas siguen puestas', () => {
  const ps1 = readFileSync(resolve(RAIZ, 'scripts', 'audit-visual.ps1'), 'utf8');
  const saltar = ps1.match(/\$SALTAR = @\(([\s\S]*?)\)/);

  it('el test de reacción y sus redirecciones se quedan fuera', () => {
    expect(saltar).toBeTruthy();
    for (const r of ['/edad-atp/tests/reaction-time', '/edad-atp/cognitive', '/tests/run/reaction-time']) {
      expect(saltar![1], `${r} debe seguir excluida`).toContain(r);
    }
  });

  it('/food-log ya no está excluida: la cámara pide gesto', () => {
    expect(saltar![1]).not.toContain("'/food-log'");
    const foto = readFileSync(
      resolve(RAIZ, 'src', 'components', 'nutrition', 'foodlog', 'PhotoSensor.tsx'),
      'utf8'
    );
    // Si alguien quita el guard, montar la pantalla vuelve a abrir la cámara y
    // el barrido vuelve a tronar. Esta es la línea que lo sostiene.
    expect(foto).toMatch(/if \(porGesto\) openCamera\(\)/);
  });

  it('el loop de adb sigue siendo tres comandos y nada más', () => {
    // La historia del encabezado: cuatro intentos de "mejorarlo" colgaron el
    // script en el S24. Se miran solo las líneas de código, porque el encabezado
    // nombra esos cuatro a propósito para que nadie los vuelva a intentar.
    const codigo = ps1
      .split('\n')
      .filter((l) => !l.trim().startsWith('#'))
      .join('\n');
    for (const veneno of ['svc power stayon', 'KEYCODE_WAKEUP', 'Start-Job']) {
      expect(codigo, `${veneno} colgó el barrido una vez`).not.toContain(veneno);
    }
    // Y los tres que sí funcionan siguen ahí.
    expect(codigo).toContain('am start -W');
    expect(codigo).toContain('screencap -p');
    expect(codigo).toContain('adb pull');
  });
});
