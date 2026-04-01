/**
 * ActionContentRenderer — Contenido expandible inteligente para acciones del timeline.
 * Detecta el tipo de acción y renderiza guías contextuales.
 */
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Spacing, Radius, FontSizes, Fonts } from '@/constants/theme';

// ═══ TIPOS ═══

interface ActionData {
  name: string;
  category: string;
  instructions: string;
  duration_min: number;
}

// ═══ RENDERER PRINCIPAL ═══

export function renderActionContent(action: ActionData): React.ReactNode {
  if (!action.instructions) return null;
  const n = action.name.toLowerCase();

  if (n.includes('suplemento') || n.includes('supplement') || n.includes('stack')) return renderSupplements(action);
  if (n.includes('luz solar') || n.includes('sunlight')) return renderSunlight(action);
  if (n.includes('hidratación') || n.includes('hidratacion') || n.includes('agua')) return renderHydration(action);
  if (n.includes('respiración') || n.includes('respiracion') || n.includes('box') || n.includes('4-7-8')) return renderBreathing(action);
  if (n.includes('desayuno') || n.includes('comida') || n.includes('cena') || n.includes('ayuno') || n.includes('proteín')) return renderNutrition(action);
  if (n.includes('entrenamiento') || n.includes('caminata') || n.includes('caminar') || n.includes('fuerza') || n.includes('hiit') || n.includes('movilidad') || n.includes('stretching')) return renderExercise(action);
  if (n.includes('frío') || n.includes('fria') || n.includes('cold') || n.includes('ducha')) return renderCold(action);
  if (n.includes('meditación') || n.includes('meditacion')) return renderMeditation(action);
  if (n.includes('dormir') || n.includes('pantallas') || n.includes('cuarto')) return renderSleep(action);
  if (n.includes('journaling') || n.includes('journal')) return renderJournaling(action);
  return renderGeneric(action);
}

// ═══ RENDERERS ═══

function renderSupplements(a: ActionData) {
  const supps = extractSupplements(a.instructions);
  return (
    <View>
      {supps.length > 0 ? (
        <View style={s.list}>
          {supps.map((sup, i) => (
            <View key={i} style={s.suppItem}>
              <View style={s.dot} />
              <View style={{ flex: 1 }}>
                <EliteText style={s.suppName}>{sup.name} <EliteText style={s.suppDose}>{sup.dose}</EliteText></EliteText>
                {sup.why ? <EliteText style={s.suppWhy}>{sup.why}</EliteText> : null}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <EliteText style={s.text}>{a.instructions}</EliteText>
      )}
      <Tip text="Toma con grasa para mejor absorción de suplementos liposolubles (D3, CoQ10, curcumina)." />
    </View>
  );
}

function renderSunlight(a: ActionData) {
  return (
    <View>
      <EliteText style={s.text}>{a.instructions}</EliteText>
      <View style={s.guide}>
        <GuideRow icon="sunny-outline" color="#a8e02a" text="Sol directo: 10-15 min" />
        <GuideRow icon="cloudy-outline" color="#EF9F27" text="Nublado: 20-30 min" />
        <GuideRow icon="glasses-outline" color="#E24B4A" text="Sin lentes de sol ni ventana" />
      </View>
      <Tip text="La luz matutina baja cortisol nocturno y mejora la melatonina. Es el reset #1 del reloj circadiano." />
    </View>
  );
}

function renderHydration(a: ActionData) {
  return (
    <View>
      <EliteText style={s.text}>{a.instructions}</EliteText>
      <View style={s.recipeBox}>
        <EliteText style={s.label}>Receta rápida:</EliteText>
        <RecipeItem emoji="💧" text="500ml agua (ambiente o tibia)" />
        <RecipeItem emoji="🧂" text="¼ cta sal de mar o rosa del Himalaya" />
        <RecipeItem emoji="🍋" text="Jugo de medio limón (opcional)" />
      </View>
      <Tip text="La sal aporta sodio perdido durante la noche. Sin sodio, el agua pasa de largo sin hidratarte." />
    </View>
  );
}

function renderBreathing(a: ActionData) {
  const n = a.name.toLowerCase();
  const is478 = n.includes('4-7-8') || n.includes('relajante');
  const pattern = is478
    ? { inhale: 4, hold: 7, exhale: 8, hold2: 0, name: '4-7-8' }
    : { inhale: 4, hold: 4, exhale: 4, hold2: 4, name: 'Box breathing' };
  const cycleLen = pattern.inhale + pattern.hold + pattern.exhale + pattern.hold2;
  const cycles = Math.round((a.duration_min || 5) * 60 / cycleLen);

  return (
    <View>
      <EliteText style={s.text}>{a.instructions}</EliteText>
      <View style={s.breathRow}>
        <BreathStep label="Inhala" seconds={pattern.inhale} color="#5B9BD5" icon="arrow-down-outline" />
        {pattern.hold > 0 && <BreathStep label="Retén" seconds={pattern.hold} color="#EF9F27" icon="pause-outline" />}
        <BreathStep label="Exhala" seconds={pattern.exhale} color="#a8e02a" icon="arrow-up-outline" />
        {pattern.hold2 > 0 && <BreathStep label="Retén" seconds={pattern.hold2} color="#7F77DD" icon="pause-outline" />}
      </View>
      <EliteText style={s.breathReps}>~{cycles} ciclos · {a.duration_min || 5} min</EliteText>
      <Tip text={is478 ? 'El exhalo largo activa el nervio vago → relajación profunda.' : 'Usado por Navy SEALs. Baja cortisol en minutos.'} />
    </View>
  );
}

function renderNutrition(a: ActionData) {
  const n = a.name.toLowerCase();
  const isBreakfast = n.includes('desayuno') || n.includes('romper');
  return (
    <View>
      <EliteText style={s.text}>{a.instructions}</EliteText>
      {isBreakfast && (
        <View style={s.guide}>
          <EliteText style={s.label}>Ejemplos rápidos:</EliteText>
          <RecipeItem emoji="🥚" text="3 huevos + aguacate + espinaca" />
          <RecipeItem emoji="🐟" text="Salmón + vegetales + aceite de oliva" />
          <RecipeItem emoji="🥩" text="Carne molida + camote + brócoli" />
        </View>
      )}
      <View style={s.rules}>
        <RuleRow ok text="Proteína primero (30-50g por comida)" />
        <RuleRow ok text="Grasas saludables (aguacate, oliva, coco)" />
        <RuleRow ok text="Vegetales en cada comida" />
        <RuleRow text="Sin carbos refinados ni azúcar" />
      </View>
    </View>
  );
}

function renderExercise(a: ActionData) {
  const n = a.name.toLowerCase();
  const isWalk = n.includes('caminata') || n.includes('caminar');
  return (
    <View>
      <EliteText style={s.text}>{a.instructions}</EliteText>
      {isWalk && (
        <View style={s.guide}>
          <GuideRow icon="walk-outline" color="#a8e02a" text="Ritmo conversacional" />
          <GuideRow icon="leaf-outline" color="#a8e02a" text="Naturaleza ideal, sin auriculares" />
          <GuideRow icon="body-outline" color="#a8e02a" text="Respiración nasal si es posible" />
        </View>
      )}
    </View>
  );
}

function renderCold(a: ActionData) {
  return (
    <View>
      <EliteText style={s.text}>{a.instructions}</EliteText>
      <View style={s.guide}>
        <EliteText style={s.label}>Progresión segura:</EliteText>
        <GuideRow icon="time-outline" color="#5B9BD5" text="Sem 1-2: 15-30 seg agua fría" />
        <GuideRow icon="time-outline" color="#EF9F27" text="Sem 3-4: 30-60 seg" />
        <GuideRow icon="time-outline" color="#a8e02a" text="Sem 5+: 1-3 min o baño de hielo" />
      </View>
      <Tip text="Hormesis: pequeño estrés controlado entrena al cuerpo a manejar estrés mejor." />
    </View>
  );
}

function renderMeditation(a: ActionData) {
  return (
    <View>
      <EliteText style={s.text}>{a.instructions}</EliteText>
      <View style={s.guide}>
        <EliteText style={s.label}>Opciones para hoy:</EliteText>
        <GuideRow icon="body-outline" color="#7F77DD" text="Body scan: recorre tu cuerpo de pies a cabeza" />
        <GuideRow icon="eye-outline" color="#7F77DD" text="Breath awareness: solo observa tu respiración" />
        <GuideRow icon="headset-outline" color="#7F77DD" text="Guiada: usa Meditación en Kit" />
      </View>
    </View>
  );
}

function renderSleep(a: ActionData) {
  const n = a.name.toLowerCase();
  const isScreens = n.includes('pantallas');
  return (
    <View>
      <EliteText style={s.text}>{a.instructions}</EliteText>
      {isScreens ? (
        <View style={s.rules}>
          <RuleRow text="Modo avión o Night Shift" icon="phone-portrait-outline" />
          <RuleRow ok text="Lentes blue-block si necesitas pantalla" icon="glasses-outline" />
          <RuleRow ok text="Leer, journaling, conversar, stretching" icon="book-outline" />
        </View>
      ) : (
        <View style={s.guide}>
          <GuideRow icon="thermometer-outline" color="#5B9BD5" text="Temperatura: 17-19°C (fresco)" />
          <GuideRow icon="moon-outline" color="#7F77DD" text="Oscuridad TOTAL (cinta en LEDs)" />
          <GuideRow icon="volume-mute-outline" color="#a8e02a" text="Ruido blanco si hay ruido externo" />
        </View>
      )}
    </View>
  );
}

function renderJournaling(a: ActionData) {
  return (
    <View>
      <EliteText style={s.text}>{a.instructions}</EliteText>
      <View style={s.promptBox}>
        <EliteText style={s.label}>Prompt de hoy:</EliteText>
        <EliteText style={s.promptText}>¿Qué fue lo más estresante de hoy? Escríbelo sin filtro. No busques soluciones — solo sácalo de la cabeza al papel.</EliteText>
      </View>
      <Tip text="Escribir lo que te preocupa reduce cortisol en 24 horas. No es terapia — es fisiología." />
    </View>
  );
}

function renderGeneric(a: ActionData) {
  return <EliteText style={s.text}>{a.instructions}</EliteText>;
}

// ═══ SUB-COMPONENTES ═══

function Tip({ text }: { text: string }) {
  return (
    <View style={s.tipBox}>
      <Ionicons name="bulb-outline" size={14} color="#EF9F27" />
      <EliteText style={s.tipText}>{text}</EliteText>
    </View>
  );
}

function GuideRow({ icon, color, text }: { icon: string; color: string; text: string }) {
  return (
    <View style={s.guideRow}>
      <Ionicons name={icon as any} size={14} color={color} />
      <EliteText style={s.guideText}>{text}</EliteText>
    </View>
  );
}

function RecipeItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={s.recipeItem}>
      <EliteText style={{ fontSize: 14, width: 22, textAlign: 'center' }}>{emoji}</EliteText>
      <EliteText style={s.guideText}>{text}</EliteText>
    </View>
  );
}

function RuleRow({ ok, text, icon }: { ok?: boolean; text: string; icon?: string }) {
  return (
    <View style={s.guideRow}>
      <Ionicons name={(icon ?? (ok ? 'checkmark-circle-outline' : 'close-circle-outline')) as any} size={14} color={ok ? '#a8e02a' : '#E24B4A'} />
      <EliteText style={s.guideText}>{text}</EliteText>
    </View>
  );
}

function BreathStep({ label, seconds, color, icon }: { label: string; seconds: number; color: string; icon: string }) {
  return (
    <View style={[s.breathStep, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon as any} size={16} color={color} />
      <EliteText style={[s.breathNum, { color }]}>{seconds}s</EliteText>
      <EliteText style={s.breathLabel}>{label}</EliteText>
    </View>
  );
}

// ═══ PARSER DE SUPLEMENTOS ═══

interface Supp { name: string; dose: string; why?: string }

function extractSupplements(text: string): Supp[] {
  const supps: Supp[] = [];
  const patterns: { rx: RegExp; name: string; why: string }[] = [
    { rx: /L-teanina\s*(\d+[-–]?\d*\s*mg)/i, name: 'L-teanina', why: 'Reduce cortisol sin somnolencia' },
    { rx: /Magnesio\s*(?:glicinato|treonato|bisglicinato)?\s*(\d+[-–]?\d*\s*mg)/i, name: 'Magnesio', why: 'Relajante muscular + mejor sueño' },
    { rx: /Ashwagandha\s*(?:KSM-66)?\s*(\d+[-–]?\d*\s*mg)/i, name: 'Ashwagandha', why: 'Adaptógeno — baja cortisol crónico' },
    { rx: /Omega[\s-]*3?\s*(\d+[-–]?\d*\s*g)/i, name: 'Omega 3', why: 'Anti-inflamatorio de primera línea' },
    { rx: /Curcumina\s*(?:liposomal)?\s*(\d+[-–]?\d*\s*mg)/i, name: 'Curcumina', why: 'Anti-inflamatorio potente' },
    { rx: /Vitamina?\s*D\s*(\d+[-–]?\d*\s*(?:IU|UI))/i, name: 'Vitamina D3', why: 'Hormona solar — inmunidad' },
    { rx: /CoQ10\s*(?:ubiquinol)?\s*(\d+[-–]?\d*\s*mg)/i, name: 'CoQ10', why: 'Energía mitocondrial' },
    { rx: /Berberina\s*(?:HCl)?\s*(\d+[-–]?\d*\s*mg)/i, name: 'Berberina', why: 'Sensibilidad a insulina' },
    { rx: /Zinc\s*(?:carnosina)?\s*(\d+[-–]?\d*\s*mg)/i, name: 'Zinc', why: 'Reparación intestinal + inmunidad' },
    { rx: /Glicina\s*(\d+[-–]?\d*\s*g)/i, name: 'Glicina', why: 'Calidad de sueño profundo' },
    { rx: /Rhodiola\s*(?:rosea)?\s*(\d+[-–]?\d*\s*mg)/i, name: 'Rhodiola', why: 'Energía + resistencia al estrés' },
    { rx: /Creatina\s*(?:monohidrato)?\s*(\d+[-–]?\d*\s*g)/i, name: 'Creatina', why: 'Energía celular + cognición' },
    { rx: /L-glutamina\s*(\d+[-–]?\d*\s*g)/i, name: 'L-glutamina', why: 'Barrera intestinal' },
    { rx: /PQQ\s*(\d+[-–]?\d*\s*mg)/i, name: 'PQQ', why: 'Biogénesis mitocondrial' },
    { rx: /L-carnitina\s*(?:L-tartrato)?\s*(\d+[-–]?\d*\s*g)/i, name: 'L-carnitina', why: 'Transporte de grasa a mitocondria' },
    { rx: /Colágeno\s*(?:hidrolizado|tipo\s*II)?\s*(\d+[-–]?\d*\s*(?:mg|g))/i, name: 'Colágeno', why: 'Articulaciones + intestino' },
    { rx: /Lion'?s?\s*Mane\s*(\d+[-–]?\d*\s*mg)/i, name: "Lion's Mane", why: 'Neuroplasticidad' },
    { rx: /Bacopa\s*(\d+[-–]?\d*\s*mg)/i, name: 'Bacopa', why: 'Memoria + aprendizaje' },
    { rx: /Melatonina\s*(\d+[-–]?\d*\s*mg)/i, name: 'Melatonina', why: 'Inductor de sueño' },
    { rx: /Probiótico\s*(?:multicepa)?\s*(\d+[-–]?\d*\s*(?:billones|billion)?\s*CFU)/i, name: 'Probiótico', why: 'Microbioma + inmunidad' },
    { rx: /EGCG.*?(\d+[-–]?\d*\s*mg)/i, name: 'EGCG (Té verde)', why: 'Termogénico' },
    { rx: /Colina\s*(\d+[-–]?\d*\s*mg)/i, name: 'Colina', why: 'Precursor de acetilcolina' },
  ];
  for (const p of patterns) {
    const m = text.match(p.rx);
    if (m) {
      const dose = m.find((v, i) => i > 0 && v && /\d/.test(v)) || '';
      supps.push({ name: p.name, dose: dose.trim(), why: p.why });
    }
  }
  return supps;
}

// ═══ ESTILOS ═══

const s = StyleSheet.create({
  text: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.7)', lineHeight: 18, marginBottom: Spacing.sm },
  label: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, marginBottom: Spacing.xs },
  list: { marginTop: Spacing.xs },
  suppItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#a8e02a', marginTop: 5 },
  suppName: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.9)', fontFamily: Fonts.semiBold },
  suppDose: { fontSize: FontSizes.sm, color: '#a8e02a', fontFamily: Fonts.semiBold },
  suppWhy: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(239,159,39,0.08)', borderRadius: Radius.sm, padding: Spacing.sm, marginTop: Spacing.sm },
  tipText: { flex: 1, fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.55)', lineHeight: 16 },
  guide: { marginTop: Spacing.xs },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  guideText: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.6)' },
  recipeBox: { backgroundColor: 'rgba(91,155,213,0.08)', borderRadius: Radius.sm, padding: Spacing.sm, marginTop: Spacing.sm },
  recipeItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  rules: { marginTop: Spacing.xs },
  breathRow: { flexDirection: 'row', gap: 6, marginTop: Spacing.xs },
  breathStep: { flex: 1, alignItems: 'center', padding: Spacing.sm, borderRadius: Radius.sm },
  breathNum: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, marginTop: 2 },
  breathLabel: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  breathReps: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: Spacing.xs },
  promptBox: { backgroundColor: 'rgba(127,119,221,0.08)', borderRadius: Radius.sm, padding: Spacing.sm, marginTop: Spacing.sm },
  promptText: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', lineHeight: 18 },
});
