/** T1 Cronotipo — el quiz vive en /quiz/chronotype; redirect en vez de re-export (OLA0 QW-6). */
import { Redirect } from 'expo-router';
export default function ChronotypeTestRedirect() { return <Redirect href="/quiz/chronotype" />; }
