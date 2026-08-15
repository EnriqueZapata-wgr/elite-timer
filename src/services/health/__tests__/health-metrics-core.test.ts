/**
 * NOCHE-1 — el núcleo de salud, y el contrato con app.json.
 *
 * Los tres estados que nadie prueba a mano (nunca pedido, negado, plataforma
 * sin soporte) se prueban aquí porque a mano exigen un teléfono, dos sistemas
 * operativos y negarle el permiso a la app a propósito.
 *
 * El cruce contra app.json es el candado que de verdad importa: Health Connect
 * NIEGA EN SILENCIO todo tipo de dato cuyo permiso no esté en el manifiesto.
 * Si alguien agrega una métrica al core y olvida el permiso, no truena nada:
 * simplemente no llegan datos nunca. Este test lo convierte en rojo.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  DEFINICIONES,
  METRICAS,
  RANGOS,
  definicionDe,
  diaVacio,
  diasConDatos,
  metricasPresentes,
  puedeLeer,
  resolverEstado,
  sanear,
  tieneDatos,
  ventanaDeFechas,
  type EntradaEstado,
  type MetricaSalud,
} from '../health-metrics-core';

const aLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const baseAndroid: EntradaEstado = {
  os: 'android',
  plataforma: 'Health Connect',
  moduloPresente: true,
  sdkDisponible: true,
  yaSePidio: false,
  metricasConcedidas: [],
  dialogoDisponible: true,
};

describe('definiciones', () => {
  it('cada métrica tiene definición y ningún nombre crudo se repite', () => {
    expect(DEFINICIONES).toHaveLength(METRICAS.length);
    for (const m of METRICAS) expect(definicionDe(m).id).toBe(m);
    expect(new Set(DEFINICIONES.map((d) => d.android)).size).toBe(METRICAS.length);
    expect(new Set(DEFINICIONES.map((d) => d.ios)).size).toBe(METRICAS.length);
  });

  it('solo el sueño es category type en HealthKit', () => {
    const categorias = DEFINICIONES.filter((d) => d.iosEsCategoria).map((d) => d.id);
    expect(categorias).toEqual(['sueno']);
  });
});

describe('contrato con app.json (Android niega en silencio lo no declarado)', () => {
  const app = JSON.parse(readFileSync(join(process.cwd(), 'app.json'), 'utf8'));
  const declarados: string[] = app.expo.android.permissions;

  it('todo permiso que el core necesita está declarado en el manifiesto', () => {
    const faltantes = DEFINICIONES.map((d) => d.permisoAndroid).filter(
      (p) => !declarados.includes(p),
    );
    expect(faltantes).toEqual([]);
  });

  it('la cadena de propósito de iOS existe y está en español', () => {
    const plugin = app.expo.plugins.find(
      (p: unknown) => Array.isArray(p) && p[0] === '@kingstinct/react-native-healthkit',
    );
    const cadena: string = plugin[1].NSHealthShareUsageDescription;
    // Apple rechaza cadenas genéricas: tiene que nombrar lo que se lee.
    expect(cadena.length).toBeGreaterThan(80);
    for (const palabra of ['pasos', 'sueño', 'peso', 'frecuencia cardiaca', 'energía activa']) {
      expect(cadena.toLowerCase()).toContain(palabra.toLowerCase());
    }
    // Y tiene que decir que es solo lectura.
    expect(cadena.toLowerCase()).toContain('solo lectura');
  });
});

describe('sanear (los datos de máquina se validan)', () => {
  it('descarta lo imposible en vez de corregirlo', () => {
    expect(sanear('peso', 900)).toBeNull(); // pesó una maleta
    expect(sanear('fc_reposo', 400)).toBeNull(); // sensor con falso contacto
    expect(sanear('pasos', 500000)).toBeNull(); // contó un viaje en coche
    expect(sanear('fc_reposo', 10)).toBeNull();
  });

  it('acepta y redondea lo plausible', () => {
    expect(sanear('pasos', 8432.7)).toBe(8433);
    expect(sanear('fc_reposo', 58.4)).toBe(58);
    expect(sanear('energia_activa', 612.9)).toBe(613);
  });

  it('el peso conserva el decimal: 71.4 kg no es 71 kg', () => {
    expect(sanear('peso', 71.43)).toBe(71.4);
  });

  it('null, undefined y NaN salen como null sin tronar', () => {
    expect(sanear('pasos', null)).toBeNull();
    expect(sanear('pasos', undefined)).toBeNull();
    expect(sanear('pasos', Number.NaN)).toBeNull();
    expect(sanear('pasos', Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('cada métrica tiene rango y el mínimo es menor que el máximo', () => {
    for (const m of METRICAS) {
      expect(RANGOS[m].min).toBeLessThan(RANGOS[m].max);
    }
  });
});

describe('días', () => {
  it('un día vacío no tiene datos y no se guarda', () => {
    const vacio = diaVacio('2026-08-14');
    expect(tieneDatos(vacio)).toBe(false);
    expect(diasConDatos([vacio])).toEqual([]);
  });

  it('un solo dato basta para que el día cuente', () => {
    const dia = { ...diaVacio('2026-08-14'), pasos: 5000 };
    expect(tieneDatos(dia)).toBe(true);
    expect(diasConDatos([dia, diaVacio('2026-08-13')])).toHaveLength(1);
  });

  it('metricasPresentes reporta solo lo que de verdad llegó', () => {
    const dias = [
      { ...diaVacio('2026-08-13'), pasos: 100 },
      { ...diaVacio('2026-08-14'), peso: 71.4 },
    ];
    const presentes: MetricaSalud[] = metricasPresentes(dias);
    expect(presentes.sort()).toEqual(['pasos', 'peso']);
  });

  it('la ventana va de la más vieja a hoy y no se pasa de largo', () => {
    const hoy = new Date(2026, 7, 14); // 14 de agosto de 2026, local
    const v = ventanaDeFechas(hoy, 3, aLocal);
    expect(v).toEqual(['2026-08-12', '2026-08-13', '2026-08-14']);
  });

  it('la ventana cruza fin de mes sin romperse', () => {
    const hoy = new Date(2026, 8, 1); // 1 de septiembre
    expect(ventanaDeFechas(hoy, 2, aLocal)).toEqual(['2026-08-31', '2026-09-01']);
  });
});

describe('resolverEstado (nunca deja la pantalla colgada)', () => {
  it('siempre devuelve título, mensaje y estado, pase lo que pase', () => {
    const casos: EntradaEstado[] = [
      baseAndroid,
      { ...baseAndroid, moduloPresente: false },
      { ...baseAndroid, sdkDisponible: false },
      { ...baseAndroid, yaSePidio: true },
      { ...baseAndroid, metricasConcedidas: ['pasos'] },
      { ...baseAndroid, metricasConcedidas: [...METRICAS] },
      { ...baseAndroid, os: 'ios', plataforma: 'Salud de Apple' },
      { ...baseAndroid, os: 'otro', plataforma: 'Plataforma de salud' },
    ];
    for (const c of casos) {
      const r = resolverEstado(c);
      expect(r.titulo.length).toBeGreaterThan(0);
      expect(r.mensaje.length).toBeGreaterThan(0);
      expect(r.estado).toBeTruthy();
      // Si hay acción hay etiqueta, y si no hay acción no hay botón fantasma.
      if (r.accion === 'ninguna') expect(r.etiquetaAccion).toBeNull();
      else expect(r.etiquetaAccion).toBeTruthy();
    }
  });

  it('permiso nunca pedido NO se confunde con permiso negado', () => {
    const nuevo = resolverEstado(baseAndroid);
    const negado = resolverEstado({ ...baseAndroid, yaSePidio: true });
    expect(nuevo.estado).toBe('sin_permiso');
    expect(nuevo.accion).toBe('pedir_permiso');
    expect(negado.estado).toBe('denegado');
    expect(negado.accion).toBe('abrir_ajustes');
    expect(nuevo.mensaje).not.toBe(negado.mensaje);
  });

  it('plataforma sin soporte lo dice y no ofrece botón', () => {
    const r = resolverEstado({ ...baseAndroid, os: 'otro' });
    expect(r.estado).toBe('no_soportado');
    expect(r.accion).toBe('ninguna');
    expect(puedeLeer(r.estado)).toBe(false);
  });

  it('binario viejo manda a la tienda, no al diálogo que crashea', () => {
    const r = resolverEstado({ ...baseAndroid, moduloPresente: false });
    expect(r.estado).toBe('sin_modulo');
    expect(r.accion).toBe('ninguna');
  });

  it('Android sin Health Connect instalado ofrece instalarlo', () => {
    const r = resolverEstado({ ...baseAndroid, sdkDisponible: false });
    expect(r.estado).toBe('sin_app');
    expect(r.accion).toBe('instalar_health_connect');
  });

  it('sin delegate el camino es ajustes, nunca el diálogo nativo', () => {
    const r = resolverEstado({ ...baseAndroid, dialogoDisponible: false });
    expect(r.estado).toBe('sin_permiso');
    expect(r.accion).toBe('abrir_ajustes');
  });

  it('permiso parcial se admite en voz alta, no se presume completo', () => {
    const r = resolverEstado({ ...baseAndroid, metricasConcedidas: ['pasos', 'sueno'] });
    expect(r.estado).toBe('conectado');
    expect(puedeLeer(r.estado)).toBe(true);
    expect(r.mensaje).toContain('2 de 5');
    expect(r.accion).toBe('abrir_ajustes');
  });

  it('con todo concedido no queda acción pendiente', () => {
    const r = resolverEstado({ ...baseAndroid, metricasConcedidas: [...METRICAS] });
    expect(r.estado).toBe('conectado');
    expect(r.accion).toBe('ninguna');
  });
});
