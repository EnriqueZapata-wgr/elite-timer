import { defineConfig } from 'vitest/config';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Alias `@` → raíz del proyecto (espeja tsconfig "paths": { "@/*": ["./*"] }).
// Necesario para que los imports `@/src/...` resuelvan bajo Vitest.
const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Batch 3: stub de imágenes — permite testear módulos con require() de assets
  // (p.ej. brand.ts BG_IMAGES) sin transform nativo de Metro.
  plugins: [
    {
      name: 'stub-image-assets',
      enforce: 'pre' as const,
      resolveId(source: string) {
        if (/\.(png|jpe?g|gif|webp)$/.test(source)) return '\0stub-image';
      },
      load(id: string) {
        if (id === '\0stub-image' || /\.(png|jpe?g|gif|webp)$/.test(id)) return 'export default 0;';
      },
    },
  ],
  resolve: {
    alias: {
      '@': projectRoot,
    },
  },
  test: {
    // Sprint #50: los helpers puros de edge functions también se testean aquí
    include: ['src/**/__tests__/**/*.test.ts', 'supabase/functions/**/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'src/engine/__tests__/**'], // engine.test.ts existente NO se toca
    environment: 'node',
    globals: false,
  },
});
