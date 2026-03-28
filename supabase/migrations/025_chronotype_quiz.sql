-- ============================================================
-- Migración 025: Quiz de cronotipo — modelo de datos
-- EJECUTAR EN: Supabase SQL Editor
-- ============================================================

-- Templates de quizzes reutilizables
CREATE TABLE IF NOT EXISTS quiz_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  scoring_logic JSONB NOT NULL DEFAULT '{}',
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resultados de quizzes por usuario
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quiz_id UUID REFERENCES quiz_templates(id) NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  scores JSONB NOT NULL DEFAULT '{}',
  result TEXT NOT NULL,
  result_data JSONB NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cronotipo del usuario (resultado procesado)
CREATE TABLE IF NOT EXISTS user_chronotype (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  chronotype TEXT NOT NULL CHECK (chronotype IN ('lion', 'bear', 'wolf', 'dolphin')),
  wake_time TIME NOT NULL,
  sleep_time TIME NOT NULL,
  peak_focus_start TIME,
  peak_focus_end TIME,
  peak_physical_start TIME,
  peak_physical_end TIME,
  wind_down_time TIME,
  raw_scores JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_chronotype ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads quiz templates" ON quiz_templates FOR SELECT USING (true);
CREATE POLICY "Users manage own results" ON quiz_results FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own chronotype" ON user_chronotype FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach reads client chronotype" ON user_chronotype FOR SELECT USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = user_chronotype.user_id AND status = 'active')
);
CREATE POLICY "Coach reads client quiz results" ON quiz_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = quiz_results.user_id AND status = 'active')
);

-- Seed del quiz de cronotipo
INSERT INTO quiz_templates (slug, name, description, category, is_required, questions, scoring_logic) VALUES (
  'chronotype',
  'Descubre tu cronotipo',
  '¿Eres león, oso, lobo o delfín? Este quiz determina tu reloj biológico natural para optimizar tus horarios.',
  'foundation',
  true,
  '[
    {"id":"q1","text":"Si no tuvieras alarma, ¿a qué hora despertarías naturalmente?","options":[{"id":"a","text":"Antes de las 6:00 am","scores":{"lion":3,"bear":1,"wolf":0,"dolphin":1}},{"id":"b","text":"Entre 6:00 y 7:00 am","scores":{"lion":2,"bear":3,"wolf":0,"dolphin":2}},{"id":"c","text":"Entre 7:00 y 8:30 am","scores":{"lion":0,"bear":2,"wolf":3,"dolphin":1}},{"id":"d","text":"Después de las 8:30 am","scores":{"lion":0,"bear":0,"wolf":3,"dolphin":0}}]},
    {"id":"q2","text":"¿A qué hora del día te sientes con más energía mental?","options":[{"id":"a","text":"Temprano en la mañana (6-9 am)","scores":{"lion":3,"bear":1,"wolf":0,"dolphin":1}},{"id":"b","text":"Media mañana a medio día (9 am - 1 pm)","scores":{"lion":1,"bear":3,"wolf":0,"dolphin":2}},{"id":"c","text":"Por la tarde (2-6 pm)","scores":{"lion":0,"bear":1,"wolf":2,"dolphin":1}},{"id":"d","text":"Por la noche (7-11 pm)","scores":{"lion":0,"bear":0,"wolf":3,"dolphin":1}}]},
    {"id":"q3","text":"¿Cómo es tu apetito al despertar?","options":[{"id":"a","text":"Despierto con hambre, necesito desayunar pronto","scores":{"lion":3,"bear":2,"wolf":0,"dolphin":0}},{"id":"b","text":"Tengo algo de hambre, desayuno tranquilo","scores":{"lion":1,"bear":3,"wolf":0,"dolphin":1}},{"id":"c","text":"No tengo hambre hasta media mañana o más tarde","scores":{"lion":0,"bear":0,"wolf":3,"dolphin":1}},{"id":"d","text":"Es impredecible, a veces sí y a veces no","scores":{"lion":0,"bear":0,"wolf":1,"dolphin":3}}]},
    {"id":"q4","text":"Si tuvieras un examen importante mañana, ¿cuándo preferirías estudiar?","options":[{"id":"a","text":"Temprano en la mañana, con la mente fresca","scores":{"lion":3,"bear":1,"wolf":0,"dolphin":1}},{"id":"b","text":"A media mañana o al mediodía","scores":{"lion":1,"bear":3,"wolf":0,"dolphin":1}},{"id":"c","text":"En la tarde-noche, es cuando me concentro mejor","scores":{"lion":0,"bear":0,"wolf":3,"dolphin":1}},{"id":"d","text":"De madrugada, cuando no hay distracciones","scores":{"lion":0,"bear":0,"wolf":2,"dolphin":3}}]},
    {"id":"q5","text":"¿Cómo describes tu sueño?","options":[{"id":"a","text":"Me duermo fácil y despierto antes de la alarma","scores":{"lion":3,"bear":1,"wolf":0,"dolphin":0}},{"id":"b","text":"Duermo bien en general, necesito mi alarma","scores":{"lion":0,"bear":3,"wolf":1,"dolphin":0}},{"id":"c","text":"Me cuesta dormirme temprano y me cuesta despertar","scores":{"lion":0,"bear":0,"wolf":3,"dolphin":1}},{"id":"d","text":"Sueño ligero, me despierto fácil y me cuesta volver a dormir","scores":{"lion":0,"bear":0,"wolf":0,"dolphin":3}}]},
    {"id":"q6","text":"En un fin de semana libre, ¿qué haces?","options":[{"id":"a","text":"Me levanto temprano y aprovecho la mañana","scores":{"lion":3,"bear":1,"wolf":0,"dolphin":1}},{"id":"b","text":"Me levanto a mi hora normal y tengo un día balanceado","scores":{"lion":0,"bear":3,"wolf":0,"dolphin":1}},{"id":"c","text":"Duermo hasta tarde y soy más productivo por la noche","scores":{"lion":0,"bear":0,"wolf":3,"dolphin":0}},{"id":"d","text":"Me despierto temprano aunque no quiera, imposible dormir más","scores":{"lion":1,"bear":0,"wolf":0,"dolphin":3}}]},
    {"id":"q7","text":"¿Cuándo preferirías hacer ejercicio?","options":[{"id":"a","text":"Al amanecer o primera hora (5-7 am)","scores":{"lion":3,"bear":0,"wolf":0,"dolphin":1}},{"id":"b","text":"En la mañana (7-10 am)","scores":{"lion":1,"bear":3,"wolf":0,"dolphin":1}},{"id":"c","text":"En la tarde (4-7 pm)","scores":{"lion":0,"bear":1,"wolf":3,"dolphin":1}},{"id":"d","text":"Me da igual, pero no muy temprano","scores":{"lion":0,"bear":1,"wolf":2,"dolphin":2}}]},
    {"id":"q8","text":"¿Cómo manejas el estrés?","options":[{"id":"a","text":"Lo enfrento de frente, soy proactivo","scores":{"lion":3,"bear":1,"wolf":0,"dolphin":0}},{"id":"b","text":"Lo manejo bien en general, pido ayuda cuando necesito","scores":{"lion":0,"bear":3,"wolf":0,"dolphin":0}},{"id":"c","text":"Lo proceso internamente, a veces me afecta el sueño","scores":{"lion":0,"bear":0,"wolf":2,"dolphin":2}},{"id":"d","text":"Me afecta bastante, tiendo a sobrepensar","scores":{"lion":0,"bear":0,"wolf":1,"dolphin":3}}]},
    {"id":"q9","text":"¿Te consideras una persona...?","options":[{"id":"a","text":"Líder natural, orientada a metas, competitiva","scores":{"lion":3,"bear":0,"wolf":0,"dolphin":1}},{"id":"b","text":"Sociable, abierta, le gusta trabajar en equipo","scores":{"lion":0,"bear":3,"wolf":0,"dolphin":0}},{"id":"c","text":"Creativa, independiente, un poco rebelde","scores":{"lion":0,"bear":0,"wolf":3,"dolphin":1}},{"id":"d","text":"Perfeccionista, analítica, obsesiva con los detalles","scores":{"lion":0,"bear":0,"wolf":0,"dolphin":3}}]},
    {"id":"q10","text":"Si pudieras elegir tu horario ideal de comidas, sería:","options":[{"id":"a","text":"Desayuno 6am, comida 12pm, cena ligera 6pm","scores":{"lion":3,"bear":1,"wolf":0,"dolphin":1}},{"id":"b","text":"Desayuno 7:30am, comida 1pm, cena 7:30pm","scores":{"lion":0,"bear":3,"wolf":0,"dolphin":1}},{"id":"c","text":"Brunch 10am, comida tarde 3pm, cena 9pm+","scores":{"lion":0,"bear":0,"wolf":3,"dolphin":0}},{"id":"d","text":"Irregular, como cuando tengo hambre","scores":{"lion":0,"bear":0,"wolf":1,"dolphin":3}}]}
  ]',
  '{
    "method": "highest_score",
    "chronotype_schedules": {
      "lion": {"name":"León","emoji":"🦁","description":"Madrugador natural. Tu pico de energía es temprano en la mañana.","wake_time":"05:30","sleep_time":"21:30","peak_focus_start":"08:00","peak_focus_end":"12:00","peak_physical_start":"06:00","peak_physical_end":"10:00","wind_down_time":"20:30"},
      "bear": {"name":"Oso","emoji":"🐻","description":"Ritmo solar. Tu energía sigue el ciclo natural del día.","wake_time":"07:00","sleep_time":"23:00","peak_focus_start":"10:00","peak_focus_end":"14:00","peak_physical_start":"07:30","peak_physical_end":"12:00","wind_down_time":"22:00"},
      "wolf": {"name":"Lobo","emoji":"🐺","description":"Noctámbulo creativo. Tu mejor rendimiento es por la tarde-noche.","wake_time":"08:00","sleep_time":"00:00","peak_focus_start":"17:00","peak_focus_end":"21:00","peak_physical_start":"17:00","peak_physical_end":"19:00","wind_down_time":"23:00"},
      "dolphin": {"name":"Delfín","emoji":"🐬","description":"Sueño ligero, mente activa. Necesitas rutinas específicas para optimizar tu descanso.","wake_time":"06:30","sleep_time":"23:30","peak_focus_start":"10:00","peak_focus_end":"12:00","peak_physical_start":"15:00","peak_physical_end":"17:00","wind_down_time":"22:00"}
    }
  }'
);
