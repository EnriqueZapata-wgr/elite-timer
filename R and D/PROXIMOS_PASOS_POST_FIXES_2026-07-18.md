# ▶️ Próximos pasos — todo listo para tu regreso (2026-07-18)

Estado: CC ejecutando `fix/triple-audit-fixes` (los 15 fixes consolidados). Todo lo demás en main, OTA en preview vivo.

## PASO 1 — Cuando CC entregue los fixes
1. Pégame el recap → **yo audito la rama rápido** (código, cero device).
2. Si APTO, mergeas + OTA:
```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
git checkout main
git pull origin main
git merge fix/triple-audit-fixes --no-edit
git push origin main
eas update --branch preview -m "Fixes triple audit: Configura HOY + Edad ATP hardening + sheets + snake_case + ARGOS copy + morado + lazy-load"
```
Sin `db push` (sin migraciones). Si lock: `Remove-Item .git\index.lock -Force`.
3. Device test en preview: los 15 fixes + los 3 gates viejos (teclado, home, cuenta femenina/Ciclo).

## PASO 2 — El BUILD NATIVO (tu gran hito, tus manos)
Desbloquea MB-4 (ARGOS orb+voz) y MB-5 (audio Mente). CC primero cablea el config nativo (keyboard-controller provider + expo-audio background mode en app.json + la presencia) como parte del arranque de MB-4 — ESO no se activa por OTA, necesita binario. Comando (perfil preview, para tu teléfono, NO stores):
```powershell
eas build --profile preview --platform ios
```
(~10-20 min en servidores EAS → instalas desde el link/QR que te da). De ahí, los cambios JS de MB-4/MB-5 vuelven a ir por OTA encima.

## PASO 3 — MB-4 ARGOS: tus 3 decisiones (del SPEC_ARGOS_JARVIS_v1.md)
1. **Voz ElevenLabs:** ¿catálogo o voz propia clonada? (voto del spec: propia, para que "suene a alguien"). Proceso: shortlist de 3, leer los diálogos del spec en device.
2. **Dirección visual del orb:** paleta/forma (recomendación: esfera translúcida lime→teal que respira, waveform solo al hablar).
3. **Firma de la voz:** ¿se auto-presenta cada turno o solo en Meet ARGOS? (recomendación: una vez).

## ORDEN HACIA V2 (recordatorio)
Fixes → OTA → **build nativo** → MB-4 ARGOS (con tus 3 decisiones) → MB-5 Mente+audio → MB-6 Sleep → MB-7 Ciclo → MB-8 pulido → onboarding → Mariana (paralelo) → infra. LIGHT + Fitness rebuild profundo = v2.1.

## Lo que YO tendré listo cuando vuelvas
- Auditoría de los fixes (en cuanto CC entregue y me pases el recap).
- El arranque de MB-4 (native prep + system prompt de ARGOS ya redactado en el spec) listo para disparar tras el build nativo.
