/**
 * Base Keycloak configuration shared by all clients
 */
export interface KeycloakBaseConfig {
    realm: string;
    'auth-server-url': string;
}
/**
 * Configuration interface for Keycloak authentication client
 * Simplified for token validation only
 */
export interface KeycloakConnectConfig extends KeycloakBaseConfig {
    'ssl-required': 'external' | 'all' | 'none';
    resource: string;
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
