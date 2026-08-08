/**
 * MB-28C P8 — el contrato del singleton de audio de Mente (Pieza 1).
 *
 * Lo que estos tests protegen:
 *  1. UN solo sonido vivo: reclamar un segundo player DESCARGA al primero.
 *     La mutación que quite esa descarga (el stop dentro de claim) TRUENA.
 *  2. La carrera real de B8: dos cargas con un await entre tomar turno y
 *     crear player — la carga vieja no crea audio (guard de generación).
 *  3. Salir de la pantalla apaga el sonido (contrato del cleanup).
 *  4. El botón de parar siempre está: apaga huérfanos aunque la pantalla
 *     haya perdido su referencia.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  beginPlayerLoad, isLoadCurrent, claimActivePlayer, releaseActivePlayer,
  stopActivePlayer, hasActivePlayer, type StoppableAudioPlayer,
} from '@/src/services/mente-player-singleton';

interface FakePlayer extends StoppableAudioPlayer {
  paused: boolean;
  removed: boolean;
}

function makePlayer(): FakePlayer {
  const p: FakePlayer = {
    paused: false,
    removed: false,
    pause() { p.paused = true; },
    remove() { p.removed = true; },
  };
  return p;
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

beforeEach(() => {
  // Estado de módulo: limpiar el player vivo entre tests (la generación es
  // monotónica y no necesita reset — cada test toma turnos frescos).
  stopActivePlayer();
});

describe('un solo sonido vivo', () => {
  it('reclamar un segundo player descarga al primero (pausa + remove)', () => {
    const a = makePlayer();
    const b = makePlayer();
    claimActivePlayer(a);
    expect(a.paused).toBe(false);

    claimActivePlayer(b);
    // La mutación que quite la descarga dentro de claim truena AQUÍ.
    expect(a.paused).toBe(true);
    expect(a.removed).toBe(true);
    expect(b.paused).toBe(false);
    expect(b.removed).toBe(false);
    expect(hasActivePlayer()).toBe(true);
  });

  it('reclamar el MISMO player dos veces no lo descarga', () => {
    const a = makePlayer();
    claimActivePlayer(a);
    claimActivePlayer(a);
    expect(a.paused).toBe(false);
    expect(a.removed).toBe(false);
  });
});

describe('la carrera de B8 (doble push, cargas concurrentes)', () => {
  /** Simula la forma real del load del player: turno → awaits → guard → create. */
  async function load(created: FakePlayer[]): Promise<FakePlayer | null> {
    const gen = beginPlayerLoad();
    await tick(); // getAudioUrl / setAudioModeAsync / loadMenteAudioPrefs
    if (!isLoadCurrent(gen)) return null; // guard pre-create
    const player = makePlayer();
    created.push(player);
    claimActivePlayer(player); // MISMO paso síncrono que la creación
    await tick(); // getSavedProgress / artwork
    if (!isLoadCurrent(gen)) return null; // guard pre-play
    return player;
  }

  it('dos cargas en vuelo dejan exactamente UN audio sonando', async () => {
    const created: FakePlayer[] = [];
    const [p1, p2] = await Promise.all([load(created), load(created)]);

    // La carga vieja no crea player (o el suyo quedó descargado por el claim
    // de la nueva): entre todos los creados, exactamente uno sigue vivo.
    const vivos = created.filter((p) => !p.paused && !p.removed);
    expect(vivos).toHaveLength(1);
    expect(p1).toBeNull(); // la primera carga quedó obsoleta
    expect(p2).not.toBeNull();
    expect(hasActivePlayer()).toBe(true);
  });

  it('una carga tardía que despierta tras un turno nuevo NO llega a crear', async () => {
    const created: FakePlayer[] = [];
    const vieja = load(created);
    // El segundo push toma turno antes de que la vieja despierte.
    const nueva = load(created);
    expect(await vieja).toBeNull();
    expect(await nueva).not.toBeNull();
    expect(created.filter((p) => !p.removed)).toHaveLength(1);
  });
});

describe('salir de la pantalla apaga el sonido', () => {
  it('el contrato del cleanup: pausa + remove + release', () => {
    const a = makePlayer();
    claimActivePlayer(a);

    // Lo que hace el cleanup del effect en player.tsx:
    a.pause();
    a.remove();
    releaseActivePlayer(a);

    expect(a.paused).toBe(true);
    expect(a.removed).toBe(true);
    expect(hasActivePlayer()).toBe(false);
    // Y no queda nada que apagar.
    expect(stopActivePlayer()).toBe(false);
  });

  it('release de un player que YA no es el dueño no tumba al vivo', () => {
    const viejo = makePlayer();
    const nuevo = makePlayer();
    claimActivePlayer(viejo);
    claimActivePlayer(nuevo); // nuevo toma el lugar; viejo descargado
    releaseActivePlayer(viejo); // cleanup tardío del viejo
    expect(hasActivePlayer()).toBe(true); // el nuevo sigue vivo
  });
});

describe('el control de parar que siempre está', () => {
  it('apaga un huérfano y reporta que lo hizo', () => {
    const huerfano = makePlayer();
    claimActivePlayer(huerfano);

    expect(stopActivePlayer()).toBe(true);
    expect(huerfano.paused).toBe(true);
    expect(huerfano.removed).toBe(true);
    expect(hasActivePlayer()).toBe(false);
  });

  it('sin nada sonando devuelve false (idempotente)', () => {
    expect(stopActivePlayer()).toBe(false);
    expect(stopActivePlayer()).toBe(false);
  });

  it('sobrevive a un player nativo ya liberado que truena al tocarlo', () => {
    const roto: StoppableAudioPlayer = {
      pause() { throw new Error('SharedObject released'); },
      remove() { throw new Error('SharedObject released'); },
    };
    claimActivePlayer(roto);
    // El objetivo es el silencio: no debe propagar el throw.
    expect(stopActivePlayer()).toBe(true);
    expect(hasActivePlayer()).toBe(false);
  });
});
