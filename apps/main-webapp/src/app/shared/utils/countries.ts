/**
 * Country data for phone number country selector
 * Focused on African countries initially, with Ghana as default
 */

export interface Country {
  code: CountryCode; // Country code (e.g., "GH")
  dialCode: string; // Dial code without + (e.g., "233")
  name: string; // Country name
  flag: string; // Flag emoji
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
  // West Africa
  { code: CountryCode.GH, dialCode: "233", name: "Ghana", flag: "🇬🇭" },
  { code: CountryCode.NG, dialCode: "234", name: "Nigeria", flag: "🇳🇬" },
  { code: CountryCode.CI, dialCode: "225", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: CountryCode.SN, dialCode: "221", name: "Senegal", flag: "🇸🇳" },
  { code: CountryCode.BF, dialCode: "226", name: "Burkina Faso", flag: "🇧🇫" },
  { code: CountryCode.ML, dialCode: "223", name: "Mali", flag: "🇲🇱" },
  { code: CountryCode.TG, dialCode: "228", name: "Togo", flag: "🇹🇬" },
  { code: CountryCode.BJ, dialCode: "229", name: "Benin", flag: "🇧🇯" },

  // East Africa
  { code: CountryCode.KE, dialCode: "254", name: "Kenya", flag: "🇰🇪" },
  { code: CountryCode.TZ, dialCode: "255", name: "Tanzania", flag: "🇹🇿" },
  { code: CountryCode.UG, dialCode: "256", name: "Uganda", flag: "🇺🇬" },
  { code: CountryCode.RW, dialCode: "250", name: "Rwanda", flag: "🇷🇼" },
  { code: CountryCode.ET, dialCode: "251", name: "Ethiopia", flag: "🇪🇹" },

  // Southern Africa
  { code: CountryCode.ZA, dialCode: "27", name: "South Africa", flag: "🇿🇦" },
  { code: CountryCode.ZW, dialCode: "263", name: "Zimbabwe", flag: "🇿🇼" },
  { code: CountryCode.ZM, dialCode: "260", name: "Zambia", flag: "🇿🇲" },
  { code: CountryCode.BW, dialCode: "267", name: "Botswana", flag: "🇧🇼" },

  // North Africa
  { code: CountryCode.EG, dialCode: "20", name: "Egypt", flag: "🇪🇬" },
  { code: CountryCode.MA, dialCode: "212", name: "Morocco", flag: "🇲🇦" },
  { code: CountryCode.TN, dialCode: "216", name: "Tunisia", flag: "🇹🇳" },
  { code: CountryCode.DZ, dialCode: "213", name: "Algeria", flag: "🇩🇿" },

  // Common international
  { code: CountryCode.US, dialCode: "1", name: "United States", flag: "🇺🇸" },
  { code: CountryCode.GB, dialCode: "44", name: "United Kingdom", flag: "🇬🇧" },
  { code: CountryCode.CA, dialCode: "1", name: "Canada", flag: "🇨🇦" },
];

export const defaultCountry: Country = countries[0]; // Ghana

export function getCountryByDialCode(dialCode: string): Country | undefined {
  return countries.find((c) => c.dialCode === dialCode);
}

export function getCountryByCode(code: string): Country | undefined {
  if (!Object.values(CountryCode).includes(code as CountryCode)) return undefined;
  return countries.find((c) => c.code === code);
}

export function formatPhoneWithCountry(
  phone: string,
  countryCode = CountryCode.GH,
): string {
  const country = getCountryByCode(countryCode);
  if (!country) return phone;

  // Remove any non-digits and spaces
  let cleanPhone = phone.replace(/\D/g, "");

  // If already has country code, return as-is
  if (cleanPhone.startsWith(country.dialCode)) {
    return cleanPhone;
  }

  // Remove leading 0 if present
  if (cleanPhone.startsWith("0")) {
    cleanPhone = cleanPhone.substring(1);
  }

  // Return country code + phone (no +)
  return `${country.dialCode}${cleanPhone}`;
}

export function parsePhoneNumber(fullNumber: string): {
  country: Country | undefined;
  localNumber: string;
} {
  // Remove any + prefix
  const cleanNumber = fullNumber.replace(/^\+/, "").replace(/\D/g, "");

  // Try to match country code (longest match first)
  const sortedCountries = [...countries].sort(
    (a, b) => b.dialCode.length - a.dialCode.length,
  );

  for (const country of sortedCountries) {
    if (cleanNumber.startsWith(country.dialCode)) {
      let localNumber = cleanNumber.substring(country.dialCode.length);
      if (localNumber.length === 9) {
        localNumber = `0${localNumber}`;
      }
      return {
        country,
        localNumber: `${localNumber}`,
      };
    }
  }

  return {
    country: undefined,
    localNumber: cleanNumber,
  };
}
