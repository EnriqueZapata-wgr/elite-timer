/** Sprint Compliance 2 — Términos y Condiciones (staging in-app). */
import { LegalDocScreen } from '@/src/components/legal/LegalDocScreen';
import { TERMS_TITLE, TERMS_VERSION_LABEL, TERMS_SECTIONS } from '@/src/constants/legal-texts';

export default function TerminosScreen() {
  return (
    <LegalDocScreen
      title={TERMS_TITLE}
      versionLabel={TERMS_VERSION_LABEL}
      sections={TERMS_SECTIONS}
    />
  );
}
