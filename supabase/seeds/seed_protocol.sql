-- ============================================================
-- Seed: Protocolo demo "Protocolo Ejecutivo ATP"
-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor
-- (ejecutar DESPUÉS de 003_daily_protocols.sql)
-- ============================================================

-- Protocolo demo
INSERT INTO daily_protocols (id, creator_id, name, description) VALUES
  ('dddddddd-0001-0001-0001-000000000001', '90a55e74-0e3d-477a-9ac5-2b339f7c40af', 'Protocolo Ejecutivo ATP', 'Día optimizado para alto rendimiento');

-- Items del protocolo (timeline completo)
INSERT INTO protocol_items (protocol_id, sort_order, scheduled_time, duration_minutes, category, title, description, accent_color, link_type) VALUES
  ('dddddddd-0001-0001-0001-000000000001', 1, '05:30', 10, 'habits', 'Grounding + luz solar', '10 min descalzo al sol. Exposición a luz natural para resetear ritmo circadiano.', '#EF9F27', 'habit_check'),
  ('dddddddd-0001-0001-0001-000000000001', 2, '05:40', 10, 'mind', 'Meditación matutina', 'Wim Hof breathing: 3 rondas de 30 respiraciones + retención.', '#7F77DD', 'breathing'),
  ('dddddddd-0001-0001-0001-000000000001', 3, '05:50', 5, 'supplements', 'Suplementos AM', 'Vitamina D3 5000UI + K2, Omega 3 2g, Magnesio glicinato 400mg.', '#1D9E75', 'supplement_check'),
  ('dddddddd-0001-0001-0001-000000000001', 4, '06:00', 55, 'fitness', 'Push Day Fuerza', 'Rutina asignada por coach. Press banca, inclinado, militar, fondos.', '#a8e02a', 'routine'),
  ('dddddddd-0001-0001-0001-000000000001', 5, '07:00', 5, 'nutrition', 'Batido post-entreno', '40g whey protein + 5g creatina + electrolitos.', '#7F77DD', 'habit_check'),
  ('dddddddd-0001-0001-0001-000000000001', 6, '08:00', NULL, 'nutrition', 'Ventana de alimentación abre', 'Protocolo 16:8. Primera comida del día.', '#5B9BD5', 'fasting_window'),
  ('dddddddd-0001-0001-0001-000000000001', 7, '08:30', 30, 'nutrition', 'Desayuno', 'Alto en proteína + grasas saludables. Toma foto para score.', '#5B9BD5', 'meal_photo'),
  ('dddddddd-0001-0001-0001-000000000001', 8, '12:00', 20, 'habits', 'Caminata digestiva', 'Post-comida. 20 min caminata ligera para mejorar digestión y sensibilidad a insulina.', '#EF9F27', 'habit_check'),
  ('dddddddd-0001-0001-0001-000000000001', 9, '12:30', 5, 'supplements', 'Suplementos PM', 'Ashwagandha 600mg, NAC 600mg, CoQ10 200mg.', '#1D9E75', 'supplement_check'),
  ('dddddddd-0001-0001-0001-000000000001', 10, '13:00', 30, 'nutrition', 'Comida principal', 'Proteína + vegetales + carbohidratos complejos. Toma foto.', '#5B9BD5', 'meal_photo'),
  ('dddddddd-0001-0001-0001-000000000001', 11, '15:00', 15, 'mind', 'Meditación enfoque', 'Mindfulness: atención a la respiración. 15 minutos.', '#7F77DD', 'meditation'),
  ('dddddddd-0001-0001-0001-000000000001', 12, '15:30', 10, 'habits', 'Journaling', 'Reflexión del día. 3 cosas por las que agradecer + intenciones.', '#EF9F27', 'journal'),
  ('dddddddd-0001-0001-0001-000000000001', 13, '16:00', NULL, 'nutrition', 'Ventana de alimentación cierra', 'Última comida. Inicia ayuno de 16 horas.', '#5B9BD5', 'fasting_window'),
  ('dddddddd-0001-0001-0001-000000000001', 14, '20:00', NULL, 'habits', 'Lentes bloqueadores', 'Ponerse lentes bloqueadores de luz azul para proteger melatonina.', '#EF9F27', 'external_link'),
  ('dddddddd-0001-0001-0001-000000000001', 15, '20:30', 5, 'recovery', 'Respiración 4-7-8', 'Inhala 4s, retén 7s, exhala 8s. 5 ciclos. Activar parasimpático.', '#7F77DD', 'breathing'),
  ('dddddddd-0001-0001-0001-000000000001', 16, '21:00', 10, 'mind', 'Meditación nocturna', 'Body scan progresivo de 10 min. Relajación de pies a cabeza.', '#7F77DD', 'meditation'),
  ('dddddddd-0001-0001-0001-000000000001', 17, '21:30', 5, 'supplements', 'Suplementos noche', 'Mg glicinato 400mg, L-theanine 200mg, Zinc 30mg.', '#1D9E75', 'supplement_check'),
  ('dddddddd-0001-0001-0001-000000000001', 18, '22:00', 480, 'sleep', 'Dormir', 'Meta: 10pm-6am. Cuarto oscuro, fresco (18-20°C), sin pantallas.', '#5B9BD5', 'habit_check');

-- Asignar protocolo (todos los días)
INSERT INTO protocol_assignments (protocol_id, user_id, assigned_by) VALUES
  ('dddddddd-0001-0001-0001-000000000001', '90a55e74-0e3d-477a-9ac5-2b339f7c40af', '90a55e74-0e3d-477a-9ac5-2b339f7c40af');

-- Pre-completar los primeros 10 items para hoy
INSERT INTO protocol_completions (user_id, protocol_item_id, completion_date)
SELECT '90a55e74-0e3d-477a-9ac5-2b339f7c40af', pi.id, CURRENT_DATE
FROM protocol_items pi
WHERE pi.protocol_id = 'dddddddd-0001-0001-0001-000000000001'
AND pi.sort_order <= 10;
