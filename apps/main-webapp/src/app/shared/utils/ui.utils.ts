import parsePhoneNumber, { CountryCode } from "libphonenumber-js";

export function formatDisplayNumber(
  phone?: string | null | undefined,
  countryCode: CountryCode = "GH",
) {
  return parsePhoneNumber(phone ?? "", countryCode)?.formatInternational();
}
