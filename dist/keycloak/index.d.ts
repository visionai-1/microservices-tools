import { KeycloakService, type KeycloakConfig } from './keycloak.service';
export { KeycloakService, type KeycloakConfig, type UserInfo, type AdminKeycloakUser, type AdminTokenResponse } from './keycloak.service';
export { authenticateKeycloak, authorizeKeycloak } from './auth.middleware';
/**
 * Initialize KeycloakService with configuration
 * This should be called once at application startup
 */
export declare const initializeKeycloak: (config: KeycloakConfig) => KeycloakService;
