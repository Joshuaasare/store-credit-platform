import crypto from "crypto";

const SERVER_SECRET = process.env.SERVER_AUTH_SECRET || "default-secret-change-in-production";

export class PasswordService {
  static generateOTP(): string {
    return crypto.randomInt(100_000, 1_000_000).toString();
  }

  static hashOTP(otp: string): string {
    return crypto.createHmac("sha256", SERVER_SECRET).update(otp).digest("hex");
  }

  static verifyOTP(otp: string, hashedOtp: string): boolean {
    return this.hashOTP(otp) === hashedOtp;
  }
}
