/**
 * Base de datos de aditivos alimentarios con clasificación de toxicidad.
 * 150+ entradas con datos precisos basados en consenso científico.
 * Incluye aditivos comunes en productos procesados mexicanos
 * (FEMSA, Bimbo, Lala, Herdez, La Costeña, Barcel, Gamesa, etc.)
 */

export interface Additive {
  code: string;
  name: string;
  nameES: string;
  toxicity: 'low' | 'medium' | 'high';
  type:
    | 'colorante'
    | 'conservador'
    | 'edulcorante'
    | 'antioxidante'
    | 'espesante'
    | 'emulsionante'
    | 'potenciador_sabor'
    | 'acidulante'
    | 'regulador'
    | 'gasificante'
    | 'humectante'
    | 'otros';
  risks: string;
  alternatives: string;
}

export const ADDITIVES_DB: Additive[] = [
  // ═══════════════════════════════════════════════════════════════
  // COLORANTES E100–E199
  // ═══════════════════════════════════════════════════════════════

  // --- LOW ---
  {
    code: 'E100',
    name: 'Curcumin',
    nameES: 'Curcumina',
    toxicity: 'low',
    type: 'colorante',
    risks: 'Sin riesgos significativos a dosis alimentarias. Propiedades antiinflamatorias documentadas.',
    alternatives: 'Cúrcuma natural en polvo.',
  },
  {
    code: 'E101',
    name: 'Riboflavin',
    nameES: 'Riboflavina (Vitamina B2)',
    toxicity: 'low',
    type: 'colorante',
    risks: 'Vitamina esencial. Sin riesgos conocidos a dosis alimentarias.',
    alternatives: 'Levadura nutricional, almendras.',
  },
  {
    code: 'E140',
    name: 'Chlorophyll',
    nameES: 'Clorofila',
    toxicity: 'low',
    type: 'colorante',
    risks: 'Pigmento vegetal natural. Sin riesgos conocidos.',
    alternatives: 'Espinaca o perejil en polvo.',
  },
  {
    code: 'E141',
    name: 'Copper chlorophyll',
    nameES: 'Clorofila cúprica',
    toxicity: 'low',
    type: 'colorante',
    risks: 'Derivado de clorofila con cobre. Seguro a dosis alimentarias normales.',
    alternatives: 'Extracto de espinaca, matcha.',
  },
  {
    code: 'E150a',
    name: 'Plain caramel',
    nameES: 'Caramelo natural',
    toxicity: 'low',
    type: 'colorante',
    risks: 'Azúcar caramelizado simple. Sin riesgos significativos.',
    alternatives: 'Melaza, piloncillo.',
  },
  {
    code: 'E160a',
    name: 'Beta-carotene',
    nameES: 'Beta-caroteno',
    toxicity: 'low',
    type: 'colorante',
    risks: 'Precursor de vitamina A. Seguro a dosis alimentarias.',
    alternatives: 'Zanahoria, camote, mango en polvo.',
  },
  {
    code: 'E160b',
    name: 'Annatto',
    nameES: 'Achiote (Annatto)',
    toxicity: 'low',
    type: 'colorante',
    risks: 'Colorante natural de semillas de achiote. Muy usado en cocina mexicana. Seguro.',
    alternatives: 'Pasta de achiote natural.',
  },
  {
    code: 'E160c',
    name: 'Capsanthin',
    nameES: 'Capsantina (Extracto de pimentón)',
    toxicity: 'low',
    type: 'colorante',
    risks: 'Pigmento natural del pimiento. Sin riesgos conocidos.',
    alternatives: 'Pimentón o paprika natural.',
  },
  {
    code: 'E161b',
    name: 'Lutein',
    nameES: 'Luteína',
    toxicity: 'low',
    type: 'colorante',
    risks: 'Carotenoide natural. Beneficioso para la salud ocular.',
    alternatives: 'Yema de huevo, espinaca, maíz.',
  },
  {
    code: 'E162',
    name: 'Beetroot red',
    nameES: 'Betanina (Rojo remolacha)',
    toxicity: 'low',
    type: 'colorante',
    risks: 'Pigmento natural de remolacha. Antioxidante. Puede colorear la orina (inofensivo).',
    alternatives: 'Jugo de betabel concentrado.',
  },
  {
    code: 'E163',
    name: 'Anthocyanins',
    nameES: 'Antocianinas',
    toxicity: 'low',
    type: 'colorante',
    risks: 'Pigmentos naturales de frutas/flores. Propiedades antioxidantes.',
    alternatives: 'Extracto de arándano, jamaica, maíz morado.',
  },
  {
    code: 'E170',
    name: 'Calcium carbonate',
    nameES: 'Carbonato de calcio',
    toxicity: 'low',
    type: 'colorante',
    risks: 'Mineral natural. Fuente de calcio. Sin riesgos a dosis normales.',
    alternatives: 'Cal natural (cal para tortillas).',
  },

  // --- MEDIUM ---
  {
    code: 'E104',
    name: 'Quinoline yellow',
    nameES: 'Amarillo de quinoleína',
    toxicity: 'medium',
    type: 'colorante',
    risks: 'Colorante sintético. Puede causar hiperactividad en niños. Prohibido en algunos países.',
    alternatives: 'Cúrcuma (E100), azafrán.',
  },
  {
    code: 'E150b',
    name: 'Caustic sulphite caramel',
    nameES: 'Caramelo de sulfito cáustico',
    toxicity: 'medium',
    type: 'colorante',
    risks: 'Procesado con sulfitos. Posible formación de subproductos indeseables.',
    alternatives: 'Caramelo natural (E150a), melaza.',
  },
  {
    code: 'E150c',
    name: 'Ammonia caramel',
    nameES: 'Caramelo amónico',
    toxicity: 'medium',
    type: 'colorante',
    risks: 'Puede contener 4-MEI (potencial carcinógeno). Usado en cervezas y salsas oscuras.',
    alternatives: 'Caramelo natural (E150a).',
  },
  {
    code: 'E150d',
    name: 'Sulphite ammonia caramel',
    nameES: 'Caramelo de sulfito amónico',
    toxicity: 'medium',
    type: 'colorante',
    risks: 'Contiene 4-MEI, clasificado como posible carcinógeno. Presente en refrescos de cola (Coca-Cola, Pepsi).',
    alternatives: 'Caramelo natural (E150a), colorantes de frutas.',
  },
  {
    code: 'E171',
    name: 'Titanium dioxide',
    nameES: 'Dióxido de titanio',
    toxicity: 'medium',
    type: 'colorante',
    risks: 'Prohibido en la UE desde 2022 por posible genotoxicidad. Nanopartículas pueden acumularse. Aún permitido en México.',
    alternatives: 'Almidón de arroz, carbonato de calcio.',
  },
  {
    code: 'E172',
    name: 'Iron oxides',
    nameES: 'Óxidos de hierro',
    toxicity: 'medium',
    type: 'colorante',
    risks: 'Generalmente seguro en dosis bajas. Posible acumulación de hierro en consumo excesivo.',
    alternatives: 'Cacao en polvo, carbón vegetal activado.',
  },

  // --- HIGH ---
  {
    code: 'E102',
    name: 'Tartrazine',
    nameES: 'Tartrazina (Amarillo 5)',
    toxicity: 'high',
    type: 'colorante',
    risks: 'Hiperactividad en niños (estudio Southampton). Reacciones alérgicas, asma. Muy común en productos Barcel y Gamesa.',
    alternatives: 'Cúrcuma, beta-caroteno, azafrán.',
  },
  {
    code: 'E110',
    name: 'Sunset yellow',
    nameES: 'Amarillo ocaso (Amarillo 6)',
    toxicity: 'high',
    type: 'colorante',
    risks: 'Hiperactividad en niños. Reacciones alérgicas cruzadas con aspirina. Presente en frituras y bebidas.',
    alternatives: 'Beta-caroteno, zanahoria, mango.',
  },
  {
    code: 'E120',
    name: 'Cochineal / Carmine',
    nameES: 'Cochinilla / Carmín',
    toxicity: 'high',
    type: 'colorante',
    risks: 'Derivado de insectos. Reacciones alérgicas graves (anafilaxis documentada). No apto para veganos.',
    alternatives: 'Betanina (remolacha), licopeno de tomate.',
  },
  {
    code: 'E122',
    name: 'Azorubine / Carmoisine',
    nameES: 'Azorrubina',
    toxicity: 'high',
    type: 'colorante',
    risks: 'Colorante azoico. Hiperactividad en niños. Posible carcinógeno. Prohibido en varios países.',
    alternatives: 'Jugo de betabel, extracto de fresa.',
  },
  {
    code: 'E123',
    name: 'Amaranth',
    nameES: 'Amaranto (Rojo 2)',
    toxicity: 'high',
    type: 'colorante',
    risks: 'Prohibido en EE.UU. por posible carcinogenicidad. Efectos teratogénicos en estudios animales.',
    alternatives: 'Betanina, antocianinas de jamaica.',
  },
  {
    code: 'E124',
    name: 'Ponceau 4R',
    nameES: 'Ponceau 4R (Rojo cochinilla A)',
    toxicity: 'high',
    type: 'colorante',
    risks: 'Hiperactividad en niños. Reacciones alérgicas. Común en embutidos mexicanos y dulces.',
    alternatives: 'Betanina, licopeno, extracto de hibisco.',
  },
  {
    code: 'E127',
    name: 'Erythrosine',
    nameES: 'Eritrosina (Rojo 3)',
    toxicity: 'high',
    type: 'colorante',
    risks: 'Disruptor tiroideo. Posible carcinógeno. La FDA propuso prohibirlo. Contiene yodo.',
    alternatives: 'Betanina, antocianinas naturales.',
  },
  {
    code: 'E129',
    name: 'Allura red',
    nameES: 'Rojo Allura (Red 40)',
    toxicity: 'high',
    type: 'colorante',
    risks: 'El colorante artificial más usado. Hiperactividad en niños. Posible promotor tumoral intestinal. Omnipresente en productos mexicanos.',
    alternatives: 'Betanina, extracto de pimentón, licopeno.',
  },
  {
    code: 'E131',
    name: 'Patent blue V',
    nameES: 'Azul patente V',
    toxicity: 'high',
    type: 'colorante',
    risks: 'Reacciones alérgicas y anafilaxis. Hiperactividad. Prohibido en varios países.',
    alternatives: 'Espirulina azul (ficocianina).',
  },
  {
    code: 'E132',
    name: 'Indigotine / Indigo carmine',
    nameES: 'Indigotina (Azul 2)',
    toxicity: 'high',
    type: 'colorante',
    risks: 'Posible promotor tumoral. Hiperactividad en niños. Náuseas e hipertensión en sensibles.',
    alternatives: 'Espirulina azul, extracto de col morada.',
  },
  {
    code: 'E133',
    name: 'Brilliant blue',
    nameES: 'Azul brillante (Blue 1)',
    toxicity: 'high',
    type: 'colorante',
    risks: 'Hiperactividad en niños. Puede cruzar la barrera hematoencefálica. Común en dulces y refrescos.',
    alternatives: 'Espirulina azul (ficocianina), gardenia.',
  },
  {
    code: 'E142',
    name: 'Green S',
    nameES: 'Verde S (Verde ácido brillante)',
    toxicity: 'high',
    type: 'colorante',
    risks: 'Colorante azoico sintético. Prohibido en Japón, EE.UU., Canadá y Noruega.',
    alternatives: 'Clorofila, matcha, espirulina.',
  },
  {
    code: 'E151',
    name: 'Brilliant black BN',
    nameES: 'Negro brillante BN',
    toxicity: 'high',
    type: 'colorante',
    risks: 'Colorante azoico. Hiperactividad. Prohibido en EE.UU., Canadá, Japón.',
    alternatives: 'Carbón vegetal activado, cacao negro.',
  },
  {
    code: 'E155',
    name: 'Brown HT',
    nameES: 'Marrón HT (Pardo chocolate)',
    toxicity: 'high',
    type: 'colorante',
    risks: 'Colorante azoico. Reacciones alérgicas, hiperactividad. Prohibido en varios países.',
    alternatives: 'Cacao en polvo, caramelo natural.',
  },

  // ═══════════════════════════════════════════════════════════════
  // CONSERVADORES E200–E299
  // ═══════════════════════════════════════════════════════════════

  // --- LOW ---
  {
    code: 'E200',
    name: 'Sorbic acid',
    nameES: 'Ácido sórbico',
    toxicity: 'low',
    type: 'conservador',
    risks: 'Conservador relativamente seguro. Puede causar irritación cutánea en sensibles.',
    alternatives: 'Extracto de romero, vitamina E.',
  },
  {
    code: 'E202',
    name: 'Potassium sorbate',
    nameES: 'Sorbato de potasio',
    toxicity: 'low',
    type: 'conservador',
    risks: 'Uno de los conservadores más seguros. Raramente causa reacciones alérgicas leves.',
    alternatives: 'Extracto de romero, vinagre.',
  },
  {
    code: 'E260',
    name: 'Acetic acid',
    nameES: 'Ácido acético (Vinagre)',
    toxicity: 'low',
    type: 'conservador',
    risks: 'Componente natural del vinagre. Seguro a dosis alimentarias.',
    alternatives: 'Vinagre de manzana natural.',
  },
  {
    code: 'E270',
    name: 'Lactic acid',
    nameES: 'Ácido láctico',
    toxicity: 'low',
    type: 'conservador',
    risks: 'Producido naturalmente por fermentación. Sin riesgos conocidos.',
    alternatives: 'Fermentación natural (lactofermentación).',
  },
  {
    code: 'E280',
    name: 'Propionic acid',
    nameES: 'Ácido propiónico',
    toxicity: 'low',
    type: 'conservador',
    risks: 'Presente naturalmente en quesos. Generalmente seguro. Usado en pan Bimbo.',
    alternatives: 'Masa madre (inhibe moho naturalmente).',
  },
  {
    code: 'E281',
    name: 'Sodium propionate',
    nameES: 'Propionato de sodio',
    toxicity: 'low',
    type: 'conservador',
    risks: 'Antimoho común en pan industrializado. Estudios sugieren posible efecto en comportamiento en dosis altas.',
    alternatives: 'Pan artesanal con masa madre.',
  },
  {
    code: 'E282',
    name: 'Calcium propionate',
    nameES: 'Propionato de calcio',
    toxicity: 'low',
    type: 'conservador',
    risks: 'Ampliamente usado en pan Bimbo y similares. Generalmente seguro, pero estudios lo vinculan a irritabilidad en niños.',
    alternatives: 'Masa madre, vinagre en la masa.',
  },
  {
    code: 'E290',
    name: 'Carbon dioxide',
    nameES: 'Dióxido de carbono (CO2)',
    toxicity: 'low',
    type: 'conservador',
    risks: 'Gas natural. Usado en bebidas carbonatadas. Sin riesgos propios (la carbonatación sí puede causar hinchazón).',
    alternatives: 'Agua mineral con gas natural.',
  },
  {
    code: 'E296',
    name: 'Malic acid',
    nameES: 'Ácido málico',
    toxicity: 'low',
    type: 'conservador',
    risks: 'Presente naturalmente en manzanas. Sin riesgos conocidos.',
    alternatives: 'Jugo de manzana verde concentrado.',
  },
  {
    code: 'E297',
    name: 'Fumaric acid',
    nameES: 'Ácido fumárico',
    toxicity: 'low',
    type: 'conservador',
    risks: 'Ocurre naturalmente en frutas. Generalmente seguro.',
    alternatives: 'Ácido cítrico, jugo de limón.',
  },

  // --- MEDIUM ---
  {
    code: 'E210',
    name: 'Benzoic acid',
    nameES: 'Ácido benzoico',
    toxicity: 'medium',
    type: 'conservador',
    risks: 'Con vitamina C puede formar benceno (carcinógeno). Asma y urticaria en sensibles. Común en salsas y refrescos mexicanos.',
    alternatives: 'Sorbato de potasio, extracto de romero.',
  },
  {
    code: 'E211',
    name: 'Sodium benzoate',
    nameES: 'Benzoato de sodio',
    toxicity: 'medium',
    type: 'conservador',
    risks: 'Forma benceno con ácido ascórbico. Hiperactividad en niños. Muy común en refrescos FEMSA y jugos.',
    alternatives: 'Sorbato de potasio, pasteurización.',
  },
  {
    code: 'E212',
    name: 'Potassium benzoate',
    nameES: 'Benzoato de potasio',
    toxicity: 'medium',
    type: 'conservador',
    risks: 'Mismos riesgos que benzoato de sodio. Puede formar benceno con vitamina C.',
    alternatives: 'Sorbato de potasio.',
  },
  {
    code: 'E213',
    name: 'Calcium benzoate',
    nameES: 'Benzoato de calcio',
    toxicity: 'medium',
    type: 'conservador',
    risks: 'Similar a otros benzoatos. Posible formación de benceno con ácido ascórbico.',
    alternatives: 'Sorbato de potasio.',
  },
  {
    code: 'E220',
    name: 'Sulphur dioxide',
    nameES: 'Dióxido de azufre',
    toxicity: 'medium',
    type: 'conservador',
    risks: 'Asmáticos altamente sensibles. Destruye vitamina B1. Común en vinos y frutas secas.',
    alternatives: 'Ácido ascórbico, liofilización.',
  },
  {
    code: 'E221',
    name: 'Sodium sulphite',
    nameES: 'Sulfito de sodio',
    toxicity: 'medium',
    type: 'conservador',
    risks: 'Reacciones asmáticas en 5-10% de asmáticos. Destruye tiamina (B1). Dolor de cabeza.',
    alternatives: 'Vitamina C, extracto de romero.',
  },
  {
    code: 'E223',
    name: 'Sodium metabisulphite',
    nameES: 'Metabisulfito de sodio',
    toxicity: 'medium',
    type: 'conservador',
    risks: 'Potente alérgeno para asmáticos. Usado en camarones, vino y fruta seca mexicana.',
    alternatives: 'Congelación rápida, ácido cítrico.',
  },
  {
    code: 'E224',
    name: 'Potassium metabisulphite',
    nameES: 'Metabisulfito de potasio',
    toxicity: 'medium',
    type: 'conservador',
    risks: 'Similar a E223. Ataques de asma en personas sensibles.',
    alternatives: 'Ácido ascórbico, pasteurización.',
  },
  {
    code: 'E228',
    name: 'Potassium hydrogen sulphite',
    nameES: 'Bisulfito de potasio',
    toxicity: 'medium',
    type: 'conservador',
    risks: 'Sulfito que puede desencadenar asma. Destruye vitamina B1.',
    alternatives: 'Ácido cítrico, pasteurización.',
  },
  {
    code: 'E234',
    name: 'Nisin',
    nameES: 'Nisina',
    toxicity: 'medium',
    type: 'conservador',
    risks: 'Antibiótico natural. Preocupación por resistencia bacteriana con uso excesivo.',
    alternatives: 'Lactoferrina, extracto de ajo.',
  },
  {
    code: 'E235',
    name: 'Natamycin',
    nameES: 'Natamicina (Pimaricina)',
    toxicity: 'medium',
    type: 'conservador',
    risks: 'Antifúngico. Preocupación por resistencia antimicrobiana. Usado en quesos Lala y embutidos.',
    alternatives: 'Aceite de mostaza, extracto de canela.',
  },

  // --- HIGH ---
  {
    code: 'E249',
    name: 'Potassium nitrite',
    nameES: 'Nitrito de potasio',
    toxicity: 'high',
    type: 'conservador',
    risks: 'Forma nitrosaminas carcinógenas (Grupo 1 IARC). Vinculado a cáncer colorrectal. Usado en jamones y salchichas.',
    alternatives: 'Extracto de apio, cultivos protectores.',
  },
  {
    code: 'E250',
    name: 'Sodium nitrite',
    nameES: 'Nitrito de sodio',
    toxicity: 'high',
    type: 'conservador',
    risks: 'Forma nitrosaminas (carcinógeno Grupo 1 IARC). Omnipresente en embutidos mexicanos (FUD, Kir, Iberomex).',
    alternatives: 'Extracto de apio, jugo de betabel, especias.',
  },
  {
    code: 'E251',
    name: 'Sodium nitrate',
    nameES: 'Nitrato de sodio',
    toxicity: 'high',
    type: 'conservador',
    risks: 'Se convierte en nitrito en el cuerpo. Carcinógeno en carnes procesadas. Metahemoglobinemia en lactantes.',
    alternatives: 'Extracto de apio, vinagre, sal marina.',
  },
  {
    code: 'E252',
    name: 'Potassium nitrate',
    nameES: 'Nitrato de potasio',
    toxicity: 'high',
    type: 'conservador',
    risks: 'Se convierte en nitritos. Carnes curadas lo contienen. Riesgo de cáncer gástrico y colorrectal.',
    alternatives: 'Extracto de apio, cultivos bioprotectores.',
  },
  {
    code: 'E284',
    name: 'Boric acid',
    nameES: 'Ácido bórico',
    toxicity: 'high',
    type: 'conservador',
    risks: 'Tóxico acumulativo. Afecta fertilidad y desarrollo. Prohibido en muchos países. Aún usado en caviar.',
    alternatives: 'Refrigeración, sal, ácido cítrico.',
  },

  // ═══════════════════════════════════════════════════════════════
  // ANTIOXIDANTES E300–E399
  // ═══════════════════════════════════════════════════════════════

  // --- LOW ---
  {
    code: 'E300',
    name: 'Ascorbic acid',
    nameES: 'Ácido ascórbico (Vitamina C)',
    toxicity: 'low',
    type: 'antioxidante',
    risks: 'Vitamina esencial. Seguro. Precaución: con benzoatos puede formar benceno.',
    alternatives: 'Jugo de limón, acerola, camu camu.',
  },
  {
    code: 'E301',
    name: 'Sodium ascorbate',
    nameES: 'Ascorbato de sodio',
    toxicity: 'low',
    type: 'antioxidante',
    risks: 'Forma de vitamina C. Sin riesgos conocidos a dosis alimentarias.',
    alternatives: 'Jugo de limón, polvo de acerola.',
  },
  {
    code: 'E302',
    name: 'Calcium ascorbate',
    nameES: 'Ascorbato de calcio',
    toxicity: 'low',
    type: 'antioxidante',
    risks: 'Vitamina C con calcio. Sin riesgos conocidos.',
    alternatives: 'Jugo de cítricos naturales.',
  },
  {
    code: 'E304',
    name: 'Ascorbyl palmitate',
    nameES: 'Palmitato de ascorbilo',
    toxicity: 'low',
    type: 'antioxidante',
    risks: 'Éster de vitamina C. Soluble en grasa. Generalmente seguro.',
    alternatives: 'Extracto de romero, tocoferoles.',
  },
  {
    code: 'E306',
    name: 'Tocopherol-rich extract',
    nameES: 'Extracto rico en tocoferoles (Vitamina E)',
    toxicity: 'low',
    type: 'antioxidante',
    risks: 'Vitamina E natural. Antioxidante beneficioso. Sin riesgos a dosis alimentarias.',
    alternatives: 'Aceite de germen de trigo, aceite de oliva.',
  },
  {
    code: 'E307',
    name: 'Alpha-tocopherol',
    nameES: 'Alfa-tocoferol (Vitamina E)',
    toxicity: 'low',
    type: 'antioxidante',
    risks: 'Forma más activa de vitamina E. Seguro como aditivo.',
    alternatives: 'Aceite de girasol prensado en frío.',
  },
  {
    code: 'E308',
    name: 'Gamma-tocopherol',
    nameES: 'Gamma-tocoferol',
    toxicity: 'low',
    type: 'antioxidante',
    risks: 'Forma de vitamina E presente en aceites. Sin riesgos.',
    alternatives: 'Aceite de soya prensado en frío.',
  },
  {
    code: 'E309',
    name: 'Delta-tocopherol',
    nameES: 'Delta-tocoferol',
    toxicity: 'low',
    type: 'antioxidante',
    risks: 'Forma de vitamina E. Antioxidante natural seguro.',
    alternatives: 'Aceites vegetales prensados en frío.',
  },
  {
    code: 'E322',
    name: 'Lecithin',
    nameES: 'Lecitina (soya/girasol)',
    toxicity: 'low',
    type: 'antioxidante',
    risks: 'Natural. Muy usado en chocolate (Nestlé, Carlos V). Precaución si hay alergia a soya.',
    alternatives: 'Lecitina de girasol (sin alérgeno soya).',
  },
  {
    code: 'E330',
    name: 'Citric acid',
    nameES: 'Ácido cítrico',
    toxicity: 'low',
    type: 'antioxidante',
    risks: 'Presente naturalmente en cítricos. Puede erosionar esmalte dental en exceso. Muy usado en industria mexicana.',
    alternatives: 'Jugo de limón, jugo de naranja.',
  },
  {
    code: 'E331',
    name: 'Sodium citrate',
    nameES: 'Citrato de sodio',
    toxicity: 'low',
    type: 'antioxidante',
    risks: 'Sal del ácido cítrico. Regulador de pH. Sin riesgos significativos.',
    alternatives: 'Jugo de limón con bicarbonato.',
  },
  {
    code: 'E332',
    name: 'Potassium citrate',
    nameES: 'Citrato de potasio',
    toxicity: 'low',
    type: 'antioxidante',
    risks: 'Regulador de acidez seguro. Fuente de potasio.',
    alternatives: 'Jugo de limón.',
  },
  {
    code: 'E334',
    name: 'Tartaric acid',
    nameES: 'Ácido tartárico',
    toxicity: 'low',
    type: 'antioxidante',
    risks: 'Natural en uvas. Sin riesgos a dosis alimentarias.',
    alternatives: 'Cremor tártaro natural, jugo de uva.',
  },
  {
    code: 'E375',
    name: 'Niacin',
    nameES: 'Niacina (Vitamina B3)',
    toxicity: 'low',
    type: 'antioxidante',
    risks: 'Vitamina esencial. Seguro a dosis alimentarias. Rubor facial (flush) en dosis altas.',
    alternatives: 'Levadura nutricional, maní.',
  },

  // --- MEDIUM ---
  {
    code: 'E310',
    name: 'Propyl gallate',
    nameES: 'Galato de propilo',
    toxicity: 'medium',
    type: 'antioxidante',
    risks: 'Posible disruptor endocrino. Reacciones alérgicas en sensibles. Usado en aceites y grasas.',
    alternatives: 'Tocoferoles (vitamina E), extracto de romero.',
  },
  {
    code: 'E338',
    name: 'Phosphoric acid',
    nameES: 'Ácido fosfórico',
    toxicity: 'medium',
    type: 'acidulante',
    risks: 'Reduce absorción de calcio, favorece osteoporosis. Principal acidulante en Coca-Cola y Pepsi.',
    alternatives: 'Ácido cítrico, ácido málico.',
  },
  {
    code: 'E339',
    name: 'Sodium phosphate',
    nameES: 'Fosfato de sodio',
    toxicity: 'medium',
    type: 'regulador',
    risks: 'Exceso de fósforo daña riñones y calcificación vascular. Muy usado en alimentos procesados.',
    alternatives: 'Citrato de sodio.',
  },
  {
    code: 'E385',
    name: 'Calcium disodium EDTA',
    nameES: 'EDTA cálcico disódico',
    toxicity: 'medium',
    type: 'antioxidante',
    risks: 'Quelante de minerales. Puede reducir absorción de hierro y zinc. Común en mayonesas y aderezos.',
    alternatives: 'Ácido cítrico, ácido ascórbico.',
  },

  // --- HIGH ---
  {
    code: 'E319',
    name: 'TBHQ',
    nameES: 'TBHQ (Terbutil hidroquinona)',
    toxicity: 'high',
    type: 'antioxidante',
    risks: 'Posible carcinógeno. Náuseas, visión borrosa en dosis altas. Común en aceites de frituras y productos Sabritas.',
    alternatives: 'Extracto de romero, tocoferoles.',
  },
  {
    code: 'E320',
    name: 'BHA',
    nameES: 'BHA (Butilhidroxianisol)',
    toxicity: 'high',
    type: 'antioxidante',
    risks: 'Posible carcinógeno (IARC Grupo 2B). Disruptor endocrino. Muy usado en cereales, frituras y chicles.',
    alternatives: 'Extracto de romero, vitamina E.',
  },
  {
    code: 'E321',
    name: 'BHT',
    nameES: 'BHT (Butilhidroxitolueno)',
    toxicity: 'high',
    type: 'antioxidante',
    risks: 'Posible disruptor endocrino y promotor tumoral. Común en cereales y snacks mexicanos (Kellogg\'s, Gamesa).',
    alternatives: 'Extracto de romero, tocoferoles naturales.',
  },

  // ═══════════════════════════════════════════════════════════════
  // ESPESANTES / ESTABILIZANTES / EMULSIONANTES E400–E499
  // ═══════════════════════════════════════════════════════════════

  // --- LOW ---
  {
    code: 'E400',
    name: 'Alginic acid',
    nameES: 'Ácido algínico',
    toxicity: 'low',
    type: 'espesante',
    risks: 'Derivado de algas. Sin riesgos conocidos. Puede reducir absorción de minerales en exceso.',
    alternatives: 'Agar-agar, semillas de chía.',
  },
  {
    code: 'E401',
    name: 'Sodium alginate',
    nameES: 'Alginato de sodio',
    toxicity: 'low',
    type: 'espesante',
    risks: 'Derivado de algas marinas. Seguro. Usado en helados y postres.',
    alternatives: 'Agar-agar, pectina de frutas.',
  },
  {
    code: 'E406',
    name: 'Agar',
    nameES: 'Agar-agar',
    toxicity: 'low',
    type: 'espesante',
    risks: 'Gelatina vegetal de algas. Sin riesgos. Prebiótico suave.',
    alternatives: 'Grenetina natural, pectina.',
  },
  {
    code: 'E410',
    name: 'Locust bean gum',
    nameES: 'Goma de garrofín (algarrobo)',
    toxicity: 'low',
    type: 'espesante',
    risks: 'Fibra soluble natural. Sin riesgos conocidos. Puede causar gases en exceso.',
    alternatives: 'Harina de linaza, almidón de maíz.',
  },
  {
    code: 'E412',
    name: 'Guar gum',
    nameES: 'Goma guar',
    toxicity: 'low',
    type: 'espesante',
    risks: 'Fibra soluble de leguminosa. Seguro. Puede causar hinchazón en cantidades grandes.',
    alternatives: 'Semillas de chía, psyllium.',
  },
  {
    code: 'E414',
    name: 'Gum arabic',
    nameES: 'Goma arábiga',
    toxicity: 'low',
    type: 'espesante',
    risks: 'Exudado natural de acacia. Prebiótico. Sin riesgos conocidos.',
    alternatives: 'Pectina, almidón de tapioca.',
  },
  {
    code: 'E415',
    name: 'Xanthan gum',
    nameES: 'Goma xantana',
    toxicity: 'low',
    type: 'espesante',
    risks: 'Producida por fermentación. Seguro. Puede causar gases. Muy común en aderezos y salsas.',
    alternatives: 'Semillas de chía molidas, psyllium.',
  },
  {
    code: 'E418',
    name: 'Gellan gum',
    nameES: 'Goma gellan',
    toxicity: 'low',
    type: 'espesante',
    risks: 'Polisacárido bacteriano. Sin riesgos significativos documentados.',
    alternatives: 'Agar-agar, pectina.',
  },
  {
    code: 'E440',
    name: 'Pectin',
    nameES: 'Pectina',
    toxicity: 'low',
    type: 'espesante',
    risks: 'Fibra soluble natural de frutas. Beneficiosa para la digestión.',
    alternatives: 'Semillas de chía, cáscara de manzana.',
  },
  {
    code: 'E460',
    name: 'Cellulose',
    nameES: 'Celulosa microcristalina',
    toxicity: 'low',
    type: 'espesante',
    risks: 'Fibra vegetal. No digerible. Sin riesgos conocidos. Usado como antiapelmazante.',
    alternatives: 'Harina de arroz, almidón de tapioca.',
  },
  {
    code: 'E461',
    name: 'Methyl cellulose',
    nameES: 'Metilcelulosa',
    toxicity: 'low',
    type: 'espesante',
    risks: 'Derivado de celulosa. Generalmente seguro. Efecto laxante en dosis altas.',
    alternatives: 'Psyllium, agar-agar.',
  },

  // --- MEDIUM ---
  {
    code: 'E407',
    name: 'Carrageenan',
    nameES: 'Carragenina',
    toxicity: 'medium',
    type: 'espesante',
    risks: 'Inflamación intestinal en estudios animales. Posible promotor de colitis. Muy usada en leches Lala y Alpura.',
    alternatives: 'Goma guar, goma xantana, agar-agar.',
  },
  {
    code: 'E407a',
    name: 'Processed eucheuma seaweed',
    nameES: 'Alga eucheuma procesada (PES)',
    toxicity: 'medium',
    type: 'espesante',
    risks: 'Similar a carragenina. Posible inflamación intestinal. Menos procesada que E407.',
    alternatives: 'Agar-agar, pectina.',
  },
  {
    code: 'E431',
    name: 'Polyoxyethylene stearate',
    nameES: 'Polioxietileno estearato',
    toxicity: 'medium',
    type: 'emulsionante',
    risks: 'Emulsionante sintético. Puede contener residuos de óxido de etileno (carcinógeno).',
    alternatives: 'Lecitina de girasol.',
  },
  {
    code: 'E433',
    name: 'Polysorbate 80',
    nameES: 'Polisorbato 80 (Tween 80)',
    toxicity: 'medium',
    type: 'emulsionante',
    risks: 'Puede alterar microbiota intestinal y barrera intestinal. Promotor de inflamación en estudios animales.',
    alternatives: 'Lecitina de girasol, yema de huevo.',
  },
  {
    code: 'E435',
    name: 'Polysorbate 60',
    nameES: 'Polisorbato 60',
    toxicity: 'medium',
    type: 'emulsionante',
    risks: 'Similar a polisorbato 80. Puede contener residuos de 1,4-dioxano.',
    alternatives: 'Lecitina, mono/diglicéridos naturales.',
  },
  {
    code: 'E436',
    name: 'Polysorbate 65',
    nameES: 'Polisorbato 65',
    toxicity: 'medium',
    type: 'emulsionante',
    risks: 'Emulsionante sintético. Posible alteración de microbiota intestinal.',
    alternatives: 'Lecitina de girasol.',
  },
  {
    code: 'E466',
    name: 'Carboxymethyl cellulose',
    nameES: 'Carboximetilcelulosa (CMC)',
    toxicity: 'medium',
    type: 'espesante',
    risks: 'Puede alterar microbiota intestinal y promover inflamación. Estudios en Nature lo vinculan a síndrome metabólico.',
    alternatives: 'Goma guar, pectina, almidón natural.',
  },
  {
    code: 'E471',
    name: 'Mono- and diglycerides',
    nameES: 'Mono y diglicéridos de ácidos grasos',
    toxicity: 'medium',
    type: 'emulsionante',
    risks: 'Pueden contener grasas trans residuales. Muy común en pan industrial, helados y margarinas.',
    alternatives: 'Lecitina de girasol, yema de huevo.',
  },
  {
    code: 'E472e',
    name: 'DATEM',
    nameES: 'DATEM (Ésteres diacetil tartáricos)',
    toxicity: 'medium',
    type: 'emulsionante',
    risks: 'Acondicionador de masa. Generalmente seguro pero procesado químicamente. Omnipresente en pan Bimbo.',
    alternatives: 'Masa madre, gluten natural.',
  },

  // --- HIGH ---
  {
    code: 'E476',
    name: 'PGPR',
    nameES: 'PGPR (Polirricinoleato de poliglicerol)',
    toxicity: 'high',
    type: 'emulsionante',
    risks: 'Reduce costos del cacao. Estudios muestran agrandamiento hepático en animales. Común en chocolates baratos.',
    alternatives: 'Manteca de cacao adicional, lecitina.',
  },

  // ═══════════════════════════════════════════════════════════════
  // REGULADORES DE ACIDEZ, SALES, GASIFICANTES E500–E599
  // ═══════════════════════════════════════════════════════════════

  {
    code: 'E500',
    name: 'Sodium bicarbonate',
    nameES: 'Bicarbonato de sodio',
    toxicity: 'low',
    type: 'gasificante',
    risks: 'Seguro. Ingrediente de repostería tradicional. Exceso puede causar alcalosis.',
    alternatives: 'Levadura natural.',
  },
  {
    code: 'E501',
    name: 'Potassium carbonate',
    nameES: 'Carbonato de potasio',
    toxicity: 'low',
    type: 'gasificante',
    risks: 'Generalmente seguro. Usado en cacao holandés y galletas.',
    alternatives: 'Bicarbonato de sodio.',
  },
  {
    code: 'E503',
    name: 'Ammonium carbonate',
    nameES: 'Carbonato de amonio',
    toxicity: 'low',
    type: 'gasificante',
    risks: 'Leudante tradicional. Se evapora al hornear. Sin riesgos en producto final.',
    alternatives: 'Bicarbonato de sodio, polvo para hornear.',
  },
  {
    code: 'E504',
    name: 'Magnesium carbonate',
    nameES: 'Carbonato de magnesio',
    toxicity: 'low',
    type: 'regulador',
    risks: 'Antiapelmazante. Fuente de magnesio. Sin riesgos significativos.',
    alternatives: 'Almidón de arroz.',
  },
  {
    code: 'E508',
    name: 'Potassium chloride',
    nameES: 'Cloruro de potasio',
    toxicity: 'low',
    type: 'regulador',
    risks: 'Sustituto de sal. Seguro para mayoría. Precaución en enfermedad renal.',
    alternatives: 'Sal marina en menor cantidad, especias.',
  },
  {
    code: 'E509',
    name: 'Calcium chloride',
    nameES: 'Cloruro de calcio',
    toxicity: 'low',
    type: 'regulador',
    risks: 'Usado para dar firmeza a frutas enlatadas. Fuente de calcio. Sin riesgos significativos.',
    alternatives: 'Cal (hidróxido de calcio) en pequeñas dosis.',
  },
  {
    code: 'E516',
    name: 'Calcium sulphate',
    nameES: 'Sulfato de calcio (yeso)',
    toxicity: 'low',
    type: 'regulador',
    risks: 'Coagulante de tofu. Fuente de calcio. Seguro a dosis alimentarias.',
    alternatives: 'Nigari (cloruro de magnesio).',
  },
  {
    code: 'E524',
    name: 'Sodium hydroxide',
    nameES: 'Hidróxido de sodio (sosa)',
    toxicity: 'low',
    type: 'regulador',
    risks: 'Usado en procesamiento (pretzel, aceitunas, nixtamalización). Neutralizado en producto final. Seguro.',
    alternatives: 'Cal (para nixtamal), sin alternativa directa.',
  },
  {
    code: 'E526',
    name: 'Calcium hydroxide',
    nameES: 'Hidróxido de calcio (Cal)',
    toxicity: 'low',
    type: 'regulador',
    risks: 'Esencial en nixtamalización del maíz mexicano. Aporta calcio. Tradición milenaria.',
    alternatives: 'Sin alternativa para nixtamal; ceniza de madera (método ancestral).',
  },
  {
    code: 'E551',
    name: 'Silicon dioxide',
    nameES: 'Dióxido de silicio',
    toxicity: 'low',
    type: 'otros',
    risks: 'Antiapelmazante. Generalmente seguro. Preocupación emergente por nanopartículas.',
    alternatives: 'Almidón de maíz, harina de arroz.',
  },
  {
    code: 'E553',
    name: 'Talc',
    nameES: 'Talco (Silicato de magnesio)',
    toxicity: 'medium',
    type: 'otros',
    risks: 'Posible contaminación con asbesto. IARC lo clasifica como posible carcinógeno en ciertas formas.',
    alternatives: 'Almidón de maíz, celulosa.',
  },
  {
    code: 'E554',
    name: 'Sodium aluminium silicate',
    nameES: 'Silicato de sodio y aluminio',
    toxicity: 'medium',
    type: 'otros',
    risks: 'Contiene aluminio. Posible neurotoxicidad acumulativa. Usado como antiapelmazante.',
    alternatives: 'Dióxido de silicio (E551), almidón de maíz.',
  },

  // ═══════════════════════════════════════════════════════════════
  // POTENCIADORES DE SABOR E600–E699
  // ═══════════════════════════════════════════════════════════════

  {
    code: 'E620',
    name: 'Glutamic acid',
    nameES: 'Ácido glutámico',
    toxicity: 'low',
    type: 'potenciador_sabor',
    risks: 'Aminoácido natural presente en tomate, queso parmesano. Sin riesgos en forma natural.',
    alternatives: 'Tomate seco, alga kombu, salsa de soya natural.',
  },
  {
    code: 'E621',
    name: 'Monosodium glutamate',
    nameES: 'Glutamato monosódico (MSG)',
    toxicity: 'medium',
    type: 'potenciador_sabor',
    risks: 'Síndrome del restaurante chino (controversia). Excitotoxina en dosis altas. Omnipresente en sopas Maruchan, Knorr, Sabritas.',
    alternatives: 'Levadura nutricional, hongos secos, alga kombu.',
  },
  {
    code: 'E622',
    name: 'Monopotassium glutamate',
    nameES: 'Glutamato monopotásico',
    toxicity: 'medium',
    type: 'potenciador_sabor',
    risks: 'Similar al MSG. Mismas preocupaciones sobre excitotoxicidad.',
    alternatives: 'Levadura nutricional, tomate deshidratado.',
  },
  {
    code: 'E627',
    name: 'Disodium guanylate',
    nameES: 'Guanilato disódico (GMP)',
    toxicity: 'medium',
    type: 'potenciador_sabor',
    risks: 'Potenciador de sabor. Derivado de purinas; evitar en gota. Sinergista del MSG.',
    alternatives: 'Extracto de hongos shiitake.',
  },
  {
    code: 'E631',
    name: 'Disodium inosinate',
    nameES: 'Inosinato disódico (IMP)',
    toxicity: 'medium',
    type: 'potenciador_sabor',
    risks: 'Derivado de purinas. Contraindicado en gota y ácido úrico elevado. Sinergista del MSG.',
    alternatives: 'Caldo de hueso, extracto de hongos.',
  },
  {
    code: 'E635',
    name: 'Disodium ribonucleotides',
    nameES: 'Ribonucleótidos disódicos',
    toxicity: 'medium',
    type: 'potenciador_sabor',
    risks: 'Mezcla de E627 y E631. Evitar en gota. Puede causar reacciones en asmáticos.',
    alternatives: 'Salsa de soya naturalmente fermentada, miso.',
  },
  {
    code: 'E636',
    name: 'Maltol',
    nameES: 'Maltol',
    toxicity: 'medium',
    type: 'potenciador_sabor',
    risks: 'Potenciador de dulzor. Posible quelante de aluminio, aumentando su absorción.',
    alternatives: 'Vainilla natural, canela.',
  },

  // ═══════════════════════════════════════════════════════════════
  // EDULCORANTES E900–E999 + E420/E421
  // ═══════════════════════════════════════════════════════════════

  // --- LOW ---
  {
    code: 'E960',
    name: 'Steviol glycosides',
    nameES: 'Glucósidos de esteviol (Stevia)',
    toxicity: 'low',
    type: 'edulcorante',
    risks: 'Edulcorante natural de la planta stevia. Sin calorías. Seguro según FDA y EFSA.',
    alternatives: 'Hojas de stevia frescas o secas.',
  },
  {
    code: 'E967',
    name: 'Xylitol',
    nameES: 'Xilitol',
    toxicity: 'low',
    type: 'edulcorante',
    risks: 'Poliol natural. Previene caries. Efecto laxante en exceso (>30g). Tóxico para perros.',
    alternatives: 'Eritritol, miel de abeja en moderación.',
  },
  {
    code: 'E968',
    name: 'Erythritol',
    nameES: 'Eritritol',
    toxicity: 'low',
    type: 'edulcorante',
    risks: 'Poliol con cero calorías. Bien tolerado. Un estudio 2023 sugiere posible riesgo cardiovascular (requiere más investigación).',
    alternatives: 'Stevia, fruta del monje (monk fruit).',
  },
  {
    code: 'E953',
    name: 'Isomalt',
    nameES: 'Isomaltosa',
    toxicity: 'low',
    type: 'edulcorante',
    risks: 'Poliol de bajo índice glucémico. Efecto laxante en exceso. Generalmente seguro.',
    alternatives: 'Eritritol, stevia.',
  },
  {
    code: 'E966',
    name: 'Lactitol',
    nameES: 'Lactitol',
    toxicity: 'low',
    type: 'edulcorante',
    risks: 'Derivado de lactosa. Prebiótico suave. Efecto laxante en dosis altas.',
    alternatives: 'Eritritol, stevia.',
  },

  // --- MEDIUM ---
  {
    code: 'E955',
    name: 'Sucralose',
    nameES: 'Sucralosa',
    toxicity: 'medium',
    type: 'edulcorante',
    risks: 'Estudios recientes sugieren alteración de microbiota y respuesta insulínica. Al calentarse puede generar cloropropanoles. Usado en Splenda.',
    alternatives: 'Stevia, eritritol, fruta del monje.',
  },
  {
    code: 'E420',
    name: 'Sorbitol',
    nameES: 'Sorbitol',
    toxicity: 'medium',
    type: 'edulcorante',
    risks: 'Efecto laxante significativo. Intolerancia común (FODMAP). Puede agravar SII.',
    alternatives: 'Eritritol, stevia.',
  },
  {
    code: 'E421',
    name: 'Mannitol',
    nameES: 'Manitol',
    toxicity: 'medium',
    type: 'edulcorante',
    risks: 'Efecto laxante fuerte. Puede causar hinchazón y diarrea. FODMAP.',
    alternatives: 'Eritritol, stevia.',
  },
  {
    code: 'E965',
    name: 'Maltitol',
    nameES: 'Maltitol',
    toxicity: 'medium',
    type: 'edulcorante',
    risks: 'Índice glucémico moderado (35). Efecto laxante notable. Engañoso en etiquetas "sin azúcar". Común en chocolates "dietéticos".',
    alternatives: 'Eritritol, stevia, chocolate con cacao >70%.',
  },

  // --- HIGH ---
  {
    code: 'E950',
    name: 'Acesulfame potassium',
    nameES: 'Acesulfame K (Ace-K)',
    toxicity: 'high',
    type: 'edulcorante',
    risks: 'Posible carcinógeno según CSPI. Contiene cloruro de metileno. Disruptor de microbiota. En Coca-Cola Zero, Pepsi Light.',
    alternatives: 'Stevia, eritritol, fruta del monje.',
  },
  {
    code: 'E951',
    name: 'Aspartame',
    nameES: 'Aspartame',
    toxicity: 'high',
    type: 'edulcorante',
    risks: 'IARC lo clasificó como posible carcinógeno (Grupo 2B) en 2023. Dolor de cabeza, vértigo. En Coca-Cola Light, Equal, NutraSweet.',
    alternatives: 'Stevia, eritritol, fruta del monje.',
  },
  {
    code: 'E952',
    name: 'Cyclamate',
    nameES: 'Ciclamato de sodio',
    toxicity: 'high',
    type: 'edulcorante',
    risks: 'Prohibido en EE.UU. desde 1970 por carcinogenicidad en animales. Aún permitido en México. Posible atrofia testicular.',
    alternatives: 'Stevia, eritritol.',
  },
  {
    code: 'E954',
    name: 'Saccharin',
    nameES: 'Sacarina',
    toxicity: 'high',
    type: 'edulcorante',
    risks: 'Vinculada a cáncer de vejiga en ratas. Altera microbiota intestinal (estudio Nature 2014). Sabor metálico.',
    alternatives: 'Stevia, eritritol, monk fruit.',
  },
  {
    code: 'E961',
    name: 'Neotame',
    nameES: 'Neotamo',
    toxicity: 'high',
    type: 'edulcorante',
    risks: 'Derivado del aspartame, 8000x más dulce que azúcar. Estudios limitados. Posible disrupción de microbiota intestinal.',
    alternatives: 'Stevia, fruta del monje.',
  },
  {
    code: 'E962',
    name: 'Aspartame-acesulfame salt',
    nameES: 'Sal de aspartame-acesulfame',
    toxicity: 'high',
    type: 'edulcorante',
    risks: 'Combina los riesgos de aspartame (E951) y acesulfame K (E950). Doble preocupación.',
    alternatives: 'Stevia, eritritol.',
  },

  // ═══════════════════════════════════════════════════════════════
  // OTROS ADITIVOS COMUNES EN MÉXICO
  // ═══════════════════════════════════════════════════════════════

  {
    code: 'E900',
    name: 'Dimethylpolysiloxane',
    nameES: 'Dimetilpolisiloxano',
    toxicity: 'medium',
    type: 'otros',
    risks: 'Antiespumante en aceites de fritura (McDonald\'s, KFC). Contiene formaldehído residual. Bioacumulable.',
    alternatives: 'Aceites de alta calidad sin antiespumantes.',
  },
  {
    code: 'E901',
    name: 'Beeswax',
    nameES: 'Cera de abeja',
    toxicity: 'low',
    type: 'otros',
    risks: 'Natural. Usado como recubrimiento de frutas y dulces. Sin riesgos conocidos.',
    alternatives: 'Cera de carnauba, cera de candelilla.',
  },
  {
    code: 'E903',
    name: 'Carnauba wax',
    nameES: 'Cera de carnauba',
    toxicity: 'low',
    type: 'otros',
    risks: 'Cera vegetal de palma brasileña. Sin riesgos. Usada en dulces, gomas de mascar.',
    alternatives: 'Cera de candelilla (planta mexicana).',
  },
  {
    code: 'E904',
    name: 'Shellac',
    nameES: 'Goma laca',
    toxicity: 'low',
    type: 'otros',
    risks: 'Secreción de insecto laca. Recubrimiento de dulces y frutas. No apto para veganos.',
    alternatives: 'Cera de carnauba, cera de candelilla.',
  },
  {
    code: 'E914',
    name: 'Oxidized polyethylene wax',
    nameES: 'Cera de polietileno oxidada',
    toxicity: 'medium',
    type: 'otros',
    risks: 'Derivada del petróleo. Recubrimiento de cítricos. Cuestionable para consumo humano.',
    alternatives: 'Cera de carnauba, cera de candelilla.',
  },
  {
    code: 'E943',
    name: 'Butane',
    nameES: 'Butano',
    toxicity: 'medium',
    type: 'otros',
    risks: 'Gas propelente en aerosoles alimentarios (sprays de aceite). Residuos mínimos pero es derivado del petróleo.',
    alternatives: 'Rociadores manuales reutilizables.',
  },
  {
    code: 'E999',
    name: 'Quillaia extract',
    nameES: 'Extracto de quilaya',
    toxicity: 'low',
    type: 'otros',
    risks: 'Espumante natural de corteza de árbol. Usado en bebidas. Sin riesgos significativos.',
    alternatives: 'Clara de huevo, saponinas naturales.',
  },
  {
    code: 'E1105',
    name: 'Lysozyme',
    nameES: 'Lisozima',
    toxicity: 'low',
    type: 'conservador',
    risks: 'Enzima natural presente en lágrimas y saliva. Conservador en quesos. Alérgeno si es de huevo.',
    alternatives: 'Nisina, extracto de ajo.',
  },
  {
    code: 'E1442',
    name: 'Hydroxypropyl distarch phosphate',
    nameES: 'Almidón modificado (fosfato de dialmidón)',
    toxicity: 'low',
    type: 'espesante',
    risks: 'Almidón químicamente modificado. Generalmente seguro. Muy común en yogures y salsas industriales.',
    alternatives: 'Almidón de maíz natural, harina de tapioca.',
  },
  {
    code: 'E1450',
    name: 'Starch sodium octenyl succinate',
    nameES: 'Almidón modificado (octenil succinato)',
    toxicity: 'low',
    type: 'espesante',
    risks: 'Almidón modificado usado como encapsulante. Sin riesgos significativos documentados.',
    alternatives: 'Goma arábiga, maltodextrina.',
  },
  {
    code: 'E1520',
    name: 'Propylene glycol',
    nameES: 'Propilenglicol',
    toxicity: 'medium',
    type: 'humectante',
    risks: 'Derivado del petróleo. Puede causar dermatitis. En dosis altas afecta sistema nervioso. Común en saborizantes y colorantes.',
    alternatives: 'Glicerina vegetal, miel.',
  },
  {
    code: 'E1422',
    name: 'Acetylated distarch adipate',
    nameES: 'Almidón modificado (adipato de dialmidón acetilado)',
    toxicity: 'low',
    type: 'espesante',
    risks: 'Almidón modificado para resistir calor y ácidos. Generalmente seguro.',
    alternatives: 'Almidón de tapioca, harina de arrurruz.',
  },

  // ═══════════════════════════════════════════════════════════════
  // ADITIVOS ESPECÍFICOS DE PRODUCTOS MEXICANOS COMUNES
  // ═══════════════════════════════════════════════════════════════

  {
    code: 'E452',
    name: 'Polyphosphates',
    nameES: 'Polifosfatos',
    toxicity: 'medium',
    type: 'regulador',
    risks: 'Exceso de fósforo. Daño renal, calcificación vascular. Muy usados en embutidos FUD y jamones.',
    alternatives: 'Sal marina, especias naturales.',
  },
  {
    code: 'E450',
    name: 'Diphosphates',
    nameES: 'Difosfatos (pirofosfatos)',
    toxicity: 'medium',
    type: 'regulador',
    risks: 'Exceso de fósforo inorgánico. Riesgo cardiovascular y renal. Común en polvos para hornear y embutidos.',
    alternatives: 'Cremor tártaro + bicarbonato.',
  },
  {
    code: 'E451',
    name: 'Triphosphates',
    nameES: 'Trifosfatos',
    toxicity: 'medium',
    type: 'regulador',
    risks: 'Retiene agua en carnes. Alto fósforo inorgánico. Riesgo renal y cardiovascular.',
    alternatives: 'Marinado natural con sal y especias.',
  },
  {
    code: 'E341',
    name: 'Calcium phosphate',
    nameES: 'Fosfato de calcio',
    toxicity: 'low',
    type: 'regulador',
    risks: 'Fuente de calcio y fósforo. Generalmente seguro a dosis normales.',
    alternatives: 'Carbonato de calcio.',
  },
  {
    code: 'E270a',
    name: 'Citric acid esters',
    nameES: 'Ésteres de ácido cítrico',
    toxicity: 'low',
    type: 'emulsionante',
    risks: 'Emulsionante derivado de ácido cítrico. Sin riesgos significativos.',
    alternatives: 'Lecitina de girasol.',
  },
  {
    code: 'E481',
    name: 'Sodium stearoyl-2-lactylate',
    nameES: 'Estearoil lactilato de sodio (SSL)',
    toxicity: 'low',
    type: 'emulsionante',
    risks: 'Acondicionador de masa. Generalmente seguro. Presente en pan Bimbo y bollería industrial.',
    alternatives: 'Masa madre, lecitina.',
  },
  {
    code: 'E482',
    name: 'Calcium stearoyl-2-lactylate',
    nameES: 'Estearoil lactilato de calcio (CSL)',
    toxicity: 'low',
    type: 'emulsionante',
    risks: 'Similar a E481. Acondicionador de masa para pan. Generalmente seguro.',
    alternatives: 'Masa madre, huevo.',
  },
  {
    code: 'E492',
    name: 'Sorbitan tristearate',
    nameES: 'Triestearato de sorbitán',
    toxicity: 'medium',
    type: 'emulsionante',
    risks: 'Emulsionante sintético. Posible alteración de microbiota. Usado en chocolate y coberturas.',
    alternatives: 'Manteca de cacao, lecitina.',
  },

  // Humectantes y otros
  {
    code: 'E422',
    name: 'Glycerol',
    nameES: 'Glicerol (Glicerina)',
    toxicity: 'low',
    type: 'humectante',
    risks: 'Humectante natural. Seguro. Puede tener efecto laxante suave en exceso.',
    alternatives: 'Miel, jarabe de agave.',
  },
  {
    code: 'E428',
    name: 'Gelatin',
    nameES: 'Gelatina',
    toxicity: 'low',
    type: 'espesante',
    risks: 'Proteína animal (cerdo/res). Sin riesgos. No apto para veganos/vegetarianos.',
    alternatives: 'Agar-agar, pectina, carragenina.',
  },
  {
    code: 'E570',
    name: 'Stearic acid',
    nameES: 'Ácido esteárico',
    toxicity: 'low',
    type: 'otros',
    risks: 'Ácido graso saturado natural. Sin riesgos significativos a dosis alimentarias.',
    alternatives: 'Aceite de coco, manteca de cacao.',
  },
  {
    code: 'E316',
    name: 'Sodium erythorbate',
    nameES: 'Eritorbato de sodio',
    toxicity: 'low',
    type: 'antioxidante',
    risks: 'Isómero de vitamina C. Antioxidante seguro. Muy usado en embutidos mexicanos para mantener color.',
    alternatives: 'Ácido ascórbico (vitamina C).',
  },
  {
    code: 'E262',
    name: 'Sodium acetate',
    nameES: 'Acetato de sodio',
    toxicity: 'low',
    type: 'conservador',
    risks: 'Sabor a vinagre. Regulador de pH seguro. Usado en snacks sabor sal y vinagre.',
    alternatives: 'Vinagre natural.',
  },
  {
    code: 'E575',
    name: 'Glucono delta-lactone',
    nameES: 'Glucono delta-lactona (GDL)',
    toxicity: 'low',
    type: 'acidulante',
    risks: 'Acidulante natural. Usado en tofu y quesos. Sin riesgos conocidos.',
    alternatives: 'Vinagre, jugo de limón, nigari.',
  },
];

// ═══════════════════════════════════════════════════════════════
// FUNCIONES DE BÚSQUEDA Y DETECCIÓN
// ═══════════════════════════════════════════════════════════════

/**
 * Busca aditivos por código, nombre en inglés o español.
 * Devuelve máximo 10 resultados.
 */
export function searchAdditive(query: string): Additive[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return ADDITIVES_DB.filter(
    (a) =>
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.nameES.toLowerCase().includes(q)
  ).slice(0, 10);
}

/**
 * Obtiene un aditivo por su código exacto (ej. "E102").
 * Retorna null si no se encuentra.
 */
export function getAdditive(code: string): Additive | null {
  return (
    ADDITIVES_DB.find(
      (a) => a.code.toLowerCase() === code.toLowerCase().trim()
    ) || null
  );
}

/**
 * Detecta aditivos mencionados en un texto de ingredientes.
 * Busca por código (E###), nombre en español y nombre en inglés.
 * Útil para escanear etiquetas con OCR.
 */
export function detectAdditives(ingredientText: string): Additive[] {
  const text = ingredientText.toLowerCase();
  const found: Additive[] = [];

  for (const a of ADDITIVES_DB) {
    // Buscar por código E### (con word boundary para evitar falsos positivos)
    const codePattern = a.code.toLowerCase();
    const codeRegex = new RegExp(`\\b${codePattern}\\b`, 'i');

    // Buscar por nombre (mínimo 4 caracteres para evitar falsos positivos)
    const nameMatch =
      (a.nameES.length >= 4 && text.includes(a.nameES.toLowerCase())) ||
      (a.name.length >= 4 && text.includes(a.name.toLowerCase()));

    if (codeRegex.test(text) || nameMatch) {
      if (!found.some((f) => f.code === a.code)) {
        found.push(a);
      }
    }
  }

  return found;
}

/**
 * Filtra aditivos por nivel de toxicidad.
 */
export function getAdditivesByToxicity(
  level: 'low' | 'medium' | 'high'
): Additive[] {
  return ADDITIVES_DB.filter((a) => a.toxicity === level);
}

/**
 * Filtra aditivos por tipo/categoría.
 */
export function getAdditivesByType(type: Additive['type']): Additive[] {
  return ADDITIVES_DB.filter((a) => a.type === type);
}

/**
 * Genera un resumen de riesgo para una lista de aditivos detectados.
 */
export function getIngredientRiskSummary(additives: Additive[]): {
  total: number;
  low: number;
  medium: number;
  high: number;
  highRiskItems: Additive[];
  overallRisk: 'low' | 'medium' | 'high';
} {
  const low = additives.filter((a) => a.toxicity === 'low').length;
  const medium = additives.filter((a) => a.toxicity === 'medium').length;
  const high = additives.filter((a) => a.toxicity === 'high').length;
  const highRiskItems = additives.filter((a) => a.toxicity === 'high');

  let overallRisk: 'low' | 'medium' | 'high' = 'low';
  if (high > 0) overallRisk = 'high';
  else if (medium > 2) overallRisk = 'high';
  else if (medium > 0) overallRisk = 'medium';

  return {
    total: additives.length,
    low,
    medium,
    high,
    highRiskItems,
    overallRisk,
  };
}
