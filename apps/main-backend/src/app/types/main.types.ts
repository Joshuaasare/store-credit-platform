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
