import { supabaseAdmin } from "../utils/supabase.client";
import { SMSTemplates } from "./messaging.service";
import { normalizePhone } from "../utils/phone.utils";
import { OtpService } from "./otp.service";
import { QueryFragments } from "../constants/queryFragments";
import { CustomerAuthUser } from "../types/main.types";
import { TokenService } from "./token.service";
import { storageService } from "./storage.service";

const AVATAR_BUCKET = "customer-avatars";

// Phone change is two-step: sendPhoneChangeOtp → verifyPhoneChangeOtp (issues a 10-min phone-verified JWT) → updateProfile with that token. On avatar_url change, the old object is deleted from the bucket (orphan-tolerant on storage failure — DB correct > bucket cleanup).
export class CustomerProfileService {
  // Rejects no-op (same as current) + uniqueness clash; OTP mechanics are delegated to OtpService.issueAndSend so OTP policy lives in one place.
  async sendPhoneChangeOtp(
    customerId: number,
    newPhoneRaw: string,
    clientIp?: string,
  ): Promise<{ message: string }> {
    const current = await this.resolveCurrentIdentity(customerId);
    const newPhone = normalizePhone(newPhoneRaw);

    if (newPhone === current.phone) {
      const error = new Error(
        "This is already your current phone number — no change to verify.",
      );
      (error as Error & { statusCode?: number }).statusCode = 400;
      throw error;
    }

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

  // The customer-app holds the returned token in EditProfile's useState (NOT the auth store) and includes it in the subsequent PATCH /me/profile body.
  async verifyPhoneChangeOtp(
    customerId: number,
    newPhoneRaw: string,
    otp: string,
  ): Promise<{ phoneVerifiedToken: string }> {
    const newPhone = normalizePhone(newPhoneRaw);

    // DEV bypass — auto-issue a phone-verified token so the dev flow works end-to-end.
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

  // newPhone requires phoneVerifiedToken (verified, customerId-matched, phone-bound). Re-checks uniqueness as a race guard against the 10-min window. Rejects empty surname.
  async updateProfile(
    customerId: number,
    body: {
      surname?: string;
      other_names?: string;
      avatar_url?: string | null;
      newPhone?: string;
      phoneVerifiedToken?: string;
      latitude?: number | null;
      longitude?: number | null;
      place_id?: string | null;
    },
  ): Promise<CustomerAuthUser> {
    if (body.surname != null) {
      const trimmed = body.surname.trim();
      if (!trimmed) {
        const error = new Error("Surname cannot be empty.");
        (error as Error & { statusCode?: number }).statusCode = 400;
        throw error;
      }
    }

    const current = await this.resolveCurrentIdentity(customerId);

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
        normalizedNewPhone = null;
      } else {
        // Race guard — another users row may have claimed this phone in the 10-minute window.
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

    // customers.phone is written here too — the webapp reads customers.phone (get_customers RPC, getCustomerDetail), so it must stay in sync with users.phone.
    const customersUpdate: Record<string, unknown> = {};
    if (body.surname != null) customersUpdate.surname = body.surname.trim();
    if (body.other_names != null)
      customersUpdate.other_names = body.other_names.trim();
    if (body.avatar_url !== undefined)
      customersUpdate.avatar_url = body.avatar_url;
    if (normalizedNewPhone != null) customersUpdate.phone = normalizedNewPhone;
    if (body.latitude !== undefined) customersUpdate.latitude = body.latitude;
    if (body.longitude !== undefined)
      customersUpdate.longitude = body.longitude;
    if (body.place_id !== undefined) customersUpdate.place_id = body.place_id;

    const oldAvatarUrl = current.avatar_url;

    // Always run the UPDATE (even if only the phone is changing) so updated_at advances on any profile edit.
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

    let updatedPhone = current.phone;
    if (normalizedNewPhone != null && current.userId != null) {
      const { error: userUpdateError } = await supabaseAdmin
        .from("users")
        .update({ phone: normalizedNewPhone })
        .eq("id", current.userId);
      if (userUpdateError) {
        throw new Error(`Failed to update phone: ${userUpdateError.message}`);
      }
      updatedPhone = normalizedNewPhone;
    }

    // Old-avatar cleanup — orphan-tolerant: a storage failure is logged but does NOT roll back the profile update.
    const newAvatarUrl =
      body.avatar_url !== undefined ? body.avatar_url : oldAvatarUrl;
    if (oldAvatarUrl != null && newAvatarUrl !== oldAvatarUrl) {
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
      latitude: updatedCustomer.latitude,
      longitude: updatedCustomer.longitude,
      place_id: updatedCustomer.place_id,
    };
  }

  // Returns userId (uuid), users.phone, and customers.avatar_url — used for newPhone comparison, the users.phone update, and old-avatar cleanup.
  private async resolveCurrentIdentity(customerId: number): Promise<{
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
      // Defensive — a customer row without a user_id can't have gone through registration.
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

export const customerProfileService = new CustomerProfileService();
