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

/** Una llamada a una función de la base (RPC), con sus parámetros. */
export interface FakeRpcCall {
  fn: string;
  params: Record<string, unknown> | undefined;
}

export interface FakeSupabase {
  from: (table: string) => any;
  /**
   * 22-ago-2026: el colector de laboratorios dejó de escribir directo a la
   * tabla y ahora pasa por funciones de la base (migración 308), porque la
   * regla de "un solo valor vivo por dato y fecha" tiene que vivir donde no
   * se pueda esquivar. Los tests necesitan poder afirmar QUÉ función se llamó
   * y con qué parámetros, igual que ya afirmaban la forma de un insert.
   */
  rpc: (fn: string, params?: Record<string, unknown>) => Promise<FakeResp>;
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
  /** Tablas consultadas, en orden. */
  queried: string[];
  /** MB-28A P3: cada método encadenado con sus args (p.ej. el payload de un
   * .insert(...)) — permite afirmar la FORMA de lo escrito, no solo la tabla. */
  calls: FakeCall[];
  /** Llamadas a funciones de la base, en orden. */
  rpcCalls: FakeRpcCall[];
}

export function makeFakeSupabase(
  byTable: Record<string, FakeResp | FakeResp[]>,
  userId: string | null = 'user-test',
  /** Respuesta por nombre de función. Sin entrada → {data:'escrito', error:null}. */
  byRpc: Record<string, FakeResp | FakeResp[]> = {},
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

  const rpcCalls: FakeRpcCall[] = [];
  const pendingRpc = new Map<string, FakeResp[]>();
  for (const [fn, r] of Object.entries(byRpc)) {
    pendingRpc.set(fn, Array.isArray(r) ? [...r] : [r]);
  }

  const rpc = async (fn: string, params?: Record<string, unknown>): Promise<FakeResp> => {
    rpcCalls.push({ fn, params });
    const list = pendingRpc.get(fn);
    if (!list || list.length === 0) return { data: 'escrito', error: null };
    return list.length === 1 ? list[0] : list.shift()!;
  };

  return {
    from,
    rpc,
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null } }),
    },
    queried,
    calls,
    rpcCalls,
  };
}
