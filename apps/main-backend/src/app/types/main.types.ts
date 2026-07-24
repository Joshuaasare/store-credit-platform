export type UserRoleValues = "manager" | "cashier";

export type BaseUserRole = {
  created_at: string | null;
  id: number;
  role: UserRoleValues;
  updated_at: string | null;
  user_id: string;
  assigned_by_user_id: string;
};

export interface UserWithRoles {
  id: string;
  email: string;
  phone: string | null;
  surname: string;
  other_names: string | null;
  access_granted: boolean;
  roles: BaseUserRole[];
}

// SMS Message Types
export type SendSMSMessageParams = {
  phone: string; // Phone number in international format (e.g., +233501234567)
  message: string; // SMS message body
  sender?: string; // Sender ID (optional, max 11 characters)
};

export type SendSMSMessageResponse = {
  status: "success";
};

export type SMSMessageErrorReponse = {
  status: "error";
  message: string;
};

export interface BaseMerchant {
  id: number;
  name: string;
  phone: string;
  country_code: string;
  slug: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BaseBranch {
  id: number;
  merchant_id: number;
  name: string | null;
  phone: string | null;
  address: string | null;
  city: string;
  country_code: string;
  is_active: boolean;
  created_at: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown[];
}

export type TransactionTypeValues =
  | "purchase"
  | "credit_issue"
  | "credit_redeem";

export interface BaseCustomer {
  id: number;
  phone: string | null;
  unique_id: string | null;
  user_id: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface BaseCustomerTransaction {
  id: number;
  customer_id: number;
  branch_id: number;
  recorded_by_user_id: string | null;
  amount: number;
  transaction_date: number;
  transaction_type: TransactionTypeValues;
  created_at: string;
  // Set for credit_issue and credit_redeem rows (the originating
  // customer_credit.id). Null for purchase rows. Used by the frontend to
  // open the redemption dialog against a specific credit.
  credit_id?: number | null;
}

// Slim profile projection of users for customer / recorded-by joins.
// Deliberately excludes otp / otp_expires_at / access_granted from BASE_USER
// so those sensitive fields are not shipped over the transactions API.
export interface BaseUserProfile {
  id: string;
  surname: string;
  other_names: string | null;
  phone: string;
}
