/**
 * Country data for the phone number country selector.
 *
 * Mirrors apps/main-webapp/src/app/shared/utils/countries.ts so both apps
 * share the same dial codes + format/parse semantics. Kept as a parallel
 * copy (rather than imported from the webapp) because the webapp's version
 * isn't in a shared workspace lib — extract to libs/shared-utils if the
 * duplication grows.
 */
export interface Country {
  code: CountryCode;
  dialCode: string;
  name: string;
  flag: string;
}

export enum CountryCode {
  GH = "GH",
  NG = "NG",
  CI = "CI",
  SN = "SN",
  BF = "BF",
  ML = "ML",
  TG = "TG",
  BJ = "BJ",
  KE = "KE",
  TZ = "TZ",
  UG = "UG",
  RW = "RW",
  ET = "ET",
  ZA = "ZA",
  ZW = "ZW",
  ZM = "ZM",
  BW = "BW",
  EG = "EG",
  MA = "MA",
  TN = "TN",
  DZ = "DZ",
  US = "US",
  GB = "GB",
  CA = "CA",
}

export const countries: Country[] = [
  { code: CountryCode.GH, dialCode: "233", name: "Ghana", flag: "🇬🇭" },
  { code: CountryCode.NG, dialCode: "234", name: "Nigeria", flag: "🇳🇬" },
  { code: CountryCode.CI, dialCode: "225", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: CountryCode.SN, dialCode: "221", name: "Senegal", flag: "🇸🇳" },
  { code: CountryCode.BF, dialCode: "226", name: "Burkina Faso", flag: "🇧🇫" },
  { code: CountryCode.ML, dialCode: "223", name: "Mali", flag: "🇲🇱" },
  { code: CountryCode.TG, dialCode: "228", name: "Togo", flag: "🇹🇬" },
  { code: CountryCode.BJ, dialCode: "229", name: "Benin", flag: "🇧🇯" },
  { code: CountryCode.KE, dialCode: "254", name: "Kenya", flag: "🇰🇪" },
  { code: CountryCode.TZ, dialCode: "255", name: "Tanzania", flag: "🇹🇿" },
  { code: CountryCode.UG, dialCode: "256", name: "Uganda", flag: "🇺🇬" },
  { code: CountryCode.RW, dialCode: "250", name: "Rwanda", flag: "🇷🇼" },
  { code: CountryCode.ET, dialCode: "251", name: "Ethiopia", flag: "🇪🇹" },
  { code: CountryCode.ZA, dialCode: "27", name: "South Africa", flag: "🇿🇦" },
  { code: CountryCode.ZW, dialCode: "263", name: "Zimbabwe", flag: "🇿🇼" },
  { code: CountryCode.ZM, dialCode: "260", name: "Zambia", flag: "🇿🇲" },
  { code: CountryCode.BW, dialCode: "267", name: "Botswana", flag: "🇧🇼" },
  { code: CountryCode.EG, dialCode: "20", name: "Egypt", flag: "🇪🇬" },
  { code: CountryCode.MA, dialCode: "212", name: "Morocco", flag: "🇲🇦" },
  { code: CountryCode.TN, dialCode: "216", name: "Tunisia", flag: "🇹🇳" },
  { code: CountryCode.DZ, dialCode: "213", name: "Algeria", flag: "🇩🇿" },
  { code: CountryCode.US, dialCode: "1", name: "United States", flag: "🇺🇸" },
  { code: CountryCode.GB, dialCode: "44", name: "United Kingdom", flag: "🇬🇧" },
  { code: CountryCode.CA, dialCode: "1", name: "Canada", flag: "🇨🇦" },
];

export const defaultCountry: Country = countries[0];

export function getCountryByCode(code: CountryCode): Country | undefined {
  return countries.find((c) => c.code === code);
}

export function getCountryByDialCode(dialCode: string): Country | undefined {
  return countries.find((c) => c.dialCode === dialCode);
}

/**
 * Compose the full international format (no `+`, no spaces) from a local
 * number + country. e.g. ("0244444444", GH) → "233244444444". The backend's
 * `normalizePhone` accepts this shape and canonicalizes to E.164.
 */
export function formatPhoneWithCountry(
  phone: string,
  countryCode = CountryCode.GH,
): string {
  const country = getCountryByCode(countryCode);
  if (!country) return phone;
  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.startsWith(country.dialCode)) return cleanPhone;
  if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
  return `${country.dialCode}${cleanPhone}`;
}

export function parsePhoneNumber(fullNumber: string): {
  country: Country | undefined;
  localNumber: string;
} {
  const cleanNumber = fullNumber.replace(/^\+/, "").replace(/\D/g, "");
  const sortedCountries = [...countries].sort(
    (a, b) => b.dialCode.length - a.dialCode.length,
  );
  for (const country of sortedCountries) {
    if (cleanNumber.startsWith(country.dialCode)) {
      let localNumber = cleanNumber.substring(country.dialCode.length);
      if (localNumber.length === 9) localNumber = `0${localNumber}`;
      return { country, localNumber };
    }
  }
  return { country: undefined, localNumber: cleanNumber };
}