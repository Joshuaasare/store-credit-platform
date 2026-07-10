let currentAccessToken: string | null = null;

export const accessTokenStorage = {
  getAccessToken(): string | null {
    return currentAccessToken;
  },

  setAccessToken(token: string): void {
    currentAccessToken = token;
  },

  clearAccessToken(): void {
    currentAccessToken = null;
  },
};
