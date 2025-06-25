// ==================== IMPORTS ====================
import { KeycloakService } from './keycloak.service';

// ==================== MAIN SERVICE & INITIALIZATION ====================
export { KeycloakService } from './keycloak.service';

// ==================== INDIVIDUAL CLIENTS ====================
export { KeycloakConnectClient } from './keycloak-connect.client';
export { KeycloakAdminClient } from './keycloak-admin.client';

// ==================== EXPRESS MIDDLEWARE ====================
export { 
  authenticateKeycloak, 
  authorizeKeycloak, 
  getKeycloakConnectClient, 
  getKeycloakAdminClient 
} from './auth.middleware';

// ==================== TYPES & INTERFACES ====================
export type {
  // Base configuration types
  KeycloakBaseConfig,
  
  // Specific configuration types
  KeycloakConnectConfig,
  KeycloakAdminConfig,
  KeycloakConfig,
  
  // User and authentication types
  UserInfo,
  ExtendedJwtPayload,
  
  // Admin types
  AdminKeycloakUser,
  AdminTokenResponse,
  UserSearchParams,
} from './types';

// ==================== ENVIRONMENT-BASED INITIALIZATION ====================
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
export const initializeKeycloak = async (): Promise<KeycloakService> => {
  return KeycloakService.getInstance();
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

/**
 * List missing required environment variables
 * @returns Array of missing environment variable names
 */
export const getMissingKeycloakEnvVars = (): string[] => {
  const required = [
    'KEYCLOAK_REALM',
    'KEYCLOAK_AUTH_SERVER_URL',
    'KEYCLOAK_RESOURCE'
  ];
  
  return required.filter(envVar => !process.env[envVar]);
};