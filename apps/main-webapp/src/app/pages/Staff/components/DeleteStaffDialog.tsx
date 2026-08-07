import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@store-credit-platform/web-components";
import type { Staff } from "@shared/types/api.types";
import { staffDisplayName } from "@shared/utils/staff.utils";

interface DeleteStaffDialogProps {
  staff: Staff | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending: boolean;
}

export function DeleteStaffDialog({
  staff,
  open,
  onOpenChange,
  onConfirm,
  pending,
}: DeleteStaffDialogProps) {
  const name = staff ? staffDisplayName(staff) : "this staff member";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete staff member</DialogTitle>
          <DialogDescription>
            Remove <strong className="text-foreground">{name}</strong> from your
            store. Their login will be blocked immediately. This is a soft
            delete — re-adding the same phone later restores the account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}