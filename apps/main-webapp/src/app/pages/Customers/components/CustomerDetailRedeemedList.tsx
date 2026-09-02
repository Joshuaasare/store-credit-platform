import { CustomerDetailCreditRow } from "@shared/types/api.types";
import { formatGHS, formatIsoDate } from "@shared/utils/format";

interface CustomerDetailRedeemedListProps {
  credits: CustomerDetailCreditRow[];
}

export function CustomerDetailRedeemedList({
  credits,
}: CustomerDetailRedeemedListProps) {
  if (credits.length === 0) return null;

  return (
    <ul className="border-t text-sm">
      {credits.map((credit, idx) => (
        <li
          key={credit.id}
          className={
            idx === 0
              ? "px-5 py-3"
              : "px-5 py-3 border-t"
          }
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-semibold tabular-nums">
              {formatGHS(credit.credit_amount)}
            </span>
            <span className="text-muted-foreground text-xs">
              from {formatGHS(credit.redeemed_total)} redeemed
            </span>
          </div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            Issued {formatIsoDate(credit.created_at)}
            {credit.branch.name?.trim() && (
              <> · {credit.branch.name}</>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
