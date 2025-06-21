import { KeycloakService, type KeycloakConfig } from './keycloak.service';

// KeycloakService exports (now includes both auth and admin functionality)
export { KeycloakService, type KeycloakConfig, type UserInfo, type AdminKeycloakUser, type AdminTokenResponse } from './keycloak.service';

// Auth middleware exports
export { authenticateKeycloak, authorizeKeycloak } from './auth.middleware';

/**
 * Initialize KeycloakService with configuration
 * This should be called once at application startup
 */
export const initializeKeycloak = (config: KeycloakConfig): KeycloakService => {
  return KeycloakService.getInstance(config);
}; 