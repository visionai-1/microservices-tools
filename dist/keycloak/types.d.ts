/**
 * Base Keycloak configuration shared by all clients
 */
export interface KeycloakBaseConfig {
    realm: string;
    'auth-server-url': string;
}
/**
 * Configuration interface for Keycloak Connect client (authentication)
 */
export interface KeycloakConnectConfig extends KeycloakBaseConfig {
    'ssl-required': 'external' | 'all' | 'none';
    resource: string;
    'public-client'?: boolean;
    'confidential-port': string | number;
    'bearer-only'?: boolean;
}
/**
 * Configuration interface for Keycloak Admin client (user management)
 */
export interface KeycloakAdminConfig extends KeycloakBaseConfig {
    adminClientId: string;
    adminClientSecret: string;
}
/**
 * Combined configuration interface with optional admin credentials
 * Used by the main KeycloakService to support both authentication and admin operations
 */
export interface KeycloakConfig extends KeycloakConnectConfig {
    adminClientId?: string;
    adminClientSecret?: string;
}
/**
 * User information extracted from JWT token
 */
export interface UserInfo {
    sub: string;
    email?: string;
    name?: string;
    preferred_username?: string;
    roles?: string[];
    permissions?: string[];
}
/**
 * Extended JWT payload with Keycloak-specific fields
 */
export interface ExtendedJwtPayload {
    sub?: string;
    email?: string;
    name?: string;
    preferred_username?: string;
    realm_access?: {
        roles: string[];
    };
    resource_access?: {
        [key: string]: {
            roles: string[];
        };
    };
}
/**
 * Admin token response from Keycloak
 */
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
/**
 * User search parameters for admin operations
 */
export interface UserSearchParams {
    search?: string;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    enabled?: boolean;
    max?: number;
    first?: number;
}
/**
 * Re-export Keycloak's built-in UserRepresentation type
 * This is used for admin operations
 */
export type AdminKeycloakUser = import('@keycloak/keycloak-admin-client/lib/defs/userRepresentation').default;
