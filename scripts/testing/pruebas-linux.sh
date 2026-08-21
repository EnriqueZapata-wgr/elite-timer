#!/usr/bin/env bash
#
# Corre la suite de vitest desde Linux sin tocar el node_modules del dueño.
#
# POR QUÉ
# El node_modules del repo está instalado desde Windows y solo trae los
# binarios nativos de Windows (@rollup/rollup-win32-x64-msvc, @esbuild/win32-x64).
# Vitest necesita rollup y esbuild nativos, y en Linux esos dos no arrancan.
#
# QUÉ HACE
# Instala SOLO los dos binarios nativos de Linux en un directorio propio fuera
# del repo, y se los presta a Node por NODE_PATH. Node resuelve los `require()`
# de rollup y esbuild ahí. El node_modules del repo se lee, nunca se escribe.
#
# LO QUE ESTE SCRIPT NO HACE, Y NO DEBE HACER NUNCA
#   - npm install / npm ci dentro del repo. Ni con banderas. Un agente ya podó
#     paquetes que no se pudieron volver a bajar y costó horas.
#   - tocar package.json o package-lock.json.
#   - escribir cualquier cosa dentro de node_modules/.
#
# USO
#   bash scripts/testing/pruebas-linux.sh              # suite completa
#   bash scripts/testing/pruebas-linux.sh src/engine   # filtro, como vitest
#
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# ─── CACHE POR USUARIO (19-ago-2026) ─────────────────────────────────────────
# El cache de vitest va POR USUARIO, no compartido. Cuando dos sesiones del
# sandbox corren con uid distinto, la segunda hereda /tmp/atp-vitest-cache a
# nombre de la primera y vitest truena con EACCES al escribir results.json,
# DESPUÉS de que todas las pruebas pasaron. Resultado: la suite sale en verde y
# el script sale con código 1. Un semáforo que dice rojo con el tablero en
# verde, que es peor que no tener semáforo.
# `vitest.linux.config.mts` ya respeta esta variable; sólo faltaba fijarla.
export ATP_TEST_CACHE="${ATP_TEST_CACHE:-/tmp/atp-vitest-cache-$(id -u)}"

CONFIG="$RAIZ/scripts/testing/vitest.linux.config.mts"

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Este script es para Linux. En Windows corre 'npm test' normal." >&2
  exit 1
fi

# ─── DÓNDE ESTÁ node_modules (21-ago-2026) ───────────────────────────────────
# En un worktree de git no hay node_modules propio. El dueño lo enlaza con una
# junction de Windows y Linux no puede seguir ese enlace (I/O error), así que
# aquí hacemos lo mismo que hace Node: subir por el árbol hasta el primer
# node_modules LEGIBLE. No se instala nada; si no aparece ninguno, se aborta
# igual que antes.
buscar_modulos() {
  local dir="$RAIZ"
  for _ in 1 2 3 4 5; do
    [[ -d "$dir/node_modules/vitest" ]] && { echo "$dir/node_modules"; return 0; }
    dir="$(dirname "$dir")"
  done
  return 1
}
MODULOS="$(buscar_modulos || true)"

# Los dos binarios nativos viven JUNTO al node_modules del repo, en una carpeta
# ignorada por git (.atp-linux-deps). Antes vivían en /tmp y se perdían cada vez
# que el sandbox reciclaba la máquina; ahí adentro, además, el VM del dueño no
# tiene salida a npm y no se podían volver a bajar. Junto al repo sobreviven y
# los comparten todos los worktrees. Se sigue pudiendo mover con ATP_LINUX_DEPS.
DEPS_LINUX="${ATP_LINUX_DEPS:-$(dirname "$MODULOS")/.atp-linux-deps}"

if [[ -z "$MODULOS" ]]; then
  echo "ERROR: no hay node_modules legible desde $RAIZ (ni subiendo por el árbol)." >&2
  echo "El dueño tiene que instalar desde Windows. NO corras npm install aquí." >&2
  exit 1
fi

# --- Qué versiones exactas pide este repo -----------------------------------
# Se leen del node_modules instalado, no del lockfile: lo instalado es la
# verdad. Si el dueño actualiza vite o vitest, estas versiones cambian solas y
# el script vuelve a bajar el binario que toca. No hay nada que editar a mano.
version_de() {
  node -p "require('$MODULOS/$1/package.json').version" 2>/dev/null || echo ""
}
VER_ROLLUP="$(version_de rollup)"
VER_ESBUILD="$(version_de esbuild)"

if [[ -z "$VER_ROLLUP" || -z "$VER_ESBUILD" ]]; then
  echo "ERROR: no pude leer las versiones de rollup/esbuild del repo." >&2
  exit 1
fi

# --- Qué binario nativo toca para esta máquina ------------------------------
ARCH="$(node -p 'process.arch')"   # x64 | arm64
case "$ARCH" in
  x64|arm64) ;;
  *) echo "ERROR: arquitectura no contemplada: $ARCH" >&2; exit 1 ;;
esac

# glibc o musl (Alpine). Rollup publica un paquete distinto para cada uno.
if ldd --version 2>&1 | grep -qi musl; then LIBC="musl"; else LIBC="gnu"; fi

PKG_ROLLUP="@rollup/rollup-linux-${ARCH}-${LIBC}@${VER_ROLLUP}"
PKG_ESBUILD="@esbuild/linux-${ARCH}@${VER_ESBUILD}"   # esbuild liga estático, no distingue libc

# --- Instalar (solo si falta o si cambió la versión) ------------------------
instalado() {
  node -p "require('$DEPS_LINUX/node_modules/$1/package.json').version" 2>/dev/null || echo ""
}
FALTA=0
[[ "$(instalado "@rollup/rollup-linux-${ARCH}-${LIBC}")" == "$VER_ROLLUP"  ]] || FALTA=1
[[ "$(instalado "@esbuild/linux-${ARCH}")"              == "$VER_ESBUILD" ]] || FALTA=1

if [[ "$FALTA" == "1" ]]; then
  echo "Preparando binarios nativos de Linux en $DEPS_LINUX (fuera del repo)..."
  mkdir -p "$DEPS_LINUX"
  [[ -f "$DEPS_LINUX/package.json" ]] || \
    echo '{"name":"atp-linux-deps","private":true,"version":"1.0.0"}' > "$DEPS_LINUX/package.json"
  # --prefix ancla el install a $DEPS_LINUX. npm nunca ve el repo.
  if ! npm install --prefix "$DEPS_LINUX" --no-audit --no-fund --loglevel=error \
        "$PKG_ROLLUP" "$PKG_ESBUILD"; then
    echo "" >&2
    echo "ERROR: no se pudieron bajar los binarios nativos." >&2
    echo "Suele ser falta de red en el sandbox. Son 2 paquetes, pesan poco:" >&2
    echo "  $PKG_ROLLUP" >&2
    echo "  $PKG_ESBUILD" >&2
    exit 1
  fi
fi

# --- Correr -----------------------------------------------------------------
# NODE_PATH es el truco entero: los require() de rollup y esbuild son CommonJS
# y CommonJS sí respeta NODE_PATH. Por eso alcanza con prestarles los dos
# binarios en vez de reinstalar 1,500 paquetes.
cd "$RAIZ"
export NODE_PATH="$DEPS_LINUX/node_modules"
exec node "$MODULOS/vitest/vitest.mjs" run --config "$CONFIG" "$@"
