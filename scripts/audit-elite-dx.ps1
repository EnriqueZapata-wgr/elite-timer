# audit-elite-dx.ps1 - recorrido corto de la app Elite DX (26-sep-2026).
#
# Que hace: en tema claro y luego en oscuro, abre las cinco salas (HOY,
# MI PROGRAMA, ARGOS, PROGRESO, TU), baja por cada una tomando capturas, toca
# las pestanas del tab bar como lo haria un cliente, y abre los destinos a los
# que llevan sus filas. Al final deja todo en .maestro\capturas\elite-dx\ para
# que Cowork lo revise.
#
# Mismo metodo que audit-visual.ps1 (adb, sin Maestro: Maestro pide WSL2 en
# Windows). Lo nuevo es tocar por texto: `uiautomator dump` devuelve donde esta
# cada texto en la pantalla y se toca ahi. Si un texto no aparece, se avisa y
# se sigue con deep link; nunca se inventa un toque a ciegas.
#
# ANTES DE CORRER
#   - Telefono por cable con Depuracion USB, `adb devices` lo ve.
#   - Sesion iniciada en la app (la cuenta con evaluacion, idealmente).
#   - Ajustes > Pantalla > Tiempo de espera de pantalla > 10 minutos.
#   - La actualizacion OTA ya aplicada (se ve MI PROGRAMA en la barra).
#
# USO
#   .\scripts\audit-elite-dx.ps1
#   .\scripts\audit-elite-dx.ps1 -Temas claro
#   .\scripts\audit-elite-dx.ps1 -Espera 3

param(
  [string]$Temas = "claro,oscuro",
  [double]$Espera = 2.2,
  [string]$AppId = "com.atpperformance.app"
)

$ErrorActionPreference = "Continue"
$raiz = Split-Path -Parent $PSScriptRoot
$tmpPng = "/sdcard/atp-dx.png"
$tmpXml = "/sdcard/atp-dx.xml"
$xmlLocal = Join-Path $env:TEMP "atp-dx-ui.xml"
$faltas = New-Object System.Collections.ArrayList

# --- Telefono ---------------------------------------------------------------
$dispositivos = (& adb devices) | Select-String -Pattern "\tdevice$"
if (-not $dispositivos) {
  Write-Host ""
  Write-Host "  No veo ningun telefono. Conecta el cable, activa Depuracion USB y" -ForegroundColor Red
  Write-Host "  acepta el dialogo en la pantalla. Verifica con:  adb devices"
  exit 1
}

# Tamano de pantalla, para los deslizamientos.
$tam = (& adb shell wm size) -join " "
if ($tam -match "(\d+)x(\d+)") { $W = [int]$Matches[1]; $H = [int]$Matches[2] } else { $W = 1080; $H = 2340 }
$xMedio = [int]($W / 2)
$yAbajo = [int]($H * 0.72)
$yArriba = [int]($H * 0.30)

function Abrir([string]$ruta) {
  $uri = "atp://" + $ruta.TrimStart('/')
  & adb shell am start -W -a android.intent.action.VIEW -d "`"$uri`"" $AppId 2>$null | Out-Null
  Start-Sleep -Seconds $Espera
}

function Captura([string]$carpeta, [string]$nombre) {
  $destino = Join-Path $carpeta "$nombre.png"
  & adb shell screencap -p $tmpPng 2>$null
  & adb pull $tmpPng $destino 2>$null | Out-Null
  if ((Test-Path $destino) -and (Get-Item $destino).Length -lt 60KB) {
    Write-Host "  ! $nombre salio casi vacia (app caida o pantalla apagada)" -ForegroundColor DarkYellow
    [void]$faltas.Add("$nombre (captura casi vacia)")
  }
}

function Bajar {
  & adb shell input swipe $xMedio $yAbajo $xMedio $yArriba 450 2>$null | Out-Null
  Start-Sleep -Seconds 1.2
}

# Busca un texto (o la descripcion de accesibilidad) en la pantalla y lo toca.
# Devuelve $true si lo encontro. La orbe de ARGOS respira, y a veces
# uiautomator no logra "quedarse quieto": se reintenta tres veces.
function Tocar([string]$texto) {
  for ($intento = 1; $intento -le 3; $intento++) {
    & adb shell uiautomator dump $tmpXml 2>$null | Out-Null
    & adb pull $tmpXml $xmlLocal 2>$null | Out-Null
    if (Test-Path $xmlLocal) {
      $xml = Get-Content $xmlLocal -Raw -Encoding UTF8
      Remove-Item $xmlLocal -ErrorAction SilentlyContinue
      $esc = [regex]::Escape($texto)
      $m = [regex]::Match($xml, "(?:text|content-desc)=""$esc""[^>]*?bounds=""\[(\d+),(\d+)\]\[(\d+),(\d+)\]""")
      if ($m.Success) {
        $x = [int](([int]$m.Groups[1].Value + [int]$m.Groups[3].Value) / 2)
        $y = [int](([int]$m.Groups[2].Value + [int]$m.Groups[4].Value) / 2)
        & adb shell input tap $x $y 2>$null | Out-Null
        Start-Sleep -Seconds $Espera
        return $true
      }
    }
    Start-Sleep -Seconds 1
  }
  return $false
}

function Tema([string]$tema) {
  $etiqueta = if ($tema -eq "oscuro") { "Oscuro" } else { "Claro" }
  Abrir "/settings/experiencia"
  for ($i = 0; $i -lt 5; $i++) {
    if (Tocar $etiqueta) { return $true }
    Bajar
  }
  return $false
}

# --- Que se recorre ---------------------------------------------------------
# Salas: [ruta, nombre, cuantas veces bajar]
$SALAS = @(
  @("/",         "hoy",        4),
  @("/programa", "mi-programa", 5),
  @("/argos",    "argos",      0),
  @("/progreso", "progreso",   3),
  @("/tu",       "tu",         4)
)
# Pestanas del tab bar, tocadas como cliente, desde HOY.
# "Tu" lleva acento; se arma con [char] porque PowerShell 5 lee este archivo
# como ANSI y un acento escrito aqui llegaria roto.
$uAcento = [string][char]0x00FA
$PESTANAS = @("Mi programa", "Progreso", ("T" + $uAcento), "Hoy")
# A donde llevan las filas de las salas.
$DESTINOS = @(
  @("/salud/evaluacion-elite",                        "eval-completa"),
  @("/salud/evaluacion-elite?seccion=alimentacion",   "eval-alimentacion"),
  @("/salud/evaluacion-elite?seccion=entrenamiento",  "eval-entrenamiento"),
  @("/salud/evaluacion-elite?seccion=marcadores",     "eval-marcadores"),
  @("/salud/evaluacion-elite?seccion=medico",         "eval-medico"),
  @("/supplements",                                   "suplementos"),
  @("/edad-atp/labs",                                 "laboratorios"),
  @("/salud/genetica",                                "genetica"),
  @("/historia-clinica",                              "historia-clinica"),
  @("/salud/mis-sintomas",                            "sintomas"),
  @("/salud/mis-datos",                               "mis-datos"),
  @("/salud/ficha-emergencia",                        "ficha-emergencia"),
  @("/medidas",                                       "medidas"),
  @("/fitness-strength",                              "fuerza"),
  @("/sleep",                                         "sueno"),
  @("/reports",                                       "reportes"),
  @("/settings/subscription",                         "tu-servicio"),
  @("/settings",                                      "ajustes"),
  @("/ordenar-dia",                                   "ordenar-dia"),
  @("/checkin",                                       "checkin")
)
# Salas retiradas: siguen abriendo por enlace viejo. Se fotografian para ver
# que no truenan, no porque el cliente deba llegar ahi.
$RETIRADAS = @(
  @("/kit",   "retirada-kit"),
  @("/salud", "retirada-salud"),
  @("/tribu", "retirada-tribu")
)

Write-Host ""
Write-Host "  Recorrido Elite DX | temas: $Temas | pantalla $W x $H" -ForegroundColor Green
Write-Host "  No toques el telefono. Arranca en 3 segundos." -ForegroundColor Cyan
Start-Sleep -Seconds 3

foreach ($tema in ($Temas -split ",")) {
  $tema = $tema.Trim()
  $carpeta = Join-Path $raiz ".maestro\capturas\elite-dx\$tema"
  New-Item -ItemType Directory -Force -Path $carpeta | Out-Null

  if (-not (Tema $tema)) {
    Write-Host "  ! No encontre el selector de tema '$tema' en Ajustes > Experiencia." -ForegroundColor Yellow
    Write-Host "    Las capturas de '$tema' salen con el tema que ya tenia la app." -ForegroundColor Yellow
    [void]$faltas.Add("tema $tema no confirmado")
  }
  Captura $carpeta "00-tema-$tema"

  # 1. Las cinco salas, de arriba abajo.
  $n = 10
  foreach ($s in $SALAS) {
    Abrir $s[0]
    Captura $carpeta ("{0:D2}-{1}-1" -f $n, $s[1])
    for ($k = 1; $k -le $s[2]; $k++) {
      Bajar
      Captura $carpeta ("{0:D2}-{1}-{2}" -f $n, $s[1], ($k + 1))
    }
    $n += 10
  }

  # 2. El tab bar, tocado como cliente.
  Abrir "/"
  $p = 1
  foreach ($pest in $PESTANAS) {
    $slug = ($pest.ToLower() -replace $uAcento, "u" -replace " ", "-")
    if (Tocar $pest) {
      Captura $carpeta ("60-tab-{0}-{1}" -f $p, $slug)
    } else {
      Write-Host "  ! No encontre la pestana '$pest' en el tab bar" -ForegroundColor Yellow
      [void]$faltas.Add("pestana $pest no encontrada ($tema)")
    }
    $p++
  }

  # 3. Los destinos de las filas.
  $d = 1
  foreach ($x in $DESTINOS) {
    Abrir $x[0]
    Captura $carpeta ("70-{0:D2}-{1}" -f $d, $x[1])
    $d++
  }

  # 4. Salas retiradas por enlace viejo.
  foreach ($x in $RETIRADAS) {
    Abrir $x[0]
    Captura $carpeta ("90-{0}" -f $x[1])
  }
}

& adb shell rm -f $tmpPng $tmpXml 2>$null | Out-Null
Abrir "/"

$total = @(Get-ChildItem (Join-Path $raiz ".maestro\capturas\elite-dx") -Recurse -Filter *.png -ErrorAction SilentlyContinue).Count
Write-Host ""
Write-Host "  Listo: $total capturas en .maestro\capturas\elite-dx\" -ForegroundColor Green
if ($faltas.Count -gt 0) {
  Write-Host "  Avisos:" -ForegroundColor Yellow
  $faltas | ForEach-Object { Write-Host "     $_" }
}
Write-Host ""
Write-Host "  Dile a Cowork: 'ya corrio el recorrido Elite DX'." -ForegroundColor Cyan
