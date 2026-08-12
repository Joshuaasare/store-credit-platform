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
import { QueryFragments } from "../constants/queryFragments";
import { CustomerAuthUser } from "../types/main.types";
import {
  CustomerOtpVerifyServiceResponse,
  CustomerRegisterServiceResponse,
  CustomerRefreshServiceResponse,
} from "../schemas/customer-auth.schema";
import {
  CustomerOtpSendRequest,
  CustomerOtpVerifyRequest,
  CustomerRegisterRequest,
} from "../schemas/auth.schema";
import { TokenService } from "./token.service";
import { RateLimitService } from "./rateLimit.service";

const MAX_OTP_ATTEMPTS = 5;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes — matches signAccessToken default.

/**
 * Customer-app auth service (`/api/customer-auth/*`).
 *
 * Phone-based OTP auth for the customer mobile app. Separate from staff auth
 * (`AuthService`) because the staff flow gates on a `staff` row
 * (`resolveStaffAssignment` throws "Access denied" for users with no staff
 * row) — a customer has no staff row and must not be rejected. This service
 * reuses the underlying primitives (otp.store, normalizePhone,
 * MessagingService, PasswordService, RateLimitService, TokenService) but
 * composes them into a customer-specific flow that:
 *   - always sends an OTP (no anti-enumeration — we WANT to verify ownership
 *     for brand-new phones);
 *   - decides post-verification between three flows (logged_in / needs_profile
 *     / register) based on `users` + `customers` row state;
 *   - issues a 5-minute `pending_token` (stateless JWT) for the needs_profile
 *     branch, consumed by `/register` to create/link the rows.
 *
 * See docs/plans/customer_app_auth_feature.md for the full decision matrix.
 */
export class CustomerAuthService {
  /**
   * Send an OTP to the given phone. Always sends (no anti-enumeration) —
   * phone ownership must be proven before any account state is revealed.
   * Dev-bypass for DEV_MOCK_PHONE skips the actual SMS send.
   */
  async sendOtp(
    data: CustomerOtpSendRequest,
    clientIp?: string,
  ): Promise<{ message: string }> {
    const normalizedPhone = normalizePhone(data.phone);

    // Rate limit (same limits as staff).
    const rateLimit = RateLimitService.checkOtpSendLimits(
      normalizedPhone,
      clientIp,
    );
    if (!rateLimit.allowed) {
      const error = new Error(rateLimit.reason || "Rate limit exceeded");
      (error as Error & { statusCode?: number }).statusCode = 429;
      throw error;
    }

    // DEV bypass — skip the SMS send for the mock customer phone. The verify
    // step's dev bypass auto-provisions a session so the customer-app dev
    // login button always lands on HomeScreen without DB seeding.
    const isDevMock =
      process.env.NODE_ENV === "development" &&
      normalizedPhone === process.env.DEV_MOCK_CUSTOMER_PHONE;

    if (isDevMock) {
      // Still record a placeholder OTP hash in the in-memory store so the
      // verify dev-bypass path can find an entry (defensive — the bypass
      // checks the env value directly, but consistency with the staff flow
      // avoids surprises).
      const otp = process.env.DEV_MOCK_CUSTOMER_OTP || "123456";
      const otpHash = PasswordService.hashOTP(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      setOtp(normalizedPhone, otpHash, expiresAt);
      return { message: "OTP sent successfully" };
    }

    // Generate + store OTP.
    const otp = PasswordService.generateOTP();
    const otpHash = PasswordService.hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    setOtp(normalizedPhone, otpHash, expiresAt);

    // Defensive: persist OTP fields on the users row IF one exists. For
    // flow 1 (brand-new phone) there is no users row yet — skip silently.
    await supabaseAdmin
      .from("users")
      .update({
        otp: otpHash,
        otp_expires_at: expiresAt.toISOString(),
        otp_attempts: 0,
      })
      .eq("phone", normalizedPhone)
      .is("deleted_at", null);

    await MessagingService.sendSMSMessage({
      phone: normalizedPhone,
      message: SMSTemplates.loginOTP(otp),
    });

    return { message: "OTP sent successfully" };
  }

  /**
   * Verify the OTP and decide the flow:
   *   - users row exists → flow 3 (logged_in) → issue session.
   *   - no users row → flows 1+2 (needs_profile) → issue pending_token.
   */
  async verifyOtp(
    data: CustomerOtpVerifyRequest,
    userAgent?: string,
    clientIp?: string,
  ): Promise<CustomerOtpVerifyServiceResponse> {
    const { phone, otp } = data;
    const normalizedPhone = normalizePhone(phone);

    // DEV bypass — accept the mock OTP for the mock customer phone and
    // auto-provision a session (idempotently creates/links users + customers
    // rows). Always returns logged_in so the customer-app dev login button
    // lands on HomeScreen without requiring manual DB seeding.
    const isDevMock =
      process.env.NODE_ENV === "development" &&
      normalizedPhone === process.env.DEV_MOCK_CUSTOMER_PHONE &&
      otp === process.env.DEV_MOCK_CUSTOMER_OTP;

    if (isDevMock) {
      return this.buildDevCustomerSession(normalizedPhone, userAgent, clientIp);
    }

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
    const attempts = incrementAttempts(normalizedPhone);
    if (attempts > MAX_OTP_ATTEMPTS) {
      deleteOtp(normalizedPhone);
      throw new Error("Too many failed attempts. Please request a new OTP.");
    }
    if (!PasswordService.verifyOTP(otp, otpEntry.otpHash)) {
      throw new Error("Invalid OTP. Please try again.");
    }

    // OTP verified — look up DB state.
    const { data: user } = await supabaseAdmin
      .from("users")
      .select(QueryFragments.BASE_USER_PROFILE)
      .eq("phone", normalizedPhone)
      .is("deleted_at", null)
      .maybeSingle();

    if (user) {
      // Flow 3: returning customer. Resolve the linked customers row.
      const customer = await this.findCustomerByUserId(user.id);
      if (!customer) {
        // Edge case: users row exists but no customers row. Treat as
        // needs_profile — the register flow will link a fresh customers row.
        deleteOtp(normalizedPhone);
        const pendingToken = await TokenService.signPendingToken(
          normalizedPhone,
        );
        return { status: "needs_profile", pending_token: pendingToken };
      }

      deleteOtp(normalizedPhone);
      await this.stampLogin(user.id);

      const authUser: CustomerAuthUser = {
        id: user.id,
        phone: user.phone,
        customer_id: customer.id,
        surname: customer.surname,
        other_names: customer.other_names,
      };
      const session = await this.issueSession(authUser, userAgent, clientIp);
      return { status: "logged_in", ...session };
    }

    // Flows 1+2: no users row → needs_profile.
    deleteOtp(normalizedPhone);
    const pendingToken = await TokenService.signPendingToken(normalizedPhone);
    return { status: "needs_profile", pending_token: pendingToken };
  }

  /**
   * Register a new customer. Verifies the pending token (carrying the
   * phone proven via OTP), creates/links the users + customers rows, and
   * issues the real session.
   *
   * Replay guard: if a users row already exists for the verified phone,
   * rejects with 400 "already registered" — a replayed pending_token is
   * naturally idempotent because the first call created the row.
   */
  async register(
    data: CustomerRegisterRequest,
    userAgent?: string,
    clientIp?: string,
  ): Promise<CustomerRegisterServiceResponse> {
    const pending = await TokenService.verifyPendingToken(data.pending_token);
    if (!pending) {
      const error = new Error(
        "Invalid or expired registration token. Please restart sign-up.",
      );
      (error as Error & { statusCode?: number }).statusCode = 400;
      throw error;
    }

    const normalizedPhone = normalizePhone(pending.phone);

    // Replay guard — a users row for this phone means registration already
    // happened (or the phone was claimed by a staff user in the meantime).
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", normalizedPhone)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingUser) {
      const error = new Error(
        "This phone number is already registered. Please log in instead.",
      );
      (error as Error & { statusCode?: number }).statusCode = 400;
      throw error;
    }

    // Create the users row. `users.id` is a uuid the application generates
    // (the DB column has no default) — mirrors the staff service's upsert path.
    const newUserId = crypto.randomUUID();
    const { data: newUser, error: userInsertError } = await supabaseAdmin
      .from("users")
      .insert({
        id: newUserId,
        phone: normalizedPhone,
        otp: null,
        otp_expires_at: null,
        otp_attempts: 0,
      })
      .select(QueryFragments.BASE_USER_PROFILE)
      .single();

    if (userInsertError || !newUser) {
      throw new Error(
        `Failed to create user: ${userInsertError?.message ?? "unknown"}`,
      );
    }

    // Flow 1 vs flow 2: check for an existing walk-in customers row by phone.
    const { data: existingCustomer } = await supabaseAdmin
      .from("customers")
      .select(QueryFragments.BASE_CUSTOMER)
      .eq("phone", normalizedPhone)
      .is("deleted_at", null)
      .maybeSingle();

    let customerId: number;

    if (existingCustomer) {
      // Flow 2: walk-in customer (cashier-created) — link + write the name.
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("customers")
        .update({
          user_id: newUser.id,
          surname: data.surname.trim() || null,
          other_names: data.other_names.trim() || null,
        })
        .eq("id", existingCustomer.id)
        .select(QueryFragments.BASE_CUSTOMER)
        .single();

      if (updateError || !updated) {
        throw new Error(
          `Failed to link customer: ${updateError?.message ?? "unknown"}`,
        );
      }
      customerId = updated.id;
    } else {
      // Flow 1: brand-new — insert a fresh customers row.
      const { data: created, error: insertError } = await supabaseAdmin
        .from("customers")
        .insert({
          phone: normalizedPhone,
          user_id: newUser.id,
          surname: data.surname.trim() || null,
          other_names: data.other_names.trim() || null,
        })
        .select(QueryFragments.BASE_CUSTOMER)
        .single();

      if (insertError || !created) {
        throw new Error(
          `Failed to create customer: ${insertError?.message ?? "unknown"}`,
        );
      }
      customerId = created.id;
    }

    await this.stampLogin(newUser.id);

    const authUser: CustomerAuthUser = {
      id: newUser.id,
      phone: newUser.phone,
      customer_id: customerId,
      surname: data.surname.trim() || null,
      other_names: data.other_names.trim() || null,
    };

    return this.issueSession(authUser, userAgent, clientIp);
  }

  /**
   * Fetch the current customer by users.id. Backs `/refresh` and `/me`.
   */
  async getCurrentCustomer(userId: string): Promise<CustomerAuthUser> {
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select(QueryFragments.BASE_USER_PROFILE)
      .eq("id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (userError || !user) {
      throw new Error("User not found");
    }

    const customer = await this.findCustomerByUserId(user.id);
    if (!customer) {
      throw new Error("Customer profile not found");
    }

    return {
      id: user.id,
      phone: user.phone,
      customer_id: customer.id,
      surname: customer.surname,
      other_names: customer.other_names,
    };
  }

  /**
   * Rotate the refresh token and issue a new access token + session.
   * The refresh token travels in the JSON body (RN has no httpOnly cookies).
   */
  async refreshSession(
    refreshToken: string,
    userAgent?: string,
    clientIp?: string,
  ): Promise<CustomerRefreshServiceResponse> {
    const oldTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const deviceFingerprint = TokenService.computeDeviceFingerprint(
      userAgent,
      clientIp,
    );

    const rotated = await TokenService.rotateRefreshToken(
      oldTokenHash,
      deviceFingerprint,
    );

    const authUser = await this.getCurrentCustomer(rotated.userId);
    const session = await this.issueSession(authUser, userAgent, clientIp, {
      refreshToken: rotated.token,
      familyId: rotated.familyId,
      skipStoreRefresh: true, // rotateRefreshToken already stored the new token.
    });

    return session;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────────

  /**
   * DEV-only — idempotently provision a customer session for the mock phone.
   * Ensures a users row + a linked customers row exist (creating either if
   * missing, linking a walk-in customers row if found by phone), stamps the
   * login, and returns a `logged_in` response. Never returns `needs_profile`
   * — the dev login is meant to land on HomeScreen in one tap.
   */
  private async buildDevCustomerSession(
    normalizedPhone: string,
    userAgent: string | undefined,
    clientIp: string | undefined,
  ): Promise<CustomerOtpVerifyServiceResponse> {
    // Find or create the users row.
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select(QueryFragments.BASE_USER_PROFILE)
      .eq("phone", normalizedPhone)
      .is("deleted_at", null)
      .maybeSingle();

    let user = existingUser;
    if (!user) {
      const newUserId = crypto.randomUUID();
      const { data: inserted, error: userInsertError } = await supabaseAdmin
        .from("users")
        .insert({
          id: newUserId,
          phone: normalizedPhone,
          otp: null,
          otp_expires_at: null,
          otp_attempts: 0,
        })
        .select(QueryFragments.BASE_USER_PROFILE)
        .single();
      if (userInsertError || !inserted) {
        throw new Error(
          `Dev login failed to create user: ${userInsertError?.message ?? "unknown"}`,
        );
      }
      user = inserted;
    }

    // Find or create + link the customers row. Walk-in customers created by a
    // cashier have user_id = null — match by phone so we link rather than dup.
    const { data: existingCustomer } = await supabaseAdmin
      .from("customers")
      .select(QueryFragments.BASE_CUSTOMER)
      .eq("phone", normalizedPhone)
      .is("deleted_at", null)
      .maybeSingle();

    let customer = existingCustomer;
    if (!customer) {
      const { data: created, error: insertError } = await supabaseAdmin
        .from("customers")
        .insert({
          phone: normalizedPhone,
          user_id: user.id,
          surname: "Dev",
          other_names: "Customer",
        })
        .select(QueryFragments.BASE_CUSTOMER)
        .single();
      if (insertError || !created) {
        throw new Error(
          `Dev login failed to create customer: ${insertError?.message ?? "unknown"}`,
        );
      }
      customer = created;
    } else if (!customer.user_id) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("customers")
        .update({ user_id: user.id })
        .eq("id", customer.id)
        .select(QueryFragments.BASE_CUSTOMER)
        .single();
      if (updateError || !updated) {
        throw new Error(
          `Dev login failed to link customer: ${updateError?.message ?? "unknown"}`,
        );
      }
      customer = updated;
    }

    await this.stampLogin(user.id);

    const authUser: CustomerAuthUser = {
      id: user.id,
      phone: user.phone,
      customer_id: customer.id,
      surname: customer.surname,
      other_names: customer.other_names,
    };
    const session = await this.issueSession(authUser, userAgent, clientIp);
    return { status: "logged_in", ...session };
  }

  /**
   * Find the live customers row linked to a users.id. Walk-in customers
   * created by a cashier have user_id = null until they register, so this
   * only matches post-registration (or post-link in `register`).
   */
  private async findCustomerByUserId(
    userId: string,
  ): Promise<{
    id: number;
    surname: string | null;
    other_names: string | null;
  } | null> {
    const { data } = await supabaseAdmin
      .from("customers")
      .select(QueryFragments.BASE_CUSTOMER)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    return data
      ? {
          id: data.id,
          surname: data.surname,
          other_names: data.other_names,
        }
      : null;
  }

  /**
   * Stamp last_login_at on the users row. Best-effort — failures are
   * logged but don't block the session.
   */
  private async stampLogin(userId: string): Promise<void> {
    await supabaseAdmin
      .from("users")
      .update({
        otp: null,
        otp_expires_at: null,
        otp_attempts: 0,
        last_login_at: new Date().toISOString(),
      })
      .eq("id", userId);
  }

  /**
   * Mint the access token, generate + store a refresh token (unless the
   * caller passed an already-stored rotation result), and compose the
   * session response.
   */
  private async issueSession(
    authUser: CustomerAuthUser,
    userAgent: string | undefined,
    clientIp: string | undefined,
    opts: {
      refreshToken?: string;
      familyId?: string;
      skipStoreRefresh?: boolean;
    } = {},
  ): Promise<CustomerRegisterServiceResponse> {
    const accessToken = await TokenService.signAccessToken(
      authUser.id,
      authUser.phone,
      null, // role — null for customers
      null, // merchant_id
      null, // branch_id
      null, // staff_id
      authUser.customer_id,
    );

    let refreshToken: string;
    if (opts.refreshToken && opts.skipStoreRefresh) {
      refreshToken = opts.refreshToken;
    } else {
      const deviceFingerprint = TokenService.computeDeviceFingerprint(
        userAgent,
        clientIp,
      );
      const familyId = opts.familyId ?? crypto.randomUUID();
      const {
        token: freshToken,
        tokenHash: refreshTokenHash,
        jti,
      } = TokenService.generateOpaqueToken();
      await TokenService.storeRefreshToken(
        refreshTokenHash,
        jti,
        authUser.id,
        familyId,
        deviceFingerprint,
        clientIp,
      );
      refreshToken = freshToken;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      expires_at: nowSeconds + ACCESS_TOKEN_TTL_SECONDS,
      token_type: "Bearer",
      user: authUser,
    };
  }
}