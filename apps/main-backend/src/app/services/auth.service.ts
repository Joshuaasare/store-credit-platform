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
import { normalizePhone } from "../utils/phone.utils";
import {
  SendOtpRequest,
  VerifyOtpRequest,
  AuthUser,
} from "../schemas/auth.schema";
import { QueryFragments } from "../constants/queryFragments";
import { Database } from "../types/database.types";
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
    const normalizedPhone = normalizePhone(phone);

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
    const normalizedPhone = normalizePhone(phone);

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

    // Also verify against DB-stored OTP (defense in depth)
    if (
      user.otp !== otpEntry.otpHash ||
      !user.otp_expires_at ||
      new Date(user.otp_expires_at) <= new Date()
    ) {
      throw new Error("Invalid or expired OTP.");
    }

    // Resolve merchant_id / primary branch_id / role via staff → branches →
    // merchants. Single role lives on staff.role (replaces the older
    // staff_user_roles join table). Names + access_granted also live on the
    // staff row — a user with no live staff row has no access.
    const staffAssignment = await this.resolveStaffAssignment(user.id);

    if (!staffAssignment || !staffAssignment.access_granted) {
      throw new Error("Access denied. Please contact your administrator.");
    }

    const authUserResponse: AuthUser = {
      id: user.id,
      email: user.email || "",
      phone: user.phone,
      surname: staffAssignment.surname,
      other_names: staffAssignment.other_names,
      access_granted: staffAssignment.access_granted,
      role: staffAssignment.role,
      merchant_id: staffAssignment.merchant_id,
      branch_id: staffAssignment.branch_id,
    };

    // Issue custom JWT access token
    const accessToken = await TokenService.signAccessToken(
      user.id,
      user.phone,
      authUserResponse.role ?? "",
      authUserResponse.merchant_id,
      authUserResponse.branch_id,
      staffAssignment.staff_id,
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

    // Clear OTP after successful login and stamp last_login_at (surfaced on
    // the Staff directory as "Last active").
    deleteOtp(normalizedPhone);
    await supabaseAdmin
      .from("users")
      .update({
        otp: null,
        otp_expires_at: null,
        otp_attempts: 0,
        last_login_at: new Date().toISOString(),
      })
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

    // Resolve merchant_id / primary branch_id / role via staff → branches →
    // merchants. Single role lives on staff.role.
    const staffAssignment = await this.resolveStaffAssignment(user.id);

    return {
      id: user.id,
      email: user.email || "",
      phone: user.phone,
      surname: staffAssignment?.surname ?? null,
      other_names: staffAssignment?.other_names ?? null,
      access_granted: staffAssignment?.access_granted ?? false,
      role: staffAssignment?.role ?? null,
      merchant_id: staffAssignment?.merchant_id ?? null,
      branch_id: staffAssignment?.branch_id ?? null,
      staff_id: staffAssignment?.staff_id ?? null,
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
    const staffAssignment = await this.resolveStaffAssignment(user.id);

    const authUserResponse: AuthUser = {
      id: user.id,
      email: user.email || "",
      phone: user.phone,
      surname: staffAssignment?.surname ?? null,
      other_names: staffAssignment?.other_names ?? null,
      access_granted: staffAssignment?.access_granted ?? false,
      role: staffAssignment?.role ?? null,
      merchant_id: staffAssignment?.merchant_id ?? null,
      branch_id: staffAssignment?.branch_id ?? null,
      staff_id: staffAssignment?.staff_id ?? null,
    };

    const accessToken = await TokenService.signAccessToken(
      user.id,
      user.phone,
      authUserResponse.role ?? "",
      authUserResponse.merchant_id,
      authUserResponse.branch_id,
      authUserResponse.staff_id,
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
   * Resolve a user's primary merchant_id and branch_id via the staff table.
   * Returns null if the user has no staff row (e.g. unassigned admin).
   * Picks the first active staff row ordered by id for determinism. Also
   * carries surname / other_names / access_granted — all live on `staff`,
   * not `users`.
   */
  private async resolveStaffAssignment(userId: string): Promise<{
    staff_id: number;
    role: Database["public"]["Enums"]["role"];
    merchant_id: number;
    branch_id: number;
    surname: string | null;
    other_names: string | null;
    access_granted: boolean;
    created_at: string;
    updated_at: string | null;
  } | null> {
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select(`id, role, surname, other_names, access_granted, created_at, updated_at, branches(id, merchants(id))`)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .not("role", "is", null)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!staff) return null;
    const branch = staff?.branches;
    const merchant = branch?.merchants;
    if (!branch?.id || !merchant?.id || staff.role == null) return null;
    return {
      staff_id: Number(staff.id),
      role: staff.role,
      merchant_id: Number(merchant.id),
      branch_id: Number(branch.id),
      surname: staff.surname ?? null,
      other_names: staff.other_names ?? null,
      access_granted: staff.access_granted ?? true,
      created_at: staff.created_at,
      updated_at: staff.updated_at,
    };
  }
}
