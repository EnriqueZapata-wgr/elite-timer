#!/usr/bin/env bash
# curl-elite.sh: los tres comandos de la carga Elite (ATP 3.0, ruta 3.7).
# Se corre con el JWT de Enrique (admin) contra PostgREST. Sin service_role.
#
# Uso:
#   bash scripts/elite/curl-elite.sh codigo <correo> [dias]     genera un codigo Elite (365 dias por defecto)
#   bash scripts/elite/curl-elite.sh cargar <payload.json>      carga una evaluacion (salida de preparar-payload.js)
#   bash scripts/elite/curl-elite.sh ver <user_id>              lista las evaluaciones Elite de un usuario
#   bash scripts/elite/curl-elite.sh quien <correo>             busca el user_id de un cliente por su correo
#   bash scripts/elite/curl-elite.sh sembrar <user_id>          (325) siembra perfil y convierte rutinas y comidas de la evaluacion vigente
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
#
# 8 de septiembre de 2026 (pivote Elite): para EMITIR codigos en lote y ver
# cuales se usaron, hoy se usa scripts/elite/codigos.js (corre igual en
# PowerShell). El 'codigo' de aqui se queda porque emite de a uno y ya esta
# en los dedos de Enrique; los dos llaman al mismo RPC.
#
# 20 de septiembre de 2026 (migracion 324): 'cargar' llama a
# elite_cargar_completa, que envuelve al RPC de siempre y ademas deja el
# vinculo coach-cliente, el plan de alimentacion, las metas del dia y los
# laboratorios en lab_values. Misma firma, misma respuesta mas contadores.
#
# 21 de septiembre de 2026 (migracion 325): DESPUES de elite_cargar_completa,
# 'cargar' llama con el mismo JWT a elite_sembrar_perfil, elite_cargar_rutinas
# y elite_cargar_comidas (solo user_id: leen la evaluacion recien guardada) y
# junta sus avisos en un segundo bloque AVISOS. 'sembrar <user_id>' corre solo
# esas tres, para un cliente cargado antes de la 325 o para repetir (son
# idempotentes: la segunda vez no duplican nada y lo dicen).

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
    404) echo "HTTP 404: el RPC no existe en produccion. Falta 'npx supabase db push' (315 y 318 para codigos y carga; 324 para elite_cargar_completa; 325 para sembrar perfil, rutinas y comidas)." >&2 ;;
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
    // 8-sep-2026: el tercer derivado. Si falta, el payload se armo con una
    // version vieja del script y la fila entra sin raices.
    if (!Array.isArray(p.p_payload.roots_detected)) {
      console.log("Aviso: este payload no trae roots_detected. Vuelve a correr preparar-payload.js si quieres raices en el Mapa funcional.");
    }
    // 20-sep-2026 (324): el cuarto derivado. Sin el, el expediente de labs
    // y ARGOS no ven los marcadores de la evaluacion.
    if (!Array.isArray(p.p_payload.lab_values_filas)) {
      console.log("Aviso: este payload no trae lab_values_filas. Vuelve a correr preparar-payload.js para que los laboratorios lleguen al expediente.");
    }
  ' "$archivo" || exit 1
  local salida http body
  salida="$(rpc_archivo elite_cargar_completa "$archivo")"
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
    if (r.suplementos_ya_del_cliente !== undefined) {
      console.log("  ya eran ficha del cliente:        " + r.suplementos_ya_del_cliente + "  (no se duplicaron)");
    }
    if (r.raices_detectadas !== undefined) console.log("  raices detectadas:                " + r.raices_detectadas);
    // 20-sep-2026 (324): las cuatro piezas nuevas de la carga completa.
    if (r.coach_client !== undefined) {
      const cc = { creado: "creado (Enrique ya es su coach activo)", ya_activo: "ya existia activo", inactivo_respetado: "existe INACTIVO y no se toco (ver avisos)" };
      console.log("  vinculo coach-cliente:            " + (cc[r.coach_client] || r.coach_client));
      console.log("  plan de alimentacion:             " + (r.nutrition_plan_id ? "escrito (" + r.nutrition_plan_id + ")" : "no se escribio (ver avisos)") + (r.nutrition_plans_pausados ? ", " + r.nutrition_plans_pausados + " anterior(es) en pausa" : ""));
      console.log("  metas del dia escritas:           " + ((r.metas_escritas || []).join(", ") || "ninguna") + ((r.metas_respetadas || []).length ? "  (" + r.metas_respetadas.length + " del cliente respetadas)" : ""));
      console.log("  laboratorios a lab_values:        " + r.lab_values_escritos + " escritos, " + r.lab_values_respetados + " ya existian, " + r.lab_values_omitidos + " fuera por tipo o clave" + (r.lab_values_measured_at ? "  (fecha " + r.lab_values_measured_at + ")" : ""));
    }
    // 8-sep-2026 (mig 321): lo que se cargo a medias se dice aqui, no se
    // descubre semanas despues en la pantalla del cliente.
    // 20-sep-2026 (revision en frio, A10): el bloque va SIEMPRE al final y
    // separado, con conteo; incluye los codigos de la 324 (coach_client_inactivo,
    // nutrition_plan_pausado, metas_del_cliente_respetadas,
    // labs_existentes_respetados) y los de la 321 (suplementos_ya_del_cliente,
    // suplementos_pausados, ...). Un aviso sin `detalle` se imprime crudo para
    // no perderlo. Sin avisos tambien se dice, para que no quede la duda.
    const avisos = Array.isArray(r.avisos) ? r.avisos : [];
    console.log("");
    console.log("==================================================");
    if (avisos.length) {
      console.log("AVISOS de la carga: " + avisos.length + " (la evaluacion si quedo guardada; lee cada uno)");
      for (const a of avisos) {
        if (a && typeof a === "object" && a.codigo) console.log("  - [" + a.codigo + "] " + (a.detalle || JSON.stringify(a)));
        else console.log("  - " + JSON.stringify(a));
      }
    } else {
      console.log("AVISOS de la carga: ninguno (todo entro completo).");
    }
    console.log("==================================================");
  ' "$body"

  # 21-sep-2026 (325): la carga ya quedo guardada arriba. Ahora, con el mismo
  # JWT, se siembra el perfil y se convierten rutinas y comidas. Si esto
  # falla, la evaluacion NO se deshace: se dice como repetirlo.
  local uid
  uid="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).p_user)' "$archivo")"
  echo ""
  cmd_sembrar "$uid" || {
    echo "La evaluacion si quedo cargada; la siembra (325) no termino. Repitela con:" >&2
    echo "  bash scripts/elite/curl-elite.sh sembrar $uid" >&2
    exit 1
  }
}

# 325: elite_sembrar_perfil + elite_cargar_rutinas + elite_cargar_comidas.
# Las tres leen la evaluacion Elite vigente del cliente y solo rellenan lo
# vacio; lo que el cliente ya tenia se respeta y sale en AVISOS.
cmd_sembrar() {
  local uid="${1:-}"
  [ -n "$uid" ] || falla "uso: sembrar <user_id>"
  case "$uid" in
    [0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]-*) ;;
    *) falla "user_id no tiene forma de uuid: $uid" ;;
  esac
  local cuerpo salida http b_perfil b_rutinas b_comidas
  cuerpo="$(node -e 'process.stdout.write(JSON.stringify({ p_user_id: process.argv[1] }))' "$uid")"
  echo "Siembra y conversion (325) para $uid..."

  salida="$(rpc elite_sembrar_perfil "$cuerpo")"
  http="$(http_de "$salida")"; b_perfil="$(cuerpo_de "$salida")"
  explica_http "$http" "$b_perfil" || return 1

  salida="$(rpc elite_cargar_rutinas "$cuerpo")"
  http="$(http_de "$salida")"; b_rutinas="$(cuerpo_de "$salida")"
  explica_http "$http" "$b_rutinas" || return 1

  salida="$(rpc elite_cargar_comidas "$cuerpo")"
  http="$(http_de "$salida")"; b_comidas="$(cuerpo_de "$salida")"
  explica_http "$http" "$b_comidas" || return 1

  node -e '
    const [perfilTxt, rutinasTxt, comidasTxt] = process.argv.slice(1);
    const parse = (t) => { try { return JSON.parse(t); } catch { return { ok: false, error: "respuesta no es JSON", cruda: t }; } };
    const perfil = parse(perfilTxt), rutinas = parse(rutinasTxt), comidas = parse(comidasTxt);
    let fallo = false;
    const linea = (nombre, r, texto) => {
      if (!r || r.ok !== true) { fallo = true; console.log("  " + nombre.padEnd(9) + "FALLO: " + (r && r.error ? r.error : JSON.stringify(r))); return; }
      console.log("  " + nombre.padEnd(9) + texto(r));
    };
    const pares = (o) => Object.entries(o || {}).map(([k, v]) => k + "=" + (typeof v === "object" ? JSON.stringify(v) : v)).join(", ") || "nada";
    linea("perfil:", perfil, (r) => "sembrado: " + pares(r.sembrado) + "  |  respetado: " + pares(r.respetado) + "  |  sin dato en el documento: " + ((r.sin_dato || []).join(", ") || "nada"));
    linea("rutinas:", rutinas, (r) => r.aviso === "sin_rutinas" ? "ninguna (la evaluacion no trae rutinas)"
      : r.rutinas + " creada(s) con " + r.bloques + " ejercicio(s) (" + r.bloques_con_matriz + " con clip, " + r.bloques_sin_matriz + " como tiempo), " + r.agendas + " dia(s) agendado(s), " + r.rutinas_ya_cargadas + " ya estaban");
    linea("comidas:", comidas, (r) => r.aviso === "sin_comidas" ? "ninguna (la evaluacion no trae comidas ni metas de macros)"
      : r.aviso === "sin_plan_elite" ? "no hay Plan Elite v" + r.version_elite + " donde escribirlas (ver avisos)"
      : r.comidas + " escrita(s) en el plan " + r.nutrition_plan_id + (r.comidas_respetadas ? " (" + r.comidas_respetadas + " ya estaban)" : "") + "; macros escritos: " + ((r.macros_escritos || []).join(", ") || "ninguno"));
    const avisos = [];
    for (const [origen, r] of [["perfil", perfil], ["rutinas", rutinas], ["comidas", comidas]]) {
      for (const a of (r && Array.isArray(r.avisos) ? r.avisos : [])) avisos.push({ origen, a });
    }
    console.log("");
    console.log("==================================================");
    if (avisos.length) {
      console.log("AVISOS de la siembra (325): " + avisos.length + " (nada se piso; lee cada uno)");
      for (const { origen, a } of avisos) {
        if (a && typeof a === "object" && a.codigo) console.log("  - [" + origen + " / " + a.codigo + "] " + (a.detalle || JSON.stringify(a)));
        else console.log("  - [" + origen + "] " + JSON.stringify(a));
      }
    } else if (fallo) {
      console.log("AVISOS de la siembra (325): ninguno, pero una o mas funciones fallaron (arriba). La que fallo no escribio nada.");
    } else {
      console.log("AVISOS de la siembra (325): ninguno (todo entro completo).");
    }
    console.log("==================================================");
    if (fallo) process.exit(1);
  ' "$b_perfil" "$b_rutinas" "$b_comidas"
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
  sembrar) shift; requiere_entorno; cmd_sembrar "$@" ;;
  *)
    sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 2 ;;
esac
