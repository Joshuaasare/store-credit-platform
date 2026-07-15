import constants from "@shared/constants";
import { ExternalToast } from "sonner";

export const toastProperties: ExternalToast = {
  position: "top-center",
  closeButton: true,
  duration: constants.toast.SHORT_TOAST_DURATION,
  richColors: true,
  id: "smart-school-toast",
};

export const successToastProperties: ExternalToast = {
  position: "top-center",
  closeButton: true,
  duration: constants.toast.SHORT_TOAST_DURATION,
  richColors: true,
  id: "smart-school-toast",
};

export const errorToastProperties: ExternalToast = {
  position: "top-center",
  closeButton: true,
  duration: constants.toast.LONG_TOAST_DURATION,
  richColors: true,
  id: "smart-school-error-toast",
};
