import { describe, it, expect } from 'vitest';
import {
  labProcReducer, initialLabProcState, bannerUpload, activeUploads, finishedUploads, activeCount,
  type LabProcState, type ProcessingUpload,
} from '@/src/hooks/lab-processing-reducer';

const up = (id: string, status: ProcessingUpload['status'], at: string): ProcessingUpload => ({
  uploadId: id, fileName: `${id}.pdf`, fileSize: 1000, status, uploadedAt: at,
});

describe('lab-processing-reducer', () => {
  it('upsert agrega un upload', () => {
    const s = labProcReducer(initialLabProcState, { type: 'upsert', upload: up('a', 'pending', '2026-06-18T10:00:00Z') });
    expect(s.uploads.a.status).toBe('pending');
  });

  it('patch actualiza status (vía Realtime)', () => {
    let s = labProcReducer(initialLabProcState, { type: 'upsert', upload: up('a', 'processing', 't1') });
    s = labProcReducer(s, { type: 'patch', uploadId: 'a', changes: { status: 'extracted' } });
    expect(s.uploads.a.status).toBe('extracted');
  });

  it('patch a un id inexistente no rompe', () => {
    const s = labProcReducer(initialLabProcState, { type: 'patch', uploadId: 'x', changes: { status: 'failed' } });
    expect(s).toEqual(initialLabProcState);
  });

  it('openSheet / minimizeSheet / closeSheet', () => {
    let s = labProcReducer(initialLabProcState, { type: 'openSheet', uploadId: 'a' });
    expect(s).toMatchObject({ sheetUploadId: 'a', sheetExpanded: true });
    s = labProcReducer(s, { type: 'minimizeSheet' });
    expect(s).toMatchObject({ sheetUploadId: 'a', sheetExpanded: false });
    s = labProcReducer(s, { type: 'closeSheet' });
    expect(s).toMatchObject({ sheetUploadId: null, sheetExpanded: false });
  });

  it('remove cierra el sheet si era el visible', () => {
    let s = labProcReducer(initialLabProcState, { type: 'upsert', upload: up('a', 'processing', 't1') });
    s = labProcReducer(s, { type: 'openSheet', uploadId: 'a' });
    s = labProcReducer(s, { type: 'remove', uploadId: 'a' });
    expect(s.uploads.a).toBeUndefined();
    expect(s.sheetUploadId).toBeNull();
  });

  it('activeUploads / activeCount = pending+processing', () => {
    let s = labProcReducer(initialLabProcState, { type: 'upsert', upload: up('a', 'processing', 't1') });
    s = labProcReducer(s, { type: 'upsert', upload: up('b', 'pending', 't2') });
    s = labProcReducer(s, { type: 'upsert', upload: up('c', 'extracted', 't3') });
    expect(activeUploads(s).length).toBe(2);
    expect(activeCount(s)).toBe(2);
  });

  it('bannerUpload prioriza terminados sobre activos, más reciente primero', () => {
    let s = labProcReducer(initialLabProcState, { type: 'upsert', upload: up('a', 'processing', '2026-06-18T10:00:00Z') });
    s = labProcReducer(s, { type: 'upsert', upload: up('b', 'extracted', '2026-06-18T09:00:00Z') });
    expect(bannerUpload(s)?.uploadId).toBe('b'); // terminado gana aunque sea más viejo
  });

  it('dismiss saca el terminado del banner', () => {
    let s = labProcReducer(initialLabProcState, { type: 'upsert', upload: up('b', 'extracted', 't1') });
    expect(bannerUpload(s)?.uploadId).toBe('b');
    s = labProcReducer(s, { type: 'dismiss', uploadId: 'b' });
    expect(finishedUploads(s).length).toBe(0);
    expect(bannerUpload(s)).toBeNull();
  });

  it('sin uploads → bannerUpload null', () => {
    expect(bannerUpload(initialLabProcState)).toBeNull();
  });
});
