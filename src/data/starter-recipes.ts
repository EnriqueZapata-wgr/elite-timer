/**
 * Recetas base para seed inicial.
 * Ejecutar seedRecipes() una vez para poblar la tabla recipes.
 */
import { supabase } from '@/src/lib/supabase';

const ADMIN_UID = '90a55e74-0e3d-477a-9ac5-2b339f7c40af';

const RECIPES = [
  {
    name: 'Huevos revueltos con aguacate y espinaca',
    description: 'Desayuno alto en proteína y grasas saludables. Perfecto para romper ayuno.',
    category: 'breakfast', tags: ['high_protein', 'anti_inflammatory', 'keto_friendly'],
    prep_time_min: 5, cook_time_min: 8, servings: 1,
    calories: 420, protein_g: 28, carbs_g: 8, fat_g: 32, fiber_g: 6,
    diet_types: ['mediterranean', 'keto', 'low_carb', 'anti_inflammatory'],
    ingredients: [
      { name: 'Huevos', amount: 3, unit: 'pzas' },
      { name: 'Aguacate', amount: 0.5, unit: 'pza' },
      { name: 'Espinaca baby', amount: 1, unit: 'taza' },
      { name: 'Aceite de oliva', amount: 1, unit: 'cdita' },
      { name: 'Sal y pimienta', amount: 1, unit: 'al gusto' },
    ],
    instructions: [
      { step: 1, text: 'Calienta aceite de oliva en sartén a fuego medio.' },
      { step: 2, text: 'Agrega la espinaca y saltea 1 minuto hasta que se marchite.' },
      { step: 3, text: 'Bate los huevos y agrégalos al sartén. Revuelve suavemente.' },
      { step: 4, text: 'Sirve con aguacate en rebanadas. Sazona al gusto.' },
    ],
  },
  {
    name: 'Bowl de quinoa con salmón y verduras',
    description: 'Comida completa con omega 3, proteína y fibra.',
    category: 'lunch', tags: ['anti_inflammatory', 'omega3', 'high_fiber'],
    prep_time_min: 10, cook_time_min: 20, servings: 1,
    calories: 550, protein_g: 38, carbs_g: 42, fat_g: 22, fiber_g: 8,
    diet_types: ['mediterranean', 'balanced', 'anti_inflammatory'],
    ingredients: [
      { name: 'Salmón fresco', amount: 150, unit: 'g' },
      { name: 'Quinoa cocida', amount: 0.75, unit: 'taza' },
      { name: 'Brócoli', amount: 1, unit: 'taza' },
      { name: 'Zanahoria rallada', amount: 0.5, unit: 'taza' },
      { name: 'Limón', amount: 0.5, unit: 'pza' },
      { name: 'Aceite de oliva', amount: 1, unit: 'cda' },
    ],
    instructions: [
      { step: 1, text: 'Cocina el salmón a la plancha 4 min por lado.' },
      { step: 2, text: 'Cuece el brócoli al vapor 3 minutos.' },
      { step: 3, text: 'Arma el bowl: quinoa de base, salmón desmenuzado, brócoli, zanahoria.' },
      { step: 4, text: 'Aliña con limón y aceite de oliva.' },
    ],
  },
  {
    name: 'Smoothie verde anti-inflamatorio',
    description: 'Bebida rica en antioxidantes y fibra. Ideal como snack o pre-entreno.',
    category: 'smoothie', tags: ['anti_inflammatory', 'detox', 'plant_based'],
    prep_time_min: 5, cook_time_min: 0, servings: 1,
    calories: 220, protein_g: 8, carbs_g: 32, fat_g: 8, fiber_g: 6,
    diet_types: ['plant_based', 'anti_inflammatory', 'balanced'],
    ingredients: [
      { name: 'Espinaca', amount: 2, unit: 'tazas' },
      { name: 'Plátano congelado', amount: 0.5, unit: 'pza' },
      { name: 'Jengibre fresco', amount: 1, unit: 'cm' },
      { name: 'Cúrcuma en polvo', amount: 0.5, unit: 'cdita' },
      { name: 'Leche de almendra', amount: 1, unit: 'taza' },
      { name: 'Semillas de chía', amount: 1, unit: 'cda' },
    ],
    instructions: [
      { step: 1, text: 'Agrega todos los ingredientes a la licuadora.' },
      { step: 2, text: 'Licúa a alta velocidad por 60 segundos.' },
      { step: 3, text: 'Sirve inmediatamente.' },
    ],
  },
  {
    name: 'Pechuga de pollo con camote y brócoli',
    description: 'Comida clásica de rendimiento. Alta en proteína, carbos complejos.',
    category: 'lunch', tags: ['high_protein', 'balanced', 'meal_prep'],
    prep_time_min: 10, cook_time_min: 25, servings: 1,
    calories: 480, protein_g: 42, carbs_g: 45, fat_g: 10, fiber_g: 7,
    diet_types: ['balanced', 'mediterranean'],
    ingredients: [
      { name: 'Pechuga de pollo', amount: 180, unit: 'g' },
      { name: 'Camote', amount: 150, unit: 'g' },
      { name: 'Brócoli', amount: 1.5, unit: 'tazas' },
      { name: 'Aceite de coco', amount: 1, unit: 'cdita' },
      { name: 'Paprika y ajo en polvo', amount: 1, unit: 'al gusto' },
    ],
    instructions: [
      { step: 1, text: 'Precalienta horno a 200°C. Corta el camote en cubos.' },
      { step: 2, text: 'Hornea camote 20 min. Agrega brócoli los últimos 8 min.' },
      { step: 3, text: 'Cocina pollo a la plancha con especias, 5-6 min por lado.' },
      { step: 4, text: 'Sirve todo junto.' },
    ],
  },
  {
    name: 'Ensalada mediterránea con garbanzos',
    description: 'Ensalada completa con proteína vegetal y grasas mono-insaturadas.',
    category: 'lunch', tags: ['mediterranean', 'plant_based', 'high_fiber'],
    prep_time_min: 10, cook_time_min: 0, servings: 1,
    calories: 380, protein_g: 15, carbs_g: 35, fat_g: 20, fiber_g: 10,
    diet_types: ['mediterranean', 'plant_based', 'anti_inflammatory'],
    ingredients: [
      { name: 'Garbanzos cocidos', amount: 0.75, unit: 'taza' },
      { name: 'Pepino', amount: 0.5, unit: 'pza' },
      { name: 'Tomate cherry', amount: 8, unit: 'pzas' },
      { name: 'Cebolla morada', amount: 0.25, unit: 'pza' },
      { name: 'Aceitunas', amount: 6, unit: 'pzas' },
      { name: 'Aceite de oliva extra virgen', amount: 1, unit: 'cda' },
      { name: 'Limón', amount: 0.5, unit: 'pza' },
    ],
    instructions: [
      { step: 1, text: 'Pica pepino, tomate y cebolla en cubos.' },
      { step: 2, text: 'Mezcla con garbanzos y aceitunas.' },
      { step: 3, text: 'Aliña con aceite de oliva y limón. Sazona.' },
    ],
  },
  {
    name: 'Caldo de hueso con vegetales',
    description: 'Restaurador intestinal. Rico en colágeno, glicina y minerales.',
    category: 'dinner', tags: ['gut_healing', 'anti_inflammatory', 'collagen'],
    prep_time_min: 10, cook_time_min: 120, servings: 4,
    calories: 120, protein_g: 12, carbs_g: 8, fat_g: 4, fiber_g: 2,
    diet_types: ['anti_inflammatory', 'carnivore', 'balanced', 'keto'],
    ingredients: [
      { name: 'Huesos de res o pollo', amount: 500, unit: 'g' },
      { name: 'Apio', amount: 2, unit: 'tallos' },
      { name: 'Zanahoria', amount: 1, unit: 'pza' },
      { name: 'Cebolla', amount: 1, unit: 'pza' },
      { name: 'Vinagre de manzana', amount: 2, unit: 'cdas' },
      { name: 'Agua', amount: 2, unit: 'litros' },
    ],
    instructions: [
      { step: 1, text: 'Coloca huesos en olla con agua y vinagre.' },
      { step: 2, text: 'Agrega vegetales picados.' },
      { step: 3, text: 'Cocina a fuego bajo 2-4 horas (o 8h en slow cooker).' },
      { step: 4, text: 'Cuela y sirve caliente. Guarda el resto en porciones.' },
    ],
  },
  {
    name: 'Avena overnight con frutos rojos',
    description: 'Desayuno preparado la noche anterior. Fibra y antioxidantes.',
    category: 'breakfast', tags: ['high_fiber', 'antioxidant', 'meal_prep'],
    prep_time_min: 5, cook_time_min: 0, servings: 1,
    calories: 350, protein_g: 15, carbs_g: 48, fat_g: 12, fiber_g: 8,
    diet_types: ['balanced', 'plant_based'],
    ingredients: [
      { name: 'Avena en hojuelas', amount: 0.5, unit: 'taza' },
      { name: 'Leche de almendra', amount: 0.75, unit: 'taza' },
      { name: 'Yogurt griego', amount: 3, unit: 'cdas' },
      { name: 'Moras/fresas', amount: 0.5, unit: 'taza' },
      { name: 'Nueces', amount: 1, unit: 'cda' },
      { name: 'Semillas de chía', amount: 1, unit: 'cdita' },
    ],
    instructions: [
      { step: 1, text: 'Mezcla avena, leche, yogurt y chía en frasco.' },
      { step: 2, text: 'Refrigera toda la noche (mínimo 4 horas).' },
      { step: 3, text: 'Al servir, agrega frutos rojos y nueces.' },
    ],
  },
  {
    name: 'Tacos de lechuga con carne molida',
    description: 'Versión baja en carbos del clásico mexicano.',
    category: 'dinner', tags: ['low_carb', 'high_protein', 'keto_friendly'],
    prep_time_min: 10, cook_time_min: 12, servings: 2,
    calories: 380, protein_g: 32, carbs_g: 8, fat_g: 24, fiber_g: 3,
    diet_types: ['keto', 'low_carb', 'balanced'],
    ingredients: [
      { name: 'Carne molida de res (magra)', amount: 200, unit: 'g' },
      { name: 'Hojas de lechuga romana', amount: 6, unit: 'pzas' },
      { name: 'Aguacate', amount: 0.5, unit: 'pza' },
      { name: 'Tomate', amount: 1, unit: 'pza' },
      { name: 'Cebolla', amount: 0.25, unit: 'pza' },
      { name: 'Comino y chile en polvo', amount: 1, unit: 'al gusto' },
    ],
    instructions: [
      { step: 1, text: 'Dora la carne con cebolla, comino y chile.' },
      { step: 2, text: 'Prepara pico de gallo con tomate y cebolla.' },
      { step: 3, text: 'Sirve carne en hojas de lechuga con aguacate y pico.' },
    ],
  },
  {
    name: 'Salmón al horno con espárragos',
    description: 'Cena anti-inflamatoria. Omega 3 + fibra + antioxidantes.',
    category: 'dinner', tags: ['anti_inflammatory', 'omega3', 'high_protein'],
    prep_time_min: 5, cook_time_min: 18, servings: 1,
    calories: 420, protein_g: 36, carbs_g: 10, fat_g: 26, fiber_g: 4,
    diet_types: ['mediterranean', 'keto', 'anti_inflammatory'],
    ingredients: [
      { name: 'Filete de salmón', amount: 180, unit: 'g' },
      { name: 'Espárragos', amount: 8, unit: 'pzas' },
      { name: 'Aceite de oliva', amount: 1, unit: 'cda' },
      { name: 'Limón', amount: 0.5, unit: 'pza' },
      { name: 'Eneldo o romero', amount: 1, unit: 'al gusto' },
    ],
    instructions: [
      { step: 1, text: 'Precalienta horno a 200°C.' },
      { step: 2, text: 'Coloca salmón y espárragos en bandeja. Baña con aceite y limón.' },
      { step: 3, text: 'Hornea 15-18 minutos.' },
      { step: 4, text: 'Sirve con hierbas frescas.' },
    ],
  },
  {
    name: 'Snack: almendras + manzana + crema de almendra',
    description: 'Snack balanceado con grasas, fibra y carbos naturales.',
    category: 'snack', tags: ['balanced', 'quick', 'anti_inflammatory'],
    prep_time_min: 2, cook_time_min: 0, servings: 1,
    calories: 280, protein_g: 8, carbs_g: 25, fat_g: 18, fiber_g: 5,
    diet_types: ['balanced', 'mediterranean', 'plant_based'],
    ingredients: [
      { name: 'Manzana', amount: 1, unit: 'pza' },
      { name: 'Crema de almendra', amount: 2, unit: 'cdas' },
      { name: 'Almendras', amount: 10, unit: 'pzas' },
    ],
    instructions: [
      { step: 1, text: 'Corta la manzana en rebanadas.' },
      { step: 2, text: 'Unta crema de almendra o úsala como dip.' },
      { step: 3, text: 'Acompaña con almendras enteras.' },
    ],
  },
];

export async function seedRecipes(): Promise<number> {
  let count = 0;
  for (const r of RECIPES) {
    const { error } = await supabase.from('recipes').insert({
      ...r, created_by: ADMIN_UID, is_public: true,
    });
    if (!error) count++;
  }
  return count;
}

export { RECIPES };
