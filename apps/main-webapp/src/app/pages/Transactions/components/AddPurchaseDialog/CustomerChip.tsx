import { BaseCustomer } from "@shared/types/api.types";
import { Monogram, Button, cn } from "@store-credit-platform/web-components";
import { formatDisplayNumber } from "@shared/utils/ui.utils";
import { customerRowInitials } from "@shared/utils/customers.utils";

interface CustomerChipProps {
  customer: BaseCustomer;
  onChange: () => void;
  disabled?: boolean;
}

export function CustomerChip({ customer, onChange, disabled }: CustomerChipProps) {
  const surname = (customer.surname ?? "").trim();
  const otherNames = (customer.other_names ?? "").trim();
  const fullName = `${surname}${otherNames ? " " + otherNames : ""}`.trim();
  const displayName = fullName || formatDisplayNumber(customer.phone) || "Customer";
  const initials = customerRowInitials({
    user_id: customer.user_id,
    customer_name: displayName,
    phone: customer.phone,
  });
  const seed =
    customer.user_id ?? customer.phone ?? String(customer.id);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2",
      )}
    >
      <Monogram text={initials} seed={seed} imageUrl={customer.avatar_url} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold tracking-tight">
          {displayName}
        </div>
        {customer.phone && (
          <div className="text-muted-foreground truncate text-xs">
            {formatDisplayNumber(customer.phone)}
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onChange}
        disabled={disabled}
        className="text-primary hover:text-primary h-8 px-2 text-xs"
      >
        Change
      </Button>
    </div>
  );
}
