interface OtpEntry {
  otpHash: string;
  expiresAt: Date;
  attempts: number;
}

const otpStore = new Map<string, OtpEntry>();

export function getOtpStore(): Map<string, OtpEntry> {
  return otpStore;
}

export function setOtp(contact: string, otpHash: string, expiresAt: Date): void {
  otpStore.set(contact, {
    otpHash,
    expiresAt,
    attempts: 0,
  });
}

export function getOtp(contact: string): OtpEntry | undefined {
  return otpStore.get(contact);
}

export function deleteOtp(contact: string): void {
  otpStore.delete(contact);
}

export function incrementAttempts(contact: string): number {
  const entry = otpStore.get(contact);
  if (entry) {
    entry.attempts += 1;
    return entry.attempts;
  }
  return 0;
}

// Cleanup expired OTPs every 15 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, entry] of otpStore.entries()) {
    if (entry.expiresAt <= now) {
      otpStore.delete(key);
    }
  }
}, 15 * 60 * 1000);
