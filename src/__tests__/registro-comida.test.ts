/**
 * MB-28A P3 — el contrato del registro de comida.
 * MB-28B P4 — el sensor de código entra al MISMO contrato, cero excepciones.
 * Sus candados propios (caída a manual, sin juicio moral) viven en
 * mb28b-etiquetas.test.ts.
 *
 * OLA3 — el registro dejó de ser cuatro pantallas sueltas. Ahora es UNA
 * carcasa (app/food-log.tsx) con tres paneles de sensor; food-scan,
 * food-text, food-register y food-barcode quedaron como redirects para no
 * romper los deep links viejos. El contrato no cambió, cambió dónde vive:
 * los candados leen la carcasa y los tres sensores.
 *
 * Cuatro candados, estilo censo (leen el fuente bajo node, sin montar RN):
 *   0. Las cuatro rutas viejas siguen siendo puro redirect a la carcasa y no
 *      guardan nada por su cuenta. Si alguien les devuelve lógica, vuelven
 *      las cuatro copias que OLA3 juntó.
 *   1. Modo simple/completo: la carcasa y los TRES sensores leen
 *      useNutritionMode y gatean con él. Mutar uno para que lo ignore truena
 *      — así murió la mentira de "modo completo" que solo afectaba a la foto
 *      (bug 8 del recorrido).
 *   2. Tipo de comida por hora: lo resuelve la carcasa UNA vez, con
 *      defaultMealTypeByHour de meal-times-core (NOCTURNO B7 lo desduplicó),
 *      y baja a los tres sensores por prop. A la misma hora, los tres
 *      resuelven igual porque es literalmente el mismo valor.
 *   3. Ruta única a food_logs: el ÚNICO módulo que escribe (insert/update/
 *      upsert/delete) en food_logs es food-log-service (MB-8 Track A). El
 *      camino rápido de frecuentes pasa por ahí igual que el largo — nada de
 *      rutas paralelas que pierdan datos.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';

const read = (f: string) => readFileSync(f, 'utf8');

/** La carcasa: barra de tipo de comida, hora, zona de un toque y sensores. */
const CARCASA = 'app/food-log.tsx';

/** Los tres paneles de sensor. Lo único que de verdad los distingue. */
const SENSORES = [
  'src/components/nutrition/foodlog/TextSensor.tsx',
  'src/components/nutrition/foodlog/PhotoSensor.tsx',
  'src/components/nutrition/foodlog/BarcodeSensor.tsx',
];

/** Las cuatro superficies donde hoy vive el registro. */
const SUPERFICIES = [CARCASA, ...SENSORES];

/** Las rutas viejas, ya sin lógica: solo puerta de entrada. */
const REDIRECTS = [
  'app/food-scan.tsx',
  'app/food-text.tsx',
  'app/food-register.tsx',
  'app/food-barcode.tsx',
];

// ─── 0. Las rutas viejas son puerta, no pantalla ────────────────────────────

describe('las cuatro rutas viejas quedaron como redirect', () => {
  it.each(REDIRECTS)('%s redirige y no guarda nada por su cuenta', (file) => {
    const src = read(file);
    expect(src, `${file} dejó de ser redirect`).toContain('<Redirect');
    expect(src, `${file} no lleva a la carcasa`).toMatch(/pathname: '\/(food-log|supplements)'/);
    // Si a un stub le vuelve la lógica, vuelven las cuatro copias que OLA3
    // juntó: nadie escribe comida desde una puerta.
    expect(src, `${file} volvió a guardar comida`).not.toContain('saveFoodLog');
    expect(src, `${file} volvió a tocar food_logs`).not.toContain("from('food_logs')");
  });
});

// ─── 1. La carcasa y los tres sensores leen el modo ─────────────────────────

describe('modo simple/completo — las cuatro superficies lo respetan', () => {
  it.each(SUPERFICIES)('%s lee useNutritionMode', (file) => {
    const src = read(file);
    expect(src, `${file} no importa useNutritionMode`).toContain(
      "from '@/src/hooks/useNutritionMode'",
    );
    expect(src, `${file} importa el hook pero no lo llama`).toContain('useNutritionMode()');
  });

  it.each(SUPERFICIES)('%s gatea comportamiento con el modo (no solo lo lee)', (file) => {
    // Leer el hook y tirar el valor sería otra forma de ignorarlo: se exige
    // al menos una comparación real contra 'simple' o 'complete'.
    const src = read(file);
    const gates = src.match(/nutritionMode === '(simple|complete)'/g) ?? [];
    expect(gates.length, `${file} no compara nutritionMode contra ningún modo`).toBeGreaterThan(0);
  });
});

// ─── 2. El tipo de comida por hora: un solo helper, un solo resolvedor ──────

describe('tipo de comida por hora — compartido, no duplicado', () => {
  it('la carcasa usa defaultMealTypeByHour de meal-times-core', () => {
    const src = read(CARCASA);
    expect(src, 'la carcasa no usa el helper compartido').toContain('defaultMealTypeByHour');
    expect(src, 'la carcasa lo importa de otro lado').toMatch(
      /import \{[^}]*defaultMealTypeByHour[^}]*\} from '@\/src\/services\/meal-times-core'/,
    );
    // La ventana del usuario primero, el reloj como respaldo.
    expect(src, 'se perdió el respaldo del reloj').toContain('?? defaultMealTypeByHour()');
  });

  it.each(SENSORES)('%s recibe el tipo de comida, no lo resuelve', (file) => {
    const src = read(file);
    expect(src, `${file} no toma mealType del contrato de panel`).toMatch(
      /\{[^}]*\bmealType\b[^}]*\}: SensorPanelProps/,
    );
    // Importarlo sería resolverlo por su cuenta y volver a abrir la puerta a
    // que dos sensores contesten distinto a la misma hora. (Se mira el
    // import, no la mención: los headers documentan la regla.)
    expect(src, `${file} resuelve el tipo por su cuenta`).not.toMatch(
      /import \{[^}]*defaultMealTypeByHour[^}]*\} from/,
    );
  });

  it('ninguna superficie redefine el mapa hora→comida a mano', () => {
    // La firma de la duplicación que B7 mató: un if de rangos horarios que
    // devuelve un meal type, viviendo en la pantalla.
    for (const file of [...SUPERFICIES, ...REDIRECTS]) {
      const src = read(file);
      expect(src, `${file} trae su propio mapa hora→comida`).not.toMatch(
        /hour\s*>=\s*\d+\s*&&\s*hour\s*<\s*\d+.*return\s*'(breakfast|lunch|dinner|snack)/s,
      );
    }
  });
});

// ─── 3. food_logs tiene UNA sola puerta de escritura ────────────────────────

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '__tests__') continue;
      walk(p, out);
    } else if (/\.tsx?$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

describe('food_logs — ruta única de escritura', () => {
  const WRITER = 'src/services/food-log-service.ts';
  /** Deuda documentada (hallazgo P3 MB-28A): nutrition-service conserva
   * logFood/updateFoodLog/deleteFoodLog SOLO para el panel de coach
   * (ClientDetailScreen registra/edita comidas DE UN CLIENTE). Migrarlo es
   * de un run del panel de coach, no de este; mientras tanto el candado de
   * abajo impide que una pantalla consumer vuelva a importarlos. */
  const LEGACY_COACH_WRITER = 'src/services/nutrition-service.ts';

  it('solo food-log-service (y el legacy del coach) escriben en food_logs', () => {
    const files = [...walk('app'), ...walk('src')].map((f) => f.split(sep).join('/'));
    const violaciones: string[] = [];
    for (const f of files) {
      if (f === WRITER || f === LEGACY_COACH_WRITER) continue;
      const src = read(f);
      let idx = src.indexOf("from('food_logs')");
      while (idx !== -1) {
        // Ventana tras el from(): si en la cadena viene una mutación, es una
        // ruta paralela. Los reads (select/order/eq) son legítimos donde sea.
        const ventana = src.slice(idx, idx + 220);
        if (/\.(insert|upsert|update|delete)\s*\(/.test(ventana)) {
          violaciones.push(`${f} muta food_logs directo — usa saveFoodLog/deleteFoodLogChecked`);
        }
        idx = src.indexOf("from('food_logs')", idx + 1);
      }
    }
    expect(violaciones).toEqual([]);
  });

  it('los writers legacy del coach no vuelven a una pantalla consumer', () => {
    const files = [...walk('app'), ...walk('src')].map((f) => f.split(sep).join('/'));
    const violaciones: string[] = [];
    for (const f of files) {
      // WRITER se excluye porque su header DOCUMENTA la historia de logFood.
      if (f === WRITER || f === LEGACY_COACH_WRITER || f === 'src/screens/coach/ClientDetailScreen.tsx') continue;
      const src = read(f);
      for (const legacy of ['logFood', 'updateFoodLog', 'deleteFoodLog']) {
        // Palabra exacta: deleteFoodLogChecked (el writer bueno) no matchea.
        if (new RegExp(`\\b${legacy}\\b(?!Checked)`).test(src)) {
          violaciones.push(`${f} usa ${legacy} — el camino consumer es food-log-service`);
        }
      }
    }
    expect(violaciones).toEqual([]);
  });

  it('el guardado único existe y emite day_changed (regla #6)', () => {
    const src = read(WRITER);
    expect(src).toContain("from('food_logs')");
    expect(src).toContain("DeviceEventEmitter.emit('day_changed')");
  });

  it('el camino rápido (frecuentes) declara su source en el contrato del writer', () => {
    // 'frequent' es un FoodLogSource del servicio único: el camino de un toque
    // queda etiquetado y auditable, no es un insert anónimo. La zona de un
    // toque se mudó de food-register a la carcasa, el source no.
    expect(read(WRITER)).toMatch(/'frequent'/);
    expect(read(CARCASA)).toContain("source: 'frequent'");
  });
});
