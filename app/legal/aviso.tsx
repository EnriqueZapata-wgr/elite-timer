/** Sprint Compliance 2 — Aviso de Privacidad Integral (staging in-app). */
import { LegalDocScreen } from '@/src/components/legal/LegalDocScreen';
import {
  AVISO_INTEGRAL_TITLE,
  AVISO_INTEGRAL_VERSION_LABEL,
  AVISO_INTEGRAL_SECTIONS,
} from '@/src/constants/legal-texts';

export default function AvisoPrivacidadScreen() {
  return (
    <LegalDocScreen
      title={AVISO_INTEGRAL_TITLE}
      versionLabel={AVISO_INTEGRAL_VERSION_LABEL}
      sections={AVISO_INTEGRAL_SECTIONS}
    />
  );
}
