import constants from "@shared/constants";
import { ExternalToast } from "sonner";

export const toastProperties: ExternalToast = {
  position: "top-center",
  closeButton: true,
  duration: constants.toast.SHORT_TOAST_DURATION,
  richColors: true,
  id: "smart-credit-toast",
};

export const successToastProperties: ExternalToast = {
  position: "top-center",
  closeButton: true,
  duration: constants.toast.SHORT_TOAST_DURATION,
  richColors: true,
  id: "smart-credit-success-toast",
};

export const errorToastProperties: ExternalToast = {
  position: "top-center",
  closeButton: true,
  duration: constants.toast.LONG_TOAST_DURATION,
  richColors: true,
  id: "smart-credit-error-toast",
};

export const isEmpty = (value: any, treatZeroAsEmpty = false) => {
  if (value === undefined) {
    return true;
  }

  if (value == null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  if (typeof value === "number") {
    return treatZeroAsEmpty ? value === 0 : false;
  }

  if (Array.isArray(value)) {
    return !value || value.length === 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  if (value instanceof Map || value instanceof Set) {
    return value.size === 0;
  }

  return false;
};
