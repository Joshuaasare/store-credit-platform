export const QueryFragments = {
  BASE_USER_ROLE: `id,created_at,role,updated_at,user_id,
  assigned_by_user_id`,
  BASE_USER: `id, email, phone, surname, other_names, access_granted, 
  otp, otp_expires_at`,
  BASE_MERCHART: `id, name, phone, country_code, slug, is_active,
  created_at, credit_pool_used, credit_pool_limit, logo_url, cover_photo_url`,
  BASE_BRANCH: `id, merchant_id, name, phone, address, city, country_code, is_active, created_at`,

  /**
   * Staff → Branch → Merchant lookup, filtered by user_id.
   * Used at login to resolve merchant_id / primary branch_id for JWT enrichment.
   * Selects a single staff row (the user's primary assignment) joined to its branch
   * and merchant, all filtered by `deleted_at is null`.
   */
  STAFF_MERCHANT_LOOKUP: `id, branch_id, user_id, branches ( id, merchant_id, merchants ( id ) )`,

  /**
   * Bare customers row used for lookups / inserts.
   */
  BASE_CUSTOMER: `id, phone, unique_id, user_id, created_at, deleted_at`,

  /**
   * Customer transactions list with joined customer (→ users for name), branch,
   * and recorded_by_user (users.surname). Used by the Transactions page.
   */
  CUSTOMER_TRANSACTION_WITH_JOINS: `id, customer_id, branch_id, recorded_by_user_id, amount, transaction_date, transaction_type, created_at,
    customer:customers ( id, phone, user_id, users ( id, surname, other_names ) ),
    branch:branches ( id, name ),
    recorded_by_user:users ( id, surname )`,
} as const;
