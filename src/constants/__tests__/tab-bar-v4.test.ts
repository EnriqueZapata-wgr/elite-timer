/**
 * Navegacion v4 (8-oct-2026 (v4)): Hoy, Plan, ARGOS, Perfil y Apps. Lo que
 * importa: el orden de la barra, ARGOS al centro con su etiqueta, que toda
 * ruta de (tabs) quede declarada (una sin declarar saldria sola en la barra),
 * que no haya glifos nuevos, y que Elite DX clasica y la ATP completa sigan
 * con su barra de siempre. Ver "R and D/ATP_V4_PLAN.md".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import {
  TAB_BAR_ICONS,
  TABS_V4,
  TABS_OCULTAS_V4,
  TABS_OCULTAS_POR_VISTA,
  ARGOS_V4_A11Y,
  vistaDeTabs,
  vistaDeSalud,
} from '../tab-bar';
import { pasosOrbTour, ORB_TOUR_STEPS } from '@/src/components/tour/orb-tour-core';
import { tourDeRutaSegunPresentacion, TOURS_POR_PANTALLA } from '@/src/components/tour/tours-por-pantalla';

const RUTAS_TABS = readdirSync('app/(tabs)')
  .filter((f) => f.endsWith('.tsx') && f !== '_layout.tsx')
  .map((f) => f.replace(/\.tsx$/, ''))
  .sort();

describe('iconos v4: reusan glifos, sin SVG nuevo', () => {
  it('Plan, Perfil y Apps usan los glifos de MI PROGRAMA, SALUD y ATP', () => {
    expect(TAB_BAR_ICONS.plan).toEqual(TAB_BAR_ICONS.programa);
    expect(TAB_BAR_ICONS.perfil).toEqual(TAB_BAR_ICONS.salud);
    expect(TAB_BAR_ICONS.apps).toEqual(TAB_BAR_ICONS.atp);
  });
});

describe('barra v4', () => {
  it('en orden: Hoy, Plan, ARGOS, Perfil, Apps', () => {
    expect(TABS_V4.map((t) => t.name)).toEqual(['index', 'programa', 'argos', 'salud', 'kit']);
    expect(TABS_V4.map((t) => t.title)).toEqual(['Hoy', 'Plan', '', 'Perfil', 'Apps']);
  });
  it('ARGOS va al centro, sin glifo, y se anuncia como "Hablar con ARGOS"', () => {
    expect(TABS_V4[2].name).toBe('argos');
    expect(TABS_V4[2].icon).toBeNull();
    expect(ARGOS_V4_A11Y).toBe('Hablar con ARGOS');
  });
  it('las demas salas tienen glifo del registro', () => {
    for (const t of TABS_V4) if (t.icon !== null) expect(TAB_BAR_ICONS[t.icon]).toBeDefined();
  });
  it('toda ruta de (tabs) se declara una sola vez (visible u oculta)', () => {
    const declaradas = [...TABS_V4.map((t) => t.name), ...TABS_OCULTAS_V4].map(String);
    expect(new Set(declaradas).size).toBe(declaradas.length);
    expect([...declaradas].sort()).toEqual(RUTAS_TABS);
  });
});

describe('salas ocultas por vista (RedirectPorModo)', () => {
  it('la v4 esconde Progreso, Tu y Tribu, y nunca una de sus cinco', () => {
    expect([...TABS_OCULTAS_POR_VISTA.v4].sort()).toEqual(['/progreso', '/tribu', '/tu']);
    for (const t of TABS_V4) expect(TABS_OCULTAS_POR_VISTA.v4.has(`/${t.name}`)).toBe(false);
  });
  it('Elite DX clasica y la ATP completa, como el 26-sep', () => {
    expect([...TABS_OCULTAS_POR_VISTA.elite_dx].sort()).toEqual(['/kit', '/salud', '/tribu']);
    expect([...TABS_OCULTAS_POR_VISTA.atp].sort()).toEqual(['/programa', '/progreso', '/tu']);
  });
  it('vistaDeTabs: sin Elite DX nunca hay v4', () => {
    expect(vistaDeTabs(false, true)).toBe('atp');
    expect(vistaDeTabs(false, false)).toBe('atp');
    expect(vistaDeTabs(true, false)).toBe('elite_dx');
    expect(vistaDeTabs(true, true)).toBe('v4');
  });
});

describe('/salud en la v4: Perfil, sin perder el hub', () => {
  it('fuera de la v4 siempre es el hub', () => {
    expect(vistaDeSalud(false, undefined)).toBe('hub');
    expect(vistaDeSalud(false, 'expediente')).toBe('hub');
  });
  it('en la v4, sin seccion es el Perfil', () => {
    expect(vistaDeSalud(true, undefined)).toBe('perfil');
    expect(vistaDeSalud(true, null)).toBe('perfil');
    expect(vistaDeSalud(true, '')).toBe('perfil');
  });
  it('en la v4, con seccion (hub, expediente, hoy, evolucion) es el hub', () => {
    for (const s of ['hub', 'expediente', 'hoy', 'evolucion']) expect(vistaDeSalud(true, s)).toBe('hub');
    expect(vistaDeSalud(true, ['expediente'])).toBe('hub');
  });
  it('la ruta usa la regla y el tab de Perfil limpia los params al tocarlo', () => {
    expect(readFileSync('app/(tabs)/salud.tsx', 'utf8')).toContain('vistaDeSalud(v4, seccion)');
    const layout = readFileSync('app/(tabs)/_layout.tsx', 'utf8');
    expect(layout).toContain("listeners={t.name === 'salud' ? limpiarParamsAlTocar : undefined}");
  });
});

describe('tours en la v4: nada de la Salud clasica encima del Perfil', () => {
  it('el tour de la orbe salta los pasos de /salud solo en la v4', () => {
    expect(pasosOrbTour(false)).toEqual(ORB_TOUR_STEPS);
    const v4 = pasosOrbTour(true);
    expect(v4.some((p) => p.route === '/salud')).toBe(false);
    expect(v4.length).toBe(ORB_TOUR_STEPS.filter((p) => p.route !== '/salud').length);
    expect(v4.length).toBeGreaterThan(0);
  });
  it('la pieza de /salud no sale en la v4; las demas si', () => {
    const salud = TOURS_POR_PANTALLA.find((t) => t.ruta === '/salud') ?? null;
    expect(salud).not.toBeNull();
    expect(tourDeRutaSegunPresentacion(salud, '/salud', true)).toBeNull();
    expect(tourDeRutaSegunPresentacion(salud, '/salud', false)).toBe(salud);
    const otra = TOURS_POR_PANTALLA.find((t) => t.ruta === '/kit') ?? null;
    expect(tourDeRutaSegunPresentacion(otra, '/kit', true)).toBe(otra);
  });
});

describe('el layout de tabs', () => {
  const src = readFileSync('app/(tabs)/_layout.tsx', 'utf8');
  it('la v4 tiene su barra propia, con historia y boton elevado', () => {
    expect(src).toContain('useEsV4');
    expect(src).toContain('key="tabs-v4"');
    expect(src).toContain('backBehavior="history"');
    expect(src).toContain('tabBarButton');
    expect(src).toContain("overflow: 'visible'");
    expect(src).toMatch(/v4 \? <TabsV4 \/> :/);
  });
  it('la barra clasica sigue igual (sus llaves y su backBehavior)', () => {
    expect(src).toContain("key={eliteDx ? 'tabs-elite-dx' : 'tabs-atp'}");
    expect(src).toContain("backBehavior={eliteDx ? 'history' : 'firstRoute'}");
    expect(src).toContain("tabBarAccessibilityLabel: 'ARGOS'");
  });
});

describe('las rutas de la v4', () => {
  it('Perfil (salud) pinta PerfilV4Screen en el mismo TabScreen themed y con el disclaimer', () => {
    const src = readFileSync('app/(tabs)/salud.tsx', 'utf8');
    expect(src).toContain('<TabScreen themed>');
    expect(src).toContain('<MedicalDisclaimerGate>');
    expect(src).toContain('<PerfilV4Screen />');
    expect(src).toContain('<SaludHub />');
  });
  it('Plan (programa) envuelve PlanV4Screen en TabScreen themed; fuera de v4, MiProgramaScreen', () => {
    const src = readFileSync('app/(tabs)/programa.tsx', 'utf8');
    expect(src).toMatch(/<TabScreen themed>[\s\S]*<PlanV4Screen \/>[\s\S]*<\/TabScreen>/);
    expect(src).toContain('<MiProgramaScreen />');
    expect(src).toContain('useAppTheme(');
  });
  it('Apps (kit) dice APPS y lleva las recomendadas solo en la v4', () => {
    const src = readFileSync('app/(tabs)/kit.tsx', 'utf8');
    expect(src).toContain("{v4 ? 'APPS' : 'ATP'}");
    expect(src).toContain('{v4 && !searching && <AppsRecomendadas />}');
  });
  it('Ajustes tiene el bloque PRESENTACIÓN, solo admin, que guarda y vuelve a HOY', () => {
    const src = readFileSync('app/settings.tsx', 'utf8');
    expect(src).toContain('<SectionLabel>PRESENTACIÓN</SectionLabel>');
    expect(src).toContain('APP_ELITE_DX && NAV_V4 && isAdmin(user?.id)');
    expect(src).toMatch(/fijarPreferenciaPresentacion\(p\);\s*guardarPreferenciaPresentacion\(p\);\s*router\.replace\('\/'\);/);
  });
});
