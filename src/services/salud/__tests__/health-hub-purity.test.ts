/**
 * Guard de doctrina (Mega-Sprint B B1 · menu_navegacion_vs_consulta_datos):
 * el hub Salud Funcional (health-hub) es MENÚ PURO — cero consulta de datos.
 * Si alguien vuelve a meter un symptom-service / widget de datos en el hub, truena.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

describe('health-hub es menú puro (cero datos de consulta)', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const hub = readFileSync(join(here, '..', '..', '..', '..', 'app', 'health-hub.tsx'), 'utf8');

  it('NO importa ningún servicio de síntomas ni de expediente vivo', () => {
    const forbidden = [
      'clinical-history-service', 'sintomas-service', 'user-symptoms-service',
      'loadSymptoms', 'loadUserSymptoms', 'buildExecutiveSummary', 'groupSymptomsBySystem',
    ];
    for (const f of forbidden) {
      expect(hub.includes(f), `health-hub no debe referir "${f}" (dato en el menú)`).toBe(false);
    }
  });

  it('NO renderiza un widget de sistemas funcionales con quick-add', () => {
    expect(hub.includes('FUNCTIONAL_SYSTEMS')).toBe(false);
    expect(hub.includes('quick-add') || hub.includes('addSymptom')).toBe(false);
  });
});
