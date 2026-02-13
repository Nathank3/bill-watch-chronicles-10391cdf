/**
 * Security Utility
 * 
 * Provides centralized checking for sensitive role permissions.
 * This relies on VITE_SUPER_ADMIN_EMAIL being set in the environment variables.
 */

// Fallback to the developer email if env var is missing, ensuring access is never lost completely for the dev.
const FALLBACK_SUPER_ADMIN = "nathankimeu067@gmail.com";

export const getSuperAdminEmail = (): string => {
    // Priority: Env Var -> Fallback
    const envEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
    return (envEmail || FALLBACK_SUPER_ADMIN).toLowerCase();
};

export const isSuperAdmin = (email: string | null | undefined): boolean => {
    if (!email) return false;
    return email.toLowerCase() === getSuperAdminEmail();
};
