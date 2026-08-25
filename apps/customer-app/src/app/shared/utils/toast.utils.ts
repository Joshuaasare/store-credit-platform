import { toast, type ToastPosition } from "sonner-native";

// Durations mirror the webapp's Sonner convention (success 5s, error 10s) so
// toasts feel consistent across platforms.
export const SHORT_TOAST_DURATION = 5000;
export const LONG_TOAST_DURATION = 10000;

// sonner-native's full toast-options type (ExternalToast) isn't exported, so
// this is a minimal structurally-compatible subset for our helpers.
export type ToastOptions = {
  duration?: number;
  id?: string | number;
  position?: ToastPosition;
  closeButton?: boolean;
};

export const successToastOptions: ToastOptions = {
  duration: SHORT_TOAST_DURATION,
};

export const errorToastOptions: ToastOptions = {
  duration: LONG_TOAST_DURATION,
};

// Tap-to-dismiss wrapper. sonner-native's built-in close button is intercepted
// by the RNGH tap gesture on Android for single non-stacked toasts, so we wire
// onPress (which the swipe handler fires on every tap) to dismiss the toast by
// its own id. Swipe-up dismissal still works independently.
export function toastSuccess(message: string) {
  let id: string | number | undefined;
  id = toast.success(message, {
    duration: SHORT_TOAST_DURATION,
    onPress: () => {
      if (id != null) toast.dismiss(id);
    },
  });
  return id;
}

export function toastError(message: string) {
  let id: string | number | undefined;
  id = toast.error(message, {
    duration: LONG_TOAST_DURATION,
    onPress: () => {
      if (id != null) toast.dismiss(id);
    },
  });
  return id;
}