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
