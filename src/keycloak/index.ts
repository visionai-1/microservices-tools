// ==================== IMPORTS ====================
import { KeycloakConnectClient } from './keycloak-connect.client';

// ==================== MAIN CLIENT & INITIALIZATION ====================
export { KeycloakConnectClient } from './keycloak-connect.client';
export { verifyAccessToken } from './keycloak-connect.client';

// ==================== EXPRESS MIDDLEWARE ====================
export { 
  authenticateKeycloakClient, 
  authorizeKeycloakClient, 
  getKeycloakConnectClient,
  extractToken
} from './auth.middleware';

// ==================== TYPES & INTERFACES ====================
export type {
  // Base configuration types
  KeycloakBaseConfig,
  
  // Specific configuration types
  KeycloakConnectConfig,
  
  // User and authentication types
  UserInfo,
  ExtendedJwtPayload,
  KeycloakTokenPayload,
  Principal
} from './types';

// ==================== ENVIRONMENT-BASED INITIALIZATION ====================

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
export const initializeKeycloakConnectClient = async (): Promise<KeycloakConnectClient> => {
  return KeycloakConnectClient.getInstance();
};

/**
 * Check if all required Keycloak environment variables are set
 * @returns true if all required env vars are present, false otherwise
 */
export const validateKeycloakEnv = (): boolean => {
  const required = [
    'KEYCLOAK_REALM',
    'KEYCLOAK_AUTH_SERVER_URL',
    'KEYCLOAK_RESOURCE'
  ];
  
  return required.every(envVar => !!process.env[envVar]);
};