export const splitSearchTerm = (searchTerm: string) => {
  return searchTerm
    ?.split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};
