import { KeycloakService } from './keycloak.service';
export { KeycloakService } from './keycloak.service';
export { KeycloakConnectClient } from './keycloak-connect.client';
export { KeycloakAdminClient } from './keycloak-admin.client';
export { authenticateKeycloak, authorizeKeycloak, getKeycloakConnectClient, getKeycloakAdminClient } from './auth.middleware';
export type { KeycloakBaseConfig, KeycloakConnectConfig, KeycloakAdminConfig, KeycloakConfig, UserInfo, ExtendedJwtPayload, AdminKeycloakUser, AdminTokenResponse, UserSearchParams, } from './types';
/**
 * Initialize KeycloakService from environment variables
 * This should be called once at microservice startup
 *
 * Required environment variables:
 * - KEYCLOAK_REALM
 * - KEYCLOAK_AUTH_SERVER_URL
 * - KEYCLOAK_RESOURCE
 *
 * Optional environment variables:
 * - KEYCLOAK_SSL_REQUIRED (defaults to 'external')
 * - KEYCLOAK_PUBLIC_CLIENT (defaults to 'false')
 * - KEYCLOAK_CONFIDENTIAL_PORT (defaults to '0')
 * - KEYCLOAK_BEARER_ONLY (defaults to 'false')
 * - KEYCLOAK_ADMIN_CLIENT_ID (for admin functionality)
 * - KEYCLOAK_ADMIN_CLIENT_SECRET (for admin functionality)
 *
 * @returns Promise<KeycloakService> singleton instance
 * @throws Error if required environment variables are missing
 */
export declare const initializeKeycloak: () => Promise<KeycloakService>;
/**
 * Check if all required Keycloak environment variables are set
 * @returns true if all required env vars are present, false otherwise
 */
export declare const validateKeycloakEnv: () => boolean;
/**
 * List missing required environment variables
 * @returns Array of missing environment variable names
 */
export declare const getMissingKeycloakEnvVars: () => string[];
