import { useEffect, useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@store-credit-platform/web-components";
import { Check, X } from "lucide-react";
import { errorToastProperties } from "@shared/utils/misc.utils";
import { toast } from "sonner";
import type { MerchantRedemptionActionBody } from "@shared/types/api.types";

const CODE_LENGTH = 4;

/**
 * Code-entry dialog for the merchant approve / reject flow.
 *
 * Layout: centered modal (`Dialog` from web-components, `max-w-lg`),
 * headline "Approve redemption" / "Reject redemption", body copy
 * explaining the customer shows a 4-digit code at the till, a single
 * numeric input with `inputMode="numeric" maxLength=4`, primary CTA
 * "Confirm" + secondary "Cancel".
 *
 * On submit the dialog calls `onConfirm({ redemption_code, redemption_id })`
 * with the parsed numeric code. The parent wires the result to the
 * approve / reject mutation; the dialog surfaces the mutation's
 * pending + error state back into the form so the user sees a clear
 * "Saving..." label and an inline error message on mismatch.
 *
 * The input is auto-focused on open and re-focused on every render so
 * a manager can rapidly type the code from the customer's screen. We
 * also auto-select-all on focus for the same reason — most managers
 * will clear-and-type rather than append.
 */
export default function RedemptionCodeDialog({
  open,
  kind,
  customerName,
  isPending,
  errorMessage,
  onConfirm,
  onDismiss,
}: {
  open: boolean;
  kind: "approve" | "reject";
  customerName: string;
  isPending: boolean;
  errorMessage: string | null;
  onConfirm: (body: MerchantRedemptionActionBody) => void;
  onDismiss: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");

  // Reset the input every time the dialog opens so a stale value from
  // a previous attempt doesn't leak across open/close cycles.
  useEffect(() => {
    if (open) {
      setCode("");
    }
  }, [open]);

  // Auto-focus the input on open (NOT on every keystroke — the previous
  // version had `code` in the dep array, which re-fired `select()` on
  // each character and made the next keystroke overwrite the entire
  // field, causing "typing one digit eats the previous one" bugs).
  // Auto-select-all on open is still useful — a manager can clear-and-
  // type from the customer's screen in one motion.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(id);
  }, [open]);

  // The action label / icon swap by kind. The visual treatment is the
  // same (centered modal, single input) — only the CTA copy + intent
  // changes. Keeping it consistent reduces the surface for user error.
  const isApprove = kind === "approve";
  const headline = isApprove ? "Approve redemption" : "Reject redemption";
  const ctaLabel = isPending
    ? isApprove
      ? "Approving…"
      : "Rejecting…"
    : isApprove
      ? "Approve"
      : "Reject";

  // Submit is disabled when the code is not exactly 4 digits. We
  // intentionally don't accept partial codes — the SQL RPC verifies
  // an exact integer match, so 3 digits or 5 digits would always
  // mismatch anyway.
  const submitDisabled =
    isPending ||
    code.length !== CODE_LENGTH ||
    !/^\d+$/.test(code);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitDisabled) return;
    onConfirm({
      redemption_code: Number(code),
      // The dialog doesn't carry redemption_id directly — the parent
      // resolves it from `dialog.redemptionId`. We surface the code +
      // a placeholder id of 0; the parent ignores the id and uses
      // its own captured value.
      redemption_id: 0,
    } as MerchantRedemptionActionBody);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) return;
    if (isPending) {
      // Don't dismiss mid-submit.
      return;
    }
    onDismiss();
  };

  // Surface the dialog-side error as a toast too, so a manager whose
  // eyes are on the code field (not the inline error) still gets a
  // clear mismatch signal. We watch `errorMessage` and toast once per
  // distinct non-null value.
  useEffect(() => {
    if (!errorMessage) return;
    toast.error(errorMessage, errorToastProperties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorMessage]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <Check className="text-primary h-4 w-4" />
            ) : (
              <X className="text-destructive h-4 w-4" />
            )}
            {headline}
          </DialogTitle>
          <DialogDescription>
            Ask {customerName || "the customer"} to show the 4-digit code on
            their Pending tab. Enter the code below to{" "}
            {isApprove ? "approve" : "reject"} their request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="redemption_code">Redemption code</Label>
            <Input
              id="redemption_code"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={CODE_LENGTH}
              autoComplete="one-time-code"
              value={code}
              disabled={isPending}
              onChange={(e) => {
                // Strip non-digits + cap at CODE_LENGTH so the field
                // never holds stray characters.
                const cleaned = e.target.value
                  .replace(/\D/g, "")
                  .slice(0, CODE_LENGTH);
                setCode(cleaned);
              }}
              placeholder="0000"
              className="text-center font-mono text-2xl tracking-[0.4em]"
              aria-invalid={errorMessage ? true : undefined}
              aria-describedby={
                errorMessage ? "redemption_code_error" : undefined
              }
            />
            {errorMessage ? (
              <p
                id="redemption_code_error"
                className="text-destructive text-xs font-medium"
              >
                {errorMessage}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                4-digit code shown on the customer's pending request.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={onDismiss}
              className="h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isApprove ? "default" : "destructive"}
              disabled={submitDisabled}
              className="h-9"
            >
              {ctaLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
