export function formatDisplayNumber(phone?: string | null | undefined) {
  return `+${phone?.slice(0, 3)} ${phone?.slice(3, 6)} ${phone?.slice(6, 10)}`;
}
