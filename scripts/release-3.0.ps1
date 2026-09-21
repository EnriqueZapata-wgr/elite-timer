# release-3.0.ps1: sube ATP a 3.0.0 y deja el repo listo para el build nativo.
#
# POR QUE EXISTE
#   Regla 11 de CLAUDE.md: NUNCA cambiar la version en app.json sin hacer build
#   inmediato. El runtime del OTA sale de esa version (policy appVersion): en
#   cuanto app.json diga 3.0.0, el binario 2.2.0 instalado deja de recibir
#   updates y solo los recibe el binario nuevo. Por eso el bump no va en ningun
#   commit de noche: va aqui, y se corre solo cuando vas a hacer `eas build`.
#
# QUE HACE (en este orden; si algo falla, no toca nada de lo siguiente)
#   0. Verifica rama main, app.json sin cambios pendientes y tag libre.
#   1. npx tsc --noEmit -p . (se salta con -SinTsc).
#   2. Sube expo.version -> 3.0.0, android.versionCode -> 24, ios.buildNumber -> 6
#      (scripts/release/bump-app-version.js; solo toca esas tres lineas).
#   3. Commit "ATP 3.0.0 ..." con app.json y tag v3.0.0.
#   4. Imprime los comandos que siguen (eas build, y despues el OTA a preview).
#
# USO (PowerShell, desde donde sea)
#   .\scripts\release-3.0.ps1 -SoloVer      # muestra que haria, no toca nada
#   .\scripts\release-3.0.ps1               # hace el bump, el commit y el tag
#   .\scripts\release-3.0.ps1 -SinTsc       # si ya corriste tsc hace un momento
#
# NO HACE
#   No hace push, no corre eas build, no publica OTA. Esos los corres tu
#   leyendo lo que imprime al final. Guia completa: "R and D/RELEASE_3.0.md".

param(
  [string]$Version = "3.0.0",
  [int]$VersionCode = 24,
  [int]$BuildNumber = 6,
  [switch]$SoloVer,
  [switch]$SinTsc
)

$ErrorActionPreference = "Stop"
$repo = Split-Path $PSScriptRoot -Parent
Set-Location $repo
$tag = "v$Version"

function Paso($texto) { Write-Host ""; Write-Host "== $texto" -ForegroundColor Cyan }

# 0. Estado del repo
Paso "Estado del repo"
$rama = (git rev-parse --abbrev-ref HEAD).Trim()
Write-Host "  rama: $rama"
if ($rama -ne "main") { throw "El release sale de main y estas en '$rama'." }

$appJsonSucio = git status --porcelain -- app.json
if ($appJsonSucio) { throw "app.json tiene cambios sin commit. Decide primero que hacer con ellos (git diff app.json)." }

$tagExiste = git tag --list $tag
if ($tagExiste) { throw "El tag $tag ya existe. Si es un reintento, borra el tag (git tag -d $tag) o cambia -Version." }

$pendientes = (git status --porcelain | Measure-Object -Line).Lines
if ($pendientes -gt 0) {
  Write-Host "  aviso: hay $pendientes archivos con cambios sin commit (no entran en el release; solo app.json se commitea)." -ForegroundColor Yellow
}

$versionActual = (node -e "console.log(require('./app.json').expo.version)").Trim()
Write-Host "  app.json hoy: $versionActual  ->  $Version (versionCode $VersionCode, buildNumber $BuildNumber)"

if ($SoloVer) {
  Paso "-SoloVer: esto es lo que haria"
  node scripts/release/bump-app-version.js --version $Version --version-code $VersionCode --build-number $BuildNumber --solo-ver
  if ($LASTEXITCODE -ne 0) { throw "bump-app-version.js rechazo los numeros (ver arriba)." }
  Write-Host "  commit: ATP ${Version}: version, versionCode y buildNumber (build nativo obligatorio)"
  Write-Host "  tag:    $tag"
  Write-Host ""
  Write-Host "No se toco nada. Sin -SoloVer se ejecuta."
  exit 0
}

# 1. Tipos
if (-not $SinTsc) {
  Paso "npx tsc --noEmit -p . (2 a 3 minutos; -SinTsc lo salta)"
  npx tsc --noEmit -p .
  if ($LASTEXITCODE -ne 0) { throw "tsc fallo. No se sube la version con errores de tipos." }
  Write-Host "  tsc: sin errores"
} else {
  Write-Host "  tsc: saltado (-SinTsc)" -ForegroundColor Yellow
}

# 2. Bump
Paso "app.json"
node scripts/release/bump-app-version.js --version $Version --version-code $VersionCode --build-number $BuildNumber
if ($LASTEXITCODE -ne 0) { throw "bump-app-version.js no escribio (ver arriba). Nada cambio." }

# 3. Commit + tag (solo app.json; nunca git add .)
Paso "commit y tag"
git add -- app.json
git commit -q -m "ATP ${Version}: version, versionCode $VersionCode y buildNumber $BuildNumber (build nativo obligatorio; el OTA pasa al runtime $Version)"
if ($LASTEXITCODE -ne 0) { throw "git commit fallo. app.json quedo modificado en el arbol; revisa git status." }
git tag -a $tag -m "ATP $Version"
Write-Host "  $(git log --oneline -1)"
Write-Host "  tag $tag"

# 4. Lo que sigue lo corres tu
Paso "LO QUE SIGUE (en este orden)"
Write-Host @"
  cd "$repo"
  git push
  git push origin $tag
  eas build -p android --profile preview
      (APK, canal preview: el que instalas en el S24. Cuando termine, instalalo.)
  eas build -p ios --profile beta
      (solo si vas a subir iOS ahora; mismo canal preview)

  Con el binario $Version instalado, el OTA vuelve a funcionar para ESE binario:
  `$env:SENTRY_AUTH_TOKEN = "<tu token>"
  npm run sourcemaps:ota -- --branch preview

  Ojo: el binario 2.2.0 que tengas instalado ya NO recibe este OTA ni los que
  sigan (runtime distinto). Si necesitas un arreglo para 2.2.0 antes de tener
  el build nuevo: git checkout $tag~1, publicas a preview, y vuelves a main.
"@
