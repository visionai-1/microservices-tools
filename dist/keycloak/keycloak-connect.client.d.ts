import { KeycloakConnectConfig, UserInfo } from './types';
export declare class KeycloakConnectClient {
    private static instance;
    private keycloak;
    private clientId;
    private constructor();
    static getInstance(config?: KeycloakConnectConfig): KeycloakConnectClient;
    /**
     * Create configuration from environment variables
     * Required: KEYCLOAK_REALM, KEYCLOAK_AUTH_SERVER_URL, KEYCLOAK_RESOURCE
     * Optional: KEYCLOAK_SSL_REQUIRED
     */
    private static createConfigFromEnv;
    /**
     * Create Keycloak configuration optimized for bearer-only token validation
     */
    private createKeycloakConfig;
    verifyToken(token: string): Promise<UserInfo>;
    hasRequiredRoles(userInfo: UserInfo, requiredRoles: string[]): boolean;
    getUserInfo(token: string): Promise<UserInfo>;
    validateAccessTokenScope(token: string, scope: string): boolean;
    extractRoles(token: string): string[];
}
