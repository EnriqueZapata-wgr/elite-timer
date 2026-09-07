/**
 * CONSENT · Los candados de la puerta a las pestañas.
 *
 * QUÉ IMPIDE ESTE ARCHIVO
 * Que vuelva a existir una forma de entrar a `/(tabs)` sin haber aceptado
 * CB-1 (términos y aviso), CB-3 (transferencia internacional) y CB-4 (mayoría
 * de edad). RE-APUNTADO el 7-sep-2026: antes decía CB-2/CB-3/CB-4 y en
 * realidad no vigilaba ninguno, porque el guardia leía `onboarding_step`. Hoy
 * los tres de la puerta son los de `surface: 'register'`, y CB-2 salió de esta
 * lista porque bloquea una función, no la app (ver sección 3).
 * Ese hueco ya se abrió tres veces por caminos distintos: el
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
  decidirAcceso,
  decidirTrasFalloDefinitivo,
  esperaDelReintento,
  faltanConsentimientosDePuerta,
  onboardingTerminado,
  permiteDatosDeSalud,
  seAgotoElTiempo,
  llaveVistoBueno,
  CONSENTIMIENTOS_DE_PUERTA,
  type EstadoConsentimientos,
  ESPERAS_REINTENTO_MS,
  TECHO_LECTURA_MS,
  TECHO_TOTAL_MS,
} from '@/src/services/acceso-consentido-core';
import { CONSENT_CHECKBOXES } from '@/src/constants/consent-copy';
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

// ─── 3 · El gate SÍ cuelga de user_consent_log (invertido el 7-sep-2026) ────

/**
 * ESTE CANDADO ESTABA AL REVÉS Y ASÍ SE QUEDA ESCRITO, porque el porqué del
 * cambio importa más que el cambio.
 *
 * Decía: "la marca válida es onboarding_step, no user_consent_log", con el
 * argumento de la 032 (marcó 'completed' a todos los usuarios previos) y de la
 * 209 (crea la tabla 177 migraciones después, vacía). La conclusión era que
 * gatear por consentimientos mandaría a los founders a re-firmar lo que ya
 * firmaron.
 *
 * El 7 de septiembre de 2026 se fue a mirar producción: `user_consent_log`
 * tiene TRES filas en total (una CB-6, dos CB-7) para 13 perfiles, y cero de
 * CB-1 a CB-5. No hay nada que re-firmar porque no hay firma. El candado
 * protegía una comodidad y a cambio dejaba que se trataran datos sensibles de
 * salud sin bitácora.
 *
 * Lo que se les pide ahora a los 12 perfiles sin filas no es re-firmar: es
 * firmar por primera vez, una sola vez, sin perder un solo dato. No se hace
 * backfill: inventar una fila de consentimiento por alguien es falsificar
 * evidencia legal.
 */
describe('3 · la puerta legal la decide user_consent_log, no onboarding_step', () => {
  const codigoGate = sinComentarios(readFileSync('app/index.tsx', 'utf8'));

  it('el gate lee el log de consentimientos', () => {
    expect(codigoGate).toContain('user_consent_log');
    expect(codigoGate).toContain('decidirAcceso');
  });

  it('onboarding_step ya no decide la entrada, solo a qué pantalla se enruta', () => {
    // Sigue leyéndose (es la pregunta de producto), pero la función que
    // autoriza ya no lo toca: `autorizaEntrada` recibe consentimientos.
    expect(codigoGate).toContain('onboarding_step');
    expect(codigoGate).toContain('onboardingTerminado');
    expect(codigoGate).not.toMatch(/autorizaEntrada\(\{\s*paso/);
  });

  it('quien no tiene los tres de la puerta va a pedirlos, no a las pestañas', () => {
    expect(codigoGate).toContain('faltan_consentimientos');
    expect(codigoGate).toContain('/consentimientos');
  });

  it('NO hay backfill: nadie escribe consentimientos por otra persona', () => {
    // La única escritura legítima nace de un toque de la persona en una
    // casilla no premarcada. Un insert disparado por el gate sería firmar por
    // alguien más.
    expect(codigoGate).not.toContain('logConsent');
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
  // 7-sep-2026, MÁS TARDE EL MISMO DÍA: /salud/intervenciones SALE del censo.
  // Se agregó cuando su alias apuntaba a '/(tabs)'; el commit 3e5f090 lo movió
  // a '/agenda' y ya no navega a las pestañas. El archivo se leyó y verificó:
  // no queda una sola aparición de '/(tabs)'. Sale porque desapareció la
  // puerta, no porque estorbara, y por el mismo motivo que salió
  // protocol-explorer en agosto.
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
  // 7-sep-2026. La puerta de CB-2: cuando alguien dice que no y no hay pila de
  // navegación a la que volver, su botón "Volver" cae a las pestañas. Es
  // exactamente el mismo caso (y la misma línea) que MedicalDisclaimerGate, que
  // ya estaba en este censo. La alternativa era dejarla sin salida.
  'src/components/legal/PuertaDatosSalud.tsx',
  'src/components/ui/HomeChip.tsx',
  'src/components/ui/HomeFloatingButton.tsx',
  'src/components/ui/global-topbar-utils.ts',
  // 7-sep-2026, MÁS TARDE EL MISMO DÍA: el mapa de rutas GENERADO también sale.
  // Entró porque su única aparición de '/(tabs)' era el destino del alias
  // "/salud/intervenciones"; ese alias ahora apunta a '/agenda' y al regenerar
  // el mapa la cadena desapareció. Verificado con grep sobre el archivo.
  //
  // 7-sep-2026 (pivote limpio, sección 6): ENTRA el cierre de la primera
  // sesión. Es el gemelo exacto de onboarding-v2-service: escribe
  // onboarding_step = 'completed', marca el visto bueno y devuelve '/(tabs)'.
  // La navegación la hace la pantalla del día 1 con ese valor, así que entra
  // por el layout como todas y el guard la cubre. Se leyó completo antes de
  // agregarlo: no decide acceso, solo persiste el cierre.
  'src/services/primera-sesion-service.ts',
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
  const TODOS: EstadoConsentimientos = { 'CB-1': 'accepted', 'CB-3': 'accepted', 'CB-4': 'accepted' };

  it('los tres de la puerta son CB-1, CB-3 y CB-4, y son los de surface register', () => {
    expect([...CONSENTIMIENTOS_DE_PUERTA]).toEqual(['CB-1', 'CB-3', 'CB-4']);
    // El otro lado del espejo: si alguien mueve una superficie en
    // consent-copy y no toca al guardia, aquí se ve.
    expect(CONSENT_CHECKBOXES.filter(c => c.surface === 'register').map(c => c.id))
      .toEqual([...CONSENTIMIENTOS_DE_PUERTA]);
  });

  it('con los tres aceptados se entra; sin uno solo, no', () => {
    expect(autorizaEntrada(TODOS)).toBe(true);
    for (const id of CONSENTIMIENTOS_DE_PUERTA) {
      const sinUno: EstadoConsentimientos = { ...TODOS };
      delete sinUno[id];
      expect(autorizaEntrada(sinUno), id).toBe(false);
      expect(faltanConsentimientosDePuerta(sinUno)).toEqual([id]);
    }
  });

  it('revocado cuenta como falta (revocar es un derecho, no un olvido)', () => {
    expect(autorizaEntrada({ ...TODOS, 'CB-3': 'revoked' })).toBe(false);
  });

  it('sin ninguna fila faltan los tres (los 12 perfiles de hoy)', () => {
    expect(faltanConsentimientosDePuerta({})).toEqual(['CB-1', 'CB-3', 'CB-4']);
    expect(autorizaEntrada({})).toBe(false);
  });

  it('CB-2 no abre ni cierra la app: se entra sin él', () => {
    expect(autorizaEntrada(TODOS)).toBe(true);
    expect(permiteDatosDeSalud(TODOS)).toBe(false);
    expect(permiteDatosDeSalud({ ...TODOS, 'CB-2': 'accepted' })).toBe(true);
    expect(permiteDatosDeSalud({ 'CB-2': 'revoked' })).toBe(false);
  });

  it('onboardingTerminado es pregunta de producto y solo la contesta completed', () => {
    expect(onboardingTerminado({ paso: 'completed' })).toBe(true);
    for (const paso of ['pending', 'v2_privacy', 'v2_welcome', '', null, undefined]) {
      expect(onboardingTerminado({ paso })).toBe(false);
    }
  });

  it('no poder LEER los consentimientos no es "no consintió"', () => {
    // La regla de la casa, en un test: a quien ya entró antes en este teléfono
    // no se le cierra la puerta por una lectura fallida.
    expect(decidirAcceso({ consentimientosLeidos: false, consentimientos: {}, vistoBuenoLocal: true }))
      .toBe('adentro');
    expect(decidirAcceso({ consentimientosLeidos: false, consentimientos: {}, vistoBuenoLocal: false }))
      .toBe('sin_conexion');
  });

  it('leído y completo entra; leído e incompleto va a pedir lo que falta', () => {
    expect(decidirAcceso({ consentimientosLeidos: true, consentimientos: TODOS, vistoBuenoLocal: false }))
      .toBe('adentro');
    // Aunque tenga visto bueno local: si el servidor dice que falta, falta.
    expect(decidirAcceso({ consentimientosLeidos: true, consentimientos: {}, vistoBuenoLocal: true }))
      .toBe('faltan_consentimientos');
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

// ─── 7 · Dónde se firma cada consentimiento (pivote 7-sep-2026) ────────────

describe('7 · el registro escribe los tres de la puerta', () => {
  const codigo = sinComentarios(readFileSync('app/register.tsx', 'utf8'));

  it('loguea CB-1, CB-3 y CB-4 en el momento en que la persona los acepta', () => {
    expect(codigo).toMatch(/logConsent\([^)]*CONSENTIMIENTOS_DE_PUERTA/);
  });

  it('los tres son casillas separadas y ninguna nace marcada', () => {
    // Una sola casilla para tres consentimientos distintos no es
    // consentimiento granular, y premarcar no es consentimiento.
    for (const estado of ['termsAccepted', 'transferAccepted', 'adultAccepted']) {
      expect(codigo).toContain(`useState(false)`);
      expect(codigo).toContain(estado);
    }
    expect(codigo).toContain("CONSENT_BY_ID['CB-3'].text");
    expect(codigo).toContain("CONSENT_BY_ID['CB-4'].text");
  });

  it('sin los tres no hay cuenta', () => {
    expect(codigo).toMatch(/if \(!termsAccepted\) return/);
    expect(codigo).toMatch(/if \(!transferAccepted\) return/);
    expect(codigo).toMatch(/if \(!adultAccepted\) return/);
  });
});

describe('7b · la puerta de CB-2 bloquea de verdad', () => {
  const codigo = sinComentarios(readFileSync('src/components/legal/PuertaDatosSalud.tsx', 'utf8'));

  it('solo el consentimiento confirmado deja escribir', () => {
    // verificando, fallo y rechazado son todos "no escribas". Si esto se
    // relaja, la puerta deja de ser puerta y pasa a ser decoración.
    expect(codigo).toContain("puedeEscribir: estado === 'otorgado'");
  });

  it('usa el texto EXACTO de CB-2, el mismo que se hashea', () => {
    expect(codigo).toContain('checkboxId="CB-2"');
    expect(codigo).toContain('CONSENTIMIENTO_DATOS_SALUD');
  });

  it('distingue "no se pudo leer" de "no consintió"', () => {
    expect(codigo).toContain("setEstado('fallo')");
    expect(codigo).toContain("setEstado('rechazado')");
  });

  it('el consentimiento no se da por dado si el insert no llegó', () => {
    // Para CB-2 una fila encolada no basta: es el consentimiento que legitima
    // el tratamiento de datos sensibles, y abrir la función con la evidencia
    // todavía en el teléfono es el agujero que este trabajo cierra.
    expect(codigo).toContain("setEstado(ok ? 'otorgado' : 'no_guardado')");
    expect(codigo).not.toContain("await logConsent(userId, ['CB-2'], 'accepted');\n      setEstado('otorgado')");
  });

  it('la envoltura no monta la pantalla hasta que hay consentimiento', () => {
    // Un modal encima no bloquea: la pantalla de abajo sigue viva y puede
    // escribir. El bloqueo real es el montaje.
    expect(codigo).toMatch(/if \(puerta\.puedeEscribir\) return <>\{children\}<\/>;/);
  });

  it('quien queda bloqueado siempre tiene salida', () => {
    expect(codigo).toContain('canGoBack');
    expect(codigo).toContain('HEALTH_DATA_CONSENT_COPY.volver');
  });

  it('decir que no NO escribe una revocación falsa en el log legal', () => {
    // El log solo admite accepted/revoked. Escribir 'revoked' por alguien que
    // nunca otorgó sería mentir en evidencia legal; el "ya se preguntó" es un
    // hecho de UI y vive en AsyncStorage.
    expect(codigo).not.toMatch(/logConsent\([^)]*'revoked'/);
    expect(codigo).toContain('llavePuertaSaludPreguntada');
  });
});

/**
 * Censo de pantallas que tratan dato sensible de salud y por lo tanto tienen
 * que montar la puerta de CB-2.
 *
 * Se congela igual que el censo de las pestañas: si aparece una pantalla nueva
 * que escribe en user_symptoms, lab_values o health_measurements, se agrega
 * aquí Y se monta la puerta. Agregar el archivo sin montar la puerta deja el
 * test rojo, que es justo lo que se quiere.
 */
const PANTALLAS_CON_DATO_DE_SALUD = [
  'app/clinical-system.tsx',
  'app/edad-atp/biomarkers.tsx',
  'app/edad-atp/labs.tsx',
  'app/medidas.tsx',
  'app/my-health.tsx',
  'app/salud/mis-sintomas/index.tsx',
];

describe('7c · CB-2 tiene superficie de verdad, no solo un componente listo', () => {
  it.each(PANTALLAS_CON_DATO_DE_SALUD)('%s monta la puerta de CB-2', (archivo) => {
    const src = sinComentarios(readFileSync(archivo, 'utf8'));
    expect(src).toContain('PuertaDatosSaludGate');
    expect(src).toContain("from '@/src/components/legal/PuertaDatosSalud'");
  });
});

describe('7d · la cola de consentimientos no firma por nadie', () => {
  const codigo = sinComentarios(readFileSync('src/services/consent-log-service.ts', 'utf8'));

  it('la llave de la cola lleva el user_id', () => {
    // La llave global de dispositivo permitía que la cuenta B heredara los
    // consentimientos que la cuenta A dejó encolados en ese teléfono.
    expect(codigo).toContain('function pendingKey(userId: string)');
    expect(codigo).toContain('@atp/pending_consent_logs/${userId}');
  });

  it('el flush NO reasigna el user_id de una fila encolada', () => {
    expect(codigo).not.toMatch(/user_id:\s*userId\s*\}\)\)/);
    expect(codigo).toContain('rows.filter(r => r.user_id === userId)');
  });

  it('lo que es de otro usuario se conserva, no se borra', () => {
    // Borrarlo sería tirar la evidencia de consentimiento de alguien más.
    expect(codigo).toContain('ajenas');
  });
});

describe('7e · revocar no puede convertirse en un encierro', () => {
  const codigo = sinComentarios(readFileSync('app/settings/privacy.tsx', 'utf8'));

  it('los tres de la puerta no se revocan con un toque', () => {
    // Revocar CB-3 en el lugar dejaba a la persona en /consentimientos con dos
    // salidas: volver a aceptar lo que acababa de revocar, o cerrar sesión.
    expect(codigo).toContain('CB_PUERTA');
    expect(codigo).toContain('CONSENTIMIENTOS_DE_PUERTA');
    expect(codigo).toMatch(/CB_PUERTA\.includes\(id\)[\s\S]{0,400}REVOKE_PUERTA_WARNING/);
  });

  it('el derecho se ejerce de verdad: lleva a la baja de cuenta', () => {
    expect(codigo).toMatch(/REVOKE_PUERTA_WARNING[\s\S]{0,400}setDeleteModal\(true\)/);
  });

  it('CB-2 sí se revoca en el lugar, porque solo apaga una función', () => {
    expect(codigo).toContain('CB_SALUD');
    expect(codigo).toMatch(/CB_SALUD\.includes\(id\)[\s\S]{0,300}doLog\('revoked'\)/);
  });
});

describe('7f · el muro del onboarding no vuelve a pedir lo ya firmado', () => {
  const codigo = sinComentarios(readFileSync('app/onboarding/v2/privacy.tsx', 'utf8'));

  it('la lista del muro sale del contrato, no de una lista a mano', () => {
    // Con CB-3 y CB-4 en el registro, exigirlos aquí generaba filas duplicadas
    // treinta segundos después; y CB-2 aquí bloqueaba el onboarding, al revés
    // de la doctrina.
    expect(codigo).toContain('CONSENTIMIENTOS_DEL_MURO');
    expect(codigo).not.toMatch(/WALL_IDS[^=]*=\s*\['CB-2'/);
    expect(codigo).not.toMatch(/REQUIRED_IDS[^=]*=\s*\['CB-2'/);
  });
});

// ─── 6 · El almacén solo guarda el SÍ ──────────────────────────────────────

describe('6 · el visto bueno nunca se fabrica', () => {
  const almacen = sinComentarios(readFileSync('src/services/acceso-consentido.ts', 'utf8'));

  it('solo hay una escritura y es la de marcarVistoBueno', () => {
    expect(almacen.match(/setItem/g) ?? []).toHaveLength(1);
  });

  /**
   * 7-sep-2026. La marca local cambió de significado: antes era "terminó el
   * onboarding", ahora es "los tres consentimientos de la puerta se leyeron
   * aceptados". Los teléfonos que ya la traen guardada la traen con el
   * significado viejo, y el guard de las pestañas la cree. Sin este borrado,
   * un deep link a una pestaña entraría saltándose la puerta legal.
   */
  it('la marca vieja se borra cuando el servidor la desmiente', () => {
    expect(almacen).toContain('olvidarVistoBueno');
    expect(almacen).toContain('removeItem');
  });

  it('el borrado NO ocurre cuando la lectura falla (ahí es lo que rescata)', () => {
    const gate = sinComentarios(readFileSync('app/index.tsx', 'utf8'));
    expect(gate).toMatch(/decision !== 'adentro'[\s\S]{0,120}olvidarVistoBueno/);
    expect(gate).not.toMatch(/decidirTrasFalloDefinitivo[\s\S]{0,200}olvidarVistoBueno/);
  });

  it('quien marca el visto bueno lo hace tras leer completed del servidor', () => {
    // Dos llamadores legítimos: el gate (leyó 'completed') y el cierre del
    // onboarding (acaba de escribir 'completed'). Cualquier tercero es
    // sospechoso y merece revisarse a mano.
    const llamadores = [...recorrer('app'), ...recorrer('src')]
      .filter((f) => /marcarVistoBueno\(/.test(sinComentarios(readFileSync(f, 'utf8'))))
      .sort();
    // 7-sep-2026 (pivote limpio): entra un tercer llamador legítimo, el cierre
    // de la primera sesión nueva. Marca el visto bueno en la misma línea en que
    // acaba de escribir 'completed' en profiles, exactamente como el cierre del
    // v2. Sin él, el guard del layout rebotaría a la persona al gate justo al
    // terminar sus seis pantallas, que es el peor momento posible.
    expect(llamadores).toEqual([
      'app/index.tsx',
      'src/services/acceso-consentido.ts',
      'src/services/onboarding-v2-service.ts',
      'src/services/primera-sesion-service.ts',
    ]);
  });

  /**
   * 7-sep-2026, revisión en frío. El cierre de la primera sesión ignoraba el
   * `error` del UPDATE, marcaba el visto bueno y entraba a las pestañas.
   * `onboardingTerminado` solo acepta 'completed', así que con mala red la
   * persona perdía cuatro minutos de trabajo y volvía a las tres preguntas en
   * el siguiente arranque en frío. Este candado exige las dos mitades del
   * arreglo: que se reintente, y que el visto bueno viva DENTRO de la rama sin
   * error.
   */
  it('la primera sesión no marca el visto bueno sin la fila escrita', () => {
    const cierre = sinComentarios(readFileSync('src/services/primera-sesion-service.ts', 'utf8'));
    expect(cierre).toContain('ESPERAS_CIERRE_MS');
    expect(cierre).toMatch(/if \(!error\)[\s\S]{0,300}marcarVistoBueno/);
    expect(cierre).not.toMatch(/no se pudo cerrar'[\s\S]{0,300}marcarVistoBueno/);
  });
});
