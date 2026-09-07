/**
 * Contrato del registro de packs (MB-25 Pieza 1 / Pieza 6.1).
 *
 * Un pack con una llave rota debe tronar AQUÍ, en CI, no en producción:
 * cada appKey de cada pack existe en APP_REGISTRY, cada electron key existe
 * en ELECTRON_WEIGHTS. Mutar una llave a algo inexistente truena.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PACKS, PAQUETES_SALUD, PACK_BY_KEY, habitosPorIntensidad } from '@/src/constants/packs';
import { APP_BY_KEY } from '@/src/constants/app-registry';
import { ELECTRON_WEIGHTS } from '@/src/constants/electrons';
import { hasAppIcon } from '@/src/components/ui/app-icon-names';
import { INTERVENTIONS_CATALOG } from '@/src/constants/interventions-catalog';

// MB-29 P4: el contrato cubre los dos registros — mismos invariantes.
const TODOS = [...PACKS, ...PAQUETES_SALUD];

describe('contrato del registro de packs', () => {
  // Candado subido el 7-sep-2026 (pivote de los 20 objetivos). Los números
  // salen de CASOS_DE_USO_DESTINOS (20-ago-2026): 8 que ya existían + los 12
  // candidatos, y se lanza con los 20, no con 8. El reparto entre los dos
  // arreglos NO es cosmético, es la puerta: PACKS son los que ofrece la
  // entrada de tres preguntas (16), PAQUETES_SALUD los que se descubren en el
  // Centro (4: los tres de salud + preparar-mi-consulta, que es de fecha).
  // Si alguien agrega un objetivo 21, este candado lo obliga a decir por cuál
  // puerta entra antes de que compile.
  it('hay 16 objetivos de estilo de vida + 4 paquetes de salud = los 20 del documento de destinos', () => {
    expect(PACKS.length).toBe(16);
    expect(PAQUETES_SALUD.length).toBe(4);
    expect(TODOS.length).toBe(20);
    expect(Object.keys(PACK_BY_KEY).length).toBe(TODOS.length);
  });

  // La llave es para siempre (vive en user_packs y en deep links): kebab-case
  // estable, sin mayúsculas ni acentos que un deep link tenga que escapar.
  it('cada key es kebab-case estable', () => {
    for (const pack of TODOS) {
      expect(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(pack.key), `key de ${pack.key}`).toBe(true);
    }
  });

  it('cada appKey de cada pack existe en APP_REGISTRY', () => {
    for (const pack of TODOS) {
      for (const appKey of pack.instala) {
        expect(APP_BY_KEY[appKey], `${pack.key} instala "${appKey}"`).toBeTruthy();
      }
    }
  });

  it('cada electron de cada pack existe en ELECTRON_WEIGHTS', () => {
    for (const pack of TODOS) {
      for (const h of pack.enciende) {
        expect(
          ELECTRON_WEIGHTS[h.electron],
          `${pack.key} enciende "${h.electron}"`,
        ).toBeTruthy();
      }
    }
  });

  it('estilo de vida: exactamente 3 hábitos core (los de "suave")', () => {
    for (const pack of PACKS) {
      const core = pack.enciende.filter((h) => h.core);
      expect(core.length, `cores de ${pack.key}`).toBe(3);
      expect(habitosPorIntensidad(pack, 'suave')).toEqual(core);
      expect(habitosPorIntensidad(pack, 'con_todo')).toEqual(pack.enciende);
    }
  });

  it('paquetes de salud: entre 1 y 3 cores (instalan apps; encienden poco)', () => {
    for (const pack of PAQUETES_SALUD) {
      const core = pack.enciende.filter((h) => h.core);
      expect(core.length, `cores de ${pack.key}`).toBeGreaterThanOrEqual(1);
      expect(core.length, `cores de ${pack.key}`).toBeLessThanOrEqual(3);
      expect(habitosPorIntensidad(pack, 'suave')).toEqual(core);
      expect(habitosPorIntensidad(pack, 'con_todo')).toEqual(pack.enciende);
    }
  });

  it('cada icono de pack resuelve en el mapa de iconos', () => {
    for (const pack of TODOS) {
      expect(hasAppIcon(pack.icon), `icono de ${pack.key}: "${pack.icon}"`).toBe(true);
    }
  });

  it('sin duplicados: ni apps ni electrones repetidos dentro de un pack', () => {
    for (const pack of TODOS) {
      expect(new Set(pack.instala).size, `instala de ${pack.key}`).toBe(pack.instala.length);
      const keys = pack.enciende.map((h) => h.electron);
      expect(new Set(keys).size, `enciende de ${pack.key}`).toBe(keys.length);
    }
  });

  it('cada aviso apunta a una app que el pack instala', () => {
    for (const pack of TODOS) {
      for (const aviso of pack.avisos) {
        expect(
          pack.instala.includes(aviso.app),
          `aviso de ${pack.key} a "${aviso.app}"`,
        ).toBe(true);
      }
    }
  });

  it('las horas relativas son razonables (offset dentro de un día)', () => {
    for (const pack of TODOS) {
      const horas = [
        ...pack.enciende.flatMap((h) => (h.hora ? [h.hora] : [])),
        ...pack.avisos.map((a) => a.hora),
      ];
      for (const hora of horas) {
        expect(Math.abs(hora.offsetMin), `${pack.key}`).toBeLessThanOrEqual(12 * 60);
      }
    }
  });

  // Regla del brief: cero em dash en copy visible, y ningún pack nombra
  // enfermedad, diagnóstico ni tratamiento — ni en nombre, ni en copy, ni
  // en comentario de código visible (criterio MedicalDisclaimer).
  const prohibidas = /diabetes|ansiedad|insomnio|depresi[oó]n|hipertensi|tiroid|resistencia a la insulina|tratamiento|diagn[oó]stico|enfermedad|\bcurar?\b/i;

  it('el copy no usa em dash ni nombra padecimientos', () => {
    for (const pack of TODOS) {
      // 7-sep-2026: el barrido también cubre el copy nuevo (`mide` y
      // `noInstala`), que es copy de usuario igual que `queEsperar`.
      const copy = [
        pack.nombre,
        pack.paraQuien,
        pack.queEsperar,
        pack.argosFoco,
        pack.mide.que,
        pack.mide.seNotaEn,
        ...pack.noInstala.flatMap((f) => [f.que, f.porque]),
      ].join(' ');
      expect(copy.includes('—'), `em dash en ${pack.key}`).toBe(false);
      expect(prohibidas.test(copy), `palabra roja en ${pack.key}: ${copy.match(prohibidas)?.[0] ?? ''}`).toBe(false);
    }
  });

  it('prescribe: toda llave existe en el catálogo y ninguna espera validación clínica', () => {
    // CASOS_DE_USO_PRESCRIBEN: prescribir desde un pack una intervención con
    // requiresClinicalValidation sería brincarse la firma de la responsable
    // clínica por la puerta de atrás. El motor ya las excluye de sugerencias;
    // este candado cierra la otra puerta.
    const porLlave = new Map(INTERVENTIONS_CATALOG.map((i) => [i.key, i]));
    for (const pack of TODOS) {
      for (const key of pack.prescribe ?? []) {
        const int = porLlave.get(key);
        expect(int, `${pack.key} prescribe "${key}" que no existe en el catálogo`).toBeTruthy();
        expect(
          int?.requiresClinicalValidation ?? false,
          `${pack.key} prescribe "${key}" que espera validación clínica`,
        ).toBe(false);
      }
      const set = new Set(pack.prescribe ?? []);
      expect(set.size, `prescribe duplicado en ${pack.key}`).toBe((pack.prescribe ?? []).length);
    }
  });

  // ── Contrato nuevo del pivote (7-sep-2026) ────────────────────────────────
  // La regla dura del documento de destinos: un objetivo solo existe si la
  // persona puede VER moverse algo por seguirlo. Sin `mide`, un objetivo es
  // una promesa sin comprobante, y este candado no lo deja entrar.
  it('mide: la señal apunta a una app real, y a una que el objetivo instala', () => {
    for (const pack of TODOS) {
      expect(pack.mide, `${pack.key} sin mide`).toBeTruthy();
      expect(pack.mide.que.trim().length, `mide.que vacío en ${pack.key}`).toBeGreaterThan(10);
      expect(pack.mide.seNotaEn.trim().length, `mide.seNotaEn vacío en ${pack.key}`).toBeGreaterThan(0);
      expect(
        APP_BY_KEY[pack.mide.dondeApp],
        `${pack.key} mide en "${pack.mide.dondeApp}" que no existe en APP_REGISTRY`,
      ).toBeTruthy();
      // Si la señal vive en una app que el objetivo no instala, la persona no
      // la va a encontrar: el número existiría y aun así no lo vería moverse.
      expect(
        pack.instala.includes(pack.mide.dondeApp),
        `${pack.key} mide en "${pack.mide.dondeApp}" pero no la instala`,
      ).toBe(true);
    }
  });

  // La fila que define el pack (CASOS_DE_USO_10_PERFILES): cualquiera hace una
  // lista de lo que ayuda; lo difícil es decidir qué se queda fuera. Dos como
  // mínimo, porque con una sola nadie tuvo que elegir de verdad.
  it('noInstala: al menos dos exclusiones, cada una con su porqué y sin repetirse', () => {
    for (const pack of TODOS) {
      expect(pack.noInstala.length, `noInstala de ${pack.key}`).toBeGreaterThanOrEqual(2);
      for (const fuera of pack.noInstala) {
        expect(fuera.que.trim().length, `noInstala.que vacío en ${pack.key}`).toBeGreaterThan(2);
        // Un porqué de tres palabras no es un porqué: es una etiqueta.
        expect(
          fuera.porque.trim().length,
          `noInstala.porque muy corto en ${pack.key}: "${fuera.que}"`,
        ).toBeGreaterThan(40);
      }
      const ques = pack.noInstala.map((f) => f.que);
      expect(new Set(ques).size, `noInstala repetido en ${pack.key}`).toBe(ques.length);
    }
  });

  // Los objetivos cuyo motor decide NO llevan set fijo. Prescribirles uno
  // pelearía con la única razón por la que la persona los eligió: el 7 es la
  // puerta del motor personalizado, el 8 y el 20 son captura de expediente, y
  // el 17 cambia con la fase del ciclo (doctrina bidireccional).
  const SIN_SET_FIJO = ['entender-sintomas', 'salud-en-orden', 'mi-ciclo-a-mi-favor', 'preparar-mi-consulta'];

  it('los objetivos cuyo motor decide no traen prescribe fijo', () => {
    for (const key of SIN_SET_FIJO) {
      expect(PACK_BY_KEY[key], `${key} no existe`).toBeTruthy();
      expect(PACK_BY_KEY[key]?.prescribe, `${key} no debe traer prescribe fijo`).toBeUndefined();
    }
    // Y el resto sí: un objetivo que configura la app sin poner nada en el día
    // es el hueco que este pivote vino a cerrar.
    for (const pack of TODOS) {
      if (SIN_SET_FIJO.includes(pack.key)) continue;
      expect((pack.prescribe ?? []).length, `${pack.key} sin prácticas`).toBeGreaterThanOrEqual(3);
    }
  });

  /**
   * El gemelo de cada electrón en el catálogo de prácticas (7-sep-2026).
   *
   * POR QUÉ EXISTE: el candado de validación clínica solo miraba `prescribe`,
   * y encender un hábito es pedirle a la persona que haga la práctica igual
   * que prescribírsela. `dormir-mejor` encendía `red_glasses` mientras su
   * gemela `lentes_rojos` seguía esperando la firma de Mariana: la firma se
   * brincaba por la puerta de `enciende`. Este mapa cierra esa puerta.
   *
   * Solo se listan los electrones que TIENEN gemelo real en el catálogo. Un
   * electrón sin gemelo (agua, proteína, check-in, subir labs) no es una
   * práctica del catálogo y no le toca firma de nadie.
   */
  const ELECTRON_GEMELO: Record<string, string> = {
    red_glasses: 'lentes_rojos',
    cold_shower: 'ducha_fria_nivel1',
    breathwork: 'respiracion_478',
    screen_time_cutoff: 'pantallas_off_60min',
    grounding: 'grounding_earthing',
    sunlight: 'exposicion_solar_matutina',
    steps: 'meta_pasos_8k',
    strength: 'levantamiento_compuesto',
    cardio: 'zona_2_aerobica',
    nback: 'n_back_challenge',
    journal: 'journal_pm',
    no_processed_foods: 'eliminar_aceites_vegetales',
    fasting_12h: 'ayuno_14_10',
    fasting_16h: 'ayuno_16_8',
    fasting_24h: 'ayuno_20_4_omad',
  };

  it('el mapa de gemelos nombra electrones y prácticas que existen', () => {
    const porLlave = new Map(INTERVENTIONS_CATALOG.map((i) => [i.key, i]));
    for (const [electron, practica] of Object.entries(ELECTRON_GEMELO)) {
      expect(ELECTRON_WEIGHTS[electron as keyof typeof ELECTRON_WEIGHTS], `electrón "${electron}"`).toBeTruthy();
      expect(porLlave.get(practica), `práctica "${practica}"`).toBeTruthy();
    }
  });

  it('enciende: ningún hábito es el gemelo de una práctica que espera validación clínica', () => {
    const porLlave = new Map(INTERVENTIONS_CATALOG.map((i) => [i.key, i]));
    for (const pack of TODOS) {
      for (const h of pack.enciende) {
        const gemela = ELECTRON_GEMELO[h.electron];
        if (!gemela) continue;
        expect(
          porLlave.get(gemela)?.requiresClinicalValidation ?? false,
          `${pack.key} enciende "${h.electron}", gemelo de "${gemela}" que espera validación clínica`,
        ).toBe(false);
      }
    }
  });

  // El objetivo del ciclo no se le ofrece a quien no puede ver el módulo. Sin
  // este candado, la entrada de tres preguntas hacía PACKS.map sin filtro y un
  // hombre lo veía entre sus opciones.
  it('soloConCiclo: lo declara quien instala la app del ciclo, y nadie más', () => {
    for (const pack of TODOS) {
      const instalaCiclo = pack.instala.some((k) => APP_BY_KEY[k]?.femaleOnly);
      expect(
        pack.soloConCiclo === true,
        `${pack.key}: soloConCiclo debe ser ${instalaCiclo} (instala app de ciclo: ${instalaCiclo})`,
      ).toBe(instalaCiclo);
    }
    // Y hoy es exactamente uno: si aparece un segundo, que sea a propósito.
    expect(TODOS.filter((p) => p.soloConCiclo).map((p) => p.key)).toEqual(['mi-ciclo-a-mi-favor']);
  });

  it('excluye: llaves reales, sin auto-exclusión y simétricas', () => {
    for (const pack of TODOS) {
      for (const otro of pack.excluye ?? []) {
        expect(PACK_BY_KEY[otro], `${pack.key} excluye "${otro}" que no existe`).toBeTruthy();
        expect(otro, `${pack.key} se excluye a sí mismo`).not.toBe(pack.key);
        expect(
          (PACK_BY_KEY[otro]?.excluye ?? []).includes(pack.key),
          `exclusión asimétrica: ${pack.key} excluye a ${otro} pero no al revés`,
        ).toBe(true);
      }
    }
  });

  it('el archivo completo (comentarios incluidos) no nombra padecimientos', () => {
    const src = readFileSync('src/constants/packs.ts', 'utf8');
    expect(prohibidas.test(src), `palabra roja en packs.ts: ${src.match(prohibidas)?.[0] ?? ''}`).toBe(false);
  });
});
