import crypto from "crypto";

// The actual code is generated inside the SQL redemption_request_create/update RPCs because it has to be unique among active codes at the merchant — JS-side generation would race two concurrent requests and risk a collision. This TS helper exists for symmetry with PasswordService.generateOTP and for tests/fixtures/manual debugging. The plpgsql side uses floor(random() * 9000 + 1000)::int (uniform but non-CSPRNG) — see the migration file's section 13 header for the trade-off.
export class RedemptionCodeService {
  static generate(): number {
    return crypto.randomInt(1000, 10_000);
  }
}
