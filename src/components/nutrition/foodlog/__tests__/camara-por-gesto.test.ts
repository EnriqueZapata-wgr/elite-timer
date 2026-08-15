/**
 * NOCHE-1 — la cámara se abre por un gesto, nunca por montar una pantalla.
 *
 * Candado estático sobre el código fuente, al estilo de mb30b-nativo: esto no
 * se puede probar de verdad sin un teléfono, pero sí se puede impedir que
 * alguien vuelva a poner la llamada suelta en un efecto de montaje.
 *
 * Por qué importa: /food-scan y /food-barcode redirigen a /food-log con el
 * sensor en el parámetro de la ruta. Si el panel abre la cámara al montar,
 * cualquier deep link secuestra la cámara del sistema sin que nadie la haya
 * pedido, y todo barrido automatizado de rutas se cae al pasar por ahí.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const leer = (...partes: string[]) => readFileSync(join(process.cwd(), ...partes), 'utf8');

const PHOTO = leer('src', 'components', 'nutrition', 'foodlog', 'PhotoSensor.tsx');
const BARCODE = leer('src', 'components', 'nutrition', 'foodlog', 'BarcodeSensor.tsx');
const CARCASA = leer('app', 'food-log.tsx');
const TIPOS = leer('src', 'components', 'nutrition', 'foodlog', 'types.ts');

/** Quita comentarios de línea y de bloque para no medir la documentación. */
function sinComentarios(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('la cámara solo se abre por gesto', () => {
  it('el panel de foto NO llama a la cámara sin condición al montar', () => {
    const codigo = sinComentarios(PHOTO);
    // La forma exacta que rompía: un efecto de montaje que abre y ya.
    expect(codigo).not.toMatch(/useEffect\(\s*\(\)\s*=>\s*\{\s*openCamera\(\)\s*;?\s*\}\s*,\s*\[\s*\]\s*\)/);
    // Y la que queremos: abrir solo si el sensor se eligió tocando su chip.
    expect(codigo).toMatch(/if\s*\(\s*porGesto\s*\)\s*openCamera\(\)/);
  });

  it('el panel de código de barras no abre nada al montar', () => {
    const codigo = sinComentarios(BARCODE);
    expect(codigo).not.toContain('useEffect');
  });

  it('expo-camera se carga perezoso, nunca en el import de arriba', () => {
    // Un import de arriba truena el binario que no trae el módulo, aunque
    // nadie entre a escanear.
    expect(sinComentarios(BARCODE)).not.toMatch(/^\s*import .* from ['"]expo-camera['"]/m);
    expect(sinComentarios(BARCODE)).toMatch(/require\(['"]expo-camera['"]\)/);
  });

  it('la carcasa distingue el gesto del parámetro de la ruta', () => {
    const codigo = sinComentarios(CARCASA);
    // Al montar arranca en false: el sensor inicial viene de la URL.
    expect(codigo).toMatch(/useState\(false\)/);
    expect(codigo).toContain('setSensorPorGesto(true)');
    expect(codigo).toContain('porGesto: sensorPorGesto');
  });

  it('porGesto es parte del contrato de los tres paneles', () => {
    expect(sinComentarios(TIPOS)).toMatch(/porGesto:\s*boolean/);
  });
});
