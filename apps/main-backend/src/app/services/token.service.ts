import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { supabaseAdmin } from "../utils/supabase.client";
import { AccessTokenPayload } from "../types/auth.types";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const PENDING_TOKEN_SECRET =
  process.env.PENDING_TOKEN_SECRET || REFRESH_TOKEN_SECRET || "";
const ACCESS_TOKEN_TTL_MINUTES = parseInt(
  process.env.ACCESS_TOKEN_TTL_MINUTES || "15",
  10,
);
const REFRESH_TOKEN_TTL_DAYS = parseInt(
  process.env.REFRESH_TOKEN_TTL_DAYS || "7",
  10,
);
const PENDING_TOKEN_TTL_MINUTES = parseInt(
  process.env.PENDING_TOKEN_TTL_MINUTES || "5",
  10,
);
// Phone-verified token — issued after the customer-app phone-change OTP succeeds. Carries (customerId, newPhone) for the subsequent PATCH /me/profile so the update can prove ownership of the new phone without re-sending an OTP.
const PHONE_VERIFIED_TOKEN_TTL_MINUTES = parseInt(
  process.env.PHONE_VERIFIED_TOKEN_TTL_MINUTES || "10",
  10,
);
const TOKEN_ISSUER = process.env.TOKEN_ISSUER || "storecredit-api";
const TOKEN_AUDIENCE = process.env.TOKEN_AUDIENCE || "storecredit-app";

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error(
    "Missing required auth secrets: ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET",
  );
}

const accessTokenKey = new TextEncoder().encode(ACCESS_TOKEN_SECRET);
// Falls back to REFRESH_TOKEN_SECRET so dev environments without PENDING_TOKEN_SECRET still work; production should set a distinct secret so a pending (registration) token can never be mistaken for an access token — the `purpose: "customer_register"` claim is the secondary guard.
const pendingTokenKey = new TextEncoder().encode(PENDING_TOKEN_SECRET);

export interface RefreshTokenRecord {
  jti: string;
  user_id: string;
  token_hash: string;
  family_id: string;
  device_fingerprint: string | null;
  ip_address: unknown;
  expires_at: string;
  revoked_at: string | null;
  replaced_at: string | null;
  replaced_by_jti: string | null;
  parent_jti: string | null;
  issued_at: string | null;
}

export class TokenService {
  static generateOpaqueToken(): {
    token: string;
    tokenHash: string;
    jti: string;
  } {
    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const jti = crypto.randomUUID();
    return { token, tokenHash, jti };
  }

  static computeDeviceFingerprint(
    userAgent: string | undefined,
    ip: string | undefined,
  ): string {
    const ua = userAgent || "";
    const clientIp = ip || "";
    return crypto
      .createHash("sha256")
      .update(`${ua}:${clientIp}`)
      .digest("hex");
  }

  // customerId is null for staff logins, set to customers.id for customer-app logins. Handlers assert request.user.customer_id != null to gate customer-only endpoints — no `persona` claim.
  static async signAccessToken(
    userId: string,
    phone: string | null,
    role: string | null,
    merchantId: number | null = null,
    branchId: number | null = null,
    staffId: number | null = null,
    customerId: number | null = null,
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();

    const jwt = await new SignJWT({
      sub: userId,
      phone,
      role,
      merchant_id: merchantId,
      branch_id: branchId,
      staff_id: staffId,
      customer_id: customerId,
      jti,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(`${ACCESS_TOKEN_TTL_MINUTES}m`)
      .setIssuer(TOKEN_ISSUER)
      .setAudience(TOKEN_AUDIENCE)
      .sign(accessTokenKey);

    return jwt;
  }

  static async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, accessTokenKey, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      clockTolerance: 5,
      requiredClaims: ["sub", "jti"],
    });

    return payload as unknown as AccessTokenPayload;
  }

  // Stateless 5-minute token — no DB row, no in-memory store. Carries the verified phone (post-OTP) and a `purpose` claim so it can't be mistaken for an access token. Replay-safe via natural idempotency: a replayed register finds the users row already exists and errors "already registered".
  static async signPendingToken(phone: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();

    return new SignJWT({
      phone,
      purpose: "customer_register",
      jti,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(`${PENDING_TOKEN_TTL_MINUTES}m`)
      .setIssuer(TOKEN_ISSUER)
      .setAudience(TOKEN_AUDIENCE)
      .sign(pendingTokenKey);
  }

  static async verifyPendingToken(
    token: string,
  ): Promise<{ phone: string } | null> {
    try {
      const { payload } = await jwtVerify(token, pendingTokenKey, {
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
        clockTolerance: 5,
      });
      if (payload.purpose !== "customer_register" || !payload.phone) {
        return null;
      }
      return { phone: payload.phone as string };
    } catch {
      return null;
    }
  }

  // Stateless 10-minute token carrying (customerId, newPhone) and a `type: 'phone_verified'` claim so it CANNOT be mistaken for a pending_token (`purpose: 'customer_register'`) or an access token. Signed with the same key as signPendingToken — the `type` claim is the cross-use guard, not the secret.
  static async signPhoneVerifiedToken(
    customerId: number,
    newPhone: string,
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();

    return new SignJWT({
      type: "phone_verified",
      customerId,
      newPhone,
      jti,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(`${PHONE_VERIFIED_TOKEN_TTL_MINUTES}m`)
      .setIssuer(TOKEN_ISSUER)
      .setAudience(TOKEN_AUDIENCE)
      .sign(pendingTokenKey);
  }

  static async verifyPhoneVerifiedToken(
    token: string,
  ): Promise<{ customerId: number; newPhone: string } | null> {
    try {
      const { payload } = await jwtVerify(token, pendingTokenKey, {
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
        clockTolerance: 5,
      });
      if (
        payload.type !== "phone_verified" ||
        typeof payload.customerId !== "number" ||
        typeof payload.newPhone !== "string"
      ) {
        return null;
      }
      return {
        customerId: payload.customerId,
        newPhone: payload.newPhone,
      };
    } catch {
      return null;
    }
  }

  static async storeRefreshToken(
    tokenHash: string,
    jti: string,
    userId: string,
    familyId: string,
    deviceFingerprint: string,
    ipAddress?: string,
    parentJti?: string,
  ): Promise<void> {
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    const issuedAt = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("refresh_tokens")
      .insert({
        jti,
        user_id: userId,
        token_hash: tokenHash,
        family_id: familyId,
        device_fingerprint: deviceFingerprint,
        ip_address: ipAddress || null,
        issued_at: issuedAt,
        expires_at: expiresAt.toISOString(),
        parent_jti: parentJti || null,
      });

    if (error) {
      throw new Error(`Failed to store refresh token: ${error.message}`);
    }
  }

  static async findRefreshToken(
    tokenHash: string,
  ): Promise<RefreshTokenRecord | null> {
    const { data, error } = await supabaseAdmin
      .from("refresh_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  static async findRefreshTokenByJti(
    jti: string,
  ): Promise<RefreshTokenRecord | null> {
    const { data, error } = await supabaseAdmin
      .from("refresh_tokens")
      .select("*")
      .eq("jti", jti)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  static async revokeRefreshTokenByJti(jti: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("jti", jti);

    if (error) {
      throw new Error(`Failed to revoke refresh token: ${error.message}`);
    }
  }

  // Verify the old token, revoke it, and issue a new one in the same family. A token already marked replaced is reuse — don't nuke the family, just require re-auth.
  static async rotateRefreshToken(
    oldTokenHash: string,
    deviceFingerprint: string,
  ): Promise<{
    token: string;
    tokenHash: string;
    familyId: string;
    userId: string;
  }> {
    const existing = await this.findRefreshToken(oldTokenHash);

    if (!existing) {
      throw new Error("Invalid refresh token");
    }

    if (existing.replaced_at) {
      throw new Error("Session expired. Please sign in again.");
    }

    if (existing.revoked_at) {
      throw new Error("Refresh token has been revoked");
    }

    if (new Date(existing.expires_at) <= new Date()) {
      throw new Error("Refresh token has expired");
    }

    const { token, tokenHash, jti } = this.generateOpaqueToken();

    await this.storeRefreshToken(
      tokenHash,
      jti,
      existing.user_id,
      existing.family_id,
      existing.device_fingerprint ?? deviceFingerprint,
      undefined,
      existing.jti,
    );

    await this.markTokenAsReplaced(existing.jti, jti);

    return {
      token,
      tokenHash,
      familyId: existing.family_id,
      userId: existing.user_id,
    };
  }

  static async markTokenAsReplaced(
    oldJti: string,
    newJti: string,
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from("refresh_tokens")
      .update({
        replaced_at: new Date().toISOString(),
        replaced_by_jti: newJti,
      })
      .eq("jti", oldJti);

    if (error) {
      throw new Error(`Failed to mark token as replaced: ${error.message}`);
    }
  }

  static async revokeRefreshToken(tokenHash: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", tokenHash);

    if (error) {
      throw new Error(`Failed to revoke refresh token: ${error.message}`);
    }
  }

  static async revokeTokenFamily(familyId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("family_id", familyId)
      .is("revoked_at", null);

    if (error) {
      throw new Error(`Failed to revoke token family: ${error.message}`);
    }
  }

  static async revokeAllUserTokens(userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("revoked_at", null);

    if (error) {
      throw new Error(`Failed to revoke user tokens: ${error.message}`);
    }
  }

  // Exposes `jti` as `id` in the returned objects for API compatibility.
  static async listUserSessions(
    userId: string,
    currentTokenHash?: string,
  ): Promise<
    Array<{
      id: string;
      device_fingerprint: string | null;
      created_at: string;
      expires_at: string;
      revoked_at: string | null;
      is_current: boolean;
    }>
  > {
    const { data, error } = await supabaseAdmin
      .from("refresh_tokens")
      .select(
        "jti, token_hash, device_fingerprint, issued_at, expires_at, revoked_at",
      )
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("issued_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list sessions: ${error.message}`);
    }

    const rows = data || [];

    return rows.map((row) => ({
      id: row.jti,
      device_fingerprint: row.device_fingerprint,
      created_at: row.issued_at ?? row.expires_at,
      expires_at: row.expires_at,
      revoked_at: row.revoked_at,
      is_current: currentTokenHash
        ? row.token_hash === currentTokenHash
        : false,
    }));
  }

  static async cleanupExpiredTokens(): Promise<number> {
    const { error, count } = await supabaseAdmin
      .from("refresh_tokens")
      .delete({ count: "exact" })
      .lt("expires_at", new Date().toISOString());

    if (error) {
      throw new Error(`Failed to cleanup expired tokens: ${error.message}`);
    }

    return count || 0;
  }
}