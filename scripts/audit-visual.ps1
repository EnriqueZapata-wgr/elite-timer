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
# ANTES DE CORRER
#   Ajustes > Pantalla > Tiempo de espera de pantalla > 10 minutos
#   (si se apaga a media corrida, las capturas salen en negro)
#
# USO
#   .\scripts\audit-visual.ps1 -Tema oscuro
#   .\scripts\audit-visual.ps1 -Tema claro -Espera 2.5
#   .\scripts\audit-visual.ps1 -Solo "salud"
#
# SALIDA
#   .maestro/capturas/<tema>/<slug>.png  — dentro del repo, Cowork las lee directo.

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
$mapaPath = Join-Path $raiz ".maestro\rutas.json"
if (-not (Test-Path $mapaPath)) {
  Write-Host "  Falta el mapa de rutas. Generando..." -ForegroundColor Yellow
  & node (Join-Path $raiz "scripts\gen-mapa-rutas.js") --maestro | Out-Null
}
$mapa = Get-Content $mapaPath -Raw -Encoding UTF8 | ConvertFrom-Json
$rutas = $mapa.rutas
if ($Solo) { $rutas = $rutas | Where-Object { $_.ruta -like "*$Solo*" } }

$destino = Join-Path $raiz ".maestro\capturas\$Tema"
New-Item -ItemType Directory -Force -Path $destino | Out-Null

Write-Host "  $($rutas.Count) pantallas | tema: $Tema | ~$([math]::Round($rutas.Count * ($Espera + 1.2) / 60, 1)) min"
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

Write-Host ""
Write-Host "  Dile a Cowork: 'ya corrio, tema $Tema'." -ForegroundColor Cyan
