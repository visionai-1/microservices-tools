import Keycloak from 'keycloak-connect';
import { KeycloakConnectConfig, UserInfo } from './types';
export declare class KeycloakConnectClient {
    private static instance;
    private keycloak;
    private config;
    private constructor();
    static getInstance(config?: KeycloakConnectConfig): KeycloakConnectClient;
    /**
     * Create configuration from environment variables
     */
    private static createConfigFromEnv;
    verifyToken(token: string): Promise<UserInfo>;
    hasRequiredRoles(userInfo: UserInfo, requiredRoles: string[]): boolean;
    getUserInfo(token: string): Promise<UserInfo>;
    validateAccessTokenScope(token: string, scope: string): boolean;
    extractRoles(token: string): string[];
    /**
     * Get the underlying Keycloak instance
     */
    getKeycloakInstance(): Keycloak.Keycloak;
    /**
     * Get the configuration
     */
    getConfig(): KeycloakConnectConfig;
}
