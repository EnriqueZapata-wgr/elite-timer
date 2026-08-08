/**
 * Fake encadenable de supabase-js para tests node-only (MB-22.1 P4).
 *
 * Cada `.from(tabla)` devuelve un builder donde CUALQUIER método encadena y
 * el await resuelve la respuesta configurada para esa tabla (o la siguiente
 * de una lista, si la misma tabla se consulta varias veces). Se registran
 * las tablas consultadas: los tests del blindaje del ciclo afirman no solo
 * el resultado, sino QUÉ tablas se tocaron — "no consultó cycle_periods" es
 * parte del contrato.
 */
export interface FakeResp {
  data: unknown;
  error: unknown;
  count?: number | null;
}

/** Llamada registrada sobre el builder: método encadenado + sus argumentos. */
export interface FakeCall {
  table: string;
  method: string;
  args: unknown[];
}

export interface FakeSupabase {
  from: (table: string) => any;
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
  /** Tablas consultadas, en orden. */
  queried: string[];
  /** MB-28A P3: cada método encadenado con sus args (p.ej. el payload de un
   * .insert(...)) — permite afirmar la FORMA de lo escrito, no solo la tabla. */
  calls: FakeCall[];
}

export function makeFakeSupabase(
  byTable: Record<string, FakeResp | FakeResp[]>,
  userId: string | null = 'user-test',
): FakeSupabase {
  const queried: string[] = [];
  const calls: FakeCall[] = [];
  const pending = new Map<string, FakeResp[]>();
  for (const [t, r] of Object.entries(byTable)) {
    pending.set(t, Array.isArray(r) ? [...r] : [r]);
  }

  const from = (table: string) => {
    queried.push(table);
    const respuesta = (): FakeResp => {
      const list = pending.get(table);
      if (!list || list.length === 0) return { data: null, error: null };
      return list.length === 1 ? list[0] : list.shift()!;
    };
    const builder: any = new Proxy(function () {}, {
      get(_target, prop: string | symbol) {
        if (prop === 'then') {
          const p = Promise.resolve(respuesta());
          return p.then.bind(p);
        }
        if (prop === Symbol.toPrimitive || prop === 'toJSON') return undefined;
        return (...args: unknown[]) => {
          calls.push({ table, method: String(prop), args });
          return builder;
        };
      },
    });
    return builder;
  };

  return {
    from,
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null } }),
    },
    queried,
    calls,
  };
}
