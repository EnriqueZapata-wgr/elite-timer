# -*- coding: utf-8 -*-
"""
generate-exercise-matrix-seed.py — MB-3 Track A · MB-3.5 #10 (v2 UPSERT).

Genera supabase/migrations/223_exercise_matrix_seed_v2.sql desde el xlsx fuente
(Matriz_Fitness_ATP_206_revisado.xlsx, hoja "Matriz 206 (auto)", 214 filas).
Reproducible: correrlo de nuevo con el mismo xlsx produce byte-a-byte el mismo SQL.

Uso:
  python scripts/generate-exercise-matrix-seed.py [ruta_al_xlsx]

Reglas de transformación (espejo de src/constants/exercise-matrix.ts):
  - Multi-valor con separador "·" → text[] (cualidades, metodos, contraindicaciones).
  - "Sí"/"No" → boolean (cargable, senior_apto).
  - media_url = Clip URL (mp4 en loop del bucket fitness-clips); el Poster URL
    pasa a la columna nueva poster_url (placeholder mientras carga el clip).
    dead-hang y broad-jump no existen en MoveKit → ambas NULL (la UI lo maneja).
  - unidades_equipo ('1' | 'par' | 'n/a') — candado de cantidad del generador.
  - origen: filas amarillas del xlsx = variantes lastre ATP (slug -lastre) → 'atp';
    el resto → 'movekit'. Se valida que sean exactamente 6.
  - Seed UPSERT: ON CONFLICT (slug) DO UPDATE — los cambios de tags del xlsx
    (banca declarada, nivel re-taggeado, Atleta) llegan a filas ya existentes.

Requiere: pip install openpyxl
"""
import sys
import io
import os

try:
    import openpyxl
except ImportError:
    sys.exit("Falta openpyxl: pip install openpyxl")

DEFAULT_XLSX = r"C:\Users\ezapa\OneDrive\EZ online\ATP\R and D\Matriz_Fitness_ATP_206_revisado.xlsx"
SHEET = "Matriz 206 (auto)"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_SQL = os.path.join(REPO_ROOT, "supabase", "migrations", "223_exercise_matrix_seed_v2.sql")

EXPECTED_HEADER = [
    "slug", "Nombre (MoveKit)", "Equipo", "Cargable", "Tipo", "Patrón",
    "Dinámica", "Lateralidad", "Músculo principal", "Secundarios", "Cualidades",
    "Nivel", "Senior-apto", "Método ATP", "EMOM-apto", "Benchmark edad",
    "Contraindicaciones", "Familia", "Poster URL", "Clip URL", "Unidades equipo",
]

# Valores canónicos (validación dura: un typo en el xlsx debe TRONAR aquí,
# no llegar silencioso a la DB). Espejo de src/constants/exercise-matrix.ts.
CANON = {
    "tipo": {"Multiarticular", "Aislado"},
    "patron": {"Empuje", "Tracción", "Bisagra", "Sentadilla", "Zancada",
               "Anti-rotación/Rotación", "Anti-extensión (core)", "Locomoción", "Estiramiento"},
    "dinamica": {"Explosivo", "Normal", "Súper-lento", "Isométrico"},
    "lateralidad": {"Bilateral", "Unilateral"},
    "cualidades": {"fuerza", "hipertrofia", "potencia", "resistencia",
                   "metabólico", "movilidad", "estabilidad", "recovery"},
    "nivel": {"Principiante", "Intermedio", "Avanzado", "Atleta"},
    "metodos": {"Estándar", "3-5", "EMOM Auto", "Myo-reps", "Rest-pause",
                "Cluster", "Dropset", "Superserie"},
    "emom_apto": {"Todos", "Intermedio+", "Avanzado", "No"},
    "benchmark_edad": {"No", "Tier A (push-ups)", "Tier A (plank)", "Tier B (max)",
                       "Tier B (max lastrado)", "Tier B (×BW)", "Tier B (carry)",
                       "Tier B (wall-sit)", "Tier B (segundos)", "Tier B (distancia)"},
    "contraindicaciones": {"Rodilla", "Hombro", "Lumbar/hernia", "Muñeca",
                           "Hipertensión (isométrico largo)", "Aquiles"},
    "unidades_equipo": {"1", "par", "n/a"},
}


def q(value):
    """Literal SQL de texto (escapa comillas simples)."""
    if value is None or value == "":
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def arr(tokens):
    """Literal SQL text[] desde lista python."""
    if not tokens:
        return "'{}'"
    return "ARRAY[" + ", ".join(q(t) for t in tokens) + "]"


def split_dot(raw):
    if raw is None:
        return []
    return [t.strip() for t in str(raw).split("·") if t.strip()]


def si_no(raw, field, slug):
    v = (str(raw or "")).strip()
    if v not in ("Sí", "No"):
        sys.exit(f"[{slug}] {field}: valor no canónico {v!r} (esperado Sí/No)")
    return "true" if v == "Sí" else "false"


def check(value, field, slug):
    if value not in CANON[field]:
        sys.exit(f"[{slug}] {field}: valor no canónico {value!r}")
    return value


def check_multi(tokens, field, slug):
    for t in tokens:
        if t not in CANON[field]:
            sys.exit(f"[{slug}] {field}: token no canónico {t!r}")
    return tokens


def main():
    xlsx = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    wb = openpyxl.load_workbook(xlsx, data_only=True)
    ws = wb[SHEET]
    rows = list(ws.iter_rows(values_only=True))
    header = [str(h).strip() if h is not None else "" for h in rows[0]]
    if header != EXPECTED_HEADER:
        sys.exit(f"Header inesperado en {xlsx}:\n{header}")

    data = [r for r in rows[1:] if r[0]]
    slugs = [str(r[0]).strip() for r in data]
    if len(slugs) != len(set(slugs)):
        sys.exit("Slugs duplicados en el xlsx")

    values = []
    n_atp = 0
    for r in data:
        slug = str(r[0]).strip()
        origen = "atp" if slug.endswith("-lastre") else "movekit"
        if origen == "atp":
            n_atp += 1
        cualidades = check_multi(split_dot(r[10]), "cualidades", slug)
        metodos = check_multi(split_dot(r[13]), "metodos", slug)
        contra = check_multi(split_dot(r[16]), "contraindicaciones", slug)
        poster = str(r[18]).strip() if r[18] else None
        clip = str(r[19]).strip() if r[19] else None
        unidades = check(str(r[20]).strip() if r[20] is not None else "n/a", "unidades_equipo", slug)
        # media_url = clip (protagonista, loop); poster queda como placeholder.
        # Sin clip (dead-hang/broad-jump, fuera de MoveKit): media NULL.
        row_sql = "  (" + ", ".join([
            q(slug),
            q(str(r[1]).strip()),                                   # nombre
            q(str(r[2]).strip()),                                   # equipo (crudo)
            si_no(r[3], "cargable", slug),
            q(check(str(r[4]).strip(), "tipo", slug)),
            q(check(str(r[5]).strip(), "patron", slug)),
            q(check(str(r[6]).strip(), "dinamica", slug)),
            q(check(str(r[7]).strip(), "lateralidad", slug)),
            q(str(r[8]).strip()),                                   # musculo_principal
            q(str(r[9]).strip()) if r[9] else "NULL",               # secundarios (crudo)
            arr(cualidades),
            q(check(str(r[11]).strip(), "nivel", slug)),
            si_no(r[12], "senior_apto", slug),
            arr(metodos),
            q(check(str(r[14]).strip(), "emom_apto", slug)),
            q(check(str(r[15] or "No").strip(), "benchmark_edad", slug)),
            arr(contra),
            q(str(r[17]).strip()),                                  # familia
            q(clip),                                                # media_url (clip mp4)
            q(poster),                                              # poster_url
            q(unidades),                                            # unidades_equipo
            q(origen),
        ]) + ")"
        values.append(row_sql)

    if len(values) != 214:
        sys.exit(f"Se esperaban 214 filas, hay {len(values)}")
    if n_atp != 6:
        sys.exit(f"Se esperaban 6 variantes lastre ATP, hay {n_atp}")

    out = io.StringIO()
    out.write(
        "-- ============================================================================\n"
        "-- 223 — EXERCISE MATRIX SEED v2 (MB-3.5 #10): 214 filas (208 MoveKit + 6 lastre ATP).\n"
        "--\n"
        "-- GENERADO por scripts/generate-exercise-matrix-seed.py desde\n"
        "-- Matriz_Fitness_ATP_206_revisado.xlsx — NO editar a mano; regenerar.\n"
        "-- Delta vs 221: banca declarada (31 filas), unidades_equipo (1/par/n/a),\n"
        "-- nivel re-taggeado (+Atleta), +dead-hang/+broad-jump, media_url=clip mp4\n"
        "-- (bucket fitness-clips) + poster_url como placeholder.\n"
        "-- Idempotente: UPSERT — ON CONFLICT (slug) DO UPDATE (los re-tags llegan\n"
        "-- a filas existentes). ⚠️ NO aplicar al remoto desde la rama — db push tras merge.\n"
        "-- ============================================================================\n\n"
        "-- Columnas nuevas (idempotente).\n"
        "ALTER TABLE exercise_matrix ADD COLUMN IF NOT EXISTS poster_url text;\n"
        "ALTER TABLE exercise_matrix ADD COLUMN IF NOT EXISTS unidades_equipo text NOT NULL DEFAULT 'n/a';\n\n"
        "INSERT INTO exercise_matrix (\n"
        "  slug, nombre, equipo, cargable, tipo, patron, dinamica, lateralidad,\n"
        "  musculo_principal, secundarios, cualidades, nivel, senior_apto, metodos,\n"
        "  emom_apto, benchmark_edad, contraindicaciones, familia, media_url,\n"
        "  poster_url, unidades_equipo, origen\n"
        ") VALUES\n"
    )
    out.write(",\n".join(values))
    out.write(
        "\nON CONFLICT (slug) DO UPDATE SET\n"
        "  nombre = EXCLUDED.nombre,\n"
        "  equipo = EXCLUDED.equipo,\n"
        "  cargable = EXCLUDED.cargable,\n"
        "  tipo = EXCLUDED.tipo,\n"
        "  patron = EXCLUDED.patron,\n"
        "  dinamica = EXCLUDED.dinamica,\n"
        "  lateralidad = EXCLUDED.lateralidad,\n"
        "  musculo_principal = EXCLUDED.musculo_principal,\n"
        "  secundarios = EXCLUDED.secundarios,\n"
        "  cualidades = EXCLUDED.cualidades,\n"
        "  nivel = EXCLUDED.nivel,\n"
        "  senior_apto = EXCLUDED.senior_apto,\n"
        "  metodos = EXCLUDED.metodos,\n"
        "  emom_apto = EXCLUDED.emom_apto,\n"
        "  benchmark_edad = EXCLUDED.benchmark_edad,\n"
        "  contraindicaciones = EXCLUDED.contraindicaciones,\n"
        "  familia = EXCLUDED.familia,\n"
        "  media_url = EXCLUDED.media_url,\n"
        "  poster_url = EXCLUDED.poster_url,\n"
        "  unidades_equipo = EXCLUDED.unidades_equipo,\n"
        "  origen = EXCLUDED.origen;\n"
    )

    with open(OUT_SQL, "w", encoding="utf-8", newline="\n") as f:
        f.write(out.getvalue())
    print(f"OK: {len(values)} filas -> {OUT_SQL}")


if __name__ == "__main__":
    main()
