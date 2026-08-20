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

  // Reset the input on each open so a stale value doesn't leak across cycles.
  useEffect(() => {
    if (open) {
      setCode("");
    }
  }, [open]);

  // Don't put `code` in the dep array — re-firing `select()` on each
  // keystroke makes the next digit overwrite the whole field.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(id);
  }, [open]);

  const isApprove = kind === "approve";
  const headline = isApprove ? "Approve redemption" : "Reject redemption";
  const ctaLabel = isPending
    ? isApprove
      ? "Approving…"
      : "Rejecting…"
    : isApprove
      ? "Approve"
      : "Reject";

  // The SQL RPC verifies an exact integer match, so partial codes always mismatch.
  const submitDisabled =
    isPending ||
    code.length !== CODE_LENGTH ||
    !/^\d+$/.test(code);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitDisabled) return;
    onConfirm({
      redemption_code: Number(code),
      // Parent owns redemption_id (from `dialog.redemptionId`); 0 is a placeholder.
      redemption_id: 0,
    } as MerchantRedemptionActionBody);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) return;
    if (isPending) return;
    onDismiss();
  };

  // Toast the mismatch so a manager watching the code field still sees it.
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
