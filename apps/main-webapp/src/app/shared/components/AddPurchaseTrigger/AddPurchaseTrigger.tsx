import { Phone, Plus, QrCode } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@store-credit-platform/web-components";

export type AddPurchaseEntryMode = "phone" | "scan";

interface AddPurchaseTriggerProps {
  onPick: (mode: AddPurchaseEntryMode) => void;
  disabled?: boolean;
}

export function AddPurchaseTrigger({
  onPick,
  disabled,
}: AddPurchaseTriggerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button size="sm" className="rounded-sm shadow-sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add purchase
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuItem onSelect={() => onPick("phone")}>
          <Phone className="mr-1 h-4 w-4" /> Enter phone number
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onPick("scan")}>
          <QrCode className="mr-1 h-4 w-4" /> Scan QR code
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
