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
