export type KeycloakTokenPayload = {
    iss: string;
    sub: string;
    aud?: string | string[];
    exp: number;
    iat: number;
    azp?: string;
    email?: string;
    preferred_username?: string;
    realm_access?: {
        roles?: string[];
    };
    resource_access?: Record<string, {
        roles?: string[];
    }>;
    permissions?: string[];
};
export type Principal = {
    sub: string;
    email?: string;
    realmRoles: string[];
    clientRoles: string[];
    raw: KeycloakTokenPayload;
};
export interface KeycloakBaseConfig {
    realm: string;
    'auth-server-url': string;
}
export interface KeycloakConnectConfig extends KeycloakBaseConfig {
    'ssl-required': 'external' | 'all' | 'none';
    resource: string;
}
export interface UserInfo {
    sub: string;
    email?: string;
    name?: string;
    preferred_username?: string;
    roles?: string[];
    permissions?: string[];
    realmRoles?: string[];
    clientRoles?: string[];
    raw?: KeycloakTokenPayload;
}
export type ExtendedJwtPayload = KeycloakTokenPayload;
