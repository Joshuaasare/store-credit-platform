import crypto from "crypto";
import { supabaseAdmin } from "../utils/supabase.client";
import { SMSTemplates } from "../utils/messaging.service";
import { normalizePhone } from "../utils/phone.utils";
import { OtpService } from "../utils/otp.service";
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
import { deleteOtp } from "../utils/otp.store";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes — matches signAccessToken default.

// Phone-based OTP auth for the customer mobile app. Separate from staff auth: the staff flow gates on a staff row, a customer has none. Always sends an OTP (no anti-enumeration — phone ownership must be proven for brand-new phones). Post-verification branches into logged_in / needs_profile / register; needs_profile gets a 5-minute pending_token consumed by /register.
export class CustomerAuthService {
  async sendOtp(
    data: CustomerOtpSendRequest,
    clientIp?: string,
  ): Promise<{ message: string }> {
    const normalizedPhone = normalizePhone(data.phone);
    await OtpService.issueAndSend({
      phone: normalizedPhone,
      clientIp,
      smsTemplate: SMSTemplates.loginOTP,
      devBypassPhone: process.env.DEV_MOCK_CUSTOMER_PHONE,
    });
    return { message: "OTP sent successfully" };
  }

  // users row exists → logged_in (issue session); no users row → needs_profile (issue pending_token).
  async verifyOtp(
    data: CustomerOtpVerifyRequest,
    userAgent?: string,
    clientIp?: string,
  ): Promise<CustomerOtpVerifyServiceResponse> {
    const { phone, otp } = data;
    const normalizedPhone = normalizePhone(phone);

    // DEV bypass — auto-provisions a session (idempotently creates/links users + customers) and returns logged_in so dev login lands on HomeScreen.
    const isDevMock =
      process.env.NODE_ENV === "development" &&
      normalizedPhone === process.env.DEV_MOCK_CUSTOMER_PHONE &&
      otp === process.env.DEV_MOCK_CUSTOMER_OTP;

    if (isDevMock) {
      return this.buildDevCustomerSession(normalizedPhone, userAgent, clientIp);
    }

    const result = OtpService.verifyAndConsume({ phone: normalizedPhone, otp });
    if (!result.valid) {
      throw new Error(result.error);
    }

    const { data: user } = await supabaseAdmin
      .from("users")
      .select(QueryFragments.BASE_USER_PROFILE)
      .eq("phone", normalizedPhone)
      .is("deleted_at", null)
      .maybeSingle();

    if (user) {
      const customer = await this.findCustomerByUserId(user.id);
      if (!customer) {
        // users row exists but no customers row — treat as needs_profile; /register will link a fresh customers row.
        deleteOtp(normalizedPhone);
        const pendingToken =
          await TokenService.signPendingToken(normalizedPhone);
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
        avatar_url: customer.avatar_url,
      };
      const session = await this.issueSession(authUser, userAgent, clientIp);
      return { status: "logged_in", ...session };
    }

    // No users row → needs_profile.
    deleteOtp(normalizedPhone);
    const pendingToken = await TokenService.signPendingToken(normalizedPhone);
    return { status: "needs_profile", pending_token: pendingToken };
  }

  // Replay guard: a users row for the verified phone means registration already happened — reject with 400 "already registered".
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

    // users.id is a uuid the application generates — the DB column has no default.
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

    // Flow 1 vs flow 2: existing walk-in customers row by phone?
    const { data: existingCustomer } = await supabaseAdmin
      .from("customers")
      .select(QueryFragments.BASE_CUSTOMER)
      .eq("phone", normalizedPhone)
      .is("deleted_at", null)
      .maybeSingle();

    let customerId: number;
    // avatar_url from whichever branch wrote the row; neither branch touches it on the write.
    let customerAvatarUrl: string | null = null;

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
      customerAvatarUrl = updated.avatar_url;
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
      customerAvatarUrl = created.avatar_url;
    }

    await this.stampLogin(newUser.id);

    const authUser: CustomerAuthUser = {
      id: newUser.id,
      phone: newUser.phone,
      customer_id: customerId,
      surname: data.surname.trim() || null,
      other_names: data.other_names.trim() || null,
      avatar_url: customerAvatarUrl,
    };

    return this.issueSession(authUser, userAgent, clientIp);
  }

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
      avatar_url: customer.avatar_url,
    };
  }

  // The refresh token travels in the JSON body (RN has no httpOnly cookies).
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

  // DEV-only — idempotently provisions a users + customers row for the mock phone. Always returns logged_in so dev login lands on HomeScreen in one tap.
  private async buildDevCustomerSession(
    normalizedPhone: string,
    userAgent: string | undefined,
    clientIp: string | undefined,
  ): Promise<CustomerOtpVerifyServiceResponse> {
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

    // Walk-in customers created by a cashier have user_id = null — match by phone so we link rather than dup.
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
      avatar_url: customer.avatar_url,
    };
    const session = await this.issueSession(authUser, userAgent, clientIp);
    return { status: "logged_in", ...session };
  }

  // Only matches post-registration — walk-in customers have user_id = null until they register.
  private async findCustomerByUserId(userId: string): Promise<{
    id: number;
    surname: string | null;
    other_names: string | null;
    avatar_url: string | null;
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
          avatar_url: data.avatar_url,
        }
      : null;
  }

  // Best-effort — failures don't block the session.
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
      null,
      null,
      null,
      null,
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
