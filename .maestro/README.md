# Audit visual de ATP

Recorre la app sola, dispara capturas, y las deja dentro del repo para que
Cowork las revise todas de un jalón. **Tu trabajo es un comando.**

## Instalación, una sola vez

```powershell
# 1. adb (~10 MB, NO el SDK completo de Android)
winget install Google.PlatformTools

# 2. Maestro
winget install mobile-dev-inc.Maestro
```

Conecta el S24 por cable con **Depuración USB** activada
(Ajustes → Acerca del teléfono → tocar 7 veces "Número de compilación",
luego Opciones de desarrollador → Depuración USB).

Verifica que el teléfono aparece:

```powershell
adb devices
```

## Correr

```powershell
npm run audit-visual
```

Conectas, corres, y te vas. Cinco minutos sin ti. Al terminar hay ~200
capturas en `.maestro/capturas/`, que está dentro del repo: **no me mandas
nada, yo las leo directo.** Solo dime "ya corrió".

## Qué corre

| Flujo | Qué persigue |
|---|---|
| `01-tema-cards.yaml` | El colapso de las cards de Tareas al cambiar de tema en caliente. Compara `04` contra `07` |
| `02-agua-taps.yaml` | Cuatro taps de agua seguidos. La secuencia debe subir siempre; si alguna captura baja, el bug volvió |
| `10-rutas-oscuro.yaml` | Las ~188 rutas en tema oscuro, por deep link |
| `10-rutas-claro.yaml` | Las mismas en claro. Aquí salen los colores clavados a mano |

Los dos de rutas están **generados** desde tu carpeta `app/`. Si mañana
agregas una pantalla, se regeneran y entra sola:

```powershell
node scripts/gen-mapa-rutas.js --maestro
```

## Correr uno solo

```powershell
maestro test .maestro/01-tema-cards.yaml
```

## Lo que esto NO hace

Te dice **qué se ve**. No te dice **cómo se siente**. Que un flujo esté torpe,
que un copy no suene a ti, que una pantalla sea bonita pero inútil: eso sigue
siendo criterio tuyo. Lo que quitamos es el trabajo mecánico de llegar hasta
ahí y describirlo.

## Nota sobre las rutas con parámetro

Seis rutas necesitan un id (`[key]`, `[userId]`, `[packKey]`, `[category]`,
`[appKey]`). No entran al recorrido automático porque el id depende de tus
datos. Si quieres cubrirlas, dime cuáles importan y les pongo valores de
muestra.
