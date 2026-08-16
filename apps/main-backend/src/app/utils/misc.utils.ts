export const splitSearchTerm = (searchTerm: string) => {
  return searchTerm
    ?.split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

export const toEpoch = (v: string | null): number =>
  Math.floor(new Date(v ?? new Date().toISOString()).getTime());

export const isTimestampInWindow = (
  timestamp: number,
  startEpoch: number | null,
  endEpoch: number | null,
): boolean => {
  if (startEpoch != null && timestamp < startEpoch) return false;
  if (endEpoch != null && timestamp > endEpoch) return false;
  return true;
};
