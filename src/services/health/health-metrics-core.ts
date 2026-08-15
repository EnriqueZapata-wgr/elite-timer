/**
 * Health metrics core (NOCHE-1) — núcleo PURO de la lectura de salud del SO.
 *
 * Una sola interfaz para las dos plataformas. Health Connect (Android) y
 * Salud de Apple (iOS) nombran distinto lo mismo, así que el nombre crudo de
 * cada plataforma vive AQUÍ, en una tabla, y no se filtra al resto de la app:
 * arriba de esta capa solo existen cinco métricas en español.
 *
 * Sin imports: 100% testeable bajo vitest. Los helpers de fecha se INYECTAN
 * (mismo patrón que sleep-import-core) para que el núcleo no dependa ni de
 * utils. La capa con I/O vive en health-platform-service.ts, que reexporta
 * estos símbolos.
 *
 * Doctrina de datos: lo que viene de una máquina SE VALIDA. Un reloj mal
 * calibrado o un widget de terceros pueden escribir 900 kg o 400 pulsaciones
 * en la plataforma de salud, y esos valores no pueden entrar al expediente.
 * Fuera de rango no se corrige: se descarta (null), que es honesto.
 */

// ── Las cinco métricas ──

export const METRICAS = ['pasos', 'sueno', 'fc_reposo', 'peso', 'energia_activa'] as const;
export type MetricaSalud = (typeof METRICAS)[number];

/** Nombre crudo de cada métrica en cada plataforma (no sale de este módulo). */
export interface DefinicionMetrica {
  id: MetricaSalud;
  /** Etiqueta de UI, español de México. */
  etiqueta: string;
  /** Qué es, en una línea, para la pantalla de conexión. */
  detalle: string;
  /** recordType de Health Connect. */
  android: string;
  /** Permiso del manifiesto que exige Android (cruzado contra app.json en test). */
  permisoAndroid: string;
  /**
   * Identificador de HealthKit. El sueño es un CATEGORY type y el resto son
   * QUANTITY types: la diferencia la resuelve el servicio, no el llamador.
   */
  ios: string;
  iosEsCategoria: boolean;
}

export const DEFINICIONES: readonly DefinicionMetrica[] = [
  {
    id: 'pasos',
    etiqueta: 'Pasos',
    detalle: 'Los que ya cuenta tu teléfono o tu reloj',
    android: 'Steps',
    permisoAndroid: 'android.permission.health.READ_STEPS',
    ios: 'HKQuantityTypeIdentifierStepCount',
    iosEsCategoria: false,
  },
  {
    id: 'sueno',
    etiqueta: 'Sueño',
    detalle: 'Horas dormidas por noche',
    android: 'SleepSession',
    permisoAndroid: 'android.permission.health.READ_SLEEP',
    ios: 'HKCategoryTypeIdentifierSleepAnalysis',
    iosEsCategoria: true,
  },
  {
    id: 'fc_reposo',
    etiqueta: 'Frecuencia cardiaca en reposo',
    detalle: 'Tus pulsaciones por minuto en calma',
    android: 'RestingHeartRate',
    permisoAndroid: 'android.permission.health.READ_RESTING_HEART_RATE',
    ios: 'HKQuantityTypeIdentifierRestingHeartRate',
    iosEsCategoria: false,
  },
  {
    id: 'peso',
    etiqueta: 'Peso',
    detalle: 'El que registra tu báscula conectada',
    android: 'Weight',
    permisoAndroid: 'android.permission.health.READ_WEIGHT',
    ios: 'HKQuantityTypeIdentifierBodyMass',
    iosEsCategoria: false,
  },
  {
    id: 'energia_activa',
    etiqueta: 'Energía activa',
    detalle: 'Calorías que quemaste moviéndote',
    android: 'ActiveCaloriesBurned',
    permisoAndroid: 'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
    ios: 'HKQuantityTypeIdentifierActiveEnergyBurned',
    iosEsCategoria: false,
  },
] as const;

export function definicionDe(id: MetricaSalud): DefinicionMetrica {
  const d = DEFINICIONES.find((x) => x.id === id);
  // DEFINICIONES cubre METRICAS por construcción; el test lo amarra.
  if (!d) throw new Error(`Métrica sin definición: ${id}`);
  return d;
}

// ── Validación de datos de máquina ──

/**
 * Rangos plausibles para un ser humano en un día. Fuera de esto, el dato
 * miente (báscula que pesó una maleta, reloj que contó un viaje en coche
 * como pasos, sensor con falso contacto).
 */
export const RANGOS: Record<MetricaSalud, { min: number; max: number }> = {
  pasos: { min: 0, max: 120000 },
  sueno: { min: 0, max: 1440 }, // minutos
  fc_reposo: { min: 25, max: 220 },
  peso: { min: 20, max: 400 }, // kg
  energia_activa: { min: 0, max: 15000 }, // kcal
};

/** Devuelve el valor redondeado si es plausible, o null si el dato miente. */
export function sanear(metrica: MetricaSalud, valor: number | null | undefined): number | null {
  if (valor == null || !Number.isFinite(valor)) return null;
  const { min, max } = RANGOS[metrica];
  if (valor < min || valor > max) return null;
  // El peso es el único que conserva decimal: 71.4 kg no es 71 kg.
  return metrica === 'peso' ? Math.round(valor * 10) / 10 : Math.round(valor);
}

// ── Un día de datos ──

export interface DiaSalud {
  /** YYYY-MM-DD local. */
  fecha: string;
  pasos: number | null;
  /** Minutos dormidos, no horas: la hora se formatea en la UI. */
  sueno: number | null;
  fc_reposo: number | null;
  peso: number | null;
  energia_activa: number | null;
}

export function diaVacio(fecha: string): DiaSalud {
  return { fecha, pasos: null, sueno: null, fc_reposo: null, peso: null, energia_activa: null };
}

export function tieneDatos(dia: DiaSalud): boolean {
  return METRICAS.some((m) => dia[m] != null);
}

/** Solo los días con al menos un dato: nunca escribimos filas vacías. */
export function diasConDatos(dias: readonly DiaSalud[]): DiaSalud[] {
  return dias.filter(tieneDatos);
}

/** Qué métricas traen al menos un dato en la ventana leída. */
export function metricasPresentes(dias: readonly DiaSalud[]): MetricaSalud[] {
  return METRICAS.filter((m) => dias.some((d) => d[m] != null));
}

/**
 * Ventana de fechas locales hacia atrás, la más vieja primero.
 * `aLocal` se inyecta (toLocalDateString) para no importar utils desde el core.
 */
export function ventanaDeFechas(
  hoy: Date,
  diasAtras: number,
  aLocal: (d: Date) => string,
): string[] {
  const out: string[] = [];
  for (let i = diasAtras - 1; i >= 0; i--) {
    const d = new Date(hoy.getTime());
    d.setDate(d.getDate() - i);
    out.push(aLocal(d));
  }
  return out;
}

// ── Estado de la conexión (la máquina de estados honesta) ──

export type EstadoConexion =
  /** Web u otra plataforma: no hay nada que conectar. */
  | 'no_soportado'
  /** OTA sobre un binario que no trae el módulo nativo. */
  | 'sin_modulo'
  /** Android sin la app Health Connect instalada o actualizada. */
  | 'sin_app'
  /** Nunca se pidió el permiso. */
  | 'sin_permiso'
  /** Se pidió y el usuario dijo que no. */
  | 'denegado'
  /** Hay al menos una métrica concedida. */
  | 'conectado';

export type AccionConexion =
  | 'pedir_permiso'
  | 'abrir_ajustes'
  | 'instalar_health_connect'
  | 'ninguna';

export interface EntradaEstado {
  os: 'android' | 'ios' | 'otro';
  /** Nombre humano de la plataforma. */
  plataforma: string;
  /** ¿El binario trae el módulo nativo? */
  moduloPresente: boolean;
  /** Android: ¿está instalada y lista la app Health Connect? */
  sdkDisponible: boolean;
  /**
   * ¿Ya le pedimos permiso alguna vez? Es la ÚNICA forma de distinguir
   * "todavía no pregunto" de "me dijo que no": ninguna de las dos
   * plataformas expone esa diferencia, y Apple la esconde a propósito.
   */
  yaSePidio: boolean;
  metricasConcedidas: readonly MetricaSalud[];
  /**
   * Android: binarios sin el permission delegate registrado CRASHEAN nativo
   * al abrir el diálogo. Ahí la única ruta es conceder desde los ajustes.
   */
  dialogoDisponible: boolean;
}

export interface EstadoSalud {
  estado: EstadoConexion;
  plataforma: string;
  metricasConcedidas: MetricaSalud[];
  /** Copy listo para la UI. Siempre dice algo: nunca queda en blanco. */
  titulo: string;
  mensaje: string;
  accion: AccionConexion;
  /** Etiqueta del botón, o null si no hay acción posible. */
  etiquetaAccion: string | null;
}

/**
 * Traduce la realidad de la plataforma a algo que un humano entiende.
 * PURA a propósito: los tres estados incómodos (nunca pedido, negado,
 * plataforma sin soporte) son justamente los que nadie prueba a mano, y así
 * se prueban en vitest sin teléfono.
 */
export function resolverEstado(e: EntradaEstado): EstadoSalud {
  const base = {
    plataforma: e.plataforma,
    metricasConcedidas: [...e.metricasConcedidas],
  };

  if (e.os === 'otro') {
    return {
      ...base,
      estado: 'no_soportado',
      titulo: 'Sin plataforma de salud',
      mensaje:
        'Esta versión de ATP no puede leer datos de salud del sistema. Sigue registrando a mano desde la app.',
      accion: 'ninguna',
      etiquetaAccion: null,
    };
  }

  if (!e.moduloPresente) {
    return {
      ...base,
      estado: 'sin_modulo',
      titulo: 'Llega en la próxima versión',
      mensaje: `Esta versión instalada todavía no trae la conexión con ${e.plataforma}. Actualiza ATP desde la tienda y aparecerá aquí.`,
      accion: 'ninguna',
      etiquetaAccion: null,
    };
  }

  if (e.os === 'android' && !e.sdkDisponible) {
    return {
      ...base,
      estado: 'sin_app',
      titulo: 'Falta Health Connect',
      mensaje:
        'Health Connect es la app de Android donde tu teléfono guarda tus datos de salud. Instálala o actualízala y vuelve aquí.',
      accion: 'instalar_health_connect',
      etiquetaAccion: 'Abrir Health Connect',
    };
  }

  if (e.metricasConcedidas.length > 0) {
    const faltan = METRICAS.filter((m) => !e.metricasConcedidas.includes(m));
    return {
      ...base,
      estado: 'conectado',
      titulo: 'Conectado',
      mensaje:
        faltan.length === 0
          ? `ATP lee tus cinco tipos de dato desde ${e.plataforma}. Solo lectura.`
          : `ATP lee ${e.metricasConcedidas.length} de ${METRICAS.length} tipos de dato desde ${e.plataforma}. Puedes conceder el resto cuando quieras.`,
      accion: faltan.length === 0 ? 'ninguna' : 'abrir_ajustes',
      etiquetaAccion: faltan.length === 0 ? null : `Ajustes de ${e.plataforma}`,
    };
  }

  // Sin métricas concedidas: separar "no pregunté" de "me dijeron que no".
  if (!e.yaSePidio) {
    return {
      ...base,
      estado: 'sin_permiso',
      titulo: 'Conecta tus datos',
      mensaje: `ATP puede leer de ${e.plataforma} tus pasos, tu sueño, tu frecuencia cardiaca, tu peso y tu energía activa, para que no los captures a mano. Solo lectura: ATP nunca escribe ahí.`,
      accion: e.dialogoDisponible ? 'pedir_permiso' : 'abrir_ajustes',
      etiquetaAccion: e.dialogoDisponible ? 'Conectar' : `Ajustes de ${e.plataforma}`,
    };
  }

  return {
    ...base,
    estado: 'denegado',
    titulo: 'Sin permiso',
    mensaje: `ATP no tiene permiso para leer tus datos de ${e.plataforma}. Puedes concederlo desde los ajustes de ${e.plataforma} cuando quieras, y nada cambia en la app mientras tanto.`,
    accion: 'abrir_ajustes',
    etiquetaAccion: `Ajustes de ${e.plataforma}`,
  };
}

/** ¿Tiene sentido intentar leer datos en este estado? */
export function puedeLeer(estado: EstadoConexion): boolean {
  return estado === 'conectado';
}
