export interface KeycloakConfig {
    realm: string;
    'auth-server-url': string;
    'ssl-required': 'external' | 'all' | 'none';
    resource: string;
    'public-client'?: boolean;
    'confidential-port': string | number;
    'bearer-only'?: boolean;
}
export interface UserInfo {
    sub: string;
    email?: string;
    name?: string;
    preferred_username?: string;
    roles?: string[];
    permissions?: string[];
}
export declare class KeycloakService {
    private static instance;
    private keycloak;
    private config;
    private constructor();
    static getInstance(config?: KeycloakConfig): KeycloakService;
    verifyToken(token: string): Promise<UserInfo>;
    hasRequiredRoles(userInfo: UserInfo, requiredRoles: string[]): boolean;
    getUserInfo(token: string): Promise<UserInfo>;
}
