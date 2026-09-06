#!/usr/bin/env bash
# curl-elite.sh: los tres comandos de la carga Elite (ATP 3.0, ruta 3.7).
# Se corre con el JWT de Enrique (admin) contra PostgREST. Sin service_role.
#
# Uso:
#   bash scripts/elite/curl-elite.sh codigo <correo> [dias]     genera un codigo Elite (365 dias por defecto)
#   bash scripts/elite/curl-elite.sh cargar <payload.json>      carga una evaluacion (salida de preparar-payload.js)
#   bash scripts/elite/curl-elite.sh ver <user_id>              lista las evaluaciones Elite de un usuario
#   bash scripts/elite/curl-elite.sh quien <correo>             busca el user_id de un cliente por su correo
#
# Variables de entorno:
#   ATP_JWT             obligatoria. Ver scripts/elite/obtener-jwt.md (dura 1 hora).
#   SUPABASE_ANON_KEY   si falta, se lee EXPO_PUBLIC_SUPABASE_ANON_KEY del .env de la raiz del repo.
#   SUPABASE_URL        opcional; por defecto el proyecto de produccion.
#   ATP_CODIGO_VIGENCIA_DIAS  opcional; dias que el codigo puede esperar sin canjearse (30 por defecto).
#
# Compatible con Git Bash en Windows: sin jq; el JSON se parsea con node -e.
# Por que existe (6 de septiembre de 2026): la pantalla de admin queda fuera
# de 3.0 (pivote 2.4, fase 1); estos curl son la herramienta de carga.

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SUPABASE_URL="${SUPABASE_URL:-https://itqkfozqvpwikogggqng.supabase.co}"

if [ -z "${SUPABASE_ANON_KEY:-}" ] && [ -f "$RAIZ/.env" ]; then
  # `|| true`: con pipefail, un .env sin la clave mataria el script sin mensaje; asi llega a requiere_entorno.
  SUPABASE_ANON_KEY="$( (grep '^EXPO_PUBLIC_SUPABASE_ANON_KEY=' "$RAIZ/.env" || true) | head -n 1 | cut -d= -f2- | tr -d '\r"'"'"' ')"
fi

falla() { echo "ERROR: $*" >&2; exit 1; }

requiere_entorno() {
  [ -n "${SUPABASE_ANON_KEY:-}" ] || falla "falta SUPABASE_ANON_KEY (o EXPO_PUBLIC_SUPABASE_ANON_KEY en .env)"
  [ -n "${ATP_JWT:-}" ] || falla "falta ATP_JWT. Ver scripts/elite/obtener-jwt.md"
  command -v curl >/dev/null || falla "no encuentro curl"
  command -v node >/dev/null || falla "no encuentro node"
}

# Llama a un RPC de PostgREST con el JWT. Imprime el cuerpo; el codigo HTTP va en la ultima linea.
rpc() {
  local nombre="$1" cuerpo="$2"
  curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/$nombre" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $ATP_JWT" \
    -H "Content-Type: application/json" \
    --data-binary "$cuerpo" \
    -w $'\n%{http_code}'
}

rpc_archivo() {
  local nombre="$1" archivo="$2"
  curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/$nombre" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $ATP_JWT" \
    -H "Content-Type: application/json" \
    --data-binary "@$archivo" \
    -w $'\n%{http_code}'
}

# Separa cuerpo y codigo HTTP de la salida de rpc().
cuerpo_de() { printf '%s\n' "$1" | sed '$d'; }
http_de()   { printf '%s\n' "$1" | tail -n 1; }

explica_http() {
  local http="$1" cuerpo="$2"
  case "$http" in
    2*) return 0 ;;
    401) echo "HTTP 401: el JWT vencio o no es valido. Genera uno nuevo (scripts/elite/obtener-jwt.md)." >&2 ;;
    404) echo "HTTP 404: el RPC no existe en produccion. Falta 'npx supabase db push' de las migraciones 315 y 318." >&2 ;;
    *)   echo "HTTP $http" >&2 ;;
  esac
  echo "$cuerpo" >&2
  return 1
}

cmd_codigo() {
  local correo="${1:-}" dias="${2:-365}"
  [ -n "$correo" ] || falla "uso: codigo <correo> [dias]"
  case "$dias" in ''|*[!0-9]*) falla "dias debe ser un entero: $dias" ;; esac
  local vigencia="${ATP_CODIGO_VIGENCIA_DIAS:-30}"
  local cuerpo
  cuerpo="$(node -e '
    const [correo, dias, vigencia] = process.argv.slice(1);
    const vence = new Date(Date.now() + Number(vigencia) * 86400000).toISOString();
    process.stdout.write(JSON.stringify({
      p_count: 1, p_tier: "elite", p_duration_days: Number(dias), p_source: "elite",
      p_expires_at: vence, p_issued_to_email: correo,
    }));
  ' "$correo" "$dias" "$vigencia")"
  local salida http body
  salida="$(rpc generate_activation_codes "$cuerpo")"
  http="$(http_de "$salida")"; body="$(cuerpo_de "$salida")"
  explica_http "$http" "$body" || exit 1
  node -e '
    let r; try { r = JSON.parse(process.argv[1]); } catch { console.error("respuesta no es JSON:", process.argv[1]); process.exit(1); }
    if (!r || r.ok !== true || !Array.isArray(r.codes) || !r.codes.length) { console.error("el RPC no genero el codigo:", JSON.stringify(r)); process.exit(1); }
    console.log("Codigo Elite generado:");
    console.log("  codigo:      " + r.codes[0]);
    console.log("  para:        " + (r.issued_to_email || "(sin correo)"));
    console.log("  tier:        " + r.tier + " por " + process.argv[2] + " dias desde el canje");
    console.log("  canjear antes de: " + process.argv[3].slice(0, 10) + " (vigencia del codigo, no de la membresia)");
    console.log("");
    console.log("Mandaselo al cliente: en la app, Ajustes > Membresia > Tengo un codigo de activacion.");
  ' "$body" "$dias" "$(node -e 'console.log(JSON.parse(process.argv[1]).p_expires_at)' "$cuerpo")"
}

cmd_cargar() {
  local archivo="${1:-}"
  [ -n "$archivo" ] || falla "uso: cargar <payload.json>"
  [ -f "$archivo" ] || falla "no existe: $archivo"
  # Comprobacion local antes de mandar nada: forma {p_user, p_payload.schema}.
  node -e '
    const fs = require("fs");
    let p; try { p = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch (e) { console.error("el archivo no es JSON valido:", e.message); process.exit(1); }
    const ok = p && typeof p.p_user === "string" && p.p_payload && p.p_payload.schema === "elite_v3"
      && typeof p.p_payload.resumen_argos === "string" && Array.isArray(p.p_payload.suplementos_filas);
    if (!ok) { console.error("esto no es la salida de preparar-payload.js (faltan p_user, p_payload.schema, resumen_argos o suplementos_filas)"); process.exit(1); }
    console.log("Cargando evaluacion v" + p.p_payload.version + " de " + p.p_payload.cliente.nombre_preferido + " para " + p.p_user + " (" + p.p_payload.suplementos_filas.length + " suplementos)...");
  ' "$archivo" || exit 1
  local salida http body
  salida="$(rpc_archivo elite_cargar_evaluacion "$archivo")"
  http="$(http_de "$salida")"; body="$(cuerpo_de "$salida")"
  explica_http "$http" "$body" || exit 1
  node -e '
    let r; try { r = JSON.parse(process.argv[1]); } catch { console.log(process.argv[1]); process.exit(0); }
    if (r && r.ok === false) {
      console.error("El RPC rechazo la carga: " + r.error);
      if (r.error === "version_mismatch") {
        console.error("  La base espera version " + r.version_esperada + " y el JSON trae " + r.version_recibida + ".");
        console.error("  Regla: version = evaluaciones Elite previas de este usuario + 1 (la primera es 1).");
        console.error("  Corrige el campo \"version\" del elite_v3.json a " + r.version_esperada + ", vuelve a correr");
        console.error("  node scripts/elite/preparar-payload.js y repite este comando. Nada se escribio.");
      } else {
        console.error(JSON.stringify(r, null, 2));
      }
      process.exit(1);
    }
    if (!r || r.ok !== true) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
    console.log("Evaluacion cargada (esta respuesta es la verificacion oficial):");
    console.log("  dx_id:                 " + r.dx_id);
    console.log("  version_elite:         " + r.version_elite + "  (fila functional_dx version " + r.version + ")");
    console.log("  quality_level:         " + r.quality_level + (r.quality_level === 5 ? " (con genetica)" : " (sin genetica)"));
    console.log("  suplementos insertados:           " + r.suplementos_insertados);
    console.log("  suplementos actualizados:         " + r.suplementos_actualizados);
    console.log("  suplementos desactivados:         " + r.suplementos_desactivados);
    console.log("  suplementos pausados respetados:  " + r.suplementos_pausados_respetados);
  ' "$body"
}

cmd_ver() {
  local uid="${1:-}"
  [ -n "$uid" ] || falla "uso: ver <user_id>"
  case "$uid" in
    [0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]-*) ;;
    *) falla "user_id no tiene forma de uuid: $uid" ;;
  esac
  local salida http body
  salida="$(curl -sS -G "$SUPABASE_URL/rest/v1/functional_dx" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $ATP_JWT" \
    --data-urlencode "select=id,version,quality_level,created_at" \
    --data-urlencode "user_id=eq.$uid" \
    --data-urlencode "sources_snapshot->elite_v3=not.is.null" \
    --data-urlencode "order=version.desc" \
    -w $'\n%{http_code}')"
  http="$(http_de "$salida")"; body="$(cuerpo_de "$salida")"
  explica_http "$http" "$body" || exit 1
  node -e '
    let filas; try { filas = JSON.parse(process.argv[1]); } catch { console.log(process.argv[1]); process.exit(0); }
    if (!Array.isArray(filas)) { console.log(JSON.stringify(filas, null, 2)); process.exit(0); }
    if (!filas.length) {
      console.log("Sin evaluaciones Elite visibles para " + process.argv[2] + ".");
      console.log("Ojo: functional_dx solo la ve su dueno o su coach activo (coach_clients). Si la carga respondio ok,");
      console.log("la fila existe aunque este comando no la vea; verifica con SELECT en Supabase o pide al cliente que abra la app.");
      process.exit(0);
    }
    console.log("Evaluaciones Elite de " + process.argv[2] + ":");
    for (const f of filas) console.log("  v" + f.version + "  quality_level " + f.quality_level + "  " + f.created_at + "  id " + f.id);
  ' "$body" "$uid"
}

# Busca el user_id por correo en profiles (SELECT abierto a autenticados en produccion).
cmd_quien() {
  local correo="${1:-}"
  [ -n "$correo" ] || falla "uso: quien <correo>"
  local salida http body
  salida="$(curl -sS -G "$SUPABASE_URL/rest/v1/profiles" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $ATP_JWT" \
    --data-urlencode "select=id,email,full_name,created_at" \
    --data-urlencode "email=ilike.$correo" \
    -w $'\n%{http_code}')"
  http="$(http_de "$salida")"; body="$(cuerpo_de "$salida")"
  explica_http "$http" "$body" || exit 1
  node -e '
    let filas; try { filas = JSON.parse(process.argv[1]); } catch { console.log(process.argv[1]); process.exit(0); }
    if (!Array.isArray(filas) || !filas.length) { console.log("Ningun perfil con el correo " + process.argv[2] + ". El cliente tiene que crear su cuenta en la app primero."); process.exit(1); }
    for (const f of filas) console.log("  user_id " + f.id + "  " + (f.full_name || "(sin nombre)") + "  " + f.email + "  cuenta desde " + String(f.created_at).slice(0, 10));
  ' "$body" "$correo"
}

case "${1:-}" in
  quien)  shift; requiere_entorno; cmd_quien "$@" ;;
  codigo) shift; requiere_entorno; cmd_codigo "$@" ;;
  cargar) shift; requiere_entorno; cmd_cargar "$@" ;;
  ver)    shift; requiere_entorno; cmd_ver "$@" ;;
  *)
    sed -n '2,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 2 ;;
esac
