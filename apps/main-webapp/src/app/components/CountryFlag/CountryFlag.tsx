import { getCountryByCode, type CountryCode } from "@shared/utils/countries";

interface CountryFlagProps {
  code: CountryCode | string;
  className?: string;
  /** Rendered width in px. Height is derived (3:2 aspect). */
  size?: number;
  title?: string;
}

/**
 * Renders a country flag as an image from flagcdn so it displays reliably
 * across platforms (flag emoji render as tofu on iOS Simulator and Windows).
 */
export function CountryFlag({
  code,
  className,
  size = 20,
  title,
}: CountryFlagProps) {
  const lc = String(code).toLowerCase();
  const country = getCountryByCode(code as CountryCode);
  const alt = title ?? country?.name ?? String(code);
  const height = Math.round((size * 2) / 3);

  return (
    <img
      src={`https://flagcdn.com/${lc}.svg`}
      alt={alt}
      width={size}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    />
  );
}