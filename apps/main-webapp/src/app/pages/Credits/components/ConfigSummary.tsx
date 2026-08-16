import { Sparkles } from "lucide-react";

interface RunningSummaryValues {
  credit_type: "percentage" | "fixed";
  percentage_credit_value: number | null;
  fixed_credit_value: number | null;
  threshold_amount: number | null;
  eligible_window: number | null;
  credit_validity: number | null;
  maximum_allowed_credit: number | null;
  cumulative_scope: "per_branch" | "merchant_wide";
}

interface FixedSummaryValues {
  credit_type: "percentage" | "fixed";
  percentage_credit_value: number | null;
  fixed_credit_value: number | null;
  maximum_allowed_credit: number | null;
  start_date: number | null;
  end_date: number | null;
}

type Accent = "primary" | "indigo" | "amber";

const ACCENTS: Record<Accent, { card: string; icon: string }> = {
  primary: { card: "bg-muted/30 border-primary/20", icon: "text-primary" },
  indigo: {
    card: "border-indigo-100 bg-indigo-50/60 dark:border-indigo-500/30 dark:bg-indigo-500/10",
    icon: "text-indigo-500 dark:text-indigo-400",
  },
  amber: {
    card: "border-amber-100 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10",
    icon: "text-amber-500 dark:text-amber-400",
  },
};

function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold">{children}</strong>;
}

function SummaryCard({
  children,
  accent = "primary",
}: {
  children: React.ReactNode;
  accent?: Accent;
}) {
  const a = ACCENTS[accent];
  return (
    <div className={`rounded-lg border p-3 ${a.card}`}>
      <div className="flex items-start gap-2.5">
        <Sparkles className={`mt-0.5 h-4 w-4 shrink-0 ${a.icon}`} />
        <p className="text-sm leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

export function RunningConfigSummary(v: RunningSummaryValues & { accent?: Accent }) {
  const accent = v.accent;
  let reward: React.ReactNode;
  if (v.credit_type === "percentage") {
    reward =
      v.percentage_credit_value != null ? (
        <>
          Customers earn <B>{v.percentage_credit_value}%</B> of their spend
          back as credit
        </>
      ) : (
        "Customers earn a percentage of their spend back as credit"
      );
  } else {
    reward =
      v.fixed_credit_value != null ? (
        <>
          Customers earn <B>GH₵{v.fixed_credit_value}</B> back as credit on
          each qualifying purchase
        </>
      ) : (
        "Customers earn a flat credit amount on each qualifying purchase"
      );
  }

  let trigger: React.ReactNode;
  if (v.threshold_amount != null) {
    trigger =
      v.eligible_window != null ? (
        <>
          {" "}once they've spent <B>GH₵{v.threshold_amount}</B> in the last{" "}
          <B>{v.eligible_window} days</B>
        </>
      ) : (
        <>
          {" "}once a single purchase reaches <B>GH₵{v.threshold_amount}</B>
        </>
      );
  } else {
    trigger = " on every purchase";
  }

  let validity: React.ReactNode;
  if (v.credit_validity != null) {
    validity = (
      <>
        {" "}
        Credit expires after <B>{v.credit_validity} days</B>.
      </>
    );
  } else {
    validity = " Credit never expires.";
  }

  let cap: React.ReactNode = null;
  if (v.credit_type === "percentage" && v.maximum_allowed_credit != null) {
    cap = (
      <>
        {" "}
        Capped at <B>GH₵{v.maximum_allowed_credit}</B> per purchase.
      </>
    );
  }

  const scope =
    v.cumulative_scope === "merchant_wide"
      ? " Spend counts across all your branches together."
      : " Spend counts at each branch separately.";

  return (
    <SummaryCard accent={accent}>
      {reward}
      {trigger}. {validity}
      {cap}
      {scope}
    </SummaryCard>
  );
}

export function FixedConfigSummary(v: FixedSummaryValues & { accent?: Accent }) {
  const accent = v.accent;
  let reward: React.ReactNode;
  if (v.credit_type === "percentage") {
    reward =
      v.percentage_credit_value != null ? (
        <>
          <B>{v.percentage_credit_value}%</B> cashback
        </>
      ) : (
        "Percentage cashback"
      );
  } else {
    reward =
      v.fixed_credit_value != null ? (
        <>
          <B>GH₵{v.fixed_credit_value}</B> cashback
        </>
      ) : (
        "Flat cashback"
      );
  }

  let cap: React.ReactNode = null;
  if (v.credit_type === "percentage" && v.maximum_allowed_credit != null) {
    cap = (
      <>
        {" "}
        capped at <B>GH₵{v.maximum_allowed_credit}</B>
      </>
    );
  }

  let window: React.ReactNode;
  if (v.start_date != null && v.end_date != null) {
    window = (
      <>
        {" "}
        Active <B>{formatEpoch(v.start_date)}</B> –{" "}
        <B>{formatEpoch(v.end_date)}</B>.
      </>
    );
  } else if (v.start_date != null) {
    window = (
      <>
        {" "}
        Active from <B>{formatEpoch(v.start_date)}</B>.
      </>
    );
  } else if (v.end_date != null) {
    window = (
      <>
        {" "}
        Active until <B>{formatEpoch(v.end_date)}</B>.
      </>
    );
  } else {
    window = " No active window set.";
  }

  return (
    <SummaryCard accent={accent}>
      {reward}
      {cap}. {window} Listed to staff; no credit is issued automatically.
    </SummaryCard>
  );
}

function formatEpoch(epoch: number): string {
  return new Date(epoch).toLocaleDateString("default", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}