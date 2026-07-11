/**
 * Tests de admin-core (Comunidad V1.1 §2.2) — espejos del CHECK de la 191.
 */
import { describe, it, expect } from 'vitest';
import {
  adminDisplayName,
  isValidReportStatus,
  isValidResolution,
  reportReasonLabel,
  REPORT_RESOLUTIONS,
  REPORT_STATUSES,
  REPORT_STATUS_LABELS,
} from '../admin-core';
import { REPORT_REASONS } from '@/src/constants/community';

describe('estados de report (espejo del CHECK de la 191)', () => {
  it('los 4 estados del CHECK son válidos y tienen label en español', () => {
    expect([...REPORT_STATUSES]).toEqual(['open', 'reviewed', 'actioned', 'dismissed']);
    for (const s of REPORT_STATUSES) {
      expect(isValidReportStatus(s)).toBe(true);
      expect(REPORT_STATUS_LABELS[s].length).toBeGreaterThan(0);
    }
  });

  it('estados fuera del set se rechazan', () => {
    expect(isValidReportStatus('resolved')).toBe(false);
    expect(isValidReportStatus('')).toBe(false);
  });
});

describe('resoluciones (subset aplicable desde el panel)', () => {
  it('reviewed/actioned/dismissed son válidas; open NO es una resolución', () => {
    for (const r of REPORT_RESOLUTIONS) {
      expect(isValidResolution(r)).toBe(true);
    }
    expect(isValidResolution('open')).toBe(false);
    expect(isValidResolution('banned')).toBe(false);
  });

  it('toda resolución es también un estado válido', () => {
    for (const r of REPORT_RESOLUTIONS) {
      expect(isValidReportStatus(r)).toBe(true);
    }
  });
});

describe('reportReasonLabel', () => {
  it('mapea cada razón del CHECK de 183 a su label en español', () => {
    for (const { key, label } of REPORT_REASONS) {
      expect(reportReasonLabel(key)).toBe(label);
    }
  });

  it('fail-soft: razón desconocida devuelve la key cruda', () => {
    expect(reportReasonLabel('unknown_reason')).toBe('unknown_reason');
  });
});

describe('adminDisplayName', () => {
  it('prioriza display, cae a username, luego fail-soft', () => {
    expect(adminDisplayName('Ana', 'ana_x')).toBe('Ana');
    expect(adminDisplayName(null, 'ana_x')).toBe('ana_x');
    expect(adminDisplayName(null, null)).toBe('Atleta ATP');
    expect(adminDisplayName('', '')).toBe('Atleta ATP');
  });
});
