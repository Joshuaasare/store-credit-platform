import { SendOTPRequest } from "../schemas/auth.schema";

export class AuthService {
  /**
   * Login user from server-side using phone and password
   * Returns session object that client can use with setSession()
   */
  async login() {}

  async getCurrentUser(userId: string, userJwt: string) {}

  async sendOTPRequest(data: SendOTPRequest) {
    const isSms = data.channel === "sms";
    const contact = isSms ? data.phone : data.email;

    // first try to locate a user (password reset flow)
    const query = isSms
      ? this.getUserByPhoneSensitive(data.userVerificationContact || contact)
      : this.getUserByEmailSensitive(data.userVerificationContact || contact);
    const user = await query;

    const otp = PasswordService.generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    if (user) {
      // existing behavior: store on user record
      const { error: updateError } = await supabaseAdmin
        .getClient()
        .from("users")
        .update({
          password_reset_otp: otp,
          password_reset_otp_expires_at: otpExpiry.toISOString(),
          password_reset_otp_attempts: 0,
        })
        .eq("id", user.id);

      if (updateError) {
        throw new Error(`Failed to set OTP: ${updateError?.message}`);
      }
    }

    // always store in in-memory map so unregistered numbers are also covered
    if (contact) {
      otpStore[contact] = {
        otp,
        expiresAt: otpExpiry,
        attempts: 0,
      };
    }

    // Send OTP via email or SMS based on channel
    if (data.channel === "email") {
      await MessagingService.sendEmailMessage({
        email: data.email,
        templateId: "5121212",
        templateData: {
          otp,
        },
      });

      return { message: "OTP sent successfully via email" };
    } else {
      // SMS channel
      if (!data.phone) {
        throw new Error("Phone number is required for SMS channel");
      }

      await MessagingService.sendSMSMessage({
        phone: data.phone,
        message: SMSTemplates.passwordResetOTP(otp),
      });

      return { message: "OTP sent successfully via SMS" };
    }
  }

  async verifyOTP(data: { phone: string; otp: string }) {}
}
