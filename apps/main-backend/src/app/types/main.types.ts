export type UserRoleValues = "manager" | "cashier";

export type BaseUserRole = {
  created_at: string | null;
  id: number;
  role: UserRoleValues;
  updated_at: string | null;
  user_id: string;
  assigned_by_user_id: string;
};
