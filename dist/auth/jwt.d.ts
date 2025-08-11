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
    [k: string]: any;
};
export type VerifyOpts = {
    issuer: string;
    audience?: string;
    clockToleranceSec?: number;
};
export declare function verifyAccessToken(token: string, { issuer, audience, clockToleranceSec }: VerifyOpts): Promise<KeycloakTokenPayload>;
export declare function buildPrincipal(p: KeycloakTokenPayload): {
    sub: string;
    email: string | undefined;
    realmRoles: string[];
    clientRoles: string[];
    roles: string[];
    raw: KeycloakTokenPayload;
};
