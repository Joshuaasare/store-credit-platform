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

/**
 * Checks if a value is empty.
 * Returns true for:
 * - null or undefined
 * - empty strings
 * - empty arrays
 * - empty objects
 * - zero for numbers (optional, controlled by treatZeroAsEmpty)
 *
 * @param value The value to check
 * @param treatZeroAsEmpty Whether to treat 0 as empty (default: false)
 * @returns boolean indicating if the value is empty
 */
export const isEmpty = (value: any, treatZeroAsEmpty = false) => {
  // Check for null or undefined
  if (value === undefined) {
    return true;
  }

  if (value == null) {
    return true;
  }

  // Check for empty strings
  if (typeof value === "string") {
    return value.trim() === "";
  }

  // Check for numbers
  if (typeof value === "number") {
    return treatZeroAsEmpty ? value === 0 : false;
  }

  // Check for arrays
  if (Array.isArray(value)) {
    return !value || value.length === 0;
  }

  // Check for objects
  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  // Maps and Sets
  if (value instanceof Map || value instanceof Set) {
    return value.size === 0;
  }

  // For other types (boolean, functions, etc.)
  return false;
};
