# Age Gate — Especificación Detallada V1.3

**Task #41 · 2026-07-06 noche (Cowork overnight, spec para Fable)**

Age gate en Onboarding v2 (task #110 ya completada por Fable) para compliance stores.

---

## 🎯 Requisitos legales

### Apple App Store
- Age Rating **17+** requerido para medical/health content
- Menores de 13 no pueden crear cuenta (COPPA en US; PIPEDA Canadá)
- 13-17 con consentimiento parental documentado

### Google Play Store
- Content rating similar
- Data Safety declaration debe reflejar audience 18+

### México (LFPDPP)
- Menores de 18 requieren consentimiento del titular de la patria potestad
- Datos de salud son datos personales sensibles

### GDPR (UE)
- Menores de 16 años (o 13-16 según país) requieren consentimiento parental
- Datos de salud tienen requisitos adicionales

---

## 🧠 Lógica del gate

```
Al confirmar fecha de nacimiento en pantalla profile.tsx v2:

1. Calcular edad exacta = floor((today - birthDate) / 365.25)

2. Si edad < 13:
   → BLOQUEAR completamente
   → Mostrar modal "ATP no está disponible para menores de 13 años"
   → Botón único: "Entendido" → cierra flujo (back a login o exit app)
   → Analytics: AGE_GATE_TRIGGERED tier=blocked
   → NO se crea perfil ni cuenta

3. Si edad entre 13-17:
   → REQUIRE consentimiento parental
   → Modal con:
     - Título: "Necesitamos consentimiento parental"
     - Copy: "ATP está diseñado para adultos. Con consentimiento de tu padre/madre/tutor puedes continuar."
     - Campo: "Email del padre/madre/tutor"
     - Checkbox: "Confirmo que tengo consentimiento parental para usar ATP y compartir mis datos según su Política de Privacidad"
     - Botón: "Continuar" (disabled hasta email válido + checkbox)
   → Al continuar:
     - Guardar parental_consent_email + parental_consent_at
     - Analytics: AGE_GATE_TRIGGERED tier=parental
     - Enviar email al padre/madre notificando (opcional, V1.4)
     - Continuar flujo normal onboarding

4. Si edad >= 18:
   → Continuar flujo normal
   → Guardar age_verified_at = NOW()
   → Analytics: AGE_GATE_TRIGGERED tier=passed
```

---

## 🗄️ Migración 154 (Fable rango 150-199, Cowork ya usó 100-101)

```sql
-- Migración 154: age gate columns en user_profiles
-- Idempotente. Backward compat (todos NULLABLE).

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMPTZ;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS parental_consent_email TEXT;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS parental_consent_at TIMESTAMPTZ;

-- Índice para queries de compliance (auditoría de menores)
CREATE INDEX IF NOT EXISTS idx_user_profiles_parental_consent
  ON user_profiles(parental_consent_at)
  WHERE parental_consent_at IS NOT NULL;

COMMENT ON COLUMN user_profiles.age_verified_at IS 'Timestamp de verificación de edad ≥18 en onboarding v2';
COMMENT ON COLUMN user_profiles.parental_consent_email IS 'Email del padre/madre/tutor que dio consentimiento (edad 13-17)';
COMMENT ON COLUMN user_profiles.parental_consent_at IS 'Timestamp del consentimiento parental documentado';
```

**Nota:** `user_profiles` es la tabla existente en el proyecto. Si el nombre real es distinto (`profiles`), ajustar.

---

## 🎨 Componente `AgeGateModal.tsx`

Ubicación sugerida: `src/components/onboarding/AgeGateModal.tsx`

```typescript
import { View, Modal, Pressable, TextInput } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { useState } from 'react';
import { ATP_BRAND } from '@/src/constants/brand';

type Variant = 'blocked' | 'parental';

interface Props {
  visible: boolean;
  variant: Variant;
  onClose: () => void;
  onParentalContinue?: (email: string) => void;
}

export function AgeGateModal({ visible, variant, onClose, onParentalContinue }: Props) {
  const [email, setEmail] = useState('');
  const [consented, setConsented] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canContinue = variant === 'parental' && emailValid && consented;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {variant === 'blocked' && (
            <>
              <EliteText style={styles.title}>ATP no está disponible para menores de 13 años.</EliteText>
              <EliteText style={styles.subtitle}>
                Nuestra política de privacidad y contenido de salud requieren usuarios de al menos 13 años con consentimiento parental para 13-17.
              </EliteText>
              <Pressable style={styles.button} onPress={onClose}>
                <EliteText style={styles.buttonText}>Entendido</EliteText>
              </Pressable>
            </>
          )}

          {variant === 'parental' && (
            <>
              <EliteText style={styles.title}>Necesitamos consentimiento parental</EliteText>
              <EliteText style={styles.subtitle}>
                ATP está diseñado para adultos. Con consentimiento de tu padre/madre/tutor puedes continuar.
              </EliteText>

              <TextInput
                style={styles.input}
                placeholder="Email del padre/madre/tutor"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Pressable style={styles.checkbox} onPress={() => setConsented(!consented)}>
                <View style={[styles.checkboxBox, consented && styles.checkboxBoxChecked]} />
                <EliteText style={styles.checkboxText}>
                  Confirmo que tengo consentimiento parental para usar ATP y compartir mis datos según su Política de Privacidad.
                </EliteText>
              </Pressable>

              <Pressable
                style={[styles.button, !canContinue && styles.buttonDisabled]}
                disabled={!canContinue}
                onPress={() => canContinue && onParentalContinue?.(email)}
              >
                <EliteText style={styles.buttonText}>Continuar</EliteText>
              </Pressable>

              <Pressable style={styles.secondaryButton} onPress={onClose}>
                <EliteText style={styles.secondaryText}>Cancelar</EliteText>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f5f5f5',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    lineHeight: 22,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    padding: 12,
    color: '#f5f5f5',
    fontSize: 15,
    marginBottom: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 3,
    marginRight: 10,
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: ATP_BRAND.lime,
    borderColor: ATP_BRAND.lime,
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: '#ccc',
    lineHeight: 18,
  },
  button: {
    backgroundColor: ATP_BRAND.lime,
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.05,
  },
  secondaryButton: {
    marginTop: 12,
    padding: 10,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#888',
    fontSize: 13,
  },
} as const;
```

---

## 🔌 Wire en `app/onboarding/v2/profile.tsx`

```typescript
// Al submitir fecha de nacimiento:
async function handleSubmit(birthDate: Date) {
  const age = calculateAge(birthDate);

  if (age < 13) {
    // Analytics
    analytics.track('AGE_GATE_TRIGGERED', { tier: 'blocked', age });
    // Show modal blocked
    setModalVariant('blocked');
    setShowModal(true);
    return;
  }

  if (age < 18) {
    // Analytics
    analytics.track('AGE_GATE_TRIGGERED', { tier: 'parental', age });
    // Show modal parental
    setModalVariant('parental');
    setShowModal(true);
    return;
  }

  // ≥18: proceed
  analytics.track('AGE_GATE_TRIGGERED', { tier: 'passed', age });
  await supabase
    .from('user_profiles')
    .update({ 
      birth_date: birthDate.toISOString().slice(0, 10),
      age_verified_at: new Date().toISOString() 
    })
    .eq('user_id', userId);
  router.push('/onboarding/v2/goal');
}

async function handleParentalContinue(parentEmail: string) {
  await supabase
    .from('user_profiles')
    .update({
      birth_date: birthDate.toISOString().slice(0, 10),
      parental_consent_email: parentEmail,
      parental_consent_at: new Date().toISOString(),
      age_verified_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  
  setShowModal(false);
  router.push('/onboarding/v2/goal');
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
```

---

## 🧪 Tests unitarios (mínimo)

Crear `src/utils/__tests__/age-gate.test.ts`:

```typescript
import { calculateAge, getAgeGateTier } from '../age-gate';

describe('calculateAge', () => {
  it('calcula edad exacta considerando mes y día', () => {
    const today = new Date('2026-07-06');
    expect(calculateAge(new Date('2000-07-06'), today)).toBe(26);
    expect(calculateAge(new Date('2000-07-07'), today)).toBe(25); // aún no cumple 26
    expect(calculateAge(new Date('2000-06-06'), today)).toBe(26);
  });
});

describe('getAgeGateTier', () => {
  it('blocked para <13', () => {
    expect(getAgeGateTier(12)).toBe('blocked');
    expect(getAgeGateTier(0)).toBe('blocked');
  });
  it('parental para 13-17', () => {
    expect(getAgeGateTier(13)).toBe('parental');
    expect(getAgeGateTier(17)).toBe('parental');
  });
  it('passed para >=18', () => {
    expect(getAgeGateTier(18)).toBe('passed');
    expect(getAgeGateTier(65)).toBe('passed');
  });
});
```

---

## 📊 Analytics

Los eventos ya definidos:
- `AGE_GATE_TRIGGERED` con `tier: 'blocked' | 'parental' | 'passed'` y `age: number`
- Trackear en PostHog con opt-in del user_consent (task #114 fase A)

---

## ✅ Deliverable checklist (para Fable)

- [ ] Migración 154 aplicada + idempotente
- [ ] Componente `AgeGateModal.tsx` con 2 variants
- [ ] Wire en `app/onboarding/v2/profile.tsx`
- [ ] Helper `calculateAge()` y `getAgeGateTier()` en `src/utils/age-gate.ts`
- [ ] Tests unitarios passing
- [ ] Analytics event configurado
- [ ] TypeScript 0 errores

Estimación: **1-2 horas** para Fable.

---

**Prioridad:** V1.3 BLOQUEANTE compliance stores. Sin age gate documentado, Apple/Google pueden rechazar.
