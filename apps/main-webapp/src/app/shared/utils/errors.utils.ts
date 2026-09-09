import { isApiError } from "./api.utils";

// Display-time mapping only: queryFn still throws the raw backend Error so
// devtools show the truth; this just keeps machine strings out of the UI.
const NETWORK_PATTERN =
  /failed to fetch|networkerror|load failed|network request failed/i;

const MESSAGE_RULES: { test: RegExp; message: string }[] = [
  {
    test: /unauthorized|forbidden/i,
    message:
      "You don't have access to this. Ask your admin to check your account setup.",
  },
  {
    test: /invalid cursor|invalid branch ?id/i,
    message: "Something's off with this page's filters. Try adjusting them.",
  },
  {
    test: /redemption code does not match/i,
    message:
      "That code doesn't match the pending redemption. Double-check and try again.",
  },
  {
    test: /no pending redemption/i,
    message: "This redemption was already handled. Refresh to see the latest.",
  },
  {
    test: /a pending redemption already exists/i,
    message:
      "There's already a redemption waiting. Approve or reject it first.",
  },
  {
    test: /branch does not belong to merchant/i,
    message: "That branch isn't part of your store.",
  },
  {
    test: /not found|does not exist/i,
    message: "We couldn't find that record. It may have been removed.",
  },
];

// PostgREST/Supabase errors arrive as composite JSON blobs — never surface them raw.
function looksLikeJsonPayload(message: string): boolean {
  return /^\s*\{/.test(message) || /"code"\s*:/.test(message);
}

export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  let message: string | undefined;
  if (typeof error === "string") {
    message = error;
  } else if (isApiError(error)) {
    message = error.error;
  } else if (error instanceof Error) {
    message = error.message;
  }
  if (!message) return fallback;

  if (NETWORK_PATTERN.test(message)) {
    return "You're offline or the server is unreachable. Check your connection and try again.";
  }
  if (looksLikeJsonPayload(message)) return fallback;

  for (const rule of MESSAGE_RULES) {
    if (rule.test.test(message)) return rule.message;
  }
  return message.length <= 120 ? message : fallback;
}
