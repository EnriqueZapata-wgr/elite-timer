/** Sprint Compliance 2 — Términos y Condiciones (staging in-app). */
import { LegalDocScreen } from '@/src/components/legal/LegalDocScreen';
import { TERMS_TITLE, TERMS_VERSION_LABEL, TERMS_SECTIONS } from '@/src/constants/legal-texts';

export default function TerminosScreen() {
  return (
    <LegalDocScreen
      title={TERMS_TITLE}
      versionLabel={TERMS_VERSION_LABEL}
      sections={TERMS_SECTIONS}
      // B-6 (MB-12): fuente única — el documento publicado (el del paywall).
      webUrl="https://somosatp.com/terminos"
    />
  );
}
