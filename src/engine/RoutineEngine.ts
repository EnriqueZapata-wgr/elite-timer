/**
 * RoutineEngine — State machine que ejecuta una secuencia de ExecutionStep[].
 *
 * Estados: idle → running ↔ paused → completed
 * Usa setInterval(1000ms) para el countdown.
 * Invoca callbacks en cada transición, tick, y al completar.
 */
import type {
  ExecutionStep,
  EngineState,
  EngineCallbacks,
  ExecutionStats,
} from './types';

export class RoutineEngine {
  private steps: ExecutionStep[];
  private callbacks: EngineCallbacks;
  private state: EngineState = 'idle';
  private currentStepIndex = 0;
  private remainingSeconds = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private startedAt: Date | null = null;
  private stepsSkipped = 0;

  constructor(steps: ExecutionStep[], callbacks: EngineCallbacks) {
    this.steps = steps;
    this.callbacks = callbacks;
    if (steps.length > 0) {
      this.remainingSeconds = steps[0].durationSeconds;
    }
  }

  // === CONTROLES PÚBLICOS ===

  /** Iniciar o reanudar la ejecución */
  play(): void {
    if (this.state === 'completed' || this.steps.length === 0) return;
    if (this.state === 'idle') {
      this.startedAt = new Date();
      this.announceStep();
    }
    this.setState('running');
    this.startTicking();
  }

  /** Pausar la ejecución */
  pause(): void {
    if (this.state !== 'running') return;
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
    this.advanceToNextStep();
  }

  /** Reiniciar el step actual desde el principio */
  restartCurrentStep(): void {
    if (this.state === 'completed' || this.steps.length === 0) return;
    const step = this.steps[this.currentStepIndex];
    this.remainingSeconds = step.durationSeconds;
    this.callbacks.onTick(this.remainingSeconds, step);
  }

  /** Reiniciar toda la rutina desde el principio */
  restart(): void {
    this.stopTicking();
    this.currentStepIndex = 0;
    this.remainingSeconds = this.steps[0]?.durationSeconds ?? 0;
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

  getRemainingSeconds(): number {
    return this.remainingSeconds;
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
    const currentStepDuration = this.steps[this.currentStepIndex]?.durationSeconds ?? 0;
    const elapsedInCurrent = currentStepDuration - this.remainingSeconds;

    return (elapsedBefore + elapsedInCurrent) / totalSeconds;
  }

  /** Progreso del step actual (0 → 1) */
  getCurrentStepProgress(): number {
    const step = this.steps[this.currentStepIndex];
    if (!step || step.durationSeconds === 0) return 0;
    return (step.durationSeconds - this.remainingSeconds) / step.durationSeconds;
  }

  // === LÓGICA INTERNA ===

  private setState(state: EngineState): void {
    this.state = state;
    this.callbacks.onStateChange(state);
  }

  private startTicking(): void {
    this.stopTicking();
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  private stopTicking(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Un tick = un segundo transcurrido.
   *
   * Regla crítica: el usuario NUNCA ve 00:00.
   * Cuando remainingSeconds llega a 0, avanzamos inmediatamente
   * al siguiente step y emitimos tick con la duración del nuevo step.
   * Esto evita acumular 1s extra por step (239 steps = 4 min de desfase).
   */
  private tick(): void {
    if (this.state !== 'running') return;

    this.remainingSeconds--;

    // Countdown hablado en los últimos 3 segundos (solo si queda tiempo)
    if (this.remainingSeconds > 0 && this.remainingSeconds <= 3) {
      this.callbacks.onSpeak(`${this.remainingSeconds}`);
      this.callbacks.onSound('countdown');
    }

    // Si llegó a 0 → avanzar INMEDIATAMENTE sin mostrar 00:00
    if (this.remainingSeconds <= 0) {
      const finishedStep = this.steps[this.currentStepIndex];
      this.callbacks.onSound(finishedStep.soundEnd);
      this.advanceToNextStep();
      // Si hay nuevo step activo, emitir tick con su duración completa
      if (this.state === 'running') {
        const newStep = this.steps[this.currentStepIndex];
        this.callbacks.onTick(this.remainingSeconds, newStep);
      }
      return;
    }

    // Tick normal — notificar con segundos restantes > 0
    const step = this.steps[this.currentStepIndex];
    this.callbacks.onTick(this.remainingSeconds, step);
  }

  /** Avanza al siguiente step o completa la rutina */
  private advanceToNextStep(): void {
    this.currentStepIndex++;

    // ¿Terminamos todos los steps?
    if (this.currentStepIndex >= this.steps.length) {
      this.stopTicking();
      const completedAt = new Date();
      const stats = this.calculateStats(completedAt);
      this.setState('completed');
      this.callbacks.onComplete(stats);
      this.callbacks.onSpeak('Rutina completada. Excelente trabajo.');
      return;
    }

    // Preparar el nuevo step
    const step = this.steps[this.currentStepIndex];
    this.remainingSeconds = step.durationSeconds;
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
