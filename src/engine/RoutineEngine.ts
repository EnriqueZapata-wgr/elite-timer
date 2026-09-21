/**
 * RoutineEngine — State machine que ejecuta una secuencia de ExecutionStep[].
 *
 * Estados: idle → running ↔ paused → completed
 * Invoca callbacks en cada transición, tick, y al completar.
 *
 * Bloque TIMERS (21-sep-2026): el tiempo ya NO se cuenta con ticks. El step
 * en curso lleva un EstadoReloj de reloj-core y los segundos restantes se
 * LEEN de `ahora()` (Date.now inyectable para tests). El setInterval que
 * queda es solo un poll (sincronizar): si la app estuvo en segundo plano, al
 * volver el motor avanza de golpe por todos los steps que el reloj ya cubrió.
 */
import type {
  ExecutionStep,
  EngineState,
  EngineCallbacks,
  ExecutionStats,
} from './types';
import {
  RELOJ_DETENIDO,
  iniciar,
  pausar,
  reanudar,
  normalizar,
  transcurridoMs,
  segundosRestantes,
  type EstadoReloj,
} from '@/src/services/fitness/reloj-core';

export interface EngineOpciones {
  /** Fuente de tiempo (ms). Producción: Date.now. Tests: reloj inyectado. */
  ahora?: () => number;
  /** Cadencia del poll mientras corre. 250 ms: el fin de step se nota antes de 1 s. */
  tickMs?: number;
}

export class RoutineEngine {
  private steps: ExecutionStep[];
  private callbacks: EngineCallbacks;
  private state: EngineState = 'idle';
  private currentStepIndex = 0;
  /** Reloj del step en curso (reloj-core): el tiempo se lee, no se cuenta. */
  private reloj: EstadoReloj = RELOJ_DETENIDO;
  /** Último "segundos restantes" emitido por onTick: se emite solo al cambiar. */
  private ultimoEmitido = -1;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private startedAt: Date | null = null;
  private stepsSkipped = 0;
  private readonly ahora: () => number;
  private readonly tickMs: number;

  constructor(steps: ExecutionStep[], callbacks: EngineCallbacks, opciones: EngineOpciones = {}) {
    this.steps = steps;
    this.callbacks = callbacks;
    this.ahora = opciones.ahora ?? Date.now;
    this.tickMs = opciones.tickMs ?? 250;
  }

  // === CONTROLES PÚBLICOS ===

  /** Iniciar o reanudar la ejecución */
  play(): void {
    if (this.state === 'completed' || this.steps.length === 0) return;
    const ahora = this.ahora();
    if (this.state === 'idle') {
      this.startedAt = new Date(ahora);
      this.announceStep();
      this.reloj = iniciar(this.reloj, ahora);
    } else {
      this.reloj = reanudar(this.reloj, ahora);
    }
    this.setState('running');
    this.startTicking();
  }

  /** Pausar la ejecución */
  pause(): void {
    if (this.state !== 'running') return;
    this.reloj = pausar(this.reloj, this.ahora());
    this.setState('paused');
    this.stopTicking();
  }

  /** Alternar entre play y pause */
  togglePlayPause(): void {
    if (this.state === 'running') {
      this.pause();
    } else {
      this.play();
    }
  }

  /** Saltar al siguiente step */
  skip(): void {
    if (this.state === 'completed' || this.steps.length === 0) return;
    this.stepsSkipped++;
    this.advanceToNextStep(this.ahora(), true);
  }

  /** Reiniciar el step actual desde el principio */
  restartCurrentStep(): void {
    if (this.state === 'completed' || this.steps.length === 0) return;
    const step = this.steps[this.currentStepIndex];
    this.reiniciarRelojDelStep(this.ahora());
    this.ultimoEmitido = step.durationSeconds;
    this.callbacks.onTick(step.durationSeconds, step);
  }

  /** Reiniciar toda la rutina desde el principio */
  restart(): void {
    this.stopTicking();
    this.currentStepIndex = 0;
    this.reloj = RELOJ_DETENIDO;
    this.ultimoEmitido = -1;
    this.stepsSkipped = 0;
    this.startedAt = null;
    this.setState('idle');
  }

  /** Destruir el engine y limpiar intervalos */
  destroy(): void {
    this.stopTicking();
  }

  // === GETTERS ===

  getState(): EngineState {
    return this.state;
  }

  getCurrentStep(): ExecutionStep | null {
    return this.steps[this.currentStepIndex] ?? null;
  }

  getNextStep(): ExecutionStep | null {
    return this.steps[this.currentStepIndex + 1] ?? null;
  }

  getStepAfterNext(): ExecutionStep | null {
    return this.steps[this.currentStepIndex + 2] ?? null;
  }

  /** Segundos restantes del step en curso, leídos del reloj (techo: nunca 0 antes de tiempo). */
  getRemainingSeconds(ahoraMs: number = this.ahora()): number {
    const step = this.steps[this.currentStepIndex];
    if (!step) return 0;
    return segundosRestantes(transcurridoMs(this.reloj, ahoraMs), step.durationSeconds);
  }

  getTotalSteps(): number {
    return this.steps.length;
  }

  getCurrentStepNumber(): number {
    return this.currentStepIndex + 1;
  }

  /** Progreso total de la rutina (0 → 1) */
  getProgress(): number {
    const totalSeconds = this.steps.reduce((sum, s) => sum + s.durationSeconds, 0);
    if (totalSeconds === 0) return 0;

    const elapsedBefore = this.steps
      .slice(0, this.currentStepIndex)
      .reduce((sum, s) => sum + s.durationSeconds, 0);
    const elapsedInCurrent = this.transcurridoEnStepSeg();

    return (elapsedBefore + elapsedInCurrent) / totalSeconds;
  }

  /** Progreso del step actual (0 → 1) */
  getCurrentStepProgress(): number {
    const step = this.steps[this.currentStepIndex];
    if (!step || step.durationSeconds === 0) return 0;
    return this.transcurridoEnStepSeg() / step.durationSeconds;
  }

  /** Segundos (con fracción) cubiertos del step en curso, acotados a su duración. */
  private transcurridoEnStepSeg(ahoraMs: number = this.ahora()): number {
    const step = this.steps[this.currentStepIndex];
    if (!step) return 0;
    return Math.min(step.durationSeconds, transcurridoMs(this.reloj, ahoraMs) / 1000);
  }

  // === LÓGICA INTERNA ===

  private setState(state: EngineState): void {
    this.state = state;
    this.callbacks.onStateChange(state);
  }

  private startTicking(): void {
    this.stopTicking();
    // Solo un poll: el tiempo sale de reloj-core, no de contar estos disparos.
    this.intervalId = setInterval(() => this.sincronizar(), this.tickMs);
  }

  private stopTicking(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Sincroniza el motor con el reloj. La llama el poll y el hook al volver del
   * segundo plano; `ahoraMs` se inyecta en tests.
   *
   * Regla crítica: el usuario NUNCA ve 00:00. Los segundos restantes son
   * techo (segundosRestantes): al cumplirse la duración se avanza de
   * inmediato y se emite tick con la duración completa del nuevo step. Lo que
   * sobró del step anterior arranca ya descontado en el nuevo (239 steps no
   * acumulan desfase). Si el reloj cubrió varios steps (segundo plano), se
   * avanza por todos de una vez y solo se anuncia el step donde aterriza.
   */
  sincronizar(ahoraMs: number = this.ahora()): void {
    if (this.state !== 'running') return;
    // Re-anclar en cada poll: si el reloj del sistema retrocede (ajuste NTP)
    // lo ya corrido queda en acumulado y el step no vuelve a su duración.
    this.reloj = normalizar(this.reloj, ahoraMs);

    let step = this.steps[this.currentStepIndex];
    let transcurrido = transcurridoMs(this.reloj, ahoraMs);
    let saltos = 0;
    while (step && transcurrido >= step.durationSeconds * 1000) {
      const sobra = transcurrido - step.durationSeconds * 1000;
      // Sonido de fin solo del primer step cerrado: tres a la vez es ruido.
      if (saltos === 0) this.callbacks.onSound(step.soundEnd);
      saltos++;
      this.advanceToNextStep(ahoraMs, false, sobra);
      if (this.state !== 'running') return;
      step = this.steps[this.currentStepIndex];
      transcurrido = transcurridoMs(this.reloj, ahoraMs);
    }
    if (saltos > 0) {
      this.callbacks.onStepChange(step, this.steps[this.currentStepIndex + 1] ?? null);
      this.announceStep();
    }

    const restante = segundosRestantes(transcurrido, step.durationSeconds);
    if (restante === this.ultimoEmitido) return;
    this.ultimoEmitido = restante;

    // Countdown hablado en los últimos 3 segundos (una vez por segundo)
    if (restante > 0 && restante <= 3) {
      this.callbacks.onSpeak(`${restante}`);
      this.callbacks.onSound('countdown');
    }

    this.callbacks.onTick(restante, step);
  }

  /** Reloj del step nuevo: corre desde `ahora - sobraMs` (lo que sobró del anterior no se pierde). */
  private reiniciarRelojDelStep(ahoraMs: number, sobraMs = 0): void {
    this.ultimoEmitido = -1;
    this.reloj = this.state === 'running' ? iniciar(this.reloj, ahoraMs - sobraMs) : RELOJ_DETENIDO;
  }

  /**
   * Avanza al siguiente step o completa la rutina. `anunciar` = false cuando
   * sincronizar() está cruzando varios steps de golpe (anuncia solo el último).
   */
  private advanceToNextStep(ahoraMs: number, anunciar: boolean, sobraMs = 0): void {
    this.currentStepIndex++;

    // ¿Terminamos todos los steps?
    if (this.currentStepIndex >= this.steps.length) {
      this.stopTicking();
      this.reloj = RELOJ_DETENIDO;
      // El fin real fue cuando el reloj cubrió el último step, no cuando se notó.
      const completedAt = new Date(ahoraMs - sobraMs);
      const stats = this.calculateStats(completedAt);
      this.setState('completed');
      this.callbacks.onComplete(stats);
      this.callbacks.onSpeak('Rutina completada. Excelente trabajo.');
      return;
    }

    // Preparar el nuevo step
    const step = this.steps[this.currentStepIndex];
    this.reiniciarRelojDelStep(ahoraMs, sobraMs);
    if (!anunciar) return;
    const nextStep = this.steps[this.currentStepIndex + 1] ?? null;
    this.callbacks.onStepChange(step, nextStep);
    this.announceStep();
  }

  /** Anuncia el step actual por TTS con info de rondas */
  private announceStep(): void {
    const step = this.steps[this.currentStepIndex];
    if (!step) return;

    let announcement = step.label;
    const { rounds } = step.context;
    if (rounds.length > 0) {
      const lastRound = rounds[rounds.length - 1];
      announcement += `, ${lastRound.current} de ${lastRound.total}`;
    }

    this.callbacks.onSpeak(announcement);
    this.callbacks.onSound(step.soundStart);
  }

  /** Calcula estadísticas al completar */
  private calculateStats(completedAt: Date): ExecutionStats {
    const totalDuration = this.steps.reduce((sum, s) => sum + s.durationSeconds, 0);
    const workSeconds = this.steps
      .filter(s => s.type === 'work')
      .reduce((sum, s) => sum + s.durationSeconds, 0);
    const restSeconds = this.steps
      .filter(s => s.type === 'rest')
      .reduce((sum, s) => sum + s.durationSeconds, 0);

    return {
      totalDurationSeconds: totalDuration,
      actualDurationSeconds: Math.round(
        (completedAt.getTime() - (this.startedAt?.getTime() ?? completedAt.getTime())) / 1000,
      ),
      workSeconds,
      restSeconds,
      stepsCompleted: this.steps.length - this.stepsSkipped,
      stepsSkipped: this.stepsSkipped,
      startedAt: this.startedAt ?? completedAt,
      completedAt,
    };
  }
}
