# i18n Fase 1 — Setup Infrastructure (Task #118)

**Fecha:** 2026-07-06 noche
**Autor:** Cowork overnight
**Estado:** Spec + arquitectura + baseline code. Implementación pendiente Fable en próximo sprint.

## Objetivo Fase 1

Preparar la app para soportar múltiples idiomas SIN traducir strings todavía. Solo infra + estructura + un archivo `es.json` con los strings actuales extraídos.

**Beneficio inmediato:** cero, funcionalmente igual.
**Beneficio futuro:** cambiar a 2do idioma toma horas en vez de semanas.

**Costo si no lo hacemos ahora:** cada semana que pasa sin i18n → cientos de strings más hardcoded que refactorear después.

---

## 📦 Stack elegido

**Biblioteca:** `i18next` + `react-i18next`

**Por qué esta y no `react-native-i18n`:**
- react-native-i18n está deprecated
- i18next es el estándar de-facto en React ecosystem
- Soporta pluralización, interpolación, fallback languages
- Detección de idioma del sistema automática
- Namespaces (dividir strings en múltiples archivos por dominio)
- Compatible con Expo SDK 54

**Deps a agregar:**

```bash
npx expo install i18next react-i18next expo-localization
```

`expo-localization` — para detectar idioma del sistema en el device.

---

## 📂 Estructura de archivos

```
src/
├── i18n/
│   ├── index.ts           # Setup principal i18next
│   ├── config.ts          # Config (idiomas soportados, defaults)
│   ├── locales/
│   │   ├── es/            # Español México (default)
│   │   │   ├── common.json      # Comunes: botones, labels, errores
│   │   │   ├── onboarding.json  # Onboarding v2
│   │   │   ├── hoy.json         # HOY dashboard
│   │   │   ├── agenda.json      # Agenda
│   │   │   ├── argos.json       # ARGOS chat + insights
│   │   │   ├── clinical.json    # Historia clínica + labs
│   │   │   ├── nutrition.json   # Nutrición
│   │   │   ├── fitness.json     # Fitness
│   │   │   ├── mind.json        # Mente + journal + meditación
│   │   │   ├── cycle.json       # Ciclo menstrual
│   │   │   ├── tests.json       # Tests
│   │   │   ├── settings.json    # Settings + privacidad + legal
│   │   │   ├── economy.json     # Electrones + protones + wallet
│   │   │   └── errors.json      # Mensajes de error unificados
│   │   └── en/            # Placeholder (vacío) — se llena en V1.5
│   │       └── ... (misma estructura)
```

---

## 🛠️ Setup base — `src/i18n/index.ts`

```typescript
/**
 * i18n Setup — Fase 1 infrastructure.
 *
 * Auto-detecta idioma del sistema (Localization.locale).
 * Fallback a 'es' (español México).
 * Namespaces por dominio funcional.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Import de recursos (Fase 1: solo español)
import esCommon from './locales/es/common.json';
import esOnboarding from './locales/es/onboarding.json';
import esHoy from './locales/es/hoy.json';
import esAgenda from './locales/es/agenda.json';
import esArgos from './locales/es/argos.json';
import esClinical from './locales/es/clinical.json';
import esNutrition from './locales/es/nutrition.json';
import esFitness from './locales/es/fitness.json';
import esMind from './locales/es/mind.json';
import esCycle from './locales/es/cycle.json';
import esTests from './locales/es/tests.json';
import esSettings from './locales/es/settings.json';
import esEconomy from './locales/es/economy.json';
import esErrors from './locales/es/errors.json';

const resources = {
  es: {
    common: esCommon,
    onboarding: esOnboarding,
    hoy: esHoy,
    agenda: esAgenda,
    argos: esArgos,
    clinical: esClinical,
    nutrition: esNutrition,
    fitness: esFitness,
    mind: esMind,
    cycle: esCycle,
    tests: esTests,
    settings: esSettings,
    economy: esEconomy,
    errors: esErrors,
  },
  // en: {...} — pendiente V1.5 traducciones
};

const deviceLocale = Localization.locale?.slice(0, 2) || 'es';
const initialLanguage = ['es', 'en'].includes(deviceLocale) ? deviceLocale : 'es';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'es',
    defaultNS: 'common',
    ns: Object.keys(resources.es),
    interpolation: {
      escapeValue: false, // React ya escapa
    },
    compatibilityJSON: 'v3', // Compat React Native
  });

export default i18n;
```

---

## 🎯 Config — `src/i18n/config.ts`

```typescript
export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  es: 'Español',
  en: 'English',
};

export const DEFAULT_LANGUAGE: SupportedLanguage = 'es';
```

---

## 📝 Ejemplo `src/i18n/locales/es/common.json`

```json
{
  "buttons": {
    "continue": "Continuar",
    "cancel": "Cancelar",
    "save": "Guardar",
    "delete": "Eliminar",
    "confirm": "Confirmar",
    "close": "Cerrar",
    "back": "Atrás",
    "next": "Siguiente",
    "done": "Listo",
    "retry": "Reintentar",
    "loading": "Cargando..."
  },
  "labels": {
    "email": "Correo electrónico",
    "password": "Contraseña",
    "name": "Nombre",
    "date": "Fecha",
    "time": "Hora",
    "today": "Hoy",
    "yesterday": "Ayer",
    "tomorrow": "Mañana"
  },
  "actions": {
    "search": "Buscar",
    "filter": "Filtrar",
    "share": "Compartir",
    "copy": "Copiar",
    "download": "Descargar",
    "upload": "Subir",
    "edit": "Editar"
  },
  "status": {
    "success": "Éxito",
    "error": "Error",
    "warning": "Aviso",
    "info": "Información",
    "pending": "Pendiente",
    "completed": "Completado"
  }
}
```

---

## 🔄 Cómo usar en un componente

**Antes (hardcoded):**

```tsx
<EliteText>Continuar</EliteText>
<EliteText>Bienvenido a ATP</EliteText>
```

**Después (i18n):**

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation(['common', 'onboarding']);

  return (
    <>
      <EliteText>{t('buttons.continue')}</EliteText>
      <EliteText>{t('onboarding:welcome.title')}</EliteText>
    </>
  );
}
```

**Con interpolación:**

```json
{
  "welcome": {
    "greeting": "Hola, {{name}}"
  }
}
```

```tsx
<EliteText>{t('onboarding:welcome.greeting', { name: user.name })}</EliteText>
```

**Con pluralización:**

```json
{
  "electrons": {
    "count_one": "{{count}} electrón",
    "count_other": "{{count}} electrones"
  }
}
```

```tsx
<EliteText>{t('economy:electrons.count', { count: 5 })}</EliteText>
// → "5 electrones"
```

---

## 🔁 Cambio de idioma en runtime

En Settings > Idioma:

```tsx
import i18n from '@/src/i18n';

// Cambiar idioma
await i18n.changeLanguage('en');

// Persist a AsyncStorage
await AsyncStorage.setItem('user_language', 'en');
```

Al arranque de app: leer `user_language` de AsyncStorage y pasar a i18n init si existe.

---

## 📋 Migración estrategia (para Fable en próximo sprint)

**NO** vamos a migrar TODOS los strings de golpe. Estrategia:

**Sprint 1 (V1.3):** solo infra + `common.json` con botones/labels universales.

**Sprint 2 (V1.4):** módulo por módulo:
- Onboarding v2 (recién creado, fácil de migrar)
- HOY dashboard
- Settings + Privacidad

**Sprint 3 (V1.4):** el resto de módulos.

**Sprint 4 (V1.5):** traducciones a inglés (Claude Sonnet 5 puede hacer draft, revisión humana).

**Regla:** cuando toques una pantalla para otra cosa, migra sus strings al pasar. Extract-and-replace incremental.

---

## 🎯 Deliverables Fase 1

Este archivo describe la infra. Los deliverables prácticos son:

1. ✅ Doc de arquitectura (este archivo)
2. ⏳ Instalación de deps (`i18next`, `react-i18next`, `expo-localization`) — próximo sprint Fable
3. ⏳ Estructura de folders `src/i18n/...` — próximo sprint Fable
4. ⏳ `common.json` inicial con botones + labels universales — próximo sprint Fable
5. ⏳ Setup en `app/_layout.tsx` (import i18n antes de render) — próximo sprint Fable
6. ⏳ Wrap primer componente con `useTranslation` como POC — próximo sprint Fable
7. ⏳ Settings > Idioma UI (dropdown español / inglés) — V1.4

**Estimación implementación Fase 1:** 3-4 horas.

---

## 🌍 V1.5 Fase 2 (Traducciones)

- Draft traducciones inglés con Claude Sonnet 5:
  - Prompt: "Traduce este JSON de un app de biohacking/salud del español mexicano al inglés US, manteniendo el tono cercano-directo del stack ATP"
  - Human review de los strings críticos (medical, legal, UX critical)
- QA en device con language toggle

**Estimación implementación Fase 2:** 2-3 días (o menos si Sonnet 5 hace el heavy lifting).

---

**Ver memoria:** none específica todavía. Al implementar, capturar decisiones.

**Prioridad:** V1.3 infra (mientras tengamos capacidad). V1.4 en migración incremental. V1.5 traducciones.
