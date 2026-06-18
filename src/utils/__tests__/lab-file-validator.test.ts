import { describe, it, expect } from 'vitest';
import { validateLabFile, countPdfPages, isPdfEncrypted, LAB_MAX_FILE_BYTES } from '@/src/utils/lab-file-validator';

const b64 = (s: string) => btoa(s);
const MB = 1024 * 1024;

describe('lab-file-validator — countPdfPages', () => {
  it('lee /Count N del árbol de páginas', () => {
    expect(countPdfPages(b64('%PDF-1.4 /Type /Pages /Count 10'))).toBe(10);
  });
  it('toma el mayor /Count (root)', () => {
    expect(countPdfPages(b64('/Count 1 ... /Count 12 ... /Count 3'))).toBe(12);
  });
  it('fallback: cuenta /Type /Page (no /Pages)', () => {
    expect(countPdfPages(b64('/Type /Page x /Type /Page y /Type /Pages'))).toBe(2);
  });
  it('sin info de páginas → null', () => {
    expect(countPdfPages(b64('not a pdf'))).toBeNull();
  });
});

describe('lab-file-validator — isPdfEncrypted', () => {
  it('detecta /Encrypt', () => { expect(isPdfEncrypted(b64('%PDF /Encrypt 5 0 R'))).toBe(true); });
  it('PDF normal → false', () => { expect(isPdfEncrypted(b64('%PDF /Count 3'))).toBe(false); });
});

describe('lab-file-validator — validateLabFile', () => {
  it('oversize (>20MB) → error duro', () => {
    const r = validateLabFile(b64('x'), 'pdf', LAB_MAX_FILE_BYTES + 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.severity).toBe('error');
  });
  it('PDF protegido → error duro', () => {
    const r = validateLabFile(b64('%PDF /Encrypt 1 0 R /Count 3'), 'pdf', 1 * MB);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/contraseña/i);
  });
  it('PDF > 50 páginas → error duro', () => {
    const r = validateLabFile(b64('/Type /Pages /Count 60'), 'pdf', 2 * MB);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/máx 50/);
  });
  it('PDF 21-50 páginas → ok con needsConfirm', () => {
    const r = validateLabFile(b64('/Type /Pages /Count 30'), 'pdf', 2 * MB);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.needsConfirm).toBe(true); expect(r.pageCount).toBe(30); }
  });
  it('PDF ≤20 páginas → ok sin confirm', () => {
    const r = validateLabFile(b64('/Type /Pages /Count 8'), 'pdf', 1 * MB);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.needsConfirm).toBeUndefined(); expect(r.pageCount).toBe(8); }
  });
  it('PDF sin conteo → ok (mejor procesar que bloquear)', () => {
    expect(validateLabFile(b64('garbage'), 'pdf', 1 * MB).ok).toBe(true);
  });
  it('imagen pesada (>8MB) → ok con info', () => {
    const r = validateLabFile(b64('x'), 'image', 9 * MB);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.info).toMatch(/pesada/i);
  });
  it('imagen normal → ok', () => {
    const r = validateLabFile(b64('x'), 'image', 2 * MB);
    expect(r.ok).toBe(true);
  });
});
