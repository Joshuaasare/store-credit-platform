interface RateLimitEntry {
  attempts: number;
  windowStart: number; // timestamp in ms
}

const OTP_PHONE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const OTP_PHONE_MAX_ATTEMPTS = 3;

const OTP_IP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const OTP_IP_MAX_ATTEMPTS = 5;

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 15 minutes (skip in test environments)
if (process.env.NODE_ENV !== "test") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.windowStart > OTP_PHONE_WINDOW_MS && now - entry.windowStart > OTP_IP_WINDOW_MS) {
        rateLimitStore.delete(key);
      }
    }
  }, 15 * 60 * 1000);
}

export class RateLimitService {
  /**
   * Check if an identifier (phone or IP) is within rate limits.
   * If within limits, increments the attempt counter.
   */
  static checkRateLimit(identifier: string, limitType: "otp_phone" | "otp_ip"): { allowed: boolean; remaining: number; resetAt: Date } {
    const windowMs = limitType === "otp_phone" ? OTP_PHONE_WINDOW_MS : OTP_IP_WINDOW_MS;
    const maxAttempts = limitType === "otp_phone" ? OTP_PHONE_MAX_ATTEMPTS : OTP_IP_MAX_ATTEMPTS;
    const now = Date.now();

    const entry = rateLimitStore.get(identifier);

    if (!entry) {
      // First attempt for this identifier
      rateLimitStore.set(identifier, { attempts: 1, windowStart: now });
      return { allowed: true, remaining: maxAttempts - 1, resetAt: new Date(now + windowMs) };
    }

    // Check if window has expired — if so, reset
    if (now - entry.windowStart > windowMs) {
      entry.attempts = 1;
      entry.windowStart = now;
      return { allowed: true, remaining: maxAttempts - 1, resetAt: new Date(now + windowMs) };
    }

    // Window is still active
    if (entry.attempts >= maxAttempts) {
      return { allowed: false, remaining: 0, resetAt: new Date(entry.windowStart + windowMs) };
    }

    entry.attempts += 1;
    return { allowed: true, remaining: maxAttempts - entry.attempts, resetAt: new Date(entry.windowStart + windowMs) };
  }

  /**
   * Check both phone and IP rate limits for OTP sends.
   * Returns the most restrictive result.
   */
  static checkOtpSendLimits(
    phone: string,
    ip: string | undefined,
  ): { allowed: boolean; reason?: string; retryAfterSeconds?: number } {
    const phoneResult = this.checkRateLimit(phone, "otp_phone");
    if (!phoneResult.allowed) {
      const retryAfter = Math.ceil((phoneResult.resetAt.getTime() - Date.now()) / 1000);
      return {
        allowed: false,
        reason: "Too many OTP requests for this phone number. Please try again later.",
        retryAfterSeconds: Math.max(0, retryAfter),
      };
    }

    if (ip) {
      const ipResult = this.checkRateLimit(ip, "otp_ip");
      if (!ipResult.allowed) {
        const retryAfter = Math.ceil((ipResult.resetAt.getTime() - Date.now()) / 1000);
        return {
          allowed: false,
          reason: "Too many OTP requests from this network. Please try again later.",
          retryAfterSeconds: Math.max(0, retryAfter),
        };
      }
    }

    return { allowed: true };
  }
}
