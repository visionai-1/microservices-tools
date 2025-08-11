export type KeycloakTokenPayload = {
  iss: string;
  sub: string;
  aud?: string | string[];
  exp: number;
  iat: number;
  azp?: string;
  email?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  permissions?: string[];
};

export type Principal = {
  sub: string;
  email?: string;
  realmRoles: string[];
  clientRoles: string[]; // "client:role"
  raw: KeycloakTokenPayload;
};

// Backwards-compat configuration types still used by the client
export interface KeycloakBaseConfig {
  realm: string;
  'auth-server-url': string;
}

export interface KeycloakConnectConfig extends KeycloakBaseConfig {
  'ssl-required': 'external' | 'all' | 'none';
  resource: string;
}

// Backwards-compat user types with additional fields for new data
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