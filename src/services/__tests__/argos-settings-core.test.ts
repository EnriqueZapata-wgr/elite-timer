/**
 * Candado de "ARGOS configura la app" (NOCHE-ARGOS).
 *
 * Estos tests no cuidan que los ajustes funcionen, cuidan que ARGOS NO pueda
 * tocar lo que no debe. La lista es blanca a propósito: el test más importante
 * de este archivo es el que recorre lo prohibido y exige que siga prohibido.
 */
import { describe, it, expect } from 'vitest';
import {
  AJUSTES_ARGOS,
  ajusteOperable,
  buscarAjuste,
  planearAjuste,
  construirPregunta,
  requiereReactivarHabito,
} from '../argos-settings-core';

describe('lista blanca', () => {
  it('lo que esta en el catalogo es operable', () => {
    expect(ajusteOperable('tema')).toBe(true);
    expect(ajusteOperable('salud_modo_denso')).toBe(true);
  });

  it.each([
    'eliminar_cuenta',
    'exportar_datos',
    'comprar_protones',
    'canjear_codigo',
    'activar_boost',
    'consentimiento_analytics',
    'argos_memoria_persistente',
    'compartir_con_clinico',
    'desconectar_coach',
    'ficha_emergencia_prelogin',
    'borrar_ficha_local',
    'silenciar_todo',
    'username_publico',
    'gastar_protones',
  ])('ARGOS NO puede tocar %s', (clave) => {
    expect(ajusteOperable(clave)).toBe(false);
    expect(planearAjuste(clave, true).tipo).toBe('rechazado');
  });

  it('un ajuste inventado se rechaza, no se intenta', () => {
    const p = planearAjuste('lo_que_sea', true);
    expect(p.tipo).toBe('rechazado');
  });
});

describe('validacion del valor', () => {
  it('un booleano no acepta texto', () => {
    expect(planearAjuste('salud_modo_denso', 'si').tipo).toBe('rechazado');
    expect(planearAjuste('salud_modo_denso', 1).tipo).toBe('rechazado');
  });

  it('una opcion no acepta un valor fuera de la lista', () => {
    expect(planearAjuste('tema', 'morado').tipo).toBe('rechazado');
    expect(planearAjuste('tema', true).tipo).toBe('rechazado');
  });

  it('el rechazo dice las opciones validas, no solo que no', () => {
    const p = planearAjuste('tema', 'morado');
    if (p.tipo === 'rechazado') {
      expect(p.motivo).toContain('claro');
      expect(p.motivo).toContain('oscuro');
    }
  });

  it('acepta los valores validos', () => {
    expect(planearAjuste('tema', 'claro').tipo).not.toBe('rechazado');
    expect(planearAjuste('salud_modo_denso', true).tipo).not.toBe('rechazado');
  });
});

describe('confirmar contra aplicar', () => {
  it('lo cosmetico se aplica directo', () => {
    expect(planearAjuste('salud_modo_denso', true).tipo).toBe('aplicar');
    expect(planearAjuste('vibracion', false).tipo).toBe('aplicar');
  });

  it('lo que el usuario podria no esperar se confirma', () => {
    expect(planearAjuste('tema', 'claro').tipo).toBe('confirmar');
    expect(planearAjuste('habito_estado', 'reposo').tipo).toBe('confirmar');
  });

  it('lo que consume protones SIEMPRE se confirma y lo dice', () => {
    // Regla dura: nada gasta protones sin avisar.
    const p = planearAjuste('insights_nutricion', true);
    expect(p.tipo).toBe('confirmar');
    if (p.tipo === 'confirmar') expect(p.pregunta).toMatch(/protones/i);
  });

  it('la pregunta es copy de usuario, no jerga', () => {
    const p = planearAjuste('tema', 'claro');
    if (p.tipo === 'confirmar') {
      expect(p.pregunta).toMatch(/\?/);
      expect(p.pregunta).not.toMatch(/—/); // cero em dash
      expect(p.pregunta).not.toMatch(/AsyncStorage|setMode|null|undefined/);
    }
  });
});

describe('el contrato del habito', () => {
  it('activar un habito exige reactivar su estado', () => {
    // Sin esto el usuario enciende el habito y la card nunca aparece.
    expect(requiereReactivarHabito('habito_estado', 'activo')).toBe(true);
  });

  it('ponerlo en reposo o graduarlo no lo exige', () => {
    expect(requiereReactivarHabito('habito_estado', 'reposo')).toBe(false);
    expect(requiereReactivarHabito('habito_estado', 'graduado')).toBe(false);
  });

  it('no aplica a otros ajustes', () => {
    expect(requiereReactivarHabito('tema', 'claro')).toBe(false);
  });

  it('ningun estado de habito BORRA nada, y la explicacion lo dice', () => {
    const a = buscarAjuste('habito_estado')!;
    expect(a.explicacion).toMatch(/no borra/i);
  });
});

describe('higiene del catalogo', () => {
  it('las claves son unicas', () => {
    const claves = AJUSTES_ARGOS.map((a) => a.clave);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it('todo ajuste tiene etiqueta, explicacion, alias y pantalla donde verlo', () => {
    for (const a of AJUSTES_ARGOS) {
      expect(a.etiqueta.length, a.clave).toBeGreaterThan(0);
      expect(a.explicacion.length, a.clave).toBeGreaterThan(20);
      expect(a.alias.length, a.clave).toBeGreaterThan(0);
      expect(a.pantalla.startsWith('/'), a.clave).toBe(true);
    }
  });

  it('cero em dash en copy de usuario', () => {
    for (const a of AJUSTES_ARGOS) {
      expect(a.etiqueta, a.clave).not.toMatch(/—/);
      expect(a.explicacion, a.clave).not.toMatch(/—/);
    }
  });

  it('todo ajuste de tipo opcion declara sus opciones', () => {
    for (const a of AJUSTES_ARGOS) {
      if (a.tipo === 'opcion') {
        expect(a.opciones, a.clave).toBeDefined();
        expect(a.opciones!.length, a.clave).toBeGreaterThan(1);
      }
    }
  });

  it('toda pregunta de confirmacion se puede construir sin truenar', () => {
    for (const a of AJUSTES_ARGOS) {
      const valor = a.tipo === 'booleano' ? true : a.opciones![0];
      expect(construirPregunta(a, valor).length).toBeGreaterThan(10);
    }
  });
});
