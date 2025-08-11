import { KeycloakConnectClient } from './keycloak-connect.client';
export { KeycloakConnectClient } from './keycloak-connect.client';
export { authenticateKeycloakClient, authorizeKeycloakClient, getKeycloakConnectClient, extractToken } from './auth.middleware';
export type { KeycloakBaseConfig, KeycloakConnectConfig, UserInfo, ExtendedJwtPayload, KeycloakTokenPayload, Principal } from './types';
/**
 * Initialize KeycloakConnectClient from environment variables
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
 *
 * @returns Promise<KeycloakConnectClient> singleton instance
 * @throws Error if required environment variables are missing
 */
export declare const initializeKeycloakConnectClient: () => Promise<KeycloakConnectClient>;
/**
 * Check if all required Keycloak environment variables are set
 * @returns true if all required env vars are present, false otherwise
 */
export declare const validateKeycloakEnv: () => boolean;
