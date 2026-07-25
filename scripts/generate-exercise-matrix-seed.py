# -*- coding: utf-8 -*-
"""
generate-exercise-matrix-seed.py — MB-3 Track A.

Genera supabase/migrations/221_exercise_matrix_seed.sql desde el xlsx fuente
(Matriz_Fitness_ATP_206_revisado.xlsx, hoja "Matriz 206 (auto)"). Reproducible:
correrlo de nuevo con el mismo xlsx produce byte-a-byte el mismo SQL.

Uso:
  python scripts/generate-exercise-matrix-seed.py [ruta_al_xlsx]

Reglas de transformación (espejo de src/constants/exercise-matrix.ts):
  - Multi-valor con separador "·" → text[] (cualidades, metodos, contraindicaciones).
  - "Sí"/"No" → boolean (cargable, senior_apto).
  - origen: filas amarillas del xlsx = variantes lastre ATP (slug -lastre) → 'atp';
    el resto → 'movekit'. Se valida que sean exactamente 6.
  - Seed idempotente: ON CONFLICT (slug) DO NOTHING.

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
OUT_SQL = os.path.join(REPO_ROOT, "supabase", "migrations", "221_exercise_matrix_seed.sql")

EXPECTED_HEADER = [
    "slug", "Nombre (MoveKit)", "Equipo", "Cargable", "Tipo", "Patrón",
    "Dinámica", "Lateralidad", "Músculo principal", "Secundarios", "Cualidades",
    "Nivel", "Senior-apto", "Método ATP", "EMOM-apto", "Benchmark edad",
    "Contraindicaciones", "Familia", "Poster URL",
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
    "nivel": {"Principiante", "Intermedio", "Avanzado"},
    "metodos": {"Estándar", "3-5", "EMOM Auto", "Myo-reps", "Rest-pause",
                "Cluster", "Dropset", "Superserie"},
    "emom_apto": {"Todos", "Intermedio+", "Avanzado", "No"},
    "benchmark_edad": {"No", "Tier A (push-ups)", "Tier A (plank)", "Tier B (max)",
                       "Tier B (max lastrado)", "Tier B (×BW)", "Tier B (carry)",
                       "Tier B (wall-sit)"},
    "contraindicaciones": {"Rodilla", "Hombro", "Lumbar/hernia", "Muñeca",
                           "Hipertensión (isométrico largo)"},
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
            q(str(r[18]).strip()) if r[18] else "NULL",             # media_url
            q(origen),
        ]) + ")"
        values.append(row_sql)

    if len(values) != 212:
        sys.exit(f"Se esperaban 212 filas, hay {len(values)}")
    if n_atp != 6:
        sys.exit(f"Se esperaban 6 variantes lastre ATP, hay {n_atp}")

    out = io.StringIO()
    out.write(
        "-- ============================================================================\n"
        "-- 221 — EXERCISE MATRIX SEED (MB-3 Track A): 212 filas (206 MoveKit + 6 lastre ATP).\n"
        "--\n"
        "-- GENERADO por scripts/generate-exercise-matrix-seed.py desde\n"
        "-- Matriz_Fitness_ATP_206_revisado.xlsx — NO editar a mano; regenerar.\n"
        "-- Idempotente: ON CONFLICT (slug) DO NOTHING.\n"
        "-- ⚠️ NO aplicar al remoto desde la rama — db push tras merge.\n"
        "-- ============================================================================\n\n"
        "INSERT INTO exercise_matrix (\n"
        "  slug, nombre, equipo, cargable, tipo, patron, dinamica, lateralidad,\n"
        "  musculo_principal, secundarios, cualidades, nivel, senior_apto, metodos,\n"
        "  emom_apto, benchmark_edad, contraindicaciones, familia, media_url, origen\n"
        ") VALUES\n"
    )
    out.write(",\n".join(values))
    out.write("\nON CONFLICT (slug) DO NOTHING;\n")

    with open(OUT_SQL, "w", encoding="utf-8", newline="\n") as f:
        f.write(out.getvalue())
    print(f"OK: {len(values)} filas -> {OUT_SQL}")


if __name__ == "__main__":
    main()
