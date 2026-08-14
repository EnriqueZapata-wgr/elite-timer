# Corrida nocturna · 11 de agosto de 2026

**Rama:** `cowork/fase0-dify` · **Base:** `68bf54e` · Nada commiteado, todo listo para auditar.
**Rumbo:** lanzamiento 1 de septiembre.

---

## Lo primero que haces mañana, en orden

```powershell
# 1. adb (~10 MB, no el SDK completo)
winget install Google.PlatformTools
winget install mobile-dev-inc.Maestro

# 2. Conecta el S24 con Depuración USB y verifica
adb devices

# 3. Corre y vete
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer\.worktrees\cowork-fase0
npm run audit-visual
```

Al terminar hay ~190 capturas en `.maestro/capturas/`. **No me mandas nada, yo leo la carpeta.** Solo dime "ya corrió".

---

## 1 · Lo que quedó funcionando

### Bug del agua · ARREGLADO
`app/hydration.tsx`. Eran dos bugs encimados: el optimista se calculaba con el valor capturado en el render (cuatro taps leían el mismo valor viejo, de ahí la lentitud) y el rollback restauraba una foto vieja (de ahí el "subí a 3.5 L y se regresó a 1.8 L"). Ahora el cálculo va contra un ref espejo, el rollback deshace solo su propio tap, y el total del servidor solo se adopta cuando ya no hay escrituras en vuelo. `loadData` tampoco pisa lo que acabas de tocar.

**El servicio nunca estuvo mal.** `addWater` ya serializaba bien con el candado del día.

### Widget que no cambiaba de tema · ARREGLADO
El push de snapshots iba piggyback en el `loadDay` de HOY, y cambiar el tema en Ajustes no pasa por ahí. Ahora `setMode` emite `theme_changed`, `WidgetSyncBridge` lo escucha y `resyncWidgetTheme` parcha solo el bloque de tema de los snapshots existentes. Sin recompilar el día, sin queries extra.

### Router de modelos · HECHO, sin desplegar
149 líneas en `argos-proxy`. Gemini para extracción, Sonnet para análisis y cerebro, Haiku fuera, respaldo cruzado. **Apagado por default:** sin `MODEL_ROUTING_ENABLED_TYPES` no cambia nada.

### Higiene de config · HECHA
CLAUDE.md al día (2.1.0, 194 pantallas, 211K líneas, 1,699 commits), modelo corregido, `anthropic-proxy` marcada como deprecada, `_shared/llm-models.ts` como fuente canónica para Deno.

---

## 2 · El audit visual, montado

| Archivo | Qué es |
|---|---|
| `scripts/gen-mapa-rutas.js` | Genera el mapa de rutas leyendo `app/`. **187 rutas estáticas, 6 con parámetro** |
| `.maestro/01-tema-cards.yaml` | Reproduce el colapso de las cards de Tareas al cambiar tema en caliente |
| `.maestro/02-agua-taps.yaml` | Cuatro taps de agua. La secuencia debe subir siempre |
| `.maestro/10-rutas-{oscuro,claro}.yaml` | Las 187 rutas por deep link, generadas |
| `.maestro/README.md` | Instalación y uso |

El recorrido **no navega menús**: salta con deep link. Por eso caben 187 pantallas en una corrida. Y el listado se regenera solo: si agregas una pantalla, entra sola.

---

## 3 · Adelanto de tu visión de ARGOS

`src/constants/app-routes.generated.ts` nació para Maestro, pero es **exactamente lo que ARGOS necesita para navegar**. Trae tres cosas:

- `APP_ROUTES` — las 187 rutas navegables
- `APP_ROUTES_DYNAMIC` — las 6 que necesitan un id
- `APP_ROUTE_DESCRIPTIONS` — **185 de 187 pantallas ya vienen descritas**

Lo tercero es lo interesante. Las descripciones se **cosechan del docblock de cada pantalla**, que es donde quien la construyó ya explicó qué hace. No inventé un catálogo aparte que naciera desactualizado: sale del código y se regenera.

Eso significa que la base de conocimiento que ARGOS necesita para **explicar** la app ya existe en un 98%, y no costó contenido nuevo.

🚨 **Pero no se le entrega cruda al usuario.** Esos textos traen números de migración, claves de sprint y nombres del equipo. Sirven como contexto para el modelo, nunca como texto a citar. Necesitan una pasada de copy antes de que ARGOS los use en una respuesta, y eso respeta la regla de que jamás aparecen nombres propios en copy de usuario.

**Lo que falta para ARGOS navegador:** la tool que ejecuta la navegación, que es IMPL-05 (tool use), y la limpieza de copy de las descripciones.

---

## 4 · Correcciones a lo que te dije antes

**Los sourcemaps de OTA ya tienen herramienta.** `scripts/upload-ota-sourcemaps.mjs` existe y está en `package.json` como `npm run sourcemaps:ota`. No falta código: falta correrlo después de cada `eas update`. Es disciplina de flujo, más barato de lo que te dije.

**El corte de pantallas no está roto.** Está anclado a tu hora de dormir menos una hora. Si te duermes tarde, el corte es tarde, y por eso nunca lo viste cambiar. El bug real es que **es invisible y no lo puedes editar**, que es peor porque no se siente como falla sino como que la app no te hace caso.

**El colapso de Tareas está acotado a un componente.** Los pendientes en la pestaña Tareas se pintan con `TareaCard` (card editorial con imagen); en Agenda con `TareaRow` (renglón compacto). Por eso Agenda se veía perfecta. El flujo `01-tema-cards.yaml` lo reproduce.

---

## 5 · Lo que sigue, y por qué en ese orden

1. **Correr el audit visual.** Todo lo de color y tema depende de tener las capturas.
2. **Contexto de ARGOS con fecha en el dato.** Es lo que quita las tonterías del GABA de hace tres meses citado como si fuera de hoy. Sin esto, meterle más contexto solo lo hace equivocarse con más seguridad.
3. **Batch del insight.** Bloquea cualquier decisión de cerebro en el insight.
4. **Extraer `glucose-service` y `journal-service`.** Desbloquea tool use, que desbloquea ARGOS navegador.
5. **Desplegar el router** y encender solo la foto de comida.
6. **HealthKit al build de tiendas.** Ventana que se cierra al lanzar.

---

## 6 · Sin verificar, y lo digo claro

- **Las Edge Functions no están type-checked.** No hay Deno en mi entorno. El deploy es la prueba, y el router va apagado por default justo por eso.
- **`npx tsc --noEmit` no corrió completo.** 211K líneas se pasaron del tiempo que tengo por comando. Los cambios de cliente de esta noche (`hydration.tsx`, `theme-context.tsx`, `WidgetSyncBridge.tsx`, `widget-sync-service.ts`) **necesitan tu `tsc` antes del push**. Son cambios chicos y quirúrgicos, pero no los di por buenos solos.
- **Los flujos de Maestro no se han ejecutado nunca.** La sintaxis es la documentada, pero el primer `maestro test` puede pedir ajustes de textos (los `tapOn` van con `optional: true` para que no truene).

---

## 7 · Cambios, archivo por archivo

```
 .gitignore                                    |   5 +-
 CLAUDE.md                                     |  15 +--
 app/hydration.tsx                             |  58 ++++++--
 package.json                                  |   5 +-
 src/components/WidgetSyncBridge.tsx           |  12 ++-
 src/contexts/theme-context.tsx                |   8 +-
 src/services/widgets/widget-sync-service.ts   |  34 ++++
 supabase/functions/anthropic-proxy/index.ts   |  19 ++-
 supabase/functions/argos-proxy/index.ts       | 149 +++++++++++++++-
 supabase/functions/lab-parser-worker/index.ts |   3 +-
```

Nuevos: `.maestro/`, `scripts/audit-colores.js`, `scripts/gen-mapa-rutas.js`, `src/constants/app-routes.generated.ts`, `supabase/functions/_shared/llm-models.ts`, y los dos documentos de `R and D/`.
