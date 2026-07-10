import crypto from "crypto";

const SERVER_SECRET = process.env.SERVER_AUTH_SECRET || "default-secret-change-in-production";

export class PasswordService {
  /**
   * Generate a 6-digit numeric OTP using cryptographically secure randomness.
   */
  static generateOTP(): string {
    return crypto.randomInt(100_000, 1_000_000).toString();
  }

  /**
   * Hash an OTP for secure storage comparison
   */
  static hashOTP(otp: string): string {
    return crypto.createHmac("sha256", SERVER_SECRET).update(otp).digest("hex");
  }

  /**
   * Verify a raw OTP against a hashed OTP
   */
  static verifyOTP(otp: string, hashedOtp: string): boolean {
    return this.hashOTP(otp) === hashedOtp;
  }
}
