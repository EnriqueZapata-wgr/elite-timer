# audit-visual.ps1 — recorre la app entera y deja una captura por pantalla.
#
# POR QUÉ ASÍ Y NO CON MAESTRO
# Maestro no corre nativo en Windows: pide WSL2 y redirigir adb entre los dos
# sistemas. Para el barrido de rutas no hace falta: `adb` solo puede abrir
# deep links y tomar capturas, y adb ya está instalado.
#
# HISTORIA, PARA NO REPETIRLA
# Esta es la version del 12-ago-2026 que SI corrio (135 capturas). Se intento
# "mejorarla" con `svc power stayon usb`, `input keyevent KEYCODE_WAKEUP`, un
# helper con Start-Job y un calentamiento previo: los cuatro colgaron el
# script en este S24. La leccion quedo escrita aqui: el barrido son tres
# comandos de adb en un loop y nada mas. Lo de la pantalla se resuelve en los
# ajustes del telefono, no con adb.
#
# 15-ago-2026: el barrido paso de 192 a 309 pantallas porque ahora tambien
# recorre las rutas con parametro. El loop NO se toco: sigue siendo los mismos
# tres comandos de adb. Todo lo nuevo pasa antes de arrancar, en el generador
# del mapa, que entrega rutas ya concretas (/reports/glucosa, no
# /reports/[dominio]). Este script sigue sin saber que existen los parametros.
#
# ANTES DE CORRER
#   Ajustes > Pantalla > Tiempo de espera de pantalla > 10 minutos
#   (si se apaga a media corrida, las capturas salen en negro)
#
# USO
#   .\scripts\audit-visual.ps1 -Tema oscuro
#   .\scripts\audit-visual.ps1 -Tema claro -Espera 2.5
#   .\scripts\audit-visual.ps1 -Solo "salud"
#   .\scripts\audit-visual.ps1 -Solo "reports"   (los 14 dominios y nada mas)
#   .\scripts\audit-visual.ps1 -Solo "tests/q"   (el motor de cuestionarios)
#
# SALIDA
#   .maestro/capturas/<tema>/<slug>.png  — dentro del repo, Cowork las lee directo.
#   El slug sale de la ruta concreta, asi que /reports/nutricion y /reports/labs
#   escriben reports-nutricion.png y reports-labs.png, y /cocina?tab=lista
#   escribe cocina-tab-lista.png. El generador verifica que no haya dos iguales.

param(
  [string]$Tema = "actual",
  [double]$Espera = 1.8,
  [string]$Solo = "",
  [string]$AppId = "com.atpperformance.app"
)

# NO poner "Stop": adb escribe cosas normales a stderr (el progreso de `pull`),
# y con Stop la primera corrida reporto "187 rutas fallaron" cuando 135 se
# habian escrito perfectamente.
$ErrorActionPreference = "Continue"
$raiz = Split-Path -Parent $PSScriptRoot

# --- 1. Verificar que hay un teléfono conectado -------------------------------
$dispositivos = (& adb devices) | Select-String -Pattern "\tdevice$"
if (-not $dispositivos) {
  Write-Host ""
  Write-Host "  No veo ningun telefono." -ForegroundColor Red
  Write-Host "  Conecta el cable, activa Depuracion USB, y acepta el dialogo"
  Write-Host "  de 'Permitir depuracion USB' que sale en la pantalla."
  Write-Host ""
  Write-Host "  Verifica con:  adb devices"
  exit 1
}
Write-Host "  Telefono listo: $($dispositivos.Count) dispositivo(s)" -ForegroundColor Green

# --- 2. Cargar el mapa de rutas ----------------------------------------------
# El mapa se regenera SIEMPRE. Un mapa viejo no truena: captura de menos y no
# lo dice, que es la peor forma de fallar para un audit. Regenerar es barato
# (lee `app/` y cuatro archivos de constantes) y deja el recorrido pegado al
# codigo que hay hoy.
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host ""
  Write-Host "  No encuentro node, y el mapa de rutas se arma con node." -ForegroundColor Red
  Write-Host "  Sin regenerarlo el barrido correria con un mapa viejo y capturaria"
  Write-Host "  de menos sin avisar, que es justo lo que no queremos de un audit."
  exit 1
}

Write-Host "  Regenerando el mapa de rutas..." -ForegroundColor Gray
& node (Join-Path $raiz "scripts\gen-mapa-rutas.js")
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "  El mapa de rutas no se pudo generar." -ForegroundColor Red
  Write-Host "  Arriba esta el motivo exacto. Los tipicos:"
  Write-Host "    - nacio una ruta con parametro y nadie le dio valores de ejemplo"
  Write-Host "    - se movio uno de los archivos de donde salen esos valores"
  Write-Host ""
  Write-Host "  Se arregla en:  scripts\ejemplos-rutas.js"
  Write-Host "  Se reintenta con:  node scripts\gen-mapa-rutas.js"
  exit 1
}

$mapaPath = Join-Path $raiz ".maestro\rutas.json"
$mapa = Get-Content $mapaPath -Raw -Encoding UTF8 | ConvertFrom-Json
$rutas = $mapa.rutas

# Pantallas que NO se pueden visitar de paso.
#
# /edad-atp/tests/reaction-time es un test reactivo: arranca solo al montarse y
# no sobrevive una visita de paso. Con el salen las dos rutas que redirigen
# ahi, porque redirigir es llegar.
#
# Las tres de camara (/food-log, /food-scan, /food-barcode) SALIERON de esta
# lista el 15-ago-2026, y por eso hoy si se fotografian. Estaban aqui porque
# montar /food-log disparaba la camara del sistema sola y el barrido ya se
# habia movido a la siguiente ruta cuando el picker respondia
# ("ExponentImagePicker.launchCameraAsync has been rejected", 12-ago-2026, tres
# veces). Eso ya se corrigio: PhotoSensor solo llama a la camara si el sensor
# se eligio con un GESTO, y cuando el sensor viene de la ruta ese flag nace en
# false. /food-scan y /food-barcode son redirects a /food-log, asi que caen del
# mismo lado. El sensor de codigo tampoco tiene efecto de montaje: su visor
# pide el permiso en el onPress.
$SALTAR = @(
  '/edad-atp/tests/reaction-time',
  '/edad-atp/cognitive',
  '/tests/run/reaction-time'
)

# Si una exclusion ya no le pega a nada, la ruta se renombro y lo que se queria
# evitar puede estar de vuelta en el recorrido sin que nadie se entere.
foreach ($s in $SALTAR) {
  if (-not ($rutas | Where-Object { $_.ruta -eq $s })) {
    Write-Host "  OJO: la exclusion '$s' ya no existe en el mapa." -ForegroundColor Yellow
    Write-Host "       Se renombro esa pantalla? Revisa la lista SALTAR de este script."
  }
}
$rutas = $rutas | Where-Object { $SALTAR -notcontains $_.ruta }

# Lo que quedo fuera a proposito, a la vista antes de arrancar.
if ($mapa.fuera) {
  foreach ($p in $mapa.fuera.PSObject.Properties) {
    Write-Host "  Fuera: $($p.Name) -> $($p.Value)" -ForegroundColor DarkGray
  }
}

if ($Solo) { $rutas = $rutas | Where-Object { $_.ruta -like "*$Solo*" } }

$destino = Join-Path $raiz ".maestro\capturas\$Tema"
New-Item -ItemType Directory -Force -Path $destino | Out-Null

$nEst = @($rutas | Where-Object { $_.tipo -eq 'estatica' }).Count
$nDin = @($rutas | Where-Object { $_.tipo -eq 'dinamica' }).Count
$nVar = @($rutas | Where-Object { $_.tipo -eq 'variante' }).Count
Write-Host "  $($rutas.Count) pantallas | tema: $Tema | ~$([math]::Round($rutas.Count * ($Espera + 1.2) / 60, 1)) min"
Write-Host "  $nEst estaticas + $nDin con parametro + $nVar pestanas" -ForegroundColor Gray
Write-Host "  Salida: .maestro\capturas\$Tema\"
Write-Host ""
Write-Host "  Deja la pantalla del telefono encendida (10 min de espera)." -ForegroundColor Yellow
Write-Host "  Arranca en 3 segundos. No toques el telefono." -ForegroundColor Cyan
Write-Host ""
Start-Sleep -Seconds 3

# --- 3. Recorrer -------------------------------------------------------------
$i = 0
$tmpRemoto = "/sdcard/atp-audit.png"

foreach ($r in $rutas) {
  $i++
  $uri = "$($mapa.scheme)://$($r.ruta.TrimStart('/'))"
  $destinoPng = Join-Path $destino "$($r.slug).png"
  $pct = [math]::Round($i / $rutas.Count * 100)
  Write-Progress -Activity "Audit visual ($Tema)" -Status "$i/$($rutas.Count)  $($r.ruta)" -PercentComplete $pct

  # Los tres comandos que ya funcionaron. -W espera a que la activity quede en
  # primer plano antes de devolver.
  & adb shell am start -W -a android.intent.action.VIEW -d "`"$uri`"" $AppId 2>$null | Out-Null
  Start-Sleep -Seconds $Espera
  & adb shell screencap -p $tmpRemoto 2>$null
  & adb pull $tmpRemoto $destinoPng 2>$null | Out-Null

  # RESISTENCIA (14-ago-2026, revalidada al pasar a 306 rutas): una sola ruta
  # mala tumbaba la corrida entera y las 150 capturas siguientes salian del
  # dialogo de "la app se detuvo". Si la captura sale sospechosamente chica, la
  # app probablemente murio: se cierra a la fuerza y la siguiente ruta la vuelve
  # a levantar sola. Con mas del doble de rutas, la probabilidad de toparse con
  # una mala subio, asi que esto importa mas que antes, no menos.
  if ((Test-Path $destinoPng) -and (Get-Item $destinoPng).Length -lt 60KB) {
    Write-Host "  ! $($r.ruta) dejo la app en mal estado, reiniciando" -ForegroundColor DarkYellow
    & adb shell am force-stop $AppId 2>$null | Out-Null
    Start-Sleep -Seconds 2
  }
}

& adb shell rm -f $tmpRemoto 2>$null | Out-Null
Write-Progress -Activity "Audit visual" -Completed

# --- 4. Reporte --------------------------------------------------------------
$capturas = @(Get-ChildItem $destino -Filter *.png -ErrorAction SilentlyContinue)
Write-Host ""
Write-Host "  Listo: $($capturas.Count) capturas de $($rutas.Count) en .maestro\capturas\$Tema\" -ForegroundColor Green

# Una captura casi vacia suele ser una pantalla que no pinto nada, o la
# pantalla apagada. Los KB son un proxy burdo pero util para saber por donde
# empezar a mirar.
$sospechosas = $capturas | Where-Object { $_.Length -lt 60KB } | Sort-Object Length
if ($sospechosas) {
  Write-Host ""
  Write-Host "  $($sospechosas.Count) capturas sospechosamente vacias:" -ForegroundColor Yellow
  $sospechosas | Select-Object -First 15 | ForEach-Object {
    Write-Host ("     {0,7:N0} KB  {1}" -f ($_.Length / 1KB), $_.Name)
  }
  if ($sospechosas.Count -gt 15) { Write-Host "     ... y $($sospechosas.Count - 15) mas" }
}

# Dos capturas identicas byte a byte casi siempre significan que el deep link
# no resolvio: la app se quedo donde estaba y la foto salio de la pantalla
# anterior. Ese es el modo silencioso de fallar de este barrido, y con rutas
# con parametro (un valor mal escrito abre la nada) importa mas que antes.
# No siempre es un error: /food-scan redirige a /food-log y las dos capturas
# tienen que salir iguales. Por eso se reporta para revisar, no como falla.
$porHash = $capturas | ForEach-Object {
  [pscustomobject]@{ Nombre = $_.Name; Hash = (Get-FileHash $_.FullName -Algorithm MD5).Hash }
}
$identicas = @($porHash | Group-Object Hash | Where-Object { $_.Count -gt 1 })
if ($identicas.Count -gt 0) {
  Write-Host ""
  Write-Host "  $($identicas.Count) grupos de capturas identicas (deep link que no resolvio, o redirect):" -ForegroundColor Yellow
  $identicas | Select-Object -First 10 | ForEach-Object {
    Write-Host ("     " + (($_.Group | ForEach-Object { $_.Nombre }) -join "  =  "))
  }
  if ($identicas.Count -gt 10) { Write-Host "     ... y $($identicas.Count - 10) grupos mas" }
}

Write-Host ""
Write-Host "  Dile a Cowork: 'ya corrio, tema $Tema'." -ForegroundColor Cyan
