import { UserRoleValues } from "@shared/types/api.types";

export type RoleRestriction<T = undefined> = {
  role: UserRoleValues;
  restrictionfn: (data?: T) => boolean;
};

export const isActionOrRoutePermitted = (
  userRoles?: UserRoleValues[],
  allowedRoles?: UserRoleValues[],
  roleRestrictions?: RoleRestriction[],
): boolean | undefined => {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return userRoles?.some((role) => {
    const matchingRole = allowedRoles.find(
      (allowedRole) => allowedRole === role,
    );
    const matchingRoleRestriction = roleRestrictions?.find(
      (r) => r.role === role,
    );

    if (matchingRole && matchingRoleRestriction) {
      return matchingRoleRestriction.restrictionfn();
    }

    return !!matchingRole;
  });
};

/**
 * Maps action IDs to the permissions required to perform them.
 * Organize by feature/module for easier maintenance.
 */
export const ACTION_PERMISSIONS = {
  // branch management
  "branch.create": ["manager"],
  "branch.update": ["manager"],
  "branch.delete": ["manager"],

  // user management
  "user.create": ["manager"],
  "user.update": ["manager"],
  "user.delete": ["manager"],
} as const satisfies Record<string, UserRoleValues[]>;

/**
 * Gets the required permissions for a specific action ID.
 * Returns undefined if no permissions are required (action is public).
 */
export const getAllowedPermissions = (
  actionId: keyof typeof ACTION_PERMISSIONS,
) => {
  return ACTION_PERMISSIONS[actionId];
};

/**
 * Checks if a user has permission to perform a specific action.
 */
export const hasActionPermission = (
  userPermissions: UserRoleValues[] | undefined,
  actionId: keyof typeof ACTION_PERMISSIONS,
): boolean | undefined => {
  const allowedPermissions = getAllowedPermissions(actionId);
  return isActionOrRoutePermitted(userPermissions, allowedPermissions);
};

export const getRestrictedOptions = <T>(
  options: T[],
  allowedRoles: UserRoleValues[],
  userRoles: UserRoleValues[] | undefined,
  roleRestrictions?: RoleRestriction<T>[],
) => {
  return options.filter((option) => {
    return userRoles?.some((role) => {
      const matchingRole = allowedRoles.find(
        (allowedRole) => allowedRole === role,
      );
      const matchingRoleRestriction = roleRestrictions?.find(
        (r) => r.role === role,
      );

      if (matchingRole && matchingRoleRestriction) {
        return matchingRoleRestriction.restrictionfn(option);
      }

      return !!matchingRole;
    });
  });
};
