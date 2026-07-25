import { describe, it, expect } from 'vitest';
import {
  parseEquipoRequisitos,
  equipoDisponible,
  parseBenchmarkEdad,
  emomPermitido,
  mapMatrixRow,
  type ExerciseMatrixRow,
} from '@/src/constants/exercise-matrix';

describe('parseEquipoRequisitos', () => {
  it('token simple', () => {
    expect(parseEquipoRequisitos('Barra')).toEqual([['Barra']]);
  });

  it('token con slash canónico (Cable/Polea) NO se parte en alternativas', () => {
    expect(parseEquipoRequisitos('Cable/Polea')).toEqual([['Cable/Polea']]);
  });

  it('alternativas con slash: Banca / Cajón', () => {
    expect(parseEquipoRequisitos('Banca / Cajón')).toEqual([['Banca', 'Cajón']]);
  });

  it('AND con +: Barra fija + Cinturón de lastre → [Barra fija] AND [Lastre]', () => {
    expect(parseEquipoRequisitos('Barra fija + Cinturón de lastre')).toEqual([['Barra fija'], ['Lastre']]);
  });

  it('combinado: Barra fija / TRX + Chaleco de lastre', () => {
    expect(parseEquipoRequisitos('Barra fija / TRX + Chaleco de lastre')).toEqual([
      ['Barra fija', 'TRX'],
      ['Lastre'],
    ]);
  });

  it('chaleco / mochila colapsan al token Lastre', () => {
    expect(parseEquipoRequisitos('Chaleco / Mochila de lastre')).toEqual([['Lastre']]);
  });

  it('Banca + Disco/Lastre → banca AND (disco O lastre)', () => {
    expect(parseEquipoRequisitos('Banca + Disco/Lastre')).toEqual([['Banca'], ['Disco', 'Lastre']]);
  });
});

describe('equipoDisponible (filtro duro de equipo)', () => {
  it('peso corporal siempre disponible', () => {
    expect(equipoDisponible('Peso corporal', new Set())).toBe(true);
  });

  it('barra requiere barra', () => {
    expect(equipoDisponible('Barra', new Set(['Mancuerna']))).toBe(false);
    expect(equipoDisponible('Barra', new Set(['Barra']))).toBe(true);
  });

  it('AND exige ambos grupos; OR se satisface con una alternativa', () => {
    expect(equipoDisponible('Barra fija + Cinturón de lastre', new Set(['Barra fija']))).toBe(false);
    expect(equipoDisponible('Barra fija + Cinturón de lastre', new Set(['Barra fija', 'Lastre']))).toBe(true);
    expect(equipoDisponible('Barra fija / TRX + Chaleco de lastre', new Set(['TRX', 'Lastre']))).toBe(true);
  });
});

describe('parseBenchmarkEdad', () => {
  it('No → tier null', () => {
    expect(parseBenchmarkEdad('No')).toEqual({ tier: null, variante: null });
    expect(parseBenchmarkEdad(null)).toEqual({ tier: null, variante: null });
  });

  it('Tier A y Tier B con variante', () => {
    expect(parseBenchmarkEdad('Tier A (push-ups)')).toEqual({ tier: 'A', variante: 'push-ups' });
    expect(parseBenchmarkEdad('Tier A (plank)')).toEqual({ tier: 'A', variante: 'plank' });
    expect(parseBenchmarkEdad('Tier B (×BW)')).toEqual({ tier: 'B', variante: '×BW' });
    expect(parseBenchmarkEdad('Tier B (max lastrado)')).toEqual({ tier: 'B', variante: 'max lastrado' });
  });
});

describe('emomPermitido (vehículo según experiencia)', () => {
  it('gradúa por nivel', () => {
    expect(emomPermitido('Todos', 'principiante')).toBe(true);
    expect(emomPermitido('Intermedio+', 'principiante')).toBe(false);
    expect(emomPermitido('Intermedio+', 'intermedio')).toBe(true);
    expect(emomPermitido('Avanzado', 'intermedio')).toBe(false);
    expect(emomPermitido('Avanzado', 'atleta')).toBe(true);
    expect(emomPermitido('No', 'atleta')).toBe(false);
  });
});

describe('mapMatrixRow', () => {
  it('mapea fila de DB a MatrixExercise', () => {
    const row: ExerciseMatrixRow = {
      slug: 'pull-ups-lastre',
      nombre: 'Pull-up lastre',
      equipo: 'Barra fija + Cinturón de lastre',
      cargable: true,
      tipo: 'Multiarticular',
      patron: 'Tracción',
      dinamica: 'Normal',
      lateralidad: 'Bilateral',
      musculo_principal: 'Dorsal',
      secundarios: 'Bíceps, Trapecio',
      cualidades: ['fuerza', 'hipertrofia'],
      nivel: 'Avanzado',
      senior_apto: false,
      metodos: ['Estándar', '3-5'],
      emom_apto: 'No',
      benchmark_edad: 'Tier B (max lastrado)',
      contraindicaciones: ['Hombro'],
      familia: 'Dominada',
      media_url: 'https://example.com/poster.webp',
      origen: 'atp',
    };
    const ex = mapMatrixRow(row);
    expect(ex.equipoRequisitos).toEqual([['Barra fija'], ['Lastre']]);
    expect(ex.secundarios).toEqual(['Bíceps', 'Trapecio']);
    expect(ex.benchmark).toEqual({ tier: 'B', variante: 'max lastrado' });
    expect(ex.cargable).toBe(true);
    expect(ex.origen).toBe('atp');
  });
});
