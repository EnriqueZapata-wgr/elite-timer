/**
 * estimacion-inicial-core — candados de la estimacion del punto de partida
 * (pivote limpio, 7 de septiembre de 2026, pantalla 5).
 *
 * El contrato que se protege es de honestidad, no de aritmetica:
 *   · sin edad de calendario no hay numero, y se dice que falta;
 *   · el numero sale del MISMO modulador de habitos del motor v2, no de una
 *     tabla nueva inventada para la ocasion;
 *   · la composicion corporal NO mueve el numero mientras no haya porcentaje
 *     de grasa, que es exactamente lo que exige ce-service;
 *   · el resultado nunca dice ser la Edad ATP.
 */
import { describe, it, expect } from 'vitest';
import {
  estimarPuntoDePartida,
  edadEnAnios,
  suenoPuntuableDeLaVentana,
  ETIQUETA_ESTIMACION,
  VENTANA_QUE_YA_NO_ALCANZA_H,
} from '@/src/services/edad-atp/estimacion-inicial-core';
import { MOTOR_V2_CAPS } from '@/src/constants/edad-atp-motor-v2-config';

const BASE = {
  edadAnios: 40,
  sexo: 'male' as const,
  pesoKg: 78,
  tallaCm: 175,
  horasVentanaSueno: null,
  horasMovimientoSemana: null,
};

describe('sin edad de calendario no hay estimacion', () => {
  it('lo dice en vez de inventar un numero', () => {
    const r = estimarPuntoDePartida({ ...BASE, edadAnios: null });
    expect(r.ok).toBe(false);
    expect(r.edadEstimada).toBeNull();
    expect(r.falta).toBe('Tu fecha de nacimiento');
  });

  it('una edad imposible tampoco pasa', () => {
    expect(estimarPuntoDePartida({ ...BASE, edadAnios: 0 }).ok).toBe(false);
    expect(estimarPuntoDePartida({ ...BASE, edadAnios: -3 }).ok).toBe(false);
  });

  it('aun sin edad, el IMC se calcula y las palancas se listan', () => {
    const r = estimarPuntoDePartida({ ...BASE, edadAnios: null });
    expect(r.imc).toBe(25.5);
    expect(r.palancas.map((p) => p.clave)).toEqual(['sueno', 'movimiento', 'composicion']);
  });
});

describe('sin una sola palanca tampoco hay estimacion', () => {
  /**
   * CONTRATO RE-APUNTADO el 7-sep-2026, en frio, el mismo dia. Antes este test
   * bendecia el bug: sin habitos, `computeHabitosModulador` normaliza a 60, el
   * factor sale 1.00 y esto devolvia ok:true con delta 0, o sea la pantalla
   * afirmaba "Igual que tu edad de calendario" sin que nadie lo hubiera
   * calculado. Y no era teorico: al reanudar en frio no hay parametros de URL
   * y el horario guardado puede no leerse.
   *
   * LA RAZON del cambio: un factor por omision no es una medicion. Con `ce` en
   * 0 no hay numero y se dice que falta.
   */
  it('sin ningun habito declarado NO hay numero, y se dice que falta', () => {
    const r = estimarPuntoDePartida(BASE);
    expect(r.ok).toBe(false);
    expect(r.edadEstimada).toBeNull();
    expect(r.delta).toBeNull();
    expect(r.factor).toBeNull();
    expect(r.falta).toContain('mueves');
    // La edad de calendario si se conoce, y se conserva para poder decirla.
    expect(r.edadCronologica).toBe(40);
  });
});

describe('la ventana en cama no se puntua como sueno medido', () => {
  /**
   * No hay margen de vigilia con fuente en este repo (se buscó: lo unico
   * cercano es `eficiencia_del_sueno` de la matriz v7, un score de wearable
   * pendiente de integrar). Sin fuente no se inventa el margen: se usa la
   * unica inferencia que el tiempo en cama sostiene solo, que es que el sueno
   * nunca es mayor que la ventana.
   */
  it('por arriba de seis horas en cama no dice nada del sueno', () => {
    expect(suenoPuntuableDeLaVentana(8)).toBeUndefined();
    expect(suenoPuntuableDeLaVentana(VENTANA_QUE_YA_NO_ALCANZA_H)).toBeUndefined();
    expect(suenoPuntuableDeLaVentana(null)).toBeUndefined();
  });

  it('por debajo de seis si, porque el sueno tampoco puede llegar', () => {
    expect(suenoPuntuableDeLaVentana(5)).toBe(5);
    expect(suenoPuntuableDeLaVentana(4.5)).toBe(4.5);
  });

  it('ocho horas en cama NO regalan un numero mejor', () => {
    const soloVentana = estimarPuntoDePartida({ ...BASE, horasVentanaSueno: 8 });
    expect(soloVentana.ok).toBe(false);
    // Y con movimiento presente, la ventana larga no mueve nada respecto a no
    // haberla dado: es la prueba de que dejo de sobreestimar.
    const conMovimiento = estimarPuntoDePartida({ ...BASE, horasMovimientoSemana: 5 });
    const conAmbos = estimarPuntoDePartida({ ...BASE, horasVentanaSueno: 8, horasMovimientoSemana: 5 });
    expect(conAmbos.edadEstimada).toBe(conMovimiento.edadEstimada);
  });

  it('una ventana que ya no alcanza SI cuenta, y solo puede restar', () => {
    const r = estimarPuntoDePartida({ ...BASE, horasVentanaSueno: 5 });
    expect(r.ok).toBe(true);
    expect(r.factor).toBe(1.1);
    expect(r.edadEstimada).toBe(44);
    expect(r.palancas.find((p) => p.clave === 'sueno')!.efecto).toBe('en_contra');
  });
});

describe('el numero sale del modulador de habitos del motor v2', () => {
  it('movimiento alto baja el numero (factor 0.95)', () => {
    // 8 h a la semana → scoreEjercicio 80 → factor 0.95.
    const r = estimarPuntoDePartida({ ...BASE, horasMovimientoSemana: 8 });
    expect(r.ok).toBe(true);
    expect(r.factor).toBe(0.95);
    expect(r.edadEstimada).toBe(38);
    expect(r.delta).toBe(-2);
  });

  it('casi nada de movimiento lo sube (factor 1.10)', () => {
    const r = estimarPuntoDePartida({ ...BASE, horasMovimientoSemana: 0 });
    expect(r.factor).toBe(1.1);
    expect(r.edadEstimada).toBe(44);
    expect(r.delta).toBe(4);
  });

  it('las dos palancas se promedian por su peso, no se suman', () => {
    // Ventana 5 h → sueno 0; movimiento 8 h → 80. Pesos iguales (0.20 y 0.20),
    // asi que el score normalizado es 40 y el factor 1.05.
    const r = estimarPuntoDePartida({ ...BASE, horasVentanaSueno: 5, horasMovimientoSemana: 8 });
    expect(r.factor).toBe(1.05);
    expect(r.edadEstimada).toBe(42);
  });

  it('es determinista', () => {
    const a = estimarPuntoDePartida({ ...BASE, horasVentanaSueno: 5, horasMovimientoSemana: 5 });
    const b = estimarPuntoDePartida({ ...BASE, horasVentanaSueno: 5, horasMovimientoSemana: 5 });
    expect(a.edadEstimada).toBe(b.edadEstimada);
  });
});

describe('el piso del motor no se disfraza de resultado', () => {
  /**
   * CONTRATO NUEVO el 7-sep-2026 (revision en frio). El cap inferior del motor
   * son 20 anios: una persona de 18 con habitos buenos salia 17.1, se acotaba
   * a 20 y la pantalla le decia "2 por encima de tu edad de calendario", con
   * habitos buenos. De 18 a 21 la estimacion solo podia castigar. Ahora el
   * acotado se reporta y el delta se calla, porque deja de ser la lectura de
   * los habitos.
   */
  it('a los 18 con buenos habitos el numero se acota y NO se pinta delta', () => {
    const r = estimarPuntoDePartida({ ...BASE, edadAnios: 18, horasMovimientoSemana: 8 });
    expect(r.ok).toBe(true);
    expect(r.acotada).toBe(true);
    expect(r.edadEstimada).toBe(MOTOR_V2_CAPS.min);
    expect(r.delta).toBeNull();
  });

  it('sin acotado, el delta se pinta como siempre', () => {
    const r = estimarPuntoDePartida({ ...BASE, horasMovimientoSemana: 8 });
    expect(r.acotada).toBe(false);
    expect(r.delta).toBe(-2);
  });

  it('el resultado nunca sale de los caps del motor', () => {
    const joven = estimarPuntoDePartida({ ...BASE, edadAnios: 20, horasMovimientoSemana: 8 });
    expect(joven.edadEstimada).toBeGreaterThanOrEqual(MOTOR_V2_CAPS.min);
    const mayor = estimarPuntoDePartida({ ...BASE, edadAnios: 95, horasMovimientoSemana: 0 });
    expect(mayor.edadEstimada).toBeLessThanOrEqual(MOTOR_V2_CAPS.max);
  });
});

describe('las palancas dicen la verdad sobre lo que mueven', () => {
  it('lo que no se declaro sale sin dato y sin valor, para que la UI lo diga', () => {
    const r = estimarPuntoDePartida(BASE);
    const sueno = r.palancas.find((p) => p.clave === 'sueno')!;
    expect(sueno.valor).toBeNull();
    expect(sueno.efecto).toBe('sin_dato');
  });

  it('la composicion NUNCA mueve el numero sin porcentaje de grasa', () => {
    // Es el punto entero de este modulo: ce-service pide body_fat_pct para que
    // la composicion cuente, y aqui no se le inventa un peso a la bascula.
    const flaco = estimarPuntoDePartida({ ...BASE, pesoKg: 60, horasMovimientoSemana: 5 });
    const pesado = estimarPuntoDePartida({ ...BASE, pesoKg: 110, horasMovimientoSemana: 5 });
    expect(flaco.ok).toBe(true);
    expect(flaco.edadEstimada).toBe(pesado.edadEstimada);
    const comp = pesado.palancas.find((p) => p.clave === 'composicion')!;
    expect(comp.efecto).toBe('sin_dato');
    expect(comp.valor).toContain('Índice de masa corporal');
  });

  it('el sexo no cambia el numero, y por eso su ausencia no bloquea', () => {
    const conSexo = estimarPuntoDePartida({ ...BASE, horasMovimientoSemana: 5 });
    const sinSexo = estimarPuntoDePartida({ ...BASE, sexo: null, horasMovimientoSemana: 5 });
    expect(conSexo.ok).toBe(true);
    expect(sinSexo.edadEstimada).toBe(conSexo.edadEstimada);
  });

  it('el efecto de cada palanca se lee de su propio score', () => {
    const r = estimarPuntoDePartida({ ...BASE, horasVentanaSueno: 5, horasMovimientoSemana: 8 });
    expect(r.palancas.find((p) => p.clave === 'sueno')!.efecto).toBe('en_contra');
    expect(r.palancas.find((p) => p.clave === 'movimiento')!.efecto).toBe('a_favor');
    // La ventana larga no se puntua: sin dato, no a favor.
    const larga = estimarPuntoDePartida({ ...BASE, horasVentanaSueno: 8, horasMovimientoSemana: 8 });
    expect(larga.palancas.find((p) => p.clave === 'sueno')!.efecto).toBe('sin_dato');
  });

  it('dice que dato la volveria precisa, en el orden del peso real del motor', () => {
    const r = estimarPuntoDePartida(BASE);
    expect(r.paraSerPrecisa[0]).toContain('grasa');
    expect(r.paraSerPrecisa[1]).toContain('laboratorio');
  });
});

describe('nunca se hace pasar por la Edad ATP', () => {
  it('la etiqueta lo dice con todas sus letras', () => {
    expect(ETIQUETA_ESTIMACION).toContain('Estimación informativa');
    expect(ETIQUETA_ESTIMACION).toContain('No es tu Edad ATP');
  });

  it('el resultado no trae ningun campo que se pueda guardar como calculo', () => {
    const r = estimarPuntoDePartida({ ...BASE, horasMovimientoSemana: 5 });
    const claves = Object.keys(r);
    for (const prohibida of ['edad_atp_integral', 'motor_version', 'ce', 'ce_integral']) {
      expect(claves).not.toContain(prohibida);
    }
  });
});

describe('edadEnAnios', () => {
  it('cuenta anios cumplidos, no fracciones', () => {
    expect(edadEnAnios('1990-09-08', '2026-09-07')).toBe(35);
    expect(edadEnAnios('1990-09-07', '2026-09-07')).toBe(36);
    expect(edadEnAnios('1990-01-01', '2026-09-07')).toBe(36);
  });

  it('lo que no es una fecha da null', () => {
    expect(edadEnAnios(null, '2026-09-07')).toBeNull();
    expect(edadEnAnios('1990-9-7', '2026-09-07')).toBeNull();
    expect(edadEnAnios('2030-01-01', '2026-09-07')).toBeNull();
  });
});
