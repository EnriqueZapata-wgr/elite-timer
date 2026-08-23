#!/usr/bin/env bash
#
# Commit desde Linux dentro de un worktree, por plomería.
#
# POR QUÉ EXISTE
# El repo se lee por un mount lento. `git commit` normal escanea el árbol
# entero antes de escribir y no cabe en el techo de tiempo que tiene cada
# llamada de shell del agente. write-tree + commit-tree + update-ref solo
# tocan el índice y los objetos, y sí caben.
#
# El mount tampoco deja BORRAR archivos, así que los .lock huérfanos que deja
# una llamada muerta no se pueden quitar. Sí se pueden RENOMBRAR: se apartan
# a basura-* y el dueño los limpia después con `git prune`.
#
# QUÉ NO HACE
#   - No agrega archivos. Eso es tuyo, antes, con `git update-index`.
#   - No cambia de rama. Escribe sobre la que apunta HEAD del worktree.
#
# USO
#   bash scripts/testing/commit-worktree-linux.sh "titulo" "" "cuerpo" ...
#   Cada argumento es un -m. Una cadena vacía deja renglón en blanco.
#
set -u

if [[ $# -eq 0 ]]; then
  echo "ERROR: falta al menos el título del commit." >&2
  exit 2
fi

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# El .git de un worktree es un ARCHIVO que apunta al directorio real. Y como
# lo creó Windows, la ruta que trae adentro es de Windows y no sirve aquí:
# la reconstruimos desde este lado.
if [[ -f "$RAIZ/.git" ]]; then
  NOMBRE="$(basename "$RAIZ")"
  PADRE="$(dirname "$(dirname "$RAIZ")")"
  export GIT_DIR="$PADRE/.git/worktrees/$NOMBRE"
  export GIT_WORK_TREE="$RAIZ"
elif [[ -d "$RAIZ/.git" ]]; then
  export GIT_DIR="$RAIZ/.git"
  export GIT_WORK_TREE="$RAIZ"
else
  echo "ERROR: no encuentro el .git de $RAIZ" >&2
  exit 1
fi

if [[ ! -d "$GIT_DIR" ]]; then
  echo "ERROR: $GIT_DIR no existe. ¿El worktree se creó con otro nombre?" >&2
  exit 1
fi

cd "$GIT_WORK_TREE" || exit 1

# La rama sale de HEAD, nunca de un nombre escrito a mano: así este script
# sirve igual en el siguiente worktree sin editarlo.
REF="$(sed -n 's/^ref: //p' "$GIT_DIR/HEAD" 2>/dev/null)"
if [[ -z "$REF" ]]; then
  echo "ERROR: HEAD no apunta a una rama (¿detached?). No hago commit a ciegas." >&2
  exit 1
fi

N=$(date +%s)
for l in "$GIT_DIR/index.lock" "$GIT_DIR/HEAD.lock"; do
  [[ -f "$l" ]] && mv "$l" "$l.basura-$N" 2>/dev/null
done

T=$(timeout 25 git write-tree 2>/dev/null) || { echo "FALLO write-tree" >&2; exit 1; }
P=$(timeout 10 git rev-parse HEAD 2>/dev/null) || { echo "FALLO rev-parse" >&2; exit 1; }

if [[ "$T" == "$(timeout 10 git rev-parse "HEAD^{tree}" 2>/dev/null)" ]]; then
  echo "NADA QUE COMPROMETER: el árbol es idéntico al de HEAD." >&2
  exit 3
fi

ARGS=(); for m in "$@"; do ARGS+=(-m "$m"); done
C=$(timeout 20 git commit-tree "$T" -p "$P" "${ARGS[@]}" 2>/dev/null) || { echo "FALLO commit-tree" >&2; exit 1; }
timeout 15 git update-ref "$REF" "$C" "$P" || { echo "FALLO update-ref" >&2; exit 1; }

echo "HEAD=$(timeout 10 git rev-parse --short HEAD 2>/dev/null) rama=${REF#refs/heads/}"
echo "  $(timeout 10 git --no-optional-locks log -1 --pretty=%s 2>/dev/null)"
