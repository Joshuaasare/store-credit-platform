export const QueryFragments = {
  BASE_USER_ROLE: `id,created_at,role,updated_at,user_id,assigned_by_user_id`,

  BASE_USER: `id, email, phone, surname, other_names, access_granted, otp, otp_expires_at`,
} as const;
