/**
 * OLA6 PIEZA D — la ficha de emergencia.
 *
 * Lo que se protege aquí es lo que le cuesta la vida a alguien si falla:
 *   · una ficha a medias nunca se entrega como si estuviera completa,
 *   · el documento no interpreta ni un dato (mismo barrido anti-juicio que el
 *     reporte de consulta),
 *   · el QR lleva la ficha adentro, no una URL,
 *   · la ficha PÚBLICA no carga con lo que un tercero puede aprovechar: ni la
 *     lista completa de medicación, ni aseguradora, ni póliza, ni historial.
 */
import { describe, it, expect } from 'vitest';
import {
  BLOOD_TYPES, NOTE_MAX, REVISION_DIAS, CONDICIONES_MAX, MEDS_CRITICOS_MAX,
  emptyCard, parseCard, cardToRow, cardHasContent, edadDe, tocaRevisar, qrPayload,
  type EmergencyCard,
} from '../emergency-card-core';
import { emergencyCardHtml, FICHA_DISCLAIMER } from '../consulta-report-core';

function fichaLlena(over: Partial<EmergencyCard> = {}): EmergencyCard {
  return {
    ...emptyCard(),
    fullName: 'Persona de Prueba',
    birthDate: '1985-03-14',
    bloodType: 'O+',
    allergies: [{ substance: 'Penicilina', severity: 'anafilaxia', reaction: 'cierre de garganta' }],
    criticalMeds: ['Anticoagulante'],
    conditions: ['Epilepsia'],
    contacts: [{ name: 'Contacto Uno', relationship: 'hermana', phone: '4421234567' }],
    organDonor: true,
    language: 'Español',
    note: 'Vive sola.',
    ...over,
  };
}

describe('los ocho tipos de sangre más no lo sé', () => {
  it('están los ocho del sistema y la respuesta honesta', () => {
    expect(BLOOD_TYPES).toHaveLength(9);
    expect(BLOOD_TYPES).toContain('no_se');
  });
});

describe('parseCard no entrega basura', () => {
  it.each([null, undefined, 'no', 7, []])('%s da una ficha vacía', (raw) => {
    expect(parseCard(raw)).toEqual(emptyCard());
  });

  it('lee tanto la fila de la base como el JSON local', () => {
    const deDb = parseCard({ full_name: 'Ana', blood_type: 'A-', critical_meds: ['Insulina'], organ_donor: false });
    expect(deDb.fullName).toBe('Ana');
    expect(deDb.bloodType).toBe('A-');
    expect(deDb.criticalMeds).toEqual(['Insulina']);
    expect(deDb.organDonor).toBe(false);
  });

  it('la ficha vieja se degrada a la curada: la dosis no sobrevive', () => {
    const viejo = parseCard({
      medications: [{ name: 'Levotiroxina', dose: '75 mcg', frequency: 'diario' }],
      insurer_name: 'Aseguradora', insurer_policy: 'AB-123', has_pacemaker: true,
    });
    expect(viejo.criticalMeds).toEqual(['Levotiroxina']);
    expect(Object.keys(viejo)).not.toContain('insurerName');
    expect(Object.keys(viejo)).not.toContain('hasPacemaker');
  });

  it('las listas cortas se recortan al techo', () => {
    const c = parseCard({
      critical_meds: Array.from({ length: 20 }, (_, i) => `M${i}`),
      conditions: Array.from({ length: 20 }, (_, i) => `C${i}`),
    });
    expect(c.criticalMeds).toHaveLength(MEDS_CRITICOS_MAX);
    expect(c.conditions).toHaveLength(CONDICIONES_MAX);
  });

  it('un tipo de sangre inventado se descarta, no se muestra', () => {
    expect(parseCard({ blood_type: 'Z+' }).bloodType).toBeNull();
  });

  it('tira alergias, medicación y contactos sin lo mínimo', () => {
    const c = parseCard({
      allergies: [{ substance: '  ' }, { substance: 'Nuez', severity: 'grave' }],
      critical_meds: ['  ', 'Insulina'],
      contacts: [{ name: 'Sin número' }, { name: 'Con número', phone: '55' }],
    });
    expect(c.allergies).toHaveLength(1);
    expect(c.criticalMeds).toEqual(['Insulina']);
    expect(c.contacts).toHaveLength(1);
  });

  it('una alergia sin severidad se asume grave (nunca a la baja)', () => {
    expect(parseCard({ allergies: [{ substance: 'Látex' }] }).allergies[0].severity).toBe('grave');
  });

  it('la nota se corta en 280', () => {
    expect(parseCard({ note: 'x'.repeat(400) }).note).toHaveLength(NOTE_MAX);
  });
});

describe('cardToRow', () => {
  it('los campos vacíos van como null, no como cadena vacía', () => {
    const row = cardToRow(emptyCard(), 'u1');
    expect(row.user_id).toBe('u1');
    expect(row.full_name).toBeNull();
    expect(row.note).toBeNull();
    expect(row.allergies).toEqual([]);
  });
});

describe('cardHasContent', () => {
  it('vacía es vacía', () => expect(cardHasContent(emptyCard())).toBe(false));
  it('con solo el tipo de sangre ya sirve', () => {
    expect(cardHasContent({ ...emptyCard(), bloodType: 'O+' })).toBe(true);
  });
});

describe('edad', () => {
  it('descuenta el cumpleaños que todavía no llega', () => {
    expect(edadDe('1985-03-14', '2026-03-13')).toBe(40);
    expect(edadDe('1985-03-14', '2026-03-14')).toBe(41);
  });
  it.each([null, '', '14/03/1985', 'ayer'])('%s no da edad', (b) => {
    expect(edadDe(b as string | null, '2026-03-14')).toBeNull();
  });
});

describe('recordatorio trimestral', () => {
  const ahora = Date.parse('2026-08-14T12:00:00Z');
  const haceDias = (d: number) => new Date(ahora - d * 86400000).toISOString();

  it('sin ficha no se le recuerda nada a nadie', () => {
    expect(tocaRevisar(emptyCard(), ahora)).toBe(false);
  });
  it('recién revisada no molesta', () => {
    expect(tocaRevisar(fichaLlena({ reviewedAt: haceDias(10) }), ahora)).toBe(false);
  });
  it('pasados los tres meses pregunta', () => {
    expect(tocaRevisar(fichaLlena({ reviewedAt: haceDias(REVISION_DIAS + 1) }), ahora)).toBe(true);
  });
  it('sin revisión cuenta desde la última edición', () => {
    expect(tocaRevisar(fichaLlena({ updatedAt: haceDias(REVISION_DIAS + 5) }), ahora)).toBe(true);
    expect(tocaRevisar(fichaLlena({ updatedAt: haceDias(2) }), ahora)).toBe(false);
  });
});

describe('el QR lleva la ficha, no un link', () => {
  const payload = qrPayload(fichaLlena());

  it('no es una URL', () => {
    expect(payload.startsWith('http')).toBe(false);
    expect(payload.includes('://')).toBe(false);
  });

  it('trae lo que se usa en los primeros dos minutos', () => {
    const p = JSON.parse(payload);
    expect(p.s).toBe('O+');
    expect(p.a[0][0]).toBe('Penicilina');
    expect(p.m).toEqual(['Anticoagulante']);
    expect(p.t[0][1]).toBe('4421234567');
  });

  /**
   * Este código se imprime y se cuelga del cuello. Las llaves del payload son
   * de una letra, así que se audita el conjunto entero: si alguien mete un
   * campo nuevo al QR público, este test se cae y le toca justificarlo.
   */
  it('el QR público no lleva ni un campo fuera de la lista curada', () => {
    const permitidas = new Set(['v', 'n', 'b', 's', 'a', 'm', 'c', 't', 'd', 'l', 'x']);
    for (const k of Object.keys(JSON.parse(payload))) {
      expect(permitidas.has(k), `llave no curada en el QR público: "${k}"`).toBe(true);
    }
  });

  it('una ficha vacía no inventa campos', () => {
    expect(JSON.parse(qrPayload(emptyCard()))).toEqual({ v: 2 });
  });
});

describe('el documento de una página', () => {
  const html = emergencyCardHtml(fichaLlena(), '2026-08-14');

  it('trae lo que alguien necesita leer', () => {
    expect(html).toContain('Persona de Prueba');
    expect(html).toContain('O positivo');
    expect(html).toContain('Penicilina');
    expect(html).toContain('4421234567');
    expect(html).toContain('41 años');
  });

  it('dice que un protocolo ATP no es prescripción', () => {
    expect(html).toContain(FICHA_DISCLAIMER);
    expect(FICHA_DISCLAIMER).toContain('no son prescripción médica');
  });

  it('es de 14pt y de una página A4', () => {
    expect(html).toContain('size: A4');
    expect(html).toContain('font-size: 14pt');
  });

  it('cero vocabulario de juicio en el texto de la app', () => {
    // Mismo barrido que el reporte de consulta. Se prueba con una ficha cuyos
    // datos NO traen esas palabras: lo que se audita es NUESTRO copy, porque
    // lo que la persona escriba en sus condiciones es suyo y va literal.
    const limpio = emergencyCardHtml(fichaLlena({ conditions: ['Epilepsia'], note: 'Vive sola.' }), '2026-08-14');
    const JUICIOS = /\bsugiere|\briesgo|\belevad[oa]|\banormal|\bpreocupante|\bdeber[ií]as|\brecomend|\bsem[áa]foro|\bpeligro|\bnormal\b|\balto\b|\bmejorar\b|\bempeorar\b/i;
    const match = limpio.match(JUICIOS);
    expect(match, `palabra de juicio: "${match?.[0] ?? ''}"`).toBeNull();
  });

  it('una ficha vacía no miente: dice que no hay dato', () => {
    const vacio = emergencyCardHtml(emptyCard(), '2026-08-14');
    expect(vacio).toContain('Sin alergias registradas');
    expect(vacio).toContain('Sin registrar');
  });

  it('el documento tampoco carga con lo que se mudó al expediente', () => {
    expect(html).not.toContain('Aseguradora');
    expect(html).not.toContain('Póliza');
    expect(html).not.toContain('75 mcg');
  });
});
