/**
 * pg-number — el ÚNICO lugar donde un número que viene de la base se vuelve
 * número de JavaScript. Puro: sin supabase, sin React.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LEE ESTO ANTES DE "ARREGLAR" 70 FILTROS
 * ─────────────────────────────────────────────────────────────────────────
 * Circula la creencia de que PostgREST devuelve las columnas `numeric` y
 * `decimal` como STRING, y que por lo tanto todo `typeof x === 'number'` en el
 * repo está roto. ES FALSO, y verificarlo cuesta una consulta.
 *
 * PostgREST no serializa el JSON en JavaScript: se lo pide a Postgres con
 * `json_agg`. Y `to_json(numeric)` emite un NÚMERO JSON, sin comillas. Corrido
 * contra la base de producción:
 *
 *   select (row_to_json(t))::text from (
 *     select 51.6::numeric as a, 51.6::decimal(5,1) as b, 5::int as c
 *   ) t;
 *   -- {"a":51.6,"b":51.6,"c":5}
 *
 * Y sobre la fila real del expediente del dueño:
 *   {"lab_date":"2026-06-12","vitamin_d":51.6,"hba1c":5.4,"ferritin":166.13,...}
 *
 * Sin comillas. `JSON.parse` los entrega como number y `typeof` da 'number'.
 * La confusión viene de mirar la respuesta en una consola SQL o en un MCP que
 * envuelve la fila entera como texto: ahí TODO sale entrecomillado, incluidos
 * los enteros. Eso no es lo que viaja por el cable.
 *
 * (La creencia sí es cierta en OTROS stacks: el driver `pg` de Node devuelve
 * numeric como string para no perder precisión, y JDBC lo da como BigDecimal.
 * Pero la app no usa ninguno de los dos: usa PostgREST.)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ENTONCES PARA QUÉ EXISTE ESTE ARCHIVO
 * ─────────────────────────────────────────────────────────────────────────
 * Porque no todo lo que parece número llega por PostgREST, y esos caminos SÍ
 * entregan texto de verdad:
 *
 *   · JSONB (`extracted_data`, `goals`, `roots_detected`): lo que se guardó es
 *     lo que sale, y ahí un `"5.5"` guardado como texto vuelve como texto.
 *   · El parser de laboratorios por IA: el modelo devuelve JSON libre y a veces
 *     escribe "51.6" con comillas.
 *   · Captura manual desde inputs de React Native: `TextInput` da string.
 *
 * Y porque el modo en que esto falló una vez es demasiado caro para repetirlo:
 * `construirHistorias` descarta con `Number.isFinite` y `dedupeLatestByKey`
 * también. Si alguno de esos dos recibiera texto, el expediente completo de
 * laboratorio del usuario desaparecería del motor y de ARGOS sin un solo error
 * en consola. Un "no sé" es recuperable; un dato incompleto dicho con
 * confianza no.
 *
 * Por eso la coerción vive AQUÍ, en una función con nombre y con pruebas, y se
 * aplica en los dos cuellos de botella por donde entran los labs. No en 70
 * filtros sueltos, que es justo lo que produce el problema inverso: setenta
 * criterios distintos que nadie puede auditar.
 */

/**
 * Convierte a número lo que venga de la base. Devuelve `null` cuando no hay un
 * número honesto que devolver, que es distinto de devolver 0.
 *
 * Acepta:
 *   · number finito → tal cual (el caso normal de PostgREST)
 *   · string numérica → convertida (jsonb, parser IA, inputs)
 *
 * Rechaza (→ null): null, undefined, NaN, Infinity, '', '   ', booleanos,
 * objetos, arreglos y cualquier texto que no sea un número completo.
 *
 * NO se acepta booleano a propósito: `Number(true) === 1` es la clase de
 * coerción silenciosa que convierte un bug en un dato plausible.
 */
export function numeroDePg(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** `numeroDePg` con valor por defecto, para cuando el 0 sí es la respuesta correcta. */
export function numeroDePgO(v: unknown, porDefecto: number): number {
  const n = numeroDePg(v);
  return n === null ? porDefecto : n;
}

/** ¿Esto es un número utilizable, venga como venga? Reemplaza `typeof x === 'number'`
 *  SOLO en los bordes donde el dato puede llegar como texto (jsonb, IA, inputs). */
export function esNumeroUtil(v: unknown): boolean {
  return numeroDePg(v) !== null;
}
