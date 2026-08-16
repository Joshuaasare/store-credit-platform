import { Moon, Sun } from "lucide-react";
import { useTheme } from "@shared/providers/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "slate" : "light")}
      className="from-primary/10 via-card to-card ring-primary/10 hover:border-primary/30 focus-visible:ring-ring fixed right-4 top-5 z-50 flex h-11 w-11 items-center justify-center rounded-2xl border bg-gradient-to-br shadow-[0_8px_30px_rgba(0,0,0,0.12)] outline-none ring-1 backdrop-blur-2xl transition-all hover:shadow-md focus-visible:ring-2 dark:shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Switch to dark theme" : "Switch to light theme"}
    >
      {isLight ? (
        <Moon className="text-foreground h-5 w-5 transition-transform duration-300 hover:rotate-12" />
      ) : (
        <Sun className="text-foreground h-5 w-5 transition-transform duration-300 hover:rotate-90" />
      )}
    </button>
  );
}
