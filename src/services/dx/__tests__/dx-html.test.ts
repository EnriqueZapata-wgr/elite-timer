import { describe, it, expect } from 'vitest';
import { buildDxHtml, type DxPdfInput } from '../dx-html';

function input(p: Partial<DxPdfInput> = {}): DxPdfInput {
  return {
    firstName: 'Enrique',
    version: 3,
    createdAt: '2026-07-13T12:00:00Z',
    level: 4,
    levelLabel: 'Con laboratorios',
    summaryText: 'Síntesis de prueba.',
    roots: [{ label: 'Disbiosis', severity: 4, confidence: 0.8, sources: ['síntomas', 'labs'] }],
    activeSources: ['Laboratorios', 'Test Braverman'],
    nextHint: 'Agrega tus genéticos para alcanzar el nivel máximo (5).',
    missing: ['Genéticos'],
    ...p,
  };
}

describe('buildDxHtml', () => {
  it('documento completo con identidad ATP, versión y nivel', () => {
    const html = buildDxHtml(input());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Mi Mapa Funcional');
    expect(html).toContain('ATP · Sistema operativo de rendimiento humano');
    expect(html).toContain('Versión 3');
    expect(html).toContain('Preparado para Enrique.');
    expect(html).toContain('Disbiosis');
    expect(html).toContain('Confianza 80%');
    expect(html).toContain('Test Braverman');
    expect(html).toContain('genéticos');
  });

  it('escapa HTML en contenido dinámico', () => {
    const html = buildDxHtml(input({ firstName: '<script>x</script>', summaryText: 'a < b' }));
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a &lt; b');
  });

  it('degrada con gracia sin nombre, sin raíces y sin síntesis', () => {
    const html = buildDxHtml(input({ firstName: '', summaryText: null, roots: [], activeSources: [], nextHint: null, missing: [] }));
    expect(html).toContain('Tu síntesis funcional.');
    expect(html).toContain('aún no detecta raíces');
    expect(html).toContain('Sin síntesis disponible');
    expect(html).not.toContain('Cómo subir de nivel');
  });
});
