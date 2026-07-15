import crypto from "crypto";
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
  AuthUser,
} from "../schemas/auth.schema";
import { QueryFragments } from "../constants/queryFragments";
import { TokenService } from "./token.service";
import { RateLimitService } from "./rateLimit.service";

const MAX_OTP_ATTEMPTS = 5;

export class AuthService {
  /**
   * Send OTP to user's phone number.
   * If user doesn't exist, we still return success to prevent phone number enumeration,
   * but we do not send an SMS to save credits and avoid spamming unregistered numbers.
   */
  async sendOtp(
    data: SendOtpRequest,
    clientIp?: string,
  ): Promise<{ message: string }> {
    const { phone } = data;
    const normalizedPhone = this.normalizePhone(phone);

    // Rate limiting
    const rateLimit = RateLimitService.checkOtpSendLimits(
      normalizedPhone,
      clientIp,
    );
    if (!rateLimit.allowed) {
      const error = new Error(rateLimit.reason || "Rate limit exceeded");
      (error as Error & { statusCode?: number }).statusCode = 429;
      throw error;
    }

    // Check if user exists before generating OTP
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", normalizedPhone)
      .is("deleted_at", null)
      .single();
    console.log("user", user, normalizedPhone);

    if (!user) {
      // Anti-enumeration: return same success response even if user not found
      return { message: "OTP sent successfully" };
    }

    // Generate OTP using cryptographically secure randomness
    const otp = PasswordService.generateOTP();
    const otpHash = PasswordService.hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in memory
    setOtp(normalizedPhone, otpHash, expiresAt);

    // Update user's OTP fields in DB
    await supabaseAdmin
      .from("users")
      .update({
        otp: otpHash,
        otp_expires_at: expiresAt.toISOString(),
        otp_attempts: 0,
      })
      .eq("id", user.id);

    // Send SMS
    await MessagingService.sendSMSMessage({
      phone: normalizedPhone,
      message: SMSTemplates.loginOTP(otp),
    });

    return { message: "OTP sent successfully" };
  }

  /**
   * Verify OTP and issue custom JWT access + refresh tokens.
   */
  async verifyOtp(
    data: VerifyOtpRequest,
    userAgent?: string,
    clientIp?: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
    token_type: string;
    user: AuthUser;
  }> {
    const { phone, otp } = data;
    const normalizedPhone = this.normalizePhone(phone);

    // DEV bypass — delete before production
    if (
      process.env.NODE_ENV === "development" &&
      normalizedPhone === process.env.DEV_MOCK_PHONE &&
      otp === process.env.DEV_MOCK_OTP
    ) {
      const { data: user } = await supabaseAdmin
        .from("users")
        .select(QueryFragments.BASE_USER)
        .eq("phone", normalizedPhone)
        .is("deleted_at", null)
        .single();
      if (!user) throw new Error("Dev mock user not found.");
      return await this.buildDevSession(user, userAgent, clientIp);
    }

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

    // Fetch user roles from staff_user_roles
    const { data: roles } = await supabaseAdmin
      .from("staff_user_roles")
      .select(`id, role, created_at, updated_at, user_id, assigned_by_user_id`)
      .eq("user_id", user.id)
      .is("deleted_at", null);

    // Resolve merchant_id / primary branch_id via staff → branches → merchants
    const staffAssignment = await this.resolveStaffAssignment(user.id);

    const authUserResponse: AuthUser = {
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
      merchant_id: staffAssignment?.merchant_id ?? null,
      branch_id: staffAssignment?.branch_id ?? null,
    };

    // Issue custom JWT access token
    const accessToken = await TokenService.signAccessToken(
      user.id,
      user.phone,
      authUserResponse.roles.map((r) => r.role),
      authUserResponse.merchant_id,
      authUserResponse.branch_id,
    );

    // Generate and store refresh token
    const deviceFingerprint = TokenService.computeDeviceFingerprint(
      userAgent,
      clientIp,
    );
    const familyId = crypto.randomUUID();
    const {
      token: refreshToken,
      tokenHash: refreshTokenHash,
      jti,
    } = TokenService.generateOpaqueToken();

    await TokenService.storeRefreshToken(
      refreshTokenHash,
      jti,
      user.id,
      familyId,
      deviceFingerprint,
      clientIp,
    );

    // Clear OTP after successful login
    deleteOtp(normalizedPhone);
    await supabaseAdmin
      .from("users")
      .update({ otp: null, otp_expires_at: null, otp_attempts: 0 })
      .eq("id", user.id);

    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresIn = 15 * 60; // 15 minutes

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      expires_at: nowSeconds + expiresIn,
      token_type: "Bearer",
      user: authUserResponse,
    };
  }

  /**
   * Get current authenticated user with roles.
   */
  async getCurrentUser(userId: string): Promise<AuthUser> {
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select(QueryFragments.BASE_USER)
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

    // Resolve merchant_id / primary branch_id for AuthUser
    const staffAssignment = await this.resolveStaffAssignment(user.id);

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
      merchant_id: staffAssignment?.merchant_id ?? null,
      branch_id: staffAssignment?.branch_id ?? null,
    };
  }

  /**
   * DEV session builder — delete before production.
   */
  private async buildDevSession(
    user: any,
    userAgent?: string,
    clientIp?: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
    token_type: string;
    user: AuthUser;
  }> {
    const { data: roles } = await supabaseAdmin
      .from("staff_user_roles")
      .select(`id, role, created_at, updated_at, user_id, assigned_by_user_id`)
      .eq("user_id", user.id)
      .is("deleted_at", null);

    const staffAssignment = await this.resolveStaffAssignment(user.id);

    const authUserResponse: AuthUser = {
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
      merchant_id: staffAssignment?.merchant_id ?? null,
      branch_id: staffAssignment?.branch_id ?? null,
    };

    const accessToken = await TokenService.signAccessToken(
      user.id,
      user.phone,
      authUserResponse.roles.map((r) => r.role),
      authUserResponse.merchant_id,
      authUserResponse.branch_id,
    );

    const deviceFingerprint = TokenService.computeDeviceFingerprint(
      userAgent,
      clientIp,
    );
    const familyId = crypto.randomUUID();
    const {
      token: refreshToken,
      tokenHash: refreshTokenHash,
      jti,
    } = TokenService.generateOpaqueToken();

    await TokenService.storeRefreshToken(
      refreshTokenHash,
      jti,
      user.id,
      familyId,
      deviceFingerprint,
      clientIp,
    );

    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresIn = 15 * 60;

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      expires_at: nowSeconds + expiresIn,
      token_type: "Bearer",
      user: authUserResponse,
    };
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

  /**
   * Resolve a user's primary merchant_id and branch_id via the staff table.
   * Returns null if the user has no staff row (e.g. unassigned admin).
   * Picks the first active staff row ordered by id for determinism.
   */
  private async resolveStaffAssignment(
    userId: string,
  ): Promise<{ merchant_id: number; branch_id: number } | null> {
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select(QueryFragments.STAFF_MERCHANT_LOOKUP)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!staff) return null;
    const branch = (staff as any)?.branches;
    const merchant = branch?.merchants;
    if (!branch?.id || !merchant?.id) return null;
    return {
      merchant_id: Number(merchant.id),
      branch_id: Number(branch.id),
    };
  }
}
