#!/usr/bin/env bash
#
# Corre la suite completa en lotes, para sandboxes que matan los procesos.
#
# POR QUÉ
# La suite completa tarda cerca de una hora en Linux (el repo se lee por un
# mount de red lento). Pero el sandbox de agentes mata TODOS los procesos entre
# una llamada de shell y la siguiente, y cada llamada tiene un techo de ~178s.
# Está verificado: hasta un `sleep 900` lanzado con `setsid nohup` muere. Ni
# setsid ni nohup ni disown salvan la corrida.
#
# Lo que sí sobrevive es el disco. Así que el avance se guarda en archivos:
# cada llamada corre un lote, lo apunta como hecho, y termina a tiempo.
#
# USO
#   bash scripts/testing/pruebas-linux-lotes.sh init    # arma la lista
#   bash scripts/testing/pruebas-linux-lotes.sh         # un lote, repetir
#   bash scripts/testing/pruebas-linux-lotes.sh total   # suma final
#
# Repite el segundo comando hasta que diga PENDIENTES=0. Son ~14 veces.
#
# Es idempotente: si un lote se corta a la mitad no cuenta, sus archivos siguen
# pendientes y se reintentan. No se pierde ni se duplica nada.
#
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TRABAJO="${ATP_LOTES_DIR:-/tmp/atp-lotes}"
PEND="$TRABAJO/pendientes.txt"
SALIDAS="$TRABAJO/resultados"
TAM="${ATP_LOTE_TAM:-26}"        # calibrado para caber en ~170s
PRESUPUESTO="${ATP_LOTE_SEG:-170}"

mkdir -p "$SALIDAS"

case "${1:-lote}" in
  init)
    # Misma lista que arma el include de vitest.config.ts, menos el exclude.
    cd "$RAIZ"
    find src supabase/functions -path '*__tests__*' -name '*.test.ts' \
      | grep -v '^src/engine/__tests__/' | sort > "$PEND"
    rm -f "$SALIDAS"/*.json
    echo "Pendientes: $(wc -l < "$PEND") archivos. Ahora corre el script sin argumentos."
    exit 0
    ;;
  total)
    node -e '
      const fs=require("fs"), dir=process.argv[1];
      let tests=0,pass=0,fail=0,skip=0; const archivos=new Set(), fallas=[];
      for(const f of fs.readdirSync(dir).filter(x=>x.endsWith(".json"))){
        const j=JSON.parse(fs.readFileSync(dir+"/"+f,"utf8"));
        tests+=j.numTotalTests||0; pass+=j.numPassedTests||0;
        fail+=j.numFailedTests||0; skip+=j.numPendingTests||0;
        for(const r of (j.testResults||[])){
          archivos.add(r.name);
          for(const a of (r.assertionResults||[])) if(a.status==="failed")
            fallas.push("  x "+a.fullName+"\n    "+r.name);
        }
      }
      console.log("Archivos: "+archivos.size);
      console.log("Pruebas:  "+tests+"  (pasadas "+pass+", fallidas "+fail+", saltadas "+skip+")");
      if(fallas.length){ console.log("\nFALLAS:\n"+fallas.join("\n")); process.exit(1); }
      console.log("\nSin fallas.");
    ' "$SALIDAS"
    exit $?
    ;;
esac

[[ -f "$PEND" ]] || { echo "Corre primero: bash $0 init" >&2; exit 1; }

INICIO=$(date +%s)
while true; do
  RESTA=$(( PRESUPUESTO - ( $(date +%s) - INICIO ) ))
  # Solo arranca otro lote si alcanza para terminarlo. Un lote cortado es
  # tiempo tirado: hay que rehacerlo completo.
  [[ $RESTA -lt 150 ]] && { echo "sin presupuesto en esta llamada"; break; }

  QUEDAN=$(wc -l < "$PEND")
  [[ "$QUEDAN" -eq 0 ]] && { echo "PENDIENTES=0 — corre: bash $0 total"; break; }

  head -n "$TAM" "$PEND" > "$TRABAJO/lote_actual.txt"
  JSON="$SALIDAS/l_$(date +%s%N).json"

  cd "$RAIZ"
  # maxThreads alto a propósito: estos tests están esperando I/O del mount, no
  # quemando CPU. Más hilos que núcleos enmascara la latencia y casi duplica el
  # avance por llamada.
  NODE_PATH="${ATP_LINUX_DEPS:-/tmp/atp-linux-deps}/node_modules" \
  timeout "$RESTA" node node_modules/vitest/vitest.mjs run \
    --config "$RAIZ/scripts/testing/vitest.linux.config.mts" \
    --poolOptions.threads.maxThreads=12 --poolOptions.threads.minThreads=12 \
    --reporter=basic --reporter=json --outputFile.json="$JSON" \
    $(tr '\n' ' ' < "$TRABAJO/lote_actual.txt") >> "$TRABAJO/corrida.log" 2>&1
  RC=$?

  if [[ -s "$JSON" ]]; then
    # rc distinto de 0 con json presente = hubo pruebas rojas, pero el lote se
    # corrió completo. Cuenta como hecho; las fallas salen en 'total'.
    tail -n +$(( TAM + 1 )) "$PEND" > "$TRABAJO/p2" && mv "$TRABAJO/p2" "$PEND"
    echo "lote listo (rc=$RC) — restan $(wc -l < "$PEND") archivos"
  else
    rm -f "$JSON"
    echo "el lote no cupo en $RESTA s. Baja el tamaño: ATP_LOTE_TAM=13 bash $0"
    break
  fi
done
