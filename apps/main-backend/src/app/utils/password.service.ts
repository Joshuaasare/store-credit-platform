import crypto from "crypto";

const SERVER_SECRET = process.env.SERVER_AUTH_SECRET || "default-secret-change-in-production";

export class PasswordService {
  /**
   * Generate a 6-digit numeric OTP
   */
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
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

  /**
   * Generate a deterministic password for a user based on their UUID and phone.
   * This allows server-side login without storing plaintext passwords.
   */
  static generateUserPassword(userId: string, phone: string): string {
    const hmac = crypto
      .createHmac("sha256", SERVER_SECRET)
      .update(`${userId}:${phone}`)
      .digest("hex");
    // Use first 16 chars + special suffix for Supabase password requirements
    return `Sc_${hmac.slice(0, 20)}!9A`;
  }

  /**
   * Generate a random email for a user based on their UUID.
   */
  static generateUserEmail(userId: string): string {
    return `user_${userId.slice(0, 8)}@storecredit.internal`;
  }
}
