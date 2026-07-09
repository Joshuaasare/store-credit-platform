import { supabaseAdmin } from "../utils/supabase.client";
import { PasswordService } from "../utils/password.service";
import { MessagingService, SMSTemplates } from "../utils/messaging.service";
import {
  setOtp,
  getOtp,
  deleteOtp,
  incrementAttempts,
} from "../utils/otp.store";
import {
  SendOtpRequest,
  VerifyOtpRequest,
  AuthSession,
  AuthUser,
} from "../schemas/auth.schema";
import { QueryFragments } from "../constants/queryFragments";

const MAX_OTP_ATTEMPTS = 5;

export class AuthService {
  /**
   * Send OTP to user's phone number.
   * If user doesn't exist, we still send OTP to prevent phone number enumeration.
   */
  async sendOtp(data: SendOtpRequest): Promise<{ message: string }> {
    const { phone } = data;

    // Normalize phone to E.164
    const normalizedPhone = this.normalizePhone(phone);

    // Generate OTP
    const otp = PasswordService.generateOTP();
    const otpHash = PasswordService.hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in memory
    setOtp(normalizedPhone, otpHash, expiresAt);

    // Also update the user's OTP fields in DB if they exist
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", normalizedPhone)
      .is("deleted_at", null)
      .single();

    if (user) {
      await supabaseAdmin
        .from("users")
        .update({
          otp: otpHash,
          otp_expires_at: expiresAt.toISOString(),
          otp_attempts: 0,
        })
        .eq("id", user.id);
    }

    // Send SMS
    await MessagingService.sendSMSMessage({
      phone: normalizedPhone,
      message: SMSTemplates.loginOTP(otp),
    });

    return { message: "OTP sent successfully" };
  }

  /**
   * Verify OTP and sign user in via Supabase email/password under the hood.
   */
  async verifyOtp(data: VerifyOtpRequest): Promise<AuthSession> {
    const { phone, otp } = data;
    const normalizedPhone = this.normalizePhone(phone);

    // Check in-memory OTP store first
    const otpEntry = getOtp(normalizedPhone);

    if (!otpEntry) {
      throw new Error(
        "OTP not found or has expired. Please request a new OTP.",
      );
    }

    if (otpEntry.expiresAt <= new Date()) {
      deleteOtp(normalizedPhone);
      throw new Error("OTP has expired. Please request a new OTP.");
    }

    // Increment attempts
    const attempts = incrementAttempts(normalizedPhone);
    if (attempts > MAX_OTP_ATTEMPTS) {
      deleteOtp(normalizedPhone);
      throw new Error("Too many failed attempts. Please request a new OTP.");
    }

    // Verify OTP hash
    if (!PasswordService.verifyOTP(otp, otpEntry.otpHash)) {
      throw new Error("Invalid OTP. Please try again.");
    }

    // OTP verified — look up user by phone
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select(QueryFragments.BASE_USER)
      .eq("phone", normalizedPhone)
      .is("deleted_at", null)
      .single();

    if (userError || !user) {
      throw new Error("User not found.");
    }

    if (!user.access_granted) {
      throw new Error("Access denied. Please contact your administrator.");
    }

    // Also verify against DB-stored OTP (defense in depth)
    if (
      user.otp !== otpEntry.otpHash ||
      !user.otp_expires_at ||
      new Date(user.otp_expires_at) <= new Date()
    ) {
      throw new Error("Invalid or expired OTP.");
    }

    // Generate deterministic email + password for Supabase auth sign-in
    const email = user.email ?? "";
    const password = PasswordService.generateUserPassword(
      user.id,
      normalizedPhone,
    );

    // Ensure user exists in Supabase auth
    await this.ensureAuthUser(user.id, email, password);

    // Sign in with Supabase auth (email/password under the hood)
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError || !signInData.session) {
      throw new Error(
        `Authentication failed: ${signInError?.message || "Unknown error"}`,
      );
    }

    // Clear OTP after successful login
    deleteOtp(normalizedPhone);
    await supabaseAdmin
      .from("users")
      .update({ otp: null, otp_expires_at: null, otp_attempts: 0 })
      .eq("id", user.id);

    // Fetch user roles from staff_user_roles
    const { data: roles } = await supabaseAdmin
      .from("staff_user_roles")
      .select(`id, role, created_at, updated_at, user_id, assigned_by_user_id`)
      .eq("user_id", user.id)
      .is("deleted_at", null);

    const authUserResponse: AuthUser = {
      id: user.id,
      email: user.email || email || "",
      phone: user.phone,
      surname: user.surname,
      other_names: user.other_names,
      access_granted: user.access_granted,
      roles:
        roles?.map((r) => ({
          id: r.id,
          role: r.role,
          user_id: r.user_id,
          assigned_by_user_id: r.assigned_by_user_id,
          created_at: r.created_at,
          updated_at: r.updated_at,
        })) || [],
    };

    const session: AuthSession = {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_in: signInData.session.expires_in,
      expires_at:
        signInData.session.expires_at ??
        Math.floor(Date.now() / 1000) + signInData.session.expires_in,
      token_type: signInData.session.token_type,
      user: authUserResponse,
    };

    return session;
  }

  /**
   * Get current authenticated user with roles.
   */
  async getCurrentUser(userId: string): Promise<AuthUser> {
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, email, phone, surname, other_names, access_granted")
      .eq("id", userId)
      .is("deleted_at", null)
      .single();

    if (error || !user) {
      throw new Error("User not found");
    }

    const { data: roles } = await supabaseAdmin
      .from("staff_user_roles")
      .select(`id, role, created_at, updated_at, user_id, assigned_by_user_id`)
      .eq("user_id", user.id)
      .is("deleted_at", null);

    return {
      id: user.id,
      email: user.email || "",
      phone: user.phone,
      surname: user.surname,
      other_names: user.other_names,
      access_granted: user.access_granted,
      roles:
        roles?.map((r) => ({
          id: r.id,
          role: r.role,
          user_id: r.user_id,
          assigned_by_user_id: r.assigned_by_user_id,
          created_at: r.created_at,
          updated_at: r.updated_at,
        })) || [],
    };
  }

  /**
   * Ensure a corresponding Supabase auth user exists.
   * If not, create one with the deterministic email + password.
   */
  private async ensureAuthUser(
    userId: string,
    email: string,
    password: string,
  ): Promise<void> {
    // Try to get existing auth user
    const { data: existingUser } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (existingUser?.user) {
      // Auth user exists — ensure email matches
      if (existingUser.user.email !== email) {
        await supabaseAdmin.auth.admin.updateUserById(userId, { email });
      }
      return;
    }

    // Create new auth user
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { id: userId },
    });

    if (createError) {
      // If user already exists (race condition), try to link by listing users
      if (!createError.message?.toLowerCase().includes("already")) {
        throw new Error(`Failed to create auth user: ${createError.message}`);
      }
    }
  }

  /**
   * Normalize Ghana phone numbers to E.164 format.
   */
  private normalizePhone(phone: string): string {
    let cleaned = phone.replace(/\s/g, "").replace(/-/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "+233" + cleaned.slice(1);
    }
    if (!cleaned.startsWith("+")) {
      cleaned = "+" + cleaned;
    }
    return cleaned;
  }
}
