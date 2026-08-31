export const QueryFragments = {
  BASE_USER: `id,email,phone,otp,otp_expires_at`,
  BASE_MERCHANT: `id,name,phone,country_code,slug,is_active,created_at,credit_pool_used,credit_pool_limit,logo_url,cover_photo_url`,
  BASE_BRANCH: `id,merchant_id,name,phone,address,city,country_code,is_active,created_at,updated_at,deleted_at,latitude,longitude,place_id,place_label,category,purchase_threshold_amount`,
  BASE_CUSTOMER: `id,phone,unique_id,user_id,surname,other_names,avatar_url,created_at,deleted_at,latitude,longitude,place_id,place_label`,
  BASE_CUSTOMER_TRANSACTION: `id,customer_id,branch_id,recorded_by_staff_id,amount,transaction_date,transaction_type,created_at`,
  BASE_USER_PROFILE: `id,phone,last_login_at,created_at,deleted_at`,
  BASE_STAFF: `id,user_id,branch_id,role,surname,other_names,access_granted,address,notes,created_at,updated_at,deleted_at`,
  BASE_CUSTOMER_CREDIT: `id,customer_id,branch_id,credit_amount,pending_redemption_amount,approved_redemption_amount,redemption_approval_staff_id,expires_at,revoked_at,revoked_by_user_id,created_at,updated_at,deleted_at,transaction_date`,
  BASE_CUSTOMER_CREDIT_REDEMPTION: `id,customer_id,branch_id,merchant_id,amount_redeemed,approved_at,approved_by_staff_id,rejected_at,created_at,updated_at,deleted_at,requested_date,transaction_date`,
  BASE_CUSTOMER_PURCHASE: `id, customer_id, branch_id, recorded_by_staff_id, amount, transaction_date, created_at`,
  BASE_RUNNING_CREDIT_CONFIG: `id,config_group_id,branch_id,credit_type,images,credit_validity,eligible_window,fixed_credit_value,percentage_credit_value,maximum_allowed_credit,threshold_amount,terms,cumulative_scope,is_active,created_at,updated_at,deleted_at`,
  BASE_FIXED_CREDIT_CONFIG: `id,config_group_id,branch_id,title,description,images,start_date,end_date,terms,is_active,created_at,updated_at,deleted_at`,
} as const;
