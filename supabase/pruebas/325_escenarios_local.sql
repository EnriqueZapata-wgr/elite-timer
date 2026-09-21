-- 325_escenarios_local.sql
-- Pruebas de la migracion 325 en un Postgres local (NO se aplica a Supabase).
-- Fecha: 2026-09-21; escenarios 10 a 14 de la ronda de arreglos (revision en
-- frio: slug, version nueva, nombre propio, reps en prosa, rangos y
-- duplicados). Como se corrio (contenedor con Postgres 16):
--   createdb -T atp_324 atp_325          # atp_324: esquema minimo donde se probo la 324
--                                        #   (profiles, functional_dx, nutrition_plans, coach_clients,
--                                        #    user_day_preferences, user_supplements, lab_values, tier_history,
--                                        #    auth.uid() leyendo current_setting('app.uid'))
--   psql -d atp_325 -v ON_ERROR_STOP=1 -f 325_escenarios_local.sql   (parte 1: tablas minimas)
--   psql -d atp_325 -v ON_ERROR_STOP=1 -f ../migrations/325_elite_sembrar_y_convertir.sql
--   psql -d atp_325 -v ON_ERROR_STOP=1 -f 325_escenarios_local.sql   (parte 2: datos y escenarios)
-- El archivo esta partido con \if para que la primera pasada solo cree
-- tablas y la segunda (cuando ya existe elite_sembrar_perfil) siembre y corra
-- los escenarios. La salida de referencia esta en el informe del bloque 325.

SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'elite_sembrar_perfil') AS ya_migrada \gset
\if :ya_migrada
\echo 'Parte 2: datos de prueba y escenarios'
-- Datos de prueba 325 (clientes 2, 3 y 4).
INSERT INTO auth.users (id) VALUES
  ('00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000004');
INSERT INTO profiles (id, email, full_name, role, tier) VALUES
  ('00000000-0000-4000-8000-000000000002', 'c2@x', 'Cliente Dos', 'client', 'elite'),
  ('00000000-0000-4000-8000-000000000003', 'c3@x', 'Cliente Tres', 'client', 'elite'),
  ('00000000-0000-4000-8000-000000000004', 'c4@x', 'Cliente Cuatro', 'client', 'free');
UPDATE profiles SET full_name = 'Enrique Zapata' WHERE id = 'a0000000-0000-4000-8000-00000000000a';

-- Cliente 2: formato nuevo completo, plan Elite v1 activo (como lo deja la 324), vinculo activo.
INSERT INTO functional_dx (user_id, version, quality_level, roots_detected, summary_text, sources_snapshot, generated_by, model, is_current)
VALUES ('00000000-0000-4000-8000-000000000002', 1, 5, '[]', 'resumen', jsonb_build_object('elite_v3', $j${"schema":"elite_v3","version":1,"generado_en":"2026-09-06","interpretado_por":{"evaluacion":"Enrique Zapata","genetica":"Proveedor de interpretacion genetica"},"cliente":{"nombre_preferido":"O.","sexo":"male","edad":38,"fecha_toma":"2026-08-14","fecha_nacimiento":"1988-03-14","estatura_cm":176,"peso_kg":84.5,"nivel_fitness":"intermedio","fc_reposo":58},"alimentacion":{"prioriza":["Verduras crucíferas asadas con aceite y limón"],"evita":["Lactosa"],"ventana":null,"horarios":[{"momento":"Mañana","que":"Café solo por la mañana, con corte al mediodía"}],"notas":[],"metas":{"proteina_g_dia":150,"agua_ml_dia":2800,"kcal_dia":2200,"grasa_g_dia":70,"carbohidrato_g_dia":200},"comidas":[{"momento":"desayuno","hora":"07:30","nombre":"Huevos con verdura","componentes":["3 huevos","espinaca salteada","medio aguacate"],"notas":"Sin pan. Café solo aquí."},{"momento":"comida","hora":"14:00","nombre":"Salmón con ensalada","componentes":["180 g de salmón","ensalada verde con aceite de oliva","media taza de arroz"],"notas":null},{"momento":"colacion","hora":null,"nombre":"Nueces y fruta","componentes":["20 g de nueces","una manzana"],"notas":null},{"momento":"cena","hora":"20:00","nombre":"Pollo con crucíferas asadas","componentes":["150 g de pollo","brócoli y coliflor asados con limón"],"notas":"Última comida del día."}]},"entrenamiento":{"base":"Motor de resistencia","sesiones":[],"descanso":[],"notas":[],"rutinas":[{"nombre":"Fuerza A","objetivo":"Base de fuerza, lejos del fallo","dias_semana":[1,4],"bloques":[{"ejercicio":"Sentadilla con barra","series":3,"reps":"8-10","descanso_s":120,"notas":null},{"ejercicio":"Peso muerto rumano","series":3,"reps":"10","descanso_s":90,"notas":"Espalda neutra"},{"ejercicio":"Plancha frontal","series":3,"reps":"30 s","descanso_s":60,"notas":null},{"ejercicio":"Sentadilla búlgara","series":3,"reps":"10","descanso_s":60,"notas":"Con mancuernas ligeras"}],"notas":"Progresión tranquila."},{"nombre":"Caminata larga","objetivo":"Motor de resistencia","dias_semana":null,"bloques":[{"ejercicio":"Caminata rápida","series":1,"reps":"45 min","descanso_s":null,"notas":null}],"notas":null}]}}$j$::jsonb), 'manual', 'enrique', true);
INSERT INTO nutrition_plans (user_id, created_by, name, description, protein_target, water_target, meal_schedule, foods_to_avoid, foods_to_prioritize, status, start_date)
VALUES ('00000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'Plan Elite v1', 'Plan de alimentación de tu evaluación Elite, versión 1.', 150, 2.8, '[]', '[]', '[]', 'active', CURRENT_DATE);
INSERT INTO coach_clients (coach_id, client_id, status) VALUES ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000002', 'active');

-- Cliente 3: formato nuevo, pero YA tiene sexo, FC en reposo propia y nivel declarado; sin plan Elite; rutinas vacias.
INSERT INTO functional_dx (user_id, version, quality_level, roots_detected, summary_text, sources_snapshot, generated_by, model, is_current)
VALUES ('00000000-0000-4000-8000-000000000003', 1, 5, '[]', 'resumen', jsonb_build_object('elite_v3', $j${"schema":"elite_v3","version":1,"generado_en":"2026-09-06","interpretado_por":{"evaluacion":"Enrique Zapata"},"cliente":{"nombre_preferido":"O.","sexo":"male","edad":38,"fecha_toma":"2026-05","fecha_nacimiento":"1975-11-02","estatura_cm":165,"peso_kg":62,"nivel_fitness":"principiante","fc_reposo":64},"alimentacion":{"prioriza":["Verduras"],"evita":[],"ventana":null,"horarios":[],"notas":[],"metas":null,"comidas":[]},"entrenamiento":{"base":null,"sesiones":[],"descanso":[],"notas":[],"rutinas":[]}}$j$::jsonb), 'manual', 'enrique', true);
INSERT INTO client_profiles (user_id, biological_sex) VALUES ('00000000-0000-4000-8000-000000000003', 'female');
INSERT INTO health_measurements (user_id, date, resting_hr, source) VALUES ('00000000-0000-4000-8000-000000000003', '2026-09-01', 71, 'manual');
UPDATE profiles SET fitness_level = 'avanzado' WHERE id = '00000000-0000-4000-8000-000000000003';

\pset format unaligned
\pset tuples_only on
\set ON_ERROR_STOP on

\echo '=== ESCENARIO 1: no admin (cliente 1 con sesion) -> not_authorized y nada escrito'
SELECT set_config('app.uid', '00000000-0000-4000-8000-000000000001', false);
SELECT 'antes: routines=' || (SELECT count(*) FROM routines) || ' client_profiles=' || (SELECT count(*) FROM client_profiles) || ' health_measurements=' || (SELECT count(*) FROM health_measurements);
SELECT 'perfil:  ' || elite_sembrar_perfil('00000000-0000-4000-8000-000000000002')::text;
SELECT 'rutinas: ' || elite_cargar_rutinas('00000000-0000-4000-8000-000000000002')::text;
SELECT 'comidas: ' || elite_cargar_comidas('00000000-0000-4000-8000-000000000002')::text;
SELECT 'despues: routines=' || (SELECT count(*) FROM routines) || ' client_profiles=' || (SELECT count(*) FROM client_profiles) || ' health_measurements=' || (SELECT count(*) FROM health_measurements);

\echo ''
\echo '=== ESCENARIO 1b: sin sesion -> sin_sesion; usuario sin evaluacion Elite -> sin_evaluacion_elite'
SELECT set_config('app.uid', '', false);
SELECT 'sin sesion: ' || elite_sembrar_perfil('00000000-0000-4000-8000-000000000002')::text;
SELECT set_config('app.uid', 'a0000000-0000-4000-8000-00000000000a', false);
SELECT 'cliente 4 (sin Elite): ' || elite_cargar_rutinas('00000000-0000-4000-8000-000000000004')::text;
SELECT 'uuid inexistente: ' || elite_cargar_comidas('00000000-0000-4000-8000-0000000000ff')::text;

\echo ''
\echo '=== ESCENARIO 2: perfil con sexo, FC en reposo y nivel YA puestos por el cliente (cliente 3) -> respetado; lo vacio se siembra'
SELECT 'antes client_profiles: ' || row_to_json(c)::text FROM (SELECT biological_sex, date_of_birth, height_cm FROM client_profiles WHERE user_id = '00000000-0000-4000-8000-000000000003') c;
SELECT jsonb_pretty(elite_sembrar_perfil('00000000-0000-4000-8000-000000000003'));
SELECT 'despues client_profiles: ' || row_to_json(c)::text FROM (SELECT biological_sex, date_of_birth, height_cm FROM client_profiles WHERE user_id = '00000000-0000-4000-8000-000000000003') c;
SELECT 'profiles.fitness_level = ' || fitness_level FROM profiles WHERE id = '00000000-0000-4000-8000-000000000003';
SELECT 'health_measurements: ' || row_to_json(h)::text FROM (SELECT date, weight_kg, height_cm, resting_hr, source FROM health_measurements WHERE user_id = '00000000-0000-4000-8000-000000000003' ORDER BY date) h;

\echo ''
\echo '=== ESCENARIO 3: perfil vacio (cliente 2, sin fila en client_profiles) -> todo sembrado'
SELECT 'antes: filas client_profiles=' || count(*) FROM client_profiles WHERE user_id = '00000000-0000-4000-8000-000000000002';
SELECT jsonb_pretty(elite_sembrar_perfil('00000000-0000-4000-8000-000000000002'));
SELECT 'client_profiles: ' || row_to_json(c)::text FROM (SELECT biological_sex, date_of_birth, height_cm FROM client_profiles WHERE user_id = '00000000-0000-4000-8000-000000000002') c;
SELECT 'profiles.fitness_level = ' || fitness_level FROM profiles WHERE id = '00000000-0000-4000-8000-000000000002';
SELECT 'health_measurements: ' || row_to_json(h)::text FROM (SELECT date, weight_kg, height_cm, resting_hr, source FROM health_measurements WHERE user_id = '00000000-0000-4000-8000-000000000002') h;

\echo ''
\echo '=== ESCENARIO 4a: recarga del perfil (cliente 2) -> todo respetado, sin filas nuevas'
SELECT jsonb_pretty(elite_sembrar_perfil('00000000-0000-4000-8000-000000000002'));
SELECT 'filas health_measurements cliente 2 = ' || count(*) FROM health_measurements WHERE user_id = '00000000-0000-4000-8000-000000000002';

\echo ''
\echo '=== ESCENARIO 5: rutinas con dias_semana (cliente 2) -> routines + blocks + scheduled_routines con assigned_by'
SELECT jsonb_pretty(elite_cargar_rutinas('00000000-0000-4000-8000-000000000002'));
SELECT 'routines: ' || row_to_json(r)::text FROM (SELECT name, creator_id, original_creator_id, mode, category, description FROM routines WHERE creator_id = '00000000-0000-4000-8000-000000000002' ORDER BY created_at) r;
SELECT 'blocks: ' || row_to_json(b)::text FROM (SELECT r.name AS rutina, b.sort_order, b.type, b.label, b.duration_seconds, b.rounds, b.rest_between_seconds, b.suggested_rest_seconds, b.matrix_slug, b.exercise_id IS NOT NULL AS con_exercise_id, b.notes FROM blocks b JOIN routines r ON r.id = b.routine_id WHERE r.creator_id = '00000000-0000-4000-8000-000000000002' ORDER BY r.created_at, b.sort_order) b;
SELECT 'scheduled_routines: ' || row_to_json(s)::text FROM (SELECT r.name AS rutina, s.schedule_type, s.day_of_week, s.assigned_by, s.is_active FROM scheduled_routines s JOIN routines r ON r.id = s.routine_id WHERE s.user_id = '00000000-0000-4000-8000-000000000002' ORDER BY r.name, s.day_of_week) s;
SELECT 'elite_rutinas_cargadas: ' || row_to_json(e)::text FROM (SELECT nombre, nombre_norm, version_elite, routine_id IS NOT NULL AS con_routine FROM elite_rutinas_cargadas WHERE user_id = '00000000-0000-4000-8000-000000000002' ORDER BY nombre) e;

\echo ''
\echo '=== ESCENARIO 4b: recarga de rutinas (cliente 2) -> rutina_ya_cargada, sin duplicados'
SELECT jsonb_pretty(elite_cargar_rutinas('00000000-0000-4000-8000-000000000002'));
SELECT 'routines cliente 2 = ' || (SELECT count(*) FROM routines WHERE creator_id = '00000000-0000-4000-8000-000000000002') || ', scheduled = ' || (SELECT count(*) FROM scheduled_routines WHERE user_id = '00000000-0000-4000-8000-000000000002') || ', blocks = ' || (SELECT count(*) FROM blocks b JOIN routines r ON r.id = b.routine_id WHERE r.creator_id = '00000000-0000-4000-8000-000000000002');

\echo ''
\echo '=== ESCENARIO 4c: el cliente borra una rutina Elite y archiva otra; la recarga NO las revive'
DELETE FROM scheduled_routines WHERE routine_id IN (SELECT id FROM routines WHERE creator_id = '00000000-0000-4000-8000-000000000002' AND name = 'Fuerza A');
DELETE FROM routines WHERE creator_id = '00000000-0000-4000-8000-000000000002' AND name = 'Fuerza A';
UPDATE routines SET archived_at = now() WHERE creator_id = '00000000-0000-4000-8000-000000000002' AND name = 'Caminata larga';
SELECT jsonb_pretty(elite_cargar_rutinas('00000000-0000-4000-8000-000000000002'));
SELECT 'routines cliente 2 = ' || count(*) FROM routines WHERE creator_id = '00000000-0000-4000-8000-000000000002';

\echo ''
\echo '=== ESCENARIO 6: rutinas vacias (cliente 3) -> aviso sin_rutinas'
SELECT jsonb_pretty(elite_cargar_rutinas('00000000-0000-4000-8000-000000000003'));

\echo ''
\echo '=== ESCENARIO 7: comidas sin plan Elite -> sin_plan_elite (cliente 2 con el plan renombrado a proposito); comidas vacias (cliente 3) -> sin_comidas'
UPDATE nutrition_plans SET name = 'Plan Elite v1 (renombrado)' WHERE user_id = '00000000-0000-4000-8000-000000000002';
SELECT jsonb_pretty(elite_cargar_comidas('00000000-0000-4000-8000-000000000002'));
UPDATE nutrition_plans SET name = 'Plan Elite v1' WHERE user_id = '00000000-0000-4000-8000-000000000002';
SELECT jsonb_pretty(elite_cargar_comidas('00000000-0000-4000-8000-000000000003'));

\echo ''
\echo '=== ESCENARIO 8: comidas con plan Elite v1 (cliente 2) -> meals y macros escritos; recarga -> respetados'
SELECT jsonb_pretty(elite_cargar_comidas('00000000-0000-4000-8000-000000000002'));
SELECT 'plan: ' || row_to_json(p)::text FROM (SELECT name, status, calorie_target, protein_target, carb_target, fat_target, water_target, jsonb_array_length(meals) AS n_meals FROM nutrition_plans WHERE user_id = '00000000-0000-4000-8000-000000000002') p;
SELECT 'meal: ' || m::text FROM nutrition_plans, jsonb_array_elements(meals) m WHERE user_id = '00000000-0000-4000-8000-000000000002';
SELECT jsonb_pretty(elite_cargar_comidas('00000000-0000-4000-8000-000000000002'));
SELECT 'otros planes intactos (cliente 1): ' || string_agg(name || '=' || jsonb_array_length(meals) || ' comidas', ', ') FROM nutrition_plans WHERE user_id = '00000000-0000-4000-8000-000000000001';

\echo ''
\echo '=== ESCENARIO 9: evaluacion formato viejo (cliente 1, Omar sin campos nuevos) -> ok:true, todo sin_*, nada roto'
SELECT jsonb_pretty(elite_sembrar_perfil('00000000-0000-4000-8000-000000000001'));
SELECT jsonb_pretty(elite_cargar_rutinas('00000000-0000-4000-8000-000000000001'));
SELECT jsonb_pretty(elite_cargar_comidas('00000000-0000-4000-8000-000000000001'));
SELECT 'cliente 1: client_profiles=' || (SELECT count(*) FROM client_profiles WHERE user_id = '00000000-0000-4000-8000-000000000001') || ' health_measurements=' || (SELECT count(*) FROM health_measurements WHERE user_id = '00000000-0000-4000-8000-000000000001') || ' routines=' || (SELECT count(*) FROM routines WHERE creator_id = '00000000-0000-4000-8000-000000000001');

\echo ''
\echo '=== ESCENARIO 10: version NUEVA (cliente 5: v1 con Fuerza A [1,4] y Movilidad [6]; v2 con Fuerza A [2,5] y Fuerza B [4]) -> la v1 se archiva y sus agendas del coach se apagan; la agenda que el cliente puso el mismo se queda'
INSERT INTO auth.users (id) VALUES ('00000000-0000-4000-8000-000000000005');
INSERT INTO profiles (id, email, full_name, role, tier) VALUES ('00000000-0000-4000-8000-000000000005', 'c5@x', 'Cliente Cinco', 'client', 'elite');
INSERT INTO functional_dx (user_id, version, quality_level, roots_detected, summary_text, sources_snapshot, generated_by, model, is_current)
VALUES ('00000000-0000-4000-8000-000000000005', 1, 4, '[]', 'v1', jsonb_build_object('elite_v3', $j${"schema":"elite_v3","version":1,"generado_en":"2026-08-01","interpretado_por":{"evaluacion":"Enrique Zapata"},"cliente":{"nombre_preferido":"C.","sexo":"male","edad":40,"fecha_toma":"2026-07-20"},"entrenamiento":{"rutinas":[{"nombre":"Fuerza A","objetivo":null,"dias_semana":[1,4],"bloques":[{"ejercicio":"Sentadilla con barra","series":3,"reps":"8","descanso_s":90,"notas":null}],"notas":null},{"nombre":"Movilidad","objetivo":null,"dias_semana":[6],"bloques":[{"ejercicio":"Gato camello","series":2,"reps":"10","descanso_s":30,"notas":null}],"notas":null}]}}$j$::jsonb), 'manual', 'enrique', true);
SELECT 'v1: rutinas=' || (x->>'rutinas') || ' agendas=' || (x->>'agendas') || ' archivadas=' || (x->>'rutinas_version_anterior_archivadas') FROM elite_cargar_rutinas('00000000-0000-4000-8000-000000000005') x;
-- El cliente agenda el mismo la Fuerza A de la v1 en domingo (assigned_by = el).
INSERT INTO scheduled_routines (user_id, routine_id, assigned_by, schedule_type, day_of_week)
SELECT '00000000-0000-4000-8000-000000000005', routine_id, '00000000-0000-4000-8000-000000000005', 'weekly_cycle', 0 FROM elite_rutinas_cargadas WHERE user_id = '00000000-0000-4000-8000-000000000005' AND nombre = 'Fuerza A';
UPDATE functional_dx SET is_current = false WHERE user_id = '00000000-0000-4000-8000-000000000005';
INSERT INTO functional_dx (user_id, version, quality_level, roots_detected, summary_text, sources_snapshot, generated_by, model, is_current)
VALUES ('00000000-0000-4000-8000-000000000005', 2, 4, '[]', 'v2', jsonb_build_object('elite_v3', $j${"schema":"elite_v3","version":2,"generado_en":"2026-09-15","interpretado_por":{"evaluacion":"Enrique Zapata"},"cliente":{"nombre_preferido":"C.","sexo":"male","edad":40,"fecha_toma":"2026-09-10"},"entrenamiento":{"rutinas":[{"nombre":"Fuerza A","objetivo":"Segunda fase","dias_semana":[2,5],"bloques":[{"ejercicio":"Sentadilla con barra","series":4,"reps":"6","descanso_s":120,"notas":null}],"notas":null},{"nombre":"Fuerza B","objetivo":null,"dias_semana":[4],"bloques":[{"ejercicio":"Press de banca","series":3,"reps":"8","descanso_s":90,"notas":null}],"notas":null}]}}$j$::jsonb), 'manual', 'enrique', true);
SELECT 'antes v2: ' || string_agg(r.name || ' v' || c.version_elite || CASE WHEN r.archived_at IS NULL THEN '' ELSE ' [archivada]' END || ' agendas_activas=' || (SELECT count(*) FROM scheduled_routines s WHERE s.routine_id = r.id AND s.is_active), '; ' ORDER BY c.version_elite, r.name)
FROM elite_rutinas_cargadas c JOIN routines r ON r.id = c.routine_id WHERE c.user_id = '00000000-0000-4000-8000-000000000005';
SELECT jsonb_pretty(elite_cargar_rutinas('00000000-0000-4000-8000-000000000005') - 'rutinas_detalle' - 'dx_id');
SELECT 'despues v2: ' || string_agg(r.name || ' v' || c.version_elite || CASE WHEN r.archived_at IS NULL THEN '' ELSE ' [archivada]' END || ' agendas_activas=' || (SELECT count(*) FROM scheduled_routines s WHERE s.routine_id = r.id AND s.is_active) || ' (' || COALESCE((SELECT string_agg('dow ' || s.day_of_week || ' por ' || CASE WHEN s.assigned_by = c.user_id THEN 'cliente' ELSE 'coach' END, ',' ORDER BY s.day_of_week) FROM scheduled_routines s WHERE s.routine_id = r.id AND s.is_active), 'ninguna') || ')', '; ' ORDER BY c.version_elite, r.name)
FROM elite_rutinas_cargadas c JOIN routines r ON r.id = c.routine_id WHERE c.user_id = '00000000-0000-4000-8000-000000000005';
SELECT 'segunda corrida v2: ya_cargadas=' || (x->>'rutinas_ya_cargadas') || ' archivadas=' || (x->>'rutinas_version_anterior_archivadas') || ' agendas_desactivadas=' || (x->>'agendas_version_anterior_desactivadas') FROM elite_cargar_rutinas('00000000-0000-4000-8000-000000000005') x;
SELECT 'routines cliente 5 = ' || count(*) || ', archivadas = ' || count(archived_at) FROM routines WHERE creator_id = '00000000-0000-4000-8000-000000000005';

\echo ''
\echo '=== ESCENARIO 11: slug empareja primero; nombre en ingles segundo; familia solo si es unica; slug inexistente avisa (cliente 6)'
INSERT INTO auth.users (id) VALUES ('00000000-0000-4000-8000-000000000006');
INSERT INTO profiles (id, email, full_name, role, tier) VALUES ('00000000-0000-4000-8000-000000000006', 'c6@x', 'Cliente Seis', 'client', 'elite');
INSERT INTO functional_dx (user_id, version, quality_level, roots_detected, summary_text, sources_snapshot, generated_by, model, is_current)
VALUES ('00000000-0000-4000-8000-000000000006', 1, 4, '[]', 'v1', jsonb_build_object('elite_v3', $j${"schema":"elite_v3","version":1,"generado_en":"2026-09-15","interpretado_por":{"evaluacion":"Enrique Zapata"},"cliente":{"nombre_preferido":"S.","sexo":"male","edad":40,"fecha_toma":"2026-09-10"},"entrenamiento":{"rutinas":[{"nombre":"Empuje","objetivo":null,"dias_semana":[1],"bloques":[
  {"ejercicio":"Press de banca con mancuernas","series":4,"reps":"6","descanso_s":120,"notas":"Con slug del catalogo","slug":"dumbbell-bench-press"},
  {"ejercicio":"Barbell Bench Press","series":3,"reps":"8","descanso_s":90,"notas":"Nombre en ingles, sin slug"},
  {"ejercicio":"Curl femoral","series":3,"reps":"12","descanso_s":60,"notas":"Familia unica"},
  {"ejercicio":"Press de pecho","series":3,"reps":"10","descanso_s":60,"notas":"Familia con varias filas: no se adivina"},
  {"ejercicio":"Remo con mancuerna","series":3,"reps":"10","descanso_s":60,"notas":"Slug que no existe","slug":"remo-que-no-existe"},
  {"ejercicio":"Peso muerto rumano","series":3,"reps":"8","descanso_s":90,"notas":"Nombre en espanol de la fila local","slug":"dumbbell-romanian-deadlift"}
]}]}}$j$::jsonb), 'manual', 'enrique', true);
SELECT jsonb_pretty(elite_cargar_rutinas('00000000-0000-4000-8000-000000000006') - 'rutinas_detalle' - 'dx_id');
SELECT 'bloque: ' || row_to_json(b)::text FROM (SELECT b.sort_order, b.label, b.matrix_slug, b.exercise_id IS NOT NULL AS con_exercise_id, b.duration_seconds, b.rounds FROM blocks b JOIN routines r ON r.id = b.routine_id WHERE r.creator_id = '00000000-0000-4000-8000-000000000006' ORDER BY b.sort_order) b;

\echo ''
\echo '=== ESCENARIO 12: rutina PROPIA del cliente con el mismo nombre (cliente 7 tiene su "Fuerza A" en lunes) -> la de la evaluacion se crea aparte, no se agenda el lunes, la propia queda intacta'
INSERT INTO auth.users (id) VALUES ('00000000-0000-4000-8000-000000000007');
INSERT INTO profiles (id, email, full_name, role, tier) VALUES ('00000000-0000-4000-8000-000000000007', 'c7@x', 'Cliente Siete', 'client', 'elite');
INSERT INTO routines (id, creator_id, name, description, category, mode) VALUES ('70000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000007', 'Fuerza A', 'La mia, hecha a mano', 'workout', 'routine');
INSERT INTO blocks (routine_id, sort_order, type, label, duration_seconds, rounds, rest_between_seconds) VALUES ('70000000-0000-4000-8000-000000000001', 0, 'work', 'Mi bloque', 60, 2, 30);
INSERT INTO scheduled_routines (user_id, routine_id, assigned_by, schedule_type, day_of_week) VALUES ('00000000-0000-4000-8000-000000000007', '70000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000007', 'weekly_cycle', 1);
INSERT INTO functional_dx (user_id, version, quality_level, roots_detected, summary_text, sources_snapshot, generated_by, model, is_current)
VALUES ('00000000-0000-4000-8000-000000000007', 1, 4, '[]', 'v1', jsonb_build_object('elite_v3', $j${"schema":"elite_v3","version":1,"generado_en":"2026-09-15","interpretado_por":{"evaluacion":"Enrique Zapata"},"cliente":{"nombre_preferido":"S.","sexo":"male","edad":40,"fecha_toma":"2026-09-10"},"entrenamiento":{"rutinas":[{"nombre":"fuerza a","objetivo":null,"dias_semana":[1,4],"bloques":[{"ejercicio":"Sentadilla con barra","series":3,"reps":"8","descanso_s":90,"notas":null}],"notas":null}]}}$j$::jsonb), 'manual', 'enrique', true);
SELECT jsonb_pretty(elite_cargar_rutinas('00000000-0000-4000-8000-000000000007') - 'dx_id');
SELECT 'routines: ' || row_to_json(r)::text FROM (SELECT name, description, original_creator_id IS NOT NULL AS del_coach, archived_at FROM routines WHERE creator_id = '00000000-0000-4000-8000-000000000007' ORDER BY created_at) r;
SELECT 'scheduled: ' || row_to_json(s)::text FROM (SELECT r.name, r.description, s.day_of_week, CASE WHEN s.assigned_by = s.user_id THEN 'cliente' ELSE 'coach' END AS puesta_por, s.is_active FROM scheduled_routines s JOIN routines r ON r.id = s.routine_id WHERE s.user_id = '00000000-0000-4000-8000-000000000007' ORDER BY s.day_of_week) s;

\echo ''
\echo '=== ESCENARIO 13: reps en prosa -> 40 s + aviso; reps limpio -> derivada; series y descanso fuera de rango -> aviso; sort_order contiguo; dias repetidos (cliente 3 con evaluacion v2)'
UPDATE functional_dx SET is_current = false WHERE user_id = '00000000-0000-4000-8000-000000000003';
INSERT INTO functional_dx (user_id, version, quality_level, roots_detected, summary_text, sources_snapshot, generated_by, model, is_current)
VALUES ('00000000-0000-4000-8000-000000000003', 2, 4, '[]', 'v2', jsonb_build_object('elite_v3', $j${"schema":"elite_v3","version":2,"generado_en":"2026-09-15","interpretado_por":{"evaluacion":"Enrique Zapata"},"cliente":{"nombre_preferido":"T.","sexo":"male","edad":40,"fecha_toma":"2026-09-10"},"entrenamiento":{"rutinas":[{"nombre":"Tiempos","objetivo":null,"dias_semana":[2,2,9],"bloques":[
  {"ejercicio":"Plancha con arrastre + bird dog","series":3,"reps":"30-45 s / 10 por lado","descanso_s":60,"notas":"Prosa: no se deriva"},
  {"ejercicio":"Face pull (MYO)","series":1,"reps":"15 dejando 2 en el tanque + 3 mini","descanso_s":15,"notas":null},
  {"ejercicio":"Antebrazo excentricos","series":null,"reps":"bajada lenta de 3 segundos","descanso_s":60,"notas":null},
  {"ejercicio":"Sentadilla bulgara","series":3,"reps":"8-10","descanso_s":60,"notas":"Limpio: 10 x 4 = 40"},
  {"ejercicio":"Zancada","series":3,"reps":"12","descanso_s":60,"notas":"Limpio: 48"},
  {"ejercicio":"Plancha lateral","series":3,"reps":"30 s","descanso_s":30,"notas":"Limpio: 30"},
  {"ejercicio":"Bici","series":1,"reps":"45 min","descanso_s":null,"notas":"Limpio, tope 1800"},
  {"ejercicio":"","series":3,"reps":"10","descanso_s":60,"notas":"Sin ejercicio: se salta y el sort_order no deja hueco"},
  {"ejercicio":"Remo","series":25,"reps":"10","descanso_s":900,"notas":"Fuera de rango"},
  {"ejercicio":"Sin reps","series":2,"reps":null,"descanso_s":30,"notas":null}
]}]}}$j$::jsonb), 'manual', 'enrique', true);
SELECT jsonb_pretty(elite_cargar_rutinas('00000000-0000-4000-8000-000000000003') - 'dx_id');
SELECT 'bloque: ' || row_to_json(b)::text FROM (SELECT b.sort_order, b.label, b.duration_seconds, b.rounds, b.rest_between_seconds FROM blocks b JOIN routines r ON r.id = b.routine_id WHERE r.creator_id = '00000000-0000-4000-8000-000000000003' ORDER BY b.sort_order) b;
SELECT 'agenda: ' || string_agg(day_of_week::text, ',' ORDER BY day_of_week) FROM scheduled_routines WHERE user_id = '00000000-0000-4000-8000-000000000003' AND is_active;

\echo ''
\echo '=== ESCENARIO 14: dos rutinas del mismo documento con el mismo nombre -> entra la primera y se avisa; label > 80 se recorta (cliente 4 con evaluacion nueva)'
INSERT INTO functional_dx (user_id, version, quality_level, roots_detected, summary_text, sources_snapshot, generated_by, model, is_current)
VALUES ('00000000-0000-4000-8000-000000000004', 1, 4, '[]', 'v1', jsonb_build_object('elite_v3', $j${"schema":"elite_v3","version":1,"generado_en":"2026-09-15","interpretado_por":{"evaluacion":"Enrique Zapata"},"cliente":{"nombre_preferido":"Q.","sexo":"male","edad":40,"fecha_toma":"2026-09-10"},"entrenamiento":{"rutinas":[{"nombre":"Fuerza A","objetivo":null,"dias_semana":[1],"bloques":[{"ejercicio":"Antebrazo: excéntricos de muñeca + pronosupinación + carry unilateral (método Estándar)","series":3,"reps":"Excéntricos de muñeca: izquierda 3 x 12 · derecha 2 x 12, mancuerna de 1.5 a 2 kg, bajada lenta de 3 segundos","descanso_s":60,"notas":"Prosa larga que va a notes"}],"notas":null},{"nombre":"FUERZA  A","objetivo":null,"dias_semana":[3],"bloques":[{"ejercicio":"Otro","series":3,"reps":"8","descanso_s":60,"notas":null}],"notas":null}]}}$j$::jsonb), 'manual', 'enrique', true);
SELECT jsonb_pretty(elite_cargar_rutinas('00000000-0000-4000-8000-000000000004') - 'dx_id' - 'rutinas_detalle');
SELECT 'bloque: label(' || length(b.label) || ')=' || b.label || ' | notes(' || length(b.notes) || ')' FROM blocks b JOIN routines r ON r.id = b.routine_id WHERE r.creator_id = '00000000-0000-4000-8000-000000000004';

\echo ''
\echo '=== CHEQUEO m3: authenticated NO ejecuta elite_325_norm ni elite_325_contexto'
SELECT p.proname || ': exec(authenticated)=' || has_function_privilege('authenticated', p.oid, 'EXECUTE') || ' exec(anon)=' || has_function_privilege('anon', p.oid, 'EXECUTE')
FROM pg_proc p WHERE p.proname IN ('elite_325_norm', 'elite_325_contexto', 'elite_cargar_rutinas') ORDER BY 1;

\else
\echo 'Parte 1: tablas minimas (ahora aplica la migracion 325 y vuelve a correr este archivo)'
-- Tablas minimas para probar la 325 en local (columnas copiadas de 007, 030, 264, 001, 220, 222/036 y de clone_routine 232).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fitness_level TEXT;
ALTER TABLE profiles ADD CONSTRAINT profiles_fitness_level_check CHECK (fitness_level IS NULL OR fitness_level IN ('principiante','intermedio','avanzado','atleta'));

CREATE TABLE client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  date_of_birth DATE,
  biological_sex TEXT CHECK (biological_sex IN ('male', 'female', 'intersex')),
  height_cm NUMERIC,
  exercise_experience TEXT CHECK (exercise_experience IN ('beginner', 'intermediate', 'advanced', 'elite')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE health_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg DECIMAL(5,2),
  height_cm DECIMAL(5,1),
  resting_hr INTEGER,
  vo2max_estimate DECIMAL(4,1),
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE health_os_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  resting_hr INTEGER CHECK (resting_hr IS NULL OR resting_hr BETWEEN 25 AND 220),
  source TEXT NOT NULL CHECK (source IN ('health_connect', 'healthkit')),
  UNIQUE(user_id, date)
);

CREATE TABLE exercise_matrix (
  slug text PRIMARY KEY,
  nombre text NOT NULL,
  equipo text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'Multiarticular',
  patron text NOT NULL DEFAULT '',
  dinamica text NOT NULL DEFAULT 'Normal',
  lateralidad text NOT NULL DEFAULT 'Bilateral',
  musculo_principal text NOT NULL DEFAULT '',
  familia text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_es TEXT,
  matrix_slug TEXT
);
CREATE UNIQUE INDEX idx_exercises_matrix_slug ON exercises (matrix_slug) WHERE matrix_slug IS NOT NULL;

-- routines/blocks: sin CREATE TABLE en el repo (legado). Columnas = las que
-- escribe clone_routine (232) y lee routine-service.ts (DbBlockRow).
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[],
  mode TEXT,
  cloned_from UUID,
  original_creator_id UUID REFERENCES profiles(id),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES routines(id) ON DELETE CASCADE NOT NULL,
  parent_block_id UUID,
  sort_order INT NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  duration_seconds INT,
  rounds INT NOT NULL DEFAULT 1,
  rest_between_seconds INT NOT NULL DEFAULT 0,
  color TEXT,
  sound_start TEXT NOT NULL DEFAULT 'default',
  sound_end TEXT NOT NULL DEFAULT 'default',
  notes TEXT NOT NULL DEFAULT '',
  exercise_id UUID REFERENCES exercises(id),
  suggested_rest_seconds INT,
  matrix_slug TEXT
);
CREATE TABLE scheduled_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  routine_id UUID REFERENCES routines(id) NOT NULL,
  assigned_by UUID REFERENCES profiles(id),
  schedule_type TEXT CHECK (schedule_type IN ('weekly_cycle', 'specific_date')) NOT NULL,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
  specific_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (
    (schedule_type = 'weekly_cycle' AND day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (schedule_type = 'specific_date' AND specific_date IS NOT NULL AND day_of_week IS NULL)
  )
);

-- Cinco filas con nombre en espanol (prueban el emparejamiento por nombre) y
-- cinco como las reales del seed 223 (nombre en INGLES, familia en espanol):
-- "Press de pecho" tiene dos filas (familia ambigua), "Curl femoral" una.
INSERT INTO exercise_matrix (slug, nombre, dinamica, lateralidad, musculo_principal, familia) VALUES
  ('sentadilla-con-barra', 'Sentadilla con barra', 'Normal', 'Bilateral', 'Cuádriceps', 'Sentadilla'),
  ('peso-muerto-rumano', 'Peso muerto rumano', 'Normal', 'Bilateral', 'Isquiotibiales', 'Peso muerto'),
  ('plancha-frontal', 'Plancha frontal', 'Isométrico', 'Bilateral', 'Core', 'Plancha'),
  ('press-de-banca', 'Press de banca', 'Normal', 'Bilateral', 'Pecho', 'Press de pecho'),
  ('press-de-banca-inclinado', 'Press de banca inclinado', 'Normal', 'Bilateral', 'Pecho', 'Press de pecho'),
  ('barbell-bench-press', 'Barbell Bench Press', 'Normal', 'Bilateral', 'Pecho', 'Press de pecho'),
  ('dumbbell-bench-press', 'Dumbbell Bench Press', 'Normal', 'Bilateral', 'Pecho', 'Press de pecho'),
  ('dumbbell-romanian-deadlift', 'Dumbbell Romanian Deadlift', 'Normal', 'Bilateral', 'Isquiotibiales', 'Peso muerto'),
  ('dumbbell-leg-curl', 'Dumbbell Leg Curl', 'Normal', 'Bilateral', 'Isquiotibiales', 'Curl femoral'),
  ('machine-leg-press', 'Machine Leg Press', 'Normal', 'Bilateral', 'Cuádriceps', 'Sentadilla/Prensa');
INSERT INTO exercises (name, matrix_slug) VALUES ('Sentadilla con barra', 'sentadilla-con-barra'), ('Dumbbell Bench Press', 'dumbbell-bench-press');
\endif
