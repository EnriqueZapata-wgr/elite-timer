/**
 * VOZ-3 · dónde termina ATP.
 *
 * El candado de doctrina de este archivo: la derivación por EMERGENCIA no se
 * toca. Si un test de emergencia truena, se arregla el bloque de alcance, nunca
 * el test. Todo lo demás del alcance es criterio de producto y se puede apagar
 * con la bandera; la emergencia no.
 */
import { describe, it, expect } from 'vitest';
import {
  buildAlcanceInjection,
  EJEMPLOS_ESPECIALIDAD,
  REMISION_GENERICA,
} from '@/src/services/argos-alcance-core';
import { ARGOS_LIMITE_DE_ALCANCE } from '@/src/constants/flags';

describe('buildAlcanceInjection — el límite que faltaba escribir', () => {
  const bloque = buildAlcanceInjection();

  it('la bandera está encendida en este bundle', () => {
    // Si alguien la apaga, los tests de abajo dejan de significar algo. Mejor
    // que truene aquí, con el motivo a la vista.
    expect(ARGOS_LIMITE_DE_ALCANCE).toBe(true);
  });

  it('prohíbe nombrar la especialidad', () => {
    expect(bloque).toContain('NUNCA nombres una especialidad médica');
    // El ejemplo tiene que estar: sin él, el modelo no sabe de qué clase de
    // palabra le estamos hablando.
    expect(bloque).toContain(EJEMPLOS_ESPECIALIDAD[0]);
  });

  it('prohíbe leer un marcador como orden de ir con alguien', () => {
    // El turno real: "este marcador pide un endocrinólogo".
    expect(bloque).toContain('"pide"');
  });

  it('prohíbe armar preguntas, citas y agendas médicas', () => {
    // El otro turno real: "te armo la lista de preguntas para tu endocrinólogo".
    expect(bloque).toContain('armar preguntas');
    expect(bloque).toContain('agenda médica');
  });

  it('remite en general, como los disclaimers aprobados', () => {
    expect(bloque).toContain(REMISION_GENERICA);
    expect(REMISION_GENERICA).toContain('tu médico');
  });

  it('CANDADO · la emergencia sobrevive al límite de alcance', () => {
    // Acotar el alcance nunca puede apagar la derivación por urgencia. Este es
    // el único punto del bloque que no es negociable.
    expect(bloque).toContain('emergencia');
    expect(bloque).toContain('911');
    expect(bloque).toContain('sin esperar confirmación');
  });

  it('pide UNA línea, no un ensayo', () => {
    // El dueño ya se quejó de que escribe de más cuando no se lo pidieron.
    expect(bloque).toContain('Dilo en UNA línea');
    // Y el bloque mismo se predica con el ejemplo: corto.
    expect(bloque.length).toBeLessThan(1200);
  });

  it('no nombra a ninguna persona ni ningún padecimiento', () => {
    for (const prohibida of ['Enrique', 'Mariana', 'diabetes', 'hipotiroidismo', 'cáncer']) {
      expect(bloque).not.toContain(prohibida);
    }
  });
});
