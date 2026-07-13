import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { supabaseAdmin } from "../utils/supabase.client";
import { AccessTokenPayload } from "../types/auth.types";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_TTL_MINUTES = parseInt(
  process.env.ACCESS_TOKEN_TTL_MINUTES || "15",
  10,
);
const REFRESH_TOKEN_TTL_DAYS = parseInt(
  process.env.REFRESH_TOKEN_TTL_DAYS || "7",
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

export interface RefreshTokenRecord {
  jti: string;
  user_id: string;
  token_hash: string;
  family_id: string;
  device_fingerprint: string | null;
  ip_address: string | null;
  expires_at: string;
  revoked_at: string | null;
  replaced_at: string | null;
  replaced_by_jti: string | null;
  parent_jti: string | null;
  issued_at: string | null;
  created_at: string;
}

export class TokenService {
  /**
   * Generate a cryptographically secure opaque refresh token.
   * Returns the raw token, its SHA-256 hash, and a JTI (UUID).
   */
  static generateOpaqueToken(): { token: string; tokenHash: string; jti: string } {
    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const jti = crypto.randomUUID();
    return { token, tokenHash, jti };
  }

  /**
   * Compute a device fingerprint from user-agent and IP address.
   */
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

  /**
   * Sign a short-lived JWT access token.
   */
  static async signAccessToken(
    userId: string,
    phone: string | null,
    roles: string[],
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();

    const jwt = await new SignJWT({
      sub: userId,
      phone,
      roles,
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

  /**
   * Verify a JWT access token and return its payload.
   */
  static async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, accessTokenKey, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      clockTolerance: 5,
      requiredClaims: ["sub", "jti"],
    });

    return payload as unknown as AccessTokenPayload;
  }

  /**
   * Store a refresh token in the database.
   */
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

    const { error } = await (supabaseAdmin as any).from("refresh_tokens").insert({
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

  /**
   * Find a refresh token by its hash.
   */
  static async findRefreshToken(
    tokenHash: string,
  ): Promise<RefreshTokenRecord | null> {
    const { data, error } = await (supabaseAdmin as any)
      .from("refresh_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .single();

    if (error || !data) {
      return null;
    }

    return data as unknown as RefreshTokenRecord;
  }

  /**
   * Find a refresh token by its JTI.
   */
  static async findRefreshTokenByJti(
    jti: string,
  ): Promise<RefreshTokenRecord | null> {
    const { data, error } = await (supabaseAdmin as any)
      .from("refresh_tokens")
      .select("*")
      .eq("jti", jti)
      .single();

    if (error || !data) {
      return null;
    }

    return data as unknown as RefreshTokenRecord;
  }

  /**
   * Revoke a single refresh token by its JTI.
   */
  static async revokeRefreshTokenByJti(jti: string): Promise<void> {
    const { error } = await (supabaseAdmin as any)
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("jti", jti);

    if (error) {
      throw new Error(`Failed to revoke refresh token: ${error.message}`);
    }
  }

  /**
   * Rotate a refresh token: verify the old one, revoke it, and issue a new one.
   * Returns the new raw refresh token.
   */
  static async rotateRefreshToken(
    oldTokenHash: string,
    deviceFingerprint: string,
  ): Promise<{ token: string; tokenHash: string; familyId: string; userId: string }> {
    const existing = await this.findRefreshToken(oldTokenHash);

    if (!existing) {
      throw new Error("Invalid refresh token");
    }

    if (existing.replaced_at) {
      // Token was already rotated — likely reuse. Don't nuke the family; just require re-auth.
      throw new Error("Session expired. Please sign in again.");
    }

    if (existing.revoked_at) {
      throw new Error("Refresh token has been revoked");
    }

    if (new Date(existing.expires_at) <= new Date()) {
      throw new Error("Refresh token has expired");
    }

    // Generate a new token in the same family
    const { token, tokenHash, jti } = this.generateOpaqueToken();

    // Store new token with parent linkage
    await this.storeRefreshToken(
      tokenHash,
      jti,
      existing.user_id,
      existing.family_id,
      existing.device_fingerprint ?? deviceFingerprint,
      undefined,
      existing.jti,
    );

    // Mark old token as replaced
    await this.markTokenAsReplaced(existing.jti, jti);

    return { token, tokenHash, familyId: existing.family_id, userId: existing.user_id };
  }

  /**
   * Mark a token as replaced by another (used during rotation).
   */
  static async markTokenAsReplaced(
    oldJti: string,
    newJti: string,
  ): Promise<void> {
    const { error } = await (supabaseAdmin as any)
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

  /**
   * Revoke a single refresh token by its hash.
   */
  static async revokeRefreshToken(tokenHash: string): Promise<void> {
    const { error } = await (supabaseAdmin as any)
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", tokenHash);

    if (error) {
      throw new Error(`Failed to revoke refresh token: ${error.message}`);
    }
  }

  /**
   * Revoke all tokens in a family (used on theft detection).
   */
  static async revokeTokenFamily(familyId: string): Promise<void> {
    const { error } = await (supabaseAdmin as any)
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("family_id", familyId)
      .is("revoked_at", null);

    if (error) {
      throw new Error(`Failed to revoke token family: ${error.message}`);
    }
  }

  /**
   * Revoke all refresh tokens for a user (e.g., on logout from all devices).
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    const { error } = await (supabaseAdmin as any)
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("revoked_at", null);

    if (error) {
      throw new Error(`Failed to revoke user tokens: ${error.message}`);
    }
  }

  /**
   * List active refresh token sessions for a user.
   * Exposes `jti` as `id` in the returned objects for API compatibility.
   */
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
    const { data, error } = await (supabaseAdmin as any)
      .from("refresh_tokens")
      .select("jti, token_hash, device_fingerprint, created_at, expires_at, revoked_at")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list sessions: ${error.message}`);
    }

    const rows = (data || []) as Array<{
      jti: string;
      token_hash: string;
      device_fingerprint: string | null;
      created_at: string;
      expires_at: string;
      revoked_at: string | null;
    }>;

    return rows.map((row) => ({
      id: row.jti,
      device_fingerprint: row.device_fingerprint,
      created_at: row.created_at,
      expires_at: row.expires_at,
      revoked_at: row.revoked_at,
      is_current: currentTokenHash
        ? row.token_hash === currentTokenHash
        : false,
    }));
  }

  /**
   * Clean up expired refresh tokens from the database.
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const { error, count } = await (supabaseAdmin as any)
      .from("refresh_tokens")
      .delete({ count: "exact" })
      .lt("expires_at", new Date().toISOString());

    if (error) {
      throw new Error(`Failed to cleanup expired tokens: ${error.message}`);
    }

    return count || 0;
  }
}
