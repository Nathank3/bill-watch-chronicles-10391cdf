
// Define user roles as constants with explicit string literals
export const ADMIN_ROLE = "admin";
export const CLERK_ROLE = "clerk";
export const PUBLIC_ROLE = "public";

// Array of valid roles for validation
export const VALID_ROLES = [ADMIN_ROLE, CLERK_ROLE, PUBLIC_ROLE] as const;

// Type for valid user roles
export type ValidUserRole = typeof VALID_ROLES[number];

/**
 * Validates and sanitizes a role string
 * @param role - The role string to validate
 * @returns A valid role string or PUBLIC_ROLE as default
 */
export const validateRole = (role: string | null | undefined): ValidUserRole => {
  // Return default role if input is null, undefined or empty string
  if (!role || typeof role !== 'string' || role.trim() === "") {
    console.warn(`Invalid role value: "${role}", defaulting to '${PUBLIC_ROLE}'`);
    return PUBLIC_ROLE;
  }

  // Check if the role is one of our valid roles
  if (VALID_ROLES.includes(role as ValidUserRole)) {
    return role as ValidUserRole;
  }

  // Return default role if not valid
  console.warn(`Unsupported role "${role}", defaulting to '${PUBLIC_ROLE}'`);
  return PUBLIC_ROLE;
};
