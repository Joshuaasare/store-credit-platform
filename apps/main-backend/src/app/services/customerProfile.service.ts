import { supabaseAdmin } from "../utils/supabase.client";
import { SMSTemplates } from "../utils/messaging.service";
import { normalizePhone } from "../utils/phone.utils";
import { OtpService } from "../utils/otp.service";
import { QueryFragments } from "../constants/queryFragments";
import { CustomerAuthUser } from "../types/main.types";
import { TokenService } from "./token.service";
import { storageService } from "./storage.service";

const AVATAR_BUCKET = "customer-avatars";

/**
 * CustomerProfileService — backs the `/customers/me/*` profile-edit
 * endpoints on the customer-app.
 *
 * Three methods:
 *   - `sendPhoneChangeOtp`   — sends an OTP to a candidate new phone,
 *     with no-op + uniqueness guards.
 *   - `verifyPhoneChangeOtp` — verifies the OTP and issues a 10-minute
 *     phone-verified JWT via `TokenService.signPhoneVerifiedToken`.
 *   - `updateProfile`        — commits surname / other_names / avatar_url
 *     and (when a phoneVerifiedToken is supplied) `users.phone`. After
 *     the DB UPDATE, if the old avatar_url was non-null AND differs
 *     from the new one, the old object is deleted from the bucket
 *     (orphan-tolerant on storage failure — DB correct > bucket
 *     cleanup).
 *
 * Avatar uploads go through the generic `POST /storage/upload-url`
 * endpoint (same path the webapp uses for vendor logos) — the
 * customer-app calls `storage.uploadFile()` from `api-services`, then
 * PATCHes `avatar_url` here. No customer-specific upload endpoint.
 *
 * Separate from `CustomerAuthService` so the auth service stays focused
 * on login. Reuses the same primitives (otp.store, normalizePhone,
 * MessagingService, PasswordService, RateLimitService, TokenService).
 */
export class CustomerProfileService {
  /**
   * Send an OTP to a candidate new phone. Guards:
   *   - normalize the phone via `normalizePhone`
   *   - reject no-op (`newPhone === currentPhone`) with 400
   *   - reject uniqueness clash (another `users` row already has this
   *     phone) with 400
   *
   * OTP mechanics (rate-limit, dev-bypass, generate/hash/store, SMS send)
   * are delegated to `OtpService.issueAndSend` — shared with the login
   * flow so OTP policy lives in one place.
   */
  async sendPhoneChangeOtp(
    customerId: number,
    newPhoneRaw: string,
    clientIp?: string,
  ): Promise<{ message: string }> {
    // Resolve the customer's current phone via the linked `users` row.
    const current = await this.resolveCurrentIdentity(customerId);
    const newPhone = normalizePhone(newPhoneRaw);

    if (newPhone === current.phone) {
      const error = new Error(
        "This is already your current phone number — no change to verify.",
      );
      (error as Error & { statusCode?: number }).statusCode = 400;
      throw error;
    }

    // Uniqueness — another users row must not already claim this phone.
    const { data: clash } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", newPhone)
      .is("deleted_at", null)
      .maybeSingle();
    if (clash) {
      const error = new Error(
        "This phone number is already in use by another account.",
      );
      (error as Error & { statusCode?: number }).statusCode = 400;
      throw error;
    }

    await OtpService.issueAndSend({
      phone: newPhone,
      clientIp,
      smsTemplate: SMSTemplates.phoneChangeOTP,
      devBypassPhone: process.env.DEV_MOCK_CUSTOMER_PHONE,
    });

    return { message: "OTP sent successfully" };
  }

  /**
   * Verify the OTP the customer entered for the phone change. Delegates
   * the OTP mechanics (get/expiry/attempts/verify/consume) to
   * `OtpService.verifyAndConsume`. On success, issues a 10-minute
   * phone-verified JWT via `TokenService.signPhoneVerifiedToken` and
   * returns it. The customer-app holds the token in EditProfile's
   * `useState` (NOT the auth store) and includes it in the subsequent
   * `PATCH /me/profile` body.
   */
  async verifyPhoneChangeOtp(
    customerId: number,
    newPhoneRaw: string,
    otp: string,
  ): Promise<{ phoneVerifiedToken: string }> {
    const newPhone = normalizePhone(newPhoneRaw);

    // DEV bypass — accept the mock OTP for the mock customer phone and
    // auto-issue a phone-verified token so the dev flow works end-to-end.
    const isDevMock =
      process.env.NODE_ENV === "development" &&
      newPhone === process.env.DEV_MOCK_CUSTOMER_PHONE &&
      otp === process.env.DEV_MOCK_CUSTOMER_OTP;

    if (isDevMock) {
      const token = await TokenService.signPhoneVerifiedToken(
        customerId,
        newPhone,
      );
      return { phoneVerifiedToken: token };
    }

    const result = OtpService.verifyAndConsume({ phone: newPhone, otp });
    if (!result.valid) {
      throw new Error(result.error);
    }

    const token = await TokenService.signPhoneVerifiedToken(
      customerId,
      newPhone,
    );
    return { phoneVerifiedToken: token };
  }

  /**
   * Commit a profile update. All fields optional except the implicit
   * `customerId` (from the JWT). When `newPhone` is present:
   *   - require `phoneVerifiedToken`
   *   - verify it via `TokenService.verifyPhoneVerifiedToken`
   *   - assert `token.customerId === customerId` (cross-customer replay guard)
   *   - assert `token.newPhone === newPhone` (token bound to the verified phone)
   *   - re-check uniqueness (race guard — another users row may have
   *     claimed this phone in the 10-minute window)
   *   - update `users.phone`
   *
   * Updates `customers.surname / other_names / avatar_url` when those
   * fields are present. Rejects empty `surname` (matches registration).
   * After the DB UPDATE, if the old `avatar_url` was non-null AND
   * differs from the new one, the old object is deleted from the
   * `customers-avatar` bucket — orphan-tolerant on storage failure (DB
   * correct > bucket cleanup).
   *
   * Returns the full post-update `CustomerAuthUser` so the customer-app
   * can call `setUser` and re-render every surface that reads `user`.
   */
  async updateProfile(
    customerId: number,
    body: {
      surname?: string;
      other_names?: string;
      avatar_url?: string | null;
      newPhone?: string;
      phoneVerifiedToken?: string;
    },
  ): Promise<CustomerAuthUser> {
    // Validate surname if present.
    if (body.surname != null) {
      const trimmed = body.surname.trim();
      if (!trimmed) {
        const error = new Error("Surname cannot be empty.");
        (error as Error & { statusCode?: number }).statusCode = 400;
        throw error;
      }
    }

    // Resolve the current identity (users + customers rows) up-front —
    // we need the customer's `user_id` to update `users.phone` and the
    // current `avatar_url` for the old-object cleanup.
    const current = await this.resolveCurrentIdentity(customerId);

    // If the customer is changing their phone, verify the phone-verified
    // token and re-check uniqueness (race guard).
    let normalizedNewPhone: string | null = null;
    if (body.newPhone != null && body.newPhone !== "") {
      if (!body.phoneVerifiedToken) {
        const error = new Error(
          "Phone verification is required to change your phone number.",
        );
        (error as Error & { statusCode?: number }).statusCode = 400;
        throw error;
      }
      const verified = await TokenService.verifyPhoneVerifiedToken(
        body.phoneVerifiedToken,
      );
      if (!verified) {
        const error = new Error(
          "Phone verification has expired. Please verify your new phone again.",
        );
        (error as Error & { statusCode?: number }).statusCode = 400;
        throw error;
      }
      if (verified.customerId !== customerId) {
        const error = new Error(
          "Phone verification token does not match this account.",
        );
        (error as Error & { statusCode?: number }).statusCode = 400;
        throw error;
      }
      normalizedNewPhone = normalizePhone(body.newPhone);
      if (verified.newPhone !== normalizedNewPhone) {
        const error = new Error(
          "Phone verification does not match the new phone number.",
        );
        (error as Error & { statusCode?: number }).statusCode = 400;
        throw error;
      }
      if (normalizedNewPhone === current.phone) {
        // No-op — the customer verified the same phone they already have.
        // Drop the phone update (we don't need to write users.phone).
        normalizedNewPhone = null;
      } else {
        // Race guard — another users row may have claimed this phone in
        // the 10-minute window between verify and update.
        const { data: clash } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("phone", normalizedNewPhone)
          .is("deleted_at", null)
          .maybeSingle();
        if (clash) {
          const error = new Error(
            "This phone number is already in use by another account.",
          );
          (error as Error & { statusCode?: number }).statusCode = 400;
          throw error;
        }
      }
    }

    // Build the customers UPDATE payload — only the fields present in
    // the body. `avatar_url` is sent as `null` when the customer removed
    // their photo; we don't treat null specially here, we just forward
    // it to the UPDATE. When the phone is changing, `phone` is written
    // here too — the webapp reads `customers.phone` (get_customers RPC,
    // getCustomerDetail), so it must stay in sync with `users.phone`
    // (which the customer-app auth reads).
    const customersUpdate: Record<string, unknown> = {};
    if (body.surname != null) customersUpdate.surname = body.surname.trim();
    if (body.other_names != null)
      customersUpdate.other_names = body.other_names.trim();
    if (body.avatar_url !== undefined)
      customersUpdate.avatar_url = body.avatar_url;
    if (normalizedNewPhone != null) customersUpdate.phone = normalizedNewPhone;

    const oldAvatarUrl = current.avatar_url;

    // Update the customers row. Always run the UPDATE (even if only the
    // phone is changing) so `updated_at` advances on any profile edit.
    const { data: updatedCustomer, error: customerUpdateError } =
      await supabaseAdmin
        .from("customers")
        .update(customersUpdate)
        .eq("id", customerId)
        .select(QueryFragments.BASE_CUSTOMER)
        .single();

    if (customerUpdateError || !updatedCustomer) {
      throw new Error(
        `Failed to update profile: ${customerUpdateError?.message ?? "unknown"}`,
      );
    }

    // Update users.phone if a verified new phone is present.
    let updatedPhone = current.phone;
    if (normalizedNewPhone != null && current.userId != null) {
      const { error: userUpdateError } = await supabaseAdmin
        .from("users")
        .update({ phone: normalizedNewPhone })
        .eq("id", current.userId);
      if (userUpdateError) {
        throw new Error(
          `Failed to update phone: ${userUpdateError.message}`,
        );
      }
      updatedPhone = normalizedNewPhone;
    }

    // Old-avatar cleanup — only when avatar_url actually changed and the
    // old value was non-null. Orphan-tolerant: a storage failure is
    // logged but does NOT roll back the profile update (the DB is the
    // source of truth; an orphaned object in the bucket is a cosmetic
    // leak, not a correctness bug).
    const newAvatarUrl =
      body.avatar_url !== undefined ? body.avatar_url : oldAvatarUrl;
    if (
      oldAvatarUrl != null &&
      newAvatarUrl !== oldAvatarUrl
    ) {
      try {
        await storageService.deleteFileByUrl(AVATAR_BUCKET, oldAvatarUrl);
      } catch (err) {
        console.warn(
          "[customerProfile] failed to delete old avatar object:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    return {
      id: current.userId ?? "",
      phone: updatedCustomer.phone ?? updatedPhone,
      customer_id: customerId,
      surname: updatedCustomer.surname,
      other_names: updatedCustomer.other_names,
      avatar_url: updatedCustomer.avatar_url,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Resolve the customer's current identity — the linked `users.id`
   * (uuid), `users.phone`, and `customers.avatar_url`. Used to:
   *   - compare newPhone against currentPhone in `sendPhoneChangeOtp`
   *   - find the `users` row to update in `updateProfile`
   *   - find the old `avatar_url` to clean up in `updateProfile`
   */
  private async resolveCurrentIdentity(
    customerId: number,
  ): Promise<{
    userId: string | null;
    phone: string | null;
    avatar_url: string | null;
  }> {
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .select(QueryFragments.BASE_CUSTOMER)
      .eq("id", customerId)
      .is("deleted_at", null)
      .maybeSingle();

    if (customerError || !customer) {
      throw new Error("Customer not found");
    }

    if (!customer.user_id) {
      // Defensive — a customer row without a user_id can't have gone
      // through registration. Return the phone from the customer row
      // (which mirrors users.phone once linked) and null userId.
      return {
        userId: null,
        phone: customer.phone,
        avatar_url: customer.avatar_url,
      };
    }

    const { data: user } = await supabaseAdmin
      .from("users")
      .select(QueryFragments.BASE_USER_PROFILE)
      .eq("id", customer.user_id)
      .is("deleted_at", null)
      .maybeSingle();

    return {
      userId: customer.user_id,
      phone: user?.phone ?? customer.phone,
      avatar_url: customer.avatar_url,
    };
  }
}

// Singleton — matches the rest of the backend service exports.
export const customerProfileService = new CustomerProfileService();