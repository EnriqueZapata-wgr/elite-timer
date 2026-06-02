import { defineConfig } from 'vitest/config';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Alias `@` → raíz del proyecto (espeja tsconfig "paths": { "@/*": ["./*"] }).
// Necesario para que los imports `@/src/...` resuelvan bajo Vitest.
const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': projectRoot,
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'src/engine/__tests__/**'], // engine.test.ts existente NO se toca
    environment: 'node',
    globals: false,
  },
});
