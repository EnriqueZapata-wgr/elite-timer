/**
 * brand-palette — los hex primarios de marca como MÓDULO PURO (MB-20 4.4).
 *
 * brand.ts es la fuente de verdad de la paleta completa, pero arrastra
 * require() de imágenes (fondos por hora) y no es importable en los *-core.ts
 * del harness node. Este módulo rompe ese nudo: cero imports, solo los hex
 * que los cores necesitan. brand.ts los importa de aquí — un solo lugar que
 * cambiar, cero espejos a mano.
 */
export const BRAND_LIME = '#A8E02A';
export const BRAND_TEAL = '#1ABC9C';
