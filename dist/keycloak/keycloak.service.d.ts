import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
export interface KeycloakConfig {
    realm: string;
    'auth-server-url': string;
    'ssl-required': 'external' | 'all' | 'none';
    resource: string;
    'public-client'?: boolean;
    'confidential-port': string | number;
    'bearer-only'?: boolean;
    adminClientId?: string;
    adminClientSecret?: string;
}
export interface UserInfo {
    sub: string;
    email?: string;
    name?: string;
    preferred_username?: string;
    roles?: string[];
    permissions?: string[];
}
export type AdminKeycloakUser = UserRepresentation;
export interface AdminTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_expires_in: number;
    refresh_token: string;
    token_type: string;
    'not-before-policy': number;
    session_state: string;
    scope: string;
}
export declare class KeycloakService {
    private static instance;
    private keycloak;
    private config;
    private adminClient;
    private constructor();
    static getInstance(config?: KeycloakConfig): KeycloakService;
    verifyToken(token: string): Promise<UserInfo>;
    hasRequiredRoles(userInfo: UserInfo, requiredRoles: string[]): boolean;
    getUserInfo(token: string): Promise<UserInfo>;
    validateAccessTokenScope(token: string, scope: string): boolean;
    extractRoles(token: string): string[];
    /**
     * Check if admin functionality is available
     */
    private checkAdminAvailable;
    /**
     * Authenticate admin client
     */
    private authenticateAdminClient;
    /**
     * Get admin access token
     */
    getAdminToken(): Promise<AdminTokenResponse>;
    /**
     * Create a new user
     */
    createUser(user: AdminKeycloakUser): Promise<string>;
    /**
     * Get user by email
     */
    getUserByEmail(email: string): Promise<AdminKeycloakUser | null>;
    /**
     * Get user by ID
     */
    getUserById(userId: string): Promise<AdminKeycloakUser>;
    /**
     * Update user
     */
    updateUser(userId: string, userData: Partial<AdminKeycloakUser>): Promise<void>;
    /**
     * Delete user by ID
     */
    deleteUser(userId: string): Promise<void>;
    /**
     * Get all users with optional filtering
     */
    getUsers(params?: {
        search?: string;
        username?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        enabled?: boolean;
        max?: number;
        first?: number;
    }): Promise<AdminKeycloakUser[]>;
    /**
     * Reset user password
     */
    resetUserPassword(userId: string, newPassword: string, temporary?: boolean): Promise<void>;
    /**
     * Enable/disable user
     */
    setUserEnabled(userId: string, enabled: boolean): Promise<void>;
    /**
     * Get user roles
     */
    getUserRoles(userId: string): Promise<any[]>;
    /**
     * Assign roles to user
     */
    assignRolesToUser(userId: string, roles: any[]): Promise<void>;
    /**
     * Check if admin functionality is enabled
     */
    isAdminEnabled(): boolean;
}
