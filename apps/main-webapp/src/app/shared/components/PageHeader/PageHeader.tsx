import { cn } from "@store-credit-platform/web-components";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  className,
  children,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "animate-fade-in-up motion-reduce:animate-none",
        "bg-background/80 border-border sticky top-0 z-20 -mx-4 border-b px-4 pb-5 pt-4 backdrop-blur-md md:-mx-8 md:px-8 md:pt-6",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="bg-primary mt-2 h-5 w-[3px] shrink-0 rounded-full"
        />
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {children && <div className="mt-5">{children}</div>}
    </header>
  );
}
