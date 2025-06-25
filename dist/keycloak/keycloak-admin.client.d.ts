import KcAdminClient from '@keycloak/keycloak-admin-client';
import { KeycloakAdminConfig, AdminKeycloakUser, AdminTokenResponse, UserSearchParams } from './types';
export declare class KeycloakAdminClient {
    private static instance;
    private adminClient;
    private config;
    private constructor();
    static getInstance(config?: KeycloakAdminConfig): KeycloakAdminClient;
    /**
     * Create configuration from environment variables
     */
    private static createConfigFromEnv;
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
    getUsers(params?: UserSearchParams): Promise<AdminKeycloakUser[]>;
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
     * Get the underlying admin client instance
     */
    getAdminClientInstance(): KcAdminClient;
    /**
     * Get the configuration
     */
    getConfig(): KeycloakAdminConfig;
}
