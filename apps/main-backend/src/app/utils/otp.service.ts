import { PasswordService } from "./password.service";
import { MessagingService } from "./messaging.service";
import {
  setOtp,
  getOtp,
  deleteOtp,
  incrementAttempts,
} from "./otp.store";
import { RateLimitService } from "../services/rateLimit.service";

const MAX_OTP_ATTEMPTS = 5;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes — shared by login + phone-change.

/**
 * Shared OTP issue/verify orchestration over the in-memory `otp.store`.
 *
 * `CustomerAuthService` (login) and `CustomerProfileService` (phone-change)
 * both call this so the OTP policy — attempt cap, expiry window, dev-bypass,
 * rate-limit — lives in one place. The two services stay separate (login
 * owns session issuance, profile-edit owns the phone-verified token); only
 * the OTP mechanics are shared.
 *
 * Callers own:
 *   - `normalizePhone` (run before calling)
 *   - flow-specific guards (no-op check, uniqueness check)
 *   - the SMS template (login vs phone-change copy differ on purpose)
 *   - the dev-bypass short-circuit in `verifyAndConsume` (the success
 *     outcome differs per flow — login auto-provisions a session,
 *     phone-change auto-issues a token — so the caller runs the dev-bypass
 *     branch BEFORE calling `verifyAndConsume`)
 */
export class OtpService {
  /**
   * Rate-limit, generate, hash, store, and SMS-send an OTP. Throws a
   * 429-tagged Error on rate-limit failure (the route surfaces the message).
   */
  static async issueAndSend(opts: {
    phone: string;
    clientIp?: string;
    smsTemplate: (otp: string) => string;
    /** When set and `phone` matches, skip the SMS send and store the mock OTP. */
    devBypassPhone?: string;
  }): Promise<void> {
    const rateLimit = RateLimitService.checkOtpSendLimits(
      opts.phone,
      opts.clientIp,
    );
    if (!rateLimit.allowed) {
      const error = new Error(rateLimit.reason || "Rate limit exceeded");
      (error as Error & { statusCode?: number }).statusCode = 429;
      throw error;
    }

    const isDevMock =
      process.env.NODE_ENV === "development" &&
      opts.devBypassPhone != null &&
      opts.phone === opts.devBypassPhone;

    if (isDevMock) {
      const otp = process.env.DEV_MOCK_CUSTOMER_OTP || "123456";
      const otpHash = PasswordService.hashOTP(otp);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS);
      setOtp(opts.phone, otpHash, expiresAt);
      return;
    }

    const otp = PasswordService.generateOTP();
    const otpHash = PasswordService.hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    setOtp(opts.phone, otpHash, expiresAt);

    await MessagingService.sendSMSMessage({
      phone: opts.phone,
      message: opts.smsTemplate(otp),
    });
  }

  /**
   * Verify and consume an OTP. Returns `{ valid: true }` on success or
   * `{ valid: false, error }` on any failure. The entry is deleted on
   * success, expiry, and lockout; a wrong-but-not-locked-out attempt
   * leaves the entry in place so the customer can retry.
   */
  static verifyAndConsume(opts: {
    phone: string;
    otp: string;
  }): { valid: true } | { valid: false; error: string } {
    const otpEntry = getOtp(opts.phone);
    if (!otpEntry) {
      return {
        valid: false,
        error: "OTP not found or has expired. Please request a new OTP.",
      };
    }
    if (otpEntry.expiresAt <= new Date()) {
      deleteOtp(opts.phone);
      return { valid: false, error: "OTP has expired. Please request a new OTP." };
    }
    const attempts = incrementAttempts(opts.phone);
    const remaining = Math.max(0, MAX_OTP_ATTEMPTS - attempts);
    if (attempts > MAX_OTP_ATTEMPTS) {
      deleteOtp(opts.phone);
      return {
        valid: false,
        error: "Too many failed attempts. Please request a new code.",
      };
    }
    if (!PasswordService.verifyOTP(opts.otp, otpEntry.otpHash)) {
      if (remaining <= 0) {
        deleteOtp(opts.phone);
        return {
          valid: false,
          error: "Too many failed attempts. Please request a new code.",
        };
      }
      return {
        valid: false,
        error: `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining`,
      };
    }
    deleteOtp(opts.phone);
    return { valid: true };
  }
}