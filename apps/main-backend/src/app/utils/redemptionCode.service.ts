import crypto from "crypto";

/**
 * Redemption-code helper.
 *
 * Generates a 4-digit integer (1000-9999) using `crypto.randomInt`,
 * the same CSPRNG used by the OTP generator. The actual code is
 * produced inside the SQL `redemption_request_create` /
 * `redemption_request_update` RPCs because it has to be unique among
 * active codes at the merchant — JS-side generation would race two
 * concurrent requests and risk a collision.
 *
 * This helper exists for symmetry with `PasswordService.generateOTP`
 * and to provide a documented TS-side generator for tests / fixtures
 * / manual debugging. The plpgsql side uses
 * `floor(random() * 9000 + 1000)::int` (uniform but non-CSPRNG) — see
 * the migration file's section 13 header comment for the trade-off.
 */
export class RedemptionCodeService {
  /**
   * Generate a 4-digit numeric redemption code (1000-9999, inclusive).
   */
  static generate(): number {
    return crypto.randomInt(1000, 10_000);
  }
}
