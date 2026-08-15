/**
 * Tests del detector de intención de ajuste (NOCHE-ARGOS Pieza 7).
 *
 * Candados de doctrina de este archivo:
 *  1. Sin verbo de configuración NO hay cambio. Un comentario no es una orden.
 *  2. Gana el alias MÁS LARGO. Si el desempate lo decidiera el orden del
 *     catálogo, agregar una entrada nueva movería en silencio a qué ajuste
 *     resuelve una frase vieja.
 *  3. Nada fuera de la lista blanca resuelve, por más que se pida.
 * Si uno truena por un cambio, se reapunta el detector, no se relaja el test.
 */
import { describe, it, expect } from 'vitest';
import { detectarIntencionAjuste } from '../argos-settings-intent-core';
import { planearAjuste, AJUSTES_ARGOS } from '../argos-settings-core';

describe('detectarIntencionAjuste — lo que SÍ es una orden', () => {
  it('apagar un booleano', () => {
    expect(detectarIntencionAjuste('apágame los sonidos'))
      .toEqual({ clave: 'sonidos', valor: false, alias: 'sonidos' });
  });

  it('encender un booleano', () => {
    const r = detectarIntencionAjuste('enciende el modo completo de salud');
    expect(r?.clave).toBe('salud_modo_denso');
    expect(r?.valor).toBe(true);
  });

  it('cambiar una opción por su nombre canónico', () => {
    const r = detectarIntencionAjuste('cámbiame a tema claro');
    expect(r?.clave).toBe('tema');
    expect(r?.valor).toBe('claro');
  });

  it('cambiar una opción por como se dice en la calle', () => {
    const r = detectarIntencionAjuste('ponme la apariencia en oscuro');
    expect(r?.clave).toBe('tema');
    expect(r?.valor).toBe('oscuro');
  });

  it('poner un hábito en reposo', () => {
    const r = detectarIntencionAjuste('pon en reposo lo de meditar');
    expect(r?.clave).toBe('habito_estado');
    expect(r?.valor).toBe('reposo');
  });

  it('quitar la vibración', () => {
    const r = detectarIntencionAjuste('quítame la vibración');
    expect(r?.clave).toBe('vibracion');
    expect(r?.valor).toBe(false);
  });
});

describe('detectarIntencionAjuste — lo que NO es una orden', () => {
  it('un comentario sobre un ajuste no lo cambia', () => {
    expect(detectarIntencionAjuste('el modo oscuro me cansa la vista')).toBeNull();
  });

  it('sin verbo de configuración no pasa nada', () => {
    expect(detectarIntencionAjuste('los sonidos de la app')).toBeNull();
  });

  it('"cambia los sonidos" no dice a qué: no se adivina', () => {
    expect(detectarIntencionAjuste('cambia los sonidos')).toBeNull();
  });

  it('un ajuste de opción sin valor válido no resuelve', () => {
    expect(detectarIntencionAjuste('cámbiame el tema a morado')).toBeNull();
  });

  it('vacío y nulo no revientan', () => {
    expect(detectarIntencionAjuste('')).toBeNull();
    expect(detectarIntencionAjuste(null)).toBeNull();
    expect(detectarIntencionAjuste(undefined)).toBeNull();
  });

  it('una consulta de salud no configura nada', () => {
    expect(detectarIntencionAjuste('me duele la cabeza en la noche')).toBeNull();
  });
});

describe('la lista blanca aguanta', () => {
  it('lo que quedó fuera a propósito sigue fuera', () => {
    // Estas frases piden cosas reales de la app. Ninguna es operable por ARGOS.
    const prohibidas = [
      'elimina mi cuenta',
      'exporta mis datos',
      'desactiva mi consentimiento',
      'apaga todas las notificaciones',
      'desconecta a mi coach',
      'compra protones',
    ];
    for (const frase of prohibidas) {
      const r = detectarIntencionAjuste(frase);
      // O no detecta nada, o lo que detecte lo rechaza la puerta única.
      if (r) expect(planearAjuste(r.clave, r.valor).tipo).toBe('rechazado');
    }
  });

  it('todo lo que el detector devuelve, el catálogo lo conoce', () => {
    const claves = new Set(AJUSTES_ARGOS.map((a) => a.clave));
    const frases = [
      'apágame los sonidos', 'enciende el velo nocturno', 'cámbiame a tema claro',
      'activa el modo denso', 'ponme el modo simple', 'pon en reposo lo de meditar',
      'apaga los comentarios al comer', 'quita que no se apague la pantalla',
    ];
    for (const f of frases) {
      const r = detectarIntencionAjuste(f);
      if (r) expect(claves.has(r.clave)).toBe(true);
    }
  });

  it('el alias más largo gana el desempate', () => {
    // "modo simple" (nutrición) contra "modo denso" (salud): la frase trae el
    // primero completo, así que no puede resolver al segundo.
    const r = detectarIntencionAjuste('ponme el modo simple');
    expect(r?.clave).toBe('nutricion_modo');
  });
});

describe('el plan que sale del detector pasa por la puerta única', () => {
  it('un ajuste de riesgo confirmar trae pregunta', () => {
    const r = detectarIntencionAjuste('cámbiame a tema claro');
    const plan = planearAjuste(r!.clave, r!.valor);
    expect(plan.tipo).toBe('confirmar');
    if (plan.tipo === 'confirmar') expect(plan.pregunta.length).toBeGreaterThan(0);
  });

  it('los insights de comida avisan que gastan protones', () => {
    const r = detectarIntencionAjuste('activa los comentarios al comer');
    const plan = planearAjuste(r!.clave, r!.valor);
    expect(plan.tipo).toBe('confirmar');
    if (plan.tipo === 'confirmar') expect(plan.pregunta.toLowerCase()).toContain('protones');
  });
});
