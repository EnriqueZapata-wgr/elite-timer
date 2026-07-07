import { usePostHog } from 'posthog-react-native';

export const ATP_EVENTS = {
  APP_OPENED: 'app_opened',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  FLOW_STARTED: 'flow_started',
  FLOW_COMPLETED: 'flow_completed',
  FLOW_FAILED: 'flow_failed',
  ELECTRON_AWARDED: 'electron_awarded',
  ARGOS_MESSAGE_SENT: 'argos_message_sent',
  PAYWALL_SHOWN: 'paywall_shown',
  PAYWALL_DISMISSED: 'paywall_dismissed',
  PAYWALL_CONVERTED: 'paywall_converted',
  FOUNDER_PURCHASE_STARTED: 'founder_purchase_started',
  FOUNDER_PURCHASE_COMPLETED: 'founder_purchase_completed',
  // Ayuno — funnel (Step AYUNO REWRITE)
  FAST_START_ATTEMPTED: 'fast_start_attempted',
  FAST_START_SUCCEEDED: 'fast_start_succeeded',
  FAST_START_FAILED: 'fast_start_failed',
  FAST_BREAK_ATTEMPTED: 'fast_break_attempted',
  FAST_BREAK_SUCCEEDED: 'fast_break_succeeded',
  FAST_BREAK_FAILED: 'fast_break_failed',
  FAST_CANCEL_ATTEMPTED: 'fast_cancel_attempted',
  FAST_CANCEL_SUCCEEDED: 'fast_cancel_succeeded',
  FAST_CANCEL_FAILED: 'fast_cancel_failed',
  FAST_DELETE_ATTEMPTED: 'fast_delete_attempted',
  FAST_DELETE_SUCCEEDED: 'fast_delete_succeeded',
  FAST_DELETE_FAILED: 'fast_delete_failed',
  FAST_PICKER_OPENED: 'fast_picker_opened',
  FAST_PICKER_DISMISSED: 'fast_picker_dismissed',
  FAST_EDIT_ATTEMPTED: 'fast_edit_attempted',
  FAST_EDIT_SUCCEEDED: 'fast_edit_succeeded',
  FAST_EDIT_FAILED: 'fast_edit_failed',
  // Edad ATP v2 — captura (Sprint 2)
  EDAD_ATP_CAPTURE_SCREEN_VIEWED: 'edad_atp_capture_screen_viewed',
  EDAD_ATP_BIOMARKERS_SAVED: 'edad_atp_biomarkers_saved',
  EDAD_ATP_COMPOSITION_SAVED: 'edad_atp_composition_saved',
  EDAD_ATP_VITALS_SAVED: 'edad_atp_vitals_saved',
  EDAD_ATP_QUESTIONNAIRE_COMPLETED: 'edad_atp_questionnaire_completed',
  EDAD_ATP_RESULT_PREVIEWED: 'edad_atp_result_previewed',
  EDAD_ATP_CE_THRESHOLD_CROSSED: 'edad_atp_ce_threshold_crossed',
  // Edad ATP v2.5 — integración con datos existentes
  EDAD_ATP_DATA_PREPOPULATED: 'edad_atp_data_prepopulated',
  EDAD_ATP_SHARED: 'edad_atp_shared',
  // MEGA COMPLETION — flujo completo
  EDAD_ATP_CINEMATIC_PLAYED: 'edad_atp_cinematic_played',
  EDAD_ATP_RECALCULATED: 'edad_atp_recalculated',
  EDAD_ATP_SUBEDAD_VIEWED: 'edad_atp_subedad_viewed',
  EDAD_ATP_FUNCTIONAL_TEST_COMPLETED: 'edad_atp_functional_test_completed',
  // Parser v2 — confirmación pre-guardado
  LAB_PARSER_V2_REVIEWED: 'lab_parser_v2_reviewed',
  LAB_PARSER_V2_CONFIRMED: 'lab_parser_v2_confirmed',
  // Compliance (#41/#42, overnight 2026-07-06)
  AGE_GATE_TRIGGERED: 'age_gate_triggered',
  MEDICAL_DISCLAIMER_SHOWN: 'medical_disclaimer_shown',
  MEDICAL_DISCLAIMER_ACCEPTED: 'medical_disclaimer_accepted',
} as const;

export type AtpEventName = typeof ATP_EVENTS[keyof typeof ATP_EVENTS];

export function useAnalytics() {
  const posthog = usePostHog();
  return {
    track: (event: AtpEventName, props?: Record<string, any>) => {
      posthog?.capture(event, props);
    },
    identify: (userId: string, traits?: Record<string, any>) => {
      posthog?.identify(userId, traits);
    },
    reset: () => posthog?.reset(),
  };
}
