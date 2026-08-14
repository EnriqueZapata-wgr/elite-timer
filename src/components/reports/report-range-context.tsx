/**
 * ReportRangeContext (OLA1 R-0) — el rango del reporte (Semana/Mes/Año/Todo)
 * compartido por el shell y el contenido del dominio.
 *
 * Se persiste POR DOMINIO: el rango que elegiste en nutrición no le impone
 * nada a ayuno. Un deep link con ?period= gana sobre lo guardado esa vez, pero
 * no lo pisa: si vuelves sin el link, sigue tu preferencia.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  parseRange, resolveRange,
  type ReportDomainKey, type ReportRange, type ResolvedRange,
} from '@/src/services/reports/report-domain-core';

const RANGE_KEY_PREFIX = '@atp/reports_range/';

export function rangeStorageKey(domain: ReportDomainKey): string {
  return `${RANGE_KEY_PREFIX}${domain}`;
}

interface ReportRangeValue {
  range: ReportRange;
  resolved: ResolvedRange;
  setRange: (r: ReportRange) => void;
  /**
   * false mientras se lee la preferencia guardada. Quien consulta datos debe
   * esperar: disparar con el rango equivocado y corregir después es una
   * lectura de más y un parpadeo de números que no son.
   */
  hydrated: boolean;
}

const Ctx = createContext<ReportRangeValue | null>(null);

interface ProviderProps {
  domain: ReportDomainKey;
  /** El ?period= del deep link. Se valida aquí; basura se ignora. */
  seed?: string | null;
  fallback?: ReportRange;
  children: ReactNode;
}

export function ReportRangeProvider({ domain, seed, fallback = 'week', children }: ProviderProps) {
  const seeded = parseRange(seed);
  const [range, setRange] = useState<ReportRange>(seeded ?? fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    // Con deep link no hay nada que esperar: el link ya dijo el rango.
    if (seeded) { setHydrated(true); return () => { alive = false; }; }
    AsyncStorage.getItem(rangeStorageKey(domain))
      .then((raw) => {
        if (!alive) return;
        const saved = parseRange(raw);
        if (saved) setRange(saved);
      })
      .catch(() => { /* sin preferencia guardada se usa el fallback */ })
      .finally(() => { if (alive) setHydrated(true); });
    return () => { alive = false; };
    // seeded se deriva de seed; el dominio no cambia dentro de una pantalla.
  }, [domain, seeded]);

  const value = useMemo<ReportRangeValue>(() => ({
    range,
    resolved: resolveRange(range, new Date()),
    hydrated,
    setRange: (r: ReportRange) => {
      setRange(r);
      AsyncStorage.setItem(rangeStorageKey(domain), r).catch(() => {});
    },
  }), [range, hydrated, domain]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReportRange(): ReportRangeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useReportRange fuera de ReportRangeProvider');
  return v;
}
