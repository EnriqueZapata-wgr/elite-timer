import { describe, expect, it } from 'vitest';

import {
  CRISIS_BANNER_TEXT,
  LINEA_DE_LA_VIDA_PHONE,
  LINEA_DE_LA_VIDA_TEL_URL,
  detectCrisisContent,
} from '../crisis-detection-core';

describe('Línea de la Vida — número oficial (B1, life-safety)', () => {
  // Número OFICIAL CONASAMA/gob.mx. El 800-290-0024 de los briefs era
  // INCORRECTO (auditoría S1). Si esta assertion falla, alguien cambió el
  // número: solo se actualiza con fuente oficial a la vista.
  it('el número es 800-911-2000 y el tel: URL coincide', () => {
    expect(LINEA_DE_LA_VIDA_PHONE).toBe('800-911-2000');
    expect(LINEA_DE_LA_VIDA_TEL_URL).toBe('tel:8009112000');
    expect(CRISIS_BANNER_TEXT).toContain('800-911-2000');
    expect(CRISIS_BANNER_TEXT).not.toContain('800-290-0024');
    expect(CRISIS_BANNER_TEXT).toContain('Línea de la Vida');
  });
});

describe('detectCrisisContent (C5-002)', () => {
  it('detecta ideación suicida explícita, con y sin acentos', () => {
    expect(detectCrisisContent('he pensado en el suicidio')).toBe(true);
    expect(detectCrisisContent('Quiero quitarme la vida')).toBe(true);
    expect(detectCrisisContent('ya no quiero vivir')).toBe(true);
    expect(detectCrisisContent('ME QUIERO MORIR')).toBe(true);
  });

  it('detecta autolesión', () => {
    expect(detectCrisisContent('tengo ganas de hacerme daño')).toBe(true);
    expect(detectCrisisContent('pienso en cortarme')).toBe(true);
    expect(detectCrisisContent('la autolesión me da vueltas')).toBe(true);
  });

  // ── B2: frases must-catch del brief que antes fallaban ──
  it('detecta "ya no quiero estar aquí"', () => {
    expect(detectCrisisContent('ya no quiero estar aquí')).toBe(true);
    expect(detectCrisisContent('no quiero seguir aquí')).toBe(true);
  });

  it('detecta "para qué sigo / para qué seguir"', () => {
    expect(detectCrisisContent('¿para qué sigo?')).toBe(true);
    expect(detectCrisisContent('no sé para qué seguir')).toBe(true);
    expect(detectCrisisContent('para qué vivir así')).toBe(true);
  });

  it('detecta "no vale la pena seguir" (sin exigir "vivir")', () => {
    expect(detectCrisisContent('no vale la pena seguir')).toBe(true);
    expect(detectCrisisContent('no vale la pena vivir')).toBe(true);
    expect(detectCrisisContent('no vale la pena nada')).toBe(true);
  });

  it('detecta "me voy a matar" y "me quiero cortar" (reflexivo)', () => {
    expect(detectCrisisContent('me voy a matar')).toBe(true);
    expect(detectCrisisContent('me quiero cortar')).toBe(true);
    expect(detectCrisisContent('me quiero matar')).toBe(true);
  });

  it('detecta "estarían mejor sin mí" (ambos órdenes)', () => {
    expect(detectCrisisContent('mis hijos estarían mejor sin mí')).toBe(true);
    expect(detectCrisisContent('mejor estarían sin mí')).toBe(true);
  });

  it('detecta "quiero desaparecer"', () => {
    expect(detectCrisisContent('quiero desaparecer')).toBe(true);
    expect(detectCrisisContent('tengo ganas de desaparecer')).toBe(true);
  });

  it('detecta "acabar/terminar con mi vida / con todo"', () => {
    expect(detectCrisisContent('quiero acabar con mi vida')).toBe(true);
    expect(detectCrisisContent('voy a terminar con mi vida')).toBe(true);
    expect(detectCrisisContent('quiero terminar con todo')).toBe(true);
    expect(detectCrisisContent('acabar con todo de una vez')).toBe(true);
  });

  it('detecta "no aguanto más" SOLO en contexto de crisis (fix final S1)', () => {
    expect(detectCrisisContent('ya no aguanto más con mi vida')).toBe(true);
    expect(detectCrisisContent('no aguanto más con la vida')).toBe(true);
    expect(detectCrisisContent('no aguanto más de esto')).toBe(true);
    expect(detectCrisisContent('no aguanto más seguir así')).toBe(true);
  });

  // ── Refuerzo B2 (fix final S1): variantes reflexivas ──
  it('detecta "me mataré" (futuro sin "voy a")', () => {
    expect(detectCrisisContent('un día de estos me mataré')).toBe(true);
  });

  it('detecta "me corto/corté las venas"', () => {
    expect(detectCrisisContent('me corto las venas')).toBe(true);
    expect(detectCrisisContent('ayer casi me corté las venas')).toBe(true);
  });

  it('detecta "acabar/terminar conmigo"', () => {
    expect(detectCrisisContent('quiero acabar conmigo')).toBe(true);
    expect(detectCrisisContent('voy a terminar conmigo')).toBe(true);
  });

  it('detecta "me quiero hacer daño" / "me haré daño"', () => {
    expect(detectCrisisContent('me quiero hacer daño')).toBe(true);
    expect(detectCrisisContent('me haré daño')).toBe(true);
    expect(detectCrisisContent('me voy a hacer daño')).toBe(true);
  });

  it('detecta "prefiero morir / prefiero estar muerto"', () => {
    expect(detectCrisisContent('prefiero morir')).toBe(true);
    expect(detectCrisisContent('prefiero estar muerto')).toBe(true);
    expect(detectCrisisContent('prefiero estar muerta')).toBe(true);
  });

  it('detecta "ojalá no despertara / ojalá me muriera"', () => {
    expect(detectCrisisContent('ojalá no despertara mañana')).toBe(true);
    expect(detectCrisisContent('ojalá me muriera')).toBe(true);
  });

  it('detecta "no le veo sentido a la vida"', () => {
    expect(detectCrisisContent('no le veo sentido a la vida')).toBe(true);
    expect(detectCrisisContent('no le veo sentido a nada')).toBe(true);
    expect(detectCrisisContent('nada tiene sentido')).toBe(true);
  });

  it('NO dispara con conversación normal de la app', () => {
    expect(detectCrisisContent('¿qué debería comer hoy?')).toBe(false);
    expect(detectCrisisContent('me duele el hombro al entrenar')).toBe(false);
    expect(detectCrisisContent('estoy cansado y estresado del trabajo')).toBe(false);
    expect(detectCrisisContent('quiero vivir con más energía')).toBe(false);
    expect(detectCrisisContent(null)).toBe(false);
    expect(detectCrisisContent('')).toBe(false);
  });

  it('NO dispara con frases fitness/nutrición que se parecen (guardas del reflexivo)', () => {
    // Sin "me": cortar/matar en contexto de comida y hábitos es lenguaje normal.
    expect(detectCrisisContent('voy a cortar el ayuno mañana')).toBe(false);
    expect(detectCrisisContent('voy a matar el hambre con esta comida')).toBe(false);
    expect(detectCrisisContent('quiero cortar los carbohidratos')).toBe(false);
    // "no aguanto más" en habla de gimnasio no es crisis (fix final S1).
    expect(detectCrisisContent('no aguanto más con estas sentadillas')).toBe(false);
    expect(detectCrisisContent('ya no aguanto más el ardor en las piernas')).toBe(false);
  });
});
