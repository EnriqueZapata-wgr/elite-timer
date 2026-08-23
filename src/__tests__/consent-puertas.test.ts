/**
 * CONSENT · Los candados de la puerta a las pestañas.
 *
 * QUÉ IMPIDE ESTE ARCHIVO
 * Que vuelva a existir una forma de entrar a `/(tabs)` sin haber aceptado
 * CB-2 (datos sensibles), CB-3 (transferencia internacional) y CB-4 (mayoría
 * de edad). Ese hueco ya se abrió tres veces por caminos distintos: el
 * `router.replace('/(tabs)')` de login, el `catch` de `app/index.tsx` que
 * degradaba a las pestañas, y los deep links por scheme que expo-router
 * resuelve por convención de archivos sin montar nunca el gate.
 *
 * LA IDEA DEL CANDADO
 * No se persigue cada llamada de navegación, porque esa carrera se pierde: la
 * lista crece con cada pantalla nueva y basta olvidar una. Se vigilan tres
 * cosas que sí son finitas:
 *   1 · que el guard siga puesto en el layout del grupo (tabs),
 *   2 · que el gate no vuelva a degradar en su fallo,
 *   3 · un censo CONGELADO de quién navega a las pestañas, para que agregar una
 *       puerta nueva sea una decisión consciente y no un descuido.
 *
 * Los candados de doctrina no se debilitan: si este archivo se pone rojo, se
 * arregla el código o se justifica el cambio por escrito. Bajarle la vara al
 * test no es una opción.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  autorizaEntrada,
  decidirTrasFalloDefinitivo,
  esperaDelReintento,
  seAgotoElTiempo,
  llaveVistoBueno,
  ESPERAS_REINTENTO_MS,
  TECHO_LECTURA_MS,
  TECHO_TOTAL_MS,
} from '@/src/services/acceso-consentido-core';
import { LOGIN_PASA_POR_GATE, TABS_EXIGEN_CONSENTIMIENTO } from '@/src/constants/flags';

/** Quita comentarios: la doctrina vive ahí y no debe cazarse a sí misma. */
function sinComentarios(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

/** Enumera .ts/.tsx bajo `raiz`, saltando tests y node_modules. */
function recorrer(raiz: string): string[] {
  const salida: string[] = [];
  const bajar = (d: string) => {
    for (const nombre of readdirSync(d)) {
      if (nombre === 'node_modules' || nombre === '__tests__') continue;
      const ruta = join(d, nombre);
      if (statSync(ruta).isDirectory()) bajar(ruta);
      else if (/\.tsx?$/.test(nombre)) salida.push(ruta.replace(/\\/g, '/'));
    }
  };
  bajar(raiz);
  return salida;
}

// ─── 1 · El guard sigue puesto en el layout del grupo (tabs) ────────────────

describe('1 · el layout de las pestañas no renderiza sin visto bueno', () => {
  const layout = readFileSync('app/(tabs)/_layout.tsx', 'utf8');
  const codigo = sinComentarios(layout);

  it('consulta el visto bueno de acceso', () => {
    expect(codigo).toContain('hayVistoBuenoEnMemoria');
    expect(codigo).toContain('leerVistoBueno');
    expect(codigo).toContain('@/src/services/acceso-consentido');
  });

  it('manda al gate a quien no lo tiene, en vez de renderizar', () => {
    // El destino es `/` a propósito: ahí vive TODA la política de fallo. Si
    // alguien lo cambia por `/login` o por un render condicional, este test
    // revienta y con razón.
    expect(codigo).toMatch(/acceso === 'al_gate'[\s\S]{0,80}<Redirect href="\/"/);
  });

  it('el estado de espera tiene techo (nada colgado en blanco para siempre)', () => {
    expect(codigo).toContain('setTimeout');
    expect(codigo).toMatch(/setAcceso\('al_gate'\)[\s\S]{0,20}\}, \d+\)/);
  });

  it('sigue detrás de su bandera, y la bandera sigue encendida', () => {
    expect(codigo).toContain('TABS_EXIGEN_CONSENTIMIENTO');
    expect(TABS_EXIGEN_CONSENTIMIENTO).toBe(true);
  });
});

// ─── 2 · El gate no degrada en su fallo ────────────────────────────────────

describe('2 · app/index.tsx: el fallo de lectura no abre la puerta', () => {
  const codigo = sinComentarios(readFileSync('app/index.tsx', 'utf8'));

  it('no queda ningún catch que declare al usuario adentro', () => {
    // La forma vieja, literal, y cualquier variante que ponga la fase en
    // 'adentro' dentro de un catch.
    expect(codigo).not.toContain('setOnboardingDone(true)');
    expect(codigo).not.toMatch(/catch[\s\S]{0,120}'adentro'/);
  });

  it('el error DEVUELTO por supabase se trata como fallo, no se ignora', () => {
    // El bug de verdad: supabase no lanza en error de red, lo devuelve en
    // `error`. Destructurar solo `data` mandaba a la persona a repetir el
    // onboarding. Aquí se exige que `error` se mire.
    expect(codigo).toMatch(/r\.error/);
    expect(codigo).not.toMatch(/const \{ data \} = await supabase/);
  });

  it('reintenta y tiene techo por lectura', () => {
    expect(codigo).toContain('esperaDelReintento');
    expect(codigo).toContain('TECHO_LECTURA_MS');
  });

  it('ofrece salida cuando no se puede leer el perfil', () => {
    expect(codigo).toContain('COPY_SIN_CONEXION');
    expect(codigo).toContain('signOut');
    expect(codigo).toContain('setReintentoManual');
  });
});

// ─── 3 · El gate NO cuelga de user_consent_log (candado de la 032) ──────────

describe('3 · la marca válida es onboarding_step, no user_consent_log', () => {
  // La 032 marcó onboarding_step='completed' a TODOS los usuarios previos y la
  // 209 crea user_consent_log 177 migraciones después, vacía y sin backfill.
  // Gatear por consentimientos mandaría a los founders a re-firmar lo que ya
  // firmaron. El dato del usuario es sagrado.
  const vigilados = [
    'app/index.tsx',
    'app/(tabs)/_layout.tsx',
    'src/services/acceso-consentido.ts',
    'src/services/acceso-consentido-core.ts',
  ];

  it.each(vigilados)('%s no consulta user_consent_log', (archivo) => {
    expect(sinComentarios(readFileSync(archivo, 'utf8'))).not.toContain('user_consent_log');
  });

  it('el gate sigue leyendo onboarding_step', () => {
    expect(readFileSync('app/index.tsx', 'utf8')).toContain('onboarding_step');
  });
});

// ─── 4 · Censo CONGELADO de puertas a las pestañas ─────────────────────────

/**
 * Quién navega a `/(tabs)` hoy. Todos pasan por el guard del layout, así que
 * ninguno es un hueco: el censo existe para que agregar una puerta nueva sea
 * una decisión consciente.
 *
 * SI ESTE TEST SE PONE ROJO: apareció una puerta nueva. Antes de agregarla a la
 * lista, comprueba que el guard de `app/(tabs)/_layout.tsx` la cubre. Si por lo
 * que sea la puerta esquiva el layout, NO la agregues aquí: arréglala.
 */
const PUERTAS_CONOCIDAS = [
  'app/argos/meet.tsx',
  'app/index.tsx',
  'app/login.tsx',
  'app/onboarding/voice-config.tsx',
  'app/ordenar-dia.tsx',
  // A-1 (20-ago-2026): protocol-explorer se retiró a alias y ya no navega
  // a las pestanias. Sale del censo porque desapareció la puerta, no
  // porque estorbara.
  'src/components/argos/argos-floating-core.ts',
  // ARGOS-MENU (21-ago-2026): el chip que relanza el tutorial cambia de
  // tab desde /argos, donde las pestañas YA están montadas y el usuario
  // ya pasó el visto bueno. Entra por el layout como todas: el guard la
  // cubre, verificado antes de agregarla aquí.
  'src/components/argos/chat/ChatEmptyState.tsx',
  'src/components/layout/StickyPillarBanner.tsx',
  'src/components/legal/MedicalDisclaimerGate.tsx',
  'src/components/ui/HomeChip.tsx',
  'src/components/ui/HomeFloatingButton.tsx',
  'src/components/ui/global-topbar-utils.ts',
].sort();

describe('4 · censo congelado: nadie estrena puerta a las pestañas sin verlo', () => {
  it('la lista de archivos que navegan a /(tabs) no cambió', () => {
    const encontrados = [...recorrer('app'), ...recorrer('src')]
      .filter((f) => /['"`]\/\(tabs\)/.test(sinComentarios(readFileSync(f, 'utf8'))))
      .sort();
    expect(encontrados).toEqual(PUERTAS_CONOCIDAS);
  });

  it('login sigue entrando por el gate y no por las pestañas', () => {
    expect(LOGIN_PASA_POR_GATE).toBe(true);
    expect(sinComentarios(readFileSync('app/login.tsx', 'utf8'))).toMatch(
      /LOGIN_PASA_POR_GATE \? '\/' :/,
    );
  });
});

// ─── 5 · La política pura ──────────────────────────────────────────────────

describe('5 · la política de acceso', () => {
  it('solo completed autoriza la entrada', () => {
    expect(autorizaEntrada({ paso: 'completed' })).toBe(true);
    for (const paso of ['pending', 'v2_privacy', 'v2_welcome', '', null, undefined]) {
      expect(autorizaEntrada({ paso })).toBe(false);
    }
  });

  it('sin perfil NO se entra (el caso que ya abrió la puerta una vez)', () => {
    expect(autorizaEntrada({ paso: undefined })).toBe(false);
  });

  it('agotados los reintentos: pasa quien ya consintió, el resto ve la verdad', () => {
    expect(decidirTrasFalloDefinitivo(true)).toBe('adentro');
    expect(decidirTrasFalloDefinitivo(false)).toBe('sin_conexion');
  });

  it('los reintentos terminan (ninguna espera infinita)', () => {
    let n = 0;
    while (esperaDelReintento(n) !== null) {
      expect(n).toBeLessThan(20);
      n++;
    }
    expect(n).toBe(ESPERAS_REINTENTO_MS.length);
  });

  it('la espera acumulada del peor caso se mantiene humana', () => {
    const total = ESPERAS_REINTENTO_MS.reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(8000);
    expect(TECHO_LECTURA_MS).toBeGreaterThan(0);
    expect(TECHO_LECTURA_MS).toBeLessThanOrEqual(15000);
  });

  it('el gate entero tiene techo, no solo cada lectura', () => {
    // Sin techo total, cuatro lecturas colgadas dan 37 s de splash: acotado y
    // aun así inaceptable. Este es el número que la persona vive.
    expect(seAgotoElTiempo(TECHO_TOTAL_MS)).toBe(true);
    expect(seAgotoElTiempo(TECHO_TOTAL_MS - 1)).toBe(false);
    expect(TECHO_TOTAL_MS).toBeLessThanOrEqual(15000);
  });

  it('el visto bueno se guarda por usuario (un teléfono no filtra permisos)', () => {
    expect(llaveVistoBueno('a')).not.toBe(llaveVistoBueno('b'));
    expect(llaveVistoBueno('a')).toContain('a');
  });
});

// ─── 6 · El almacén solo guarda el SÍ ──────────────────────────────────────

describe('6 · el visto bueno nunca se fabrica', () => {
  const almacen = sinComentarios(readFileSync('src/services/acceso-consentido.ts', 'utf8'));

  it('solo hay una escritura y es la de marcarVistoBueno', () => {
    expect(almacen.match(/setItem/g) ?? []).toHaveLength(1);
  });

  it('quien marca el visto bueno lo hace tras leer completed del servidor', () => {
    // Dos llamadores legítimos: el gate (leyó 'completed') y el cierre del
    // onboarding (acaba de escribir 'completed'). Cualquier tercero es
    // sospechoso y merece revisarse a mano.
    const llamadores = [...recorrer('app'), ...recorrer('src')]
      .filter((f) => /marcarVistoBueno\(/.test(sinComentarios(readFileSync(f, 'utf8'))))
      .sort();
    expect(llamadores).toEqual([
      'app/index.tsx',
      'src/services/acceso-consentido.ts',
      'src/services/onboarding-v2-service.ts',
    ]);
  });
});
