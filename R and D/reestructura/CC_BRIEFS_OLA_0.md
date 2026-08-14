# CC Briefs · Ola 0 (quick wins) + arranque del shell de Reports

**Aprobado por Enrique el 12-ago-2026.** Reglas 1-5 aprobadas. Ficha pre-login: SÍ. Sliders a Journal: SÍ (con posible rebautizo de Journal). Paywall: número + múltiplo (YA HECHO por Cowork en `app/paywall.tsx`). Nombres de rutas nuevas: aprobados.

Cada brief es independiente y ejecutable por un agente CC en su propio worktree. Referencias de detalle: anexos A-E en esta carpeta. Regla transversal: toda ruta que muere deja `<Redirect>`; `npx tsc --noEmit` limpio antes de cada push; str_replace quirúrgico, nunca reescribir archivos.

---

## BRIEF QW-1 · La orbe deja de tapar contenido

**Problema medido:** `ArgosFloatingButton` tapa contenido interactivo en 15 de 32 pantallas auditadas (toggles, botones GUARDAR, valores de resultados, disclaimers médicos).
**Fix:** reservar margen inferior en el contenedor de scroll de las pantallas via un token compartido (p.ej. `paddingBottom: ORB_SAFE_AREA` exportado junto al botón), y/o permitir que la orbe se repliegue al hacer scroll hacia abajo. NO mover la orbe de lugar (es identidad).
**Verifica con:** correr `npm run audit-visual` y comparar las 15 pantallas afectadas (lista en ANALISIS_MAESTRO 3.1).

## BRIEF QW-2 · Header legible en tema claro

**Problema:** el componente de header compartido (patrón "ATP + TÍTULO") tiene la segunda palabra clavada en blanco. Ilegible en claro en 10+ pantallas (nutrition, hydration, glucose-log, food-register, food-text, checkin, cycle, emotions, fitness-hub, my-health, edad-atp).
**Fix:** el título toma `t.texto` del theme context. `fasting.tsx` y `economy/shop.tsx` muestran cómo debe verse.
**Bonus del mismo PR:** StatusBar style que no voltea en claro (reloj blanco sobre fondo claro en solar/food-register): fix por navigator.

## BRIEF QW-3 · Subtítulos de cards + Mood Meter en claro

1. Componente de action-card/gradient-card: subtítulo clavado en rgba blanco → token. Repara food-register (horarios), nutrition (subtítulos), breathing ("Ya respiré").
2. Mood Meter de `/checkin`: 144 etiquetas blancas sobre pastel claro → `#0F1518` en claro (o celdas más saturadas). Es el diferenciador #1 de Mente.
3. Cards oscuras sin migrar: emotions (2 cards sin foto), cycle (card de fase con "Próximo período" ilegible en el gradiente), nutrition (score card negra) → tokens de superficie.

## BRIEF QW-4 · Auth en tema claro

Login, register, forgot-password, reset-password ignoran el tema claro por completo (fondo negro). Es lo primero que ve un usuario nuevo. Migrar a tokens. `register.tsx` además usa THEME_DARK directo (uno de los únicos 2 archivos).

## BRIEF QW-5 · Puerta a términos y condiciones 🔴 BLOQUEANTE DE TIENDAS

`/legal/aviso` y `/legal/terminos` no tienen UN SOLO router.push en toda la app. Agregar: filas en `settings/legal.tsx`, y verificar que onboarding/v2/consent enlace a ambos (no solo checkbox). Revisión de tiendas lo exige.

## BRIEF QW-6 · Borrar muertos y fantasmas

**Borrar (evidencia: 0 enlaces entrantes, verificado en ANALISIS_MAESTRO §5):** `(tabs)/yo.tsx` (382L, dashboard sin puerta), `(tabs)/biblioteca.tsx`, `(tabs)/progreso.tsx`, `(tabs)/perfil.tsx` (re-exports href:null — OJO: si algún deep link externo los usa, dejar Redirect), `/economy/challenges`, `/economy/referrals` (duplica afiliados), `/admin/reports`, `/session-summary`, `/shared-routine` (su feature ya vive como ?share en my-routines: verificar antes), `/reset-password` (forgot es el vivo), `/clinical-system` (NO borrar la lógica: se recicla como filtro en Ola Tests, mover a src/ o dejar comentado el destino), `/edad-atp/cognitive` (placeholder), `/edad-atp/tests/chronotype` (re-export), `/argos` re-export se QUEDA (es el tab). Quitar el Stack.Screen fantasma `/timer` de `_layout.tsx:206`.
**Antes de borrar `/(tabs)/yo.tsx`:** su contenido (scores, composición, cronotipo) debe estar disponible en SALUD/mis-datos; verificar y anotar qué no lo está.

## BRIEF QW-7 · Chevron visible en filas de HOY + siembra por momento

1. `src/components/hoy/TareaRow.tsx` + `tareas-core.ts`: toda fila con `route` muestra affordance de navegación visible. El tap largo se queda como atajo, deja de ser el único camino.
2. `initialSeedApps()` en `install-core.ts:132`: sembrar por momentos declarados en onboarding, no `['respirar','edad-atp']` fijo. Mapa propuesto: mañana→solar+hydration, comidas→nutrition+fasting, noche→journal+sleep. Diseño fino: proponer y mostrar a Enrique antes de merge.

## BRIEF QW-8 · Salud sin puertas + labs lineal

Anexo E §2-3 completo. Resumen: PuertaScreen → SeccionColapsable; tab /salud con hero Edad ATP + 4 secciones (HOY abierta default, estado persistido); DESTINOS_* intactos; redirects /salud/hoy|evolucion|expediente → /salud?seccion=X; health-hub → Redirect a /salud + repuntar settings/salud:183; labs: los 3 router.replace de lab-confirmation → /edad-atp/labs?nuevo=N, cancelar → replace a mis-datos.

## BRIEF QW-9 · Ficha de emergencia

Anexo E §4 completo. Tabla `user_emergency_card` (RLS dueño, migración idempotente), pantalla `/salud/ficha-emergencia` (fila roja en EXPEDIENTE), copia local cifrada (abre sin red y sin sesión — decisión aprobada), emergencyCardHtml() en consulta-report-core (una página A4, pasa el test anti-juicio), salidas PDF + modo pantalla + QR con payload embebido, long-press en tab SALUD → modo pantalla, enlace pre-login leyendo copia local, interruptor en Ajustes default ON con aviso al crear, recordatorio trimestral. Migración con `supabase db push` DESPUÉS del merge (regla 12).

## BRIEF QW-10 · Sliders subjetivos a Journal + rebautizo

Los 4 sliders (energy_level, sleep_quality, stress_level, mood_level) de health-input → check-in opcional dentro de /journal, escribiendo `health_measurements` (misma tabla canónica, cero tablas nuevas). NO borrar health-input en este brief (eso es de la Ola Salud, con la migración de neck_cm y pasos).
**Rebautizo de Journal (decisión Enrique "que se entienda que también encontramos eso ahí"):** proponer 2-3 nombres es-MX (candidatos: "Diario", "Bitácora") con mock del header, Enrique elige antes de tocar copy. Los nombres NUNCA llevan nombres propios.

## BRIEF R-0 · Shell de Reports (arranca la Ola 1 en paralelo)

Anexo A §4 completo. `app/reports/_layout.tsx` + `ReportDomainShell` + `ReportRangeContext` + ruta `/reports/[dominio]`. Contrato: push (nunca replace) para que el back preserve origen; selector de rango persistido por dominio; 3 estados honestos; export CSV/JSON del rango con Share; guards (useCycleGate, MedicalDisclaimerGate); umbral de honestidad estadística. Con el shell verde, los dominios baratos (nutricion, hidratacion, ayuno, mente, economia) entran moviendo las secciones existentes de reports.tsx. Los redirects de pantallas viejas NO van en este PR (van por dominio conforme absorben).

---

## Reparto sugerido (worktrees paralelos)

- Agente 1: QW-1 + QW-2 + QW-3 (los tres son de componentes compartidos, mismo territorio visual)
- Agente 2: QW-5 + QW-6 (legal + limpieza, bajo riesgo)
- Agente 3: QW-7 + QW-8 (HOY + Salud, tocan navegación)
- Agente 4: QW-9 (ficha de emergencia, independiente)
- Agente 5: R-0 (shell de Reports) y sigue con dominios baratos
- QW-4 (auth claro) y QW-10 (journal) en segunda tanda o el agente que termine primero.

Auditoría: Cowork revisa cada branch antes del merge (regla 12). El audit visual (`npm run audit-visual`) corre después de cada merge para comparar capturas.
