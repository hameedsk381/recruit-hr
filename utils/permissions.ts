import { AuthContext } from "../middleware/authMiddleware";

/**
 * Enterprise Role Definitions
 */
export const ROLES = {
    ADMIN: "admin",
    RECRUITER: "recruiter",
    HIRING_MANAGER: "hiring_manager",
    USER: "user"
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Permission bitmasks or simple registry
 */
export const PERMISSIONS = {
    MANAGE_TENANT: "manage_tenant",
    MANAGE_JOBS: "manage_jobs",
    VIEW_ANALYTICS: "view_analytics",
    REVIEW_CANDIDATES: "review_candidates",
    SCHEDULE_INTERVIEWS: "schedule_interviews",
    ACCESS_DPDP_LOGS: "access_dpdp_logs"
};

/**
 * Role-to-Permission Mapping
 */
const ROLE_PERMISSIONS: Record<Role, string[]> = {
    admin: [
        PERMISSIONS.MANAGE_TENANT,
        PERMISSIONS.MANAGE_JOBS,
        PERMISSIONS.VIEW_ANALYTICS,
        PERMISSIONS.REVIEW_CANDIDATES,
        PERMISSIONS.SCHEDULE_INTERVIEWS,
        PERMISSIONS.ACCESS_DPDP_LOGS
    ],
    recruiter: [
        PERMISSIONS.MANAGE_JOBS,
        PERMISSIONS.VIEW_ANALYTICS,
        PERMISSIONS.REVIEW_CANDIDATES,
        PERMISSIONS.SCHEDULE_INTERVIEWS
    ],
    hiring_manager: [
        PERMISSIONS.REVIEW_CANDIDATES
    ],
    user: [
        PERMISSIONS.REVIEW_CANDIDATES
    ]
};

/**
 * Checks if a user context has a specific permission
 */
export function hasPermission(context: AuthContext, permission: string): boolean {
    if (!context.isAuthenticated) return false;
    
    // Admins always have all permissions in their tenant
    if (context.roles.includes(ROLES.ADMIN)) return true;

    // Check if any of the user's roles grant this permission
    return context.roles.some(role => {
        const perms = ROLE_PERMISSIONS[role as Role] || [];
        return perms.includes(permission);
    });
}

/**
 * Checks if a user context has any of the required roles
 */
export function hasRole(context: AuthContext, requiredRoles: Role[]): boolean {
    if (!context.isAuthenticated) return false;
    return context.roles.some(role => requiredRoles.includes(role as Role));
}
