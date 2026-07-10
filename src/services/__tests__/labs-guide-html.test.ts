/**
 * Guía de Laboratorios — template HTML del PDF (Sprint LABS GUÍA T2).
 */
import { describe, it, expect } from 'vitest';
import { buildLabsGuideHtml, escapeHtml } from '../labs-guide-html';
import { LABS_PACKAGES, LABS_COMERCIALES } from '@/src/constants/labs-guide-content';

describe('labs-guide-html', () => {
  it('genera documento completo con las 5 secciones y todos los paquetes', () => {
    const html = buildLabsGuideHtml('Enrique');
    expect(html).toContain('<!DOCTYPE html>');
    for (const p of LABS_PACKAGES) expect(html).toContain(p.name);
    for (const l of LABS_COMERCIALES) expect(html).toContain(l.name);
    for (const section of ['Paquetes recomendados', 'Dónde hacértelos', 'Cómo prepararte']) {
      expect(html).toContain(section);
    }
  });

  it('personaliza el saludo y degrada con gracia sin nombre', () => {
    expect(buildLabsGuideHtml('Enrique')).toContain('Hola, Enrique.');
    expect(buildLabsGuideHtml('')).toContain('Hola.');
    expect(buildLabsGuideHtml('   ')).toContain('Hola.');
  });

  it('escapa HTML en el nombre (nombre no puede inyectar markup al PDF)', () => {
    const html = buildLabsGuideHtml('<script>alert(1)</script>');
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
    expect(escapeHtml('a & b < c')).toBe('a &amp; b &lt; c');
  });

  it('incluye disclaimer y precios MXN visibles', () => {
    const html = buildLabsGuideHtml();
    expect(html).toMatch(/no es una orden médica/i);
    expect((html.match(/MXN/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
});
