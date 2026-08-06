/**
 * Contrato del registro de packs (MB-25 Pieza 1 / Pieza 6.1).
 *
 * Un pack con una llave rota debe tronar AQUÍ, en CI, no en producción:
 * cada appKey de cada pack existe en APP_REGISTRY, cada electron key existe
 * en ELECTRON_WEIGHTS. Mutar una llave a algo inexistente truena.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PACKS, PACK_BY_KEY, habitosPorIntensidad } from '@/src/constants/packs';
import { APP_BY_KEY } from '@/src/constants/app-registry';
import { ELECTRON_WEIGHTS } from '@/src/constants/electrons';
import { hasAppIcon } from '@/src/components/ui/app-icon-names';

describe('contrato del registro de packs', () => {
  it('hay cinco packs con llave única', () => {
    expect(PACKS.length).toBe(5);
    expect(Object.keys(PACK_BY_KEY).length).toBe(5);
  });

  it('cada appKey de cada pack existe en APP_REGISTRY', () => {
    for (const pack of PACKS) {
      for (const appKey of pack.instala) {
        expect(APP_BY_KEY[appKey], `${pack.key} instala "${appKey}"`).toBeTruthy();
      }
    }
  });

  it('cada electron de cada pack existe en ELECTRON_WEIGHTS', () => {
    for (const pack of PACKS) {
      for (const h of pack.enciende) {
        expect(
          ELECTRON_WEIGHTS[h.electron],
          `${pack.key} enciende "${h.electron}"`,
        ).toBeTruthy();
      }
    }
  });

  it('cada pack tiene exactamente 3 hábitos core (los de "suave")', () => {
    for (const pack of PACKS) {
      const core = pack.enciende.filter((h) => h.core);
      expect(core.length, `cores de ${pack.key}`).toBe(3);
      expect(habitosPorIntensidad(pack, 'suave')).toEqual(core);
      expect(habitosPorIntensidad(pack, 'con_todo')).toEqual(pack.enciende);
    }
  });

  it('cada icono de pack resuelve en el mapa de iconos', () => {
    for (const pack of PACKS) {
      expect(hasAppIcon(pack.icon), `icono de ${pack.key}: "${pack.icon}"`).toBe(true);
    }
  });

  it('sin duplicados: ni apps ni electrones repetidos dentro de un pack', () => {
    for (const pack of PACKS) {
      expect(new Set(pack.instala).size, `instala de ${pack.key}`).toBe(pack.instala.length);
      const keys = pack.enciende.map((h) => h.electron);
      expect(new Set(keys).size, `enciende de ${pack.key}`).toBe(keys.length);
    }
  });

  it('cada aviso apunta a una app que el pack instala', () => {
    for (const pack of PACKS) {
      for (const aviso of pack.avisos) {
        expect(
          pack.instala.includes(aviso.app),
          `aviso de ${pack.key} a "${aviso.app}"`,
        ).toBe(true);
      }
    }
  });

  it('las horas relativas son razonables (offset dentro de un día)', () => {
    for (const pack of PACKS) {
      const horas = [
        ...pack.enciende.flatMap((h) => (h.hora ? [h.hora] : [])),
        ...pack.avisos.map((a) => a.hora),
      ];
      for (const hora of horas) {
        expect(Math.abs(hora.offsetMin), `${pack.key}`).toBeLessThanOrEqual(12 * 60);
      }
    }
  });

  // Regla del brief: cero em dash en copy visible, y ningún pack nombra
  // enfermedad, diagnóstico ni tratamiento — ni en nombre, ni en copy, ni
  // en comentario de código visible (criterio MedicalDisclaimer).
  const prohibidas = /diabetes|ansiedad|insomnio|depresi[oó]n|hipertensi|tiroid|resistencia a la insulina|tratamiento|diagn[oó]stico|enfermedad|\bcurar?\b/i;

  it('el copy no usa em dash ni nombra padecimientos', () => {
    for (const pack of PACKS) {
      const copy = [pack.nombre, pack.paraQuien, pack.queEsperar, pack.argosFoco].join(' ');
      expect(copy.includes('—'), `em dash en ${pack.key}`).toBe(false);
      expect(prohibidas.test(copy), `palabra roja en ${pack.key}: ${copy.match(prohibidas)?.[0] ?? ''}`).toBe(false);
    }
  });

  it('el archivo completo (comentarios incluidos) no nombra padecimientos', () => {
    const src = readFileSync('src/constants/packs.ts', 'utf8');
    expect(prohibidas.test(src), `palabra roja en packs.ts: ${src.match(prohibidas)?.[0] ?? ''}`).toBe(false);
  });
});
