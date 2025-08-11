import Keycloak from 'keycloak-connect';
import { decodeJwt } from 'jose';
import { Logging } from '../logging';
import { 
  KeycloakConnectConfig, 
  UserInfo, 
  ExtendedJwtPayload,
  KeycloakTokenPayload
} from './types';
import { verifyAccessToken as verifyAccessTokenWithIssuer, buildPrincipal } from '../auth/jwt';

const ISSUER = process.env.KEYCLOAK_ISSUER!;
const AUDIENCE = process.env.KEYCLOAK_AUDIENCE;

export class KeycloakConnectClient {
  private static instance: KeycloakConnectClient;
  private keycloak: Keycloak.Keycloak;
  private clientId: string; // KEYCLOAK_RESOURCE (client ID)

  private constructor(config: KeycloakConnectConfig) {
    this.clientId = config.resource;
    this.keycloak = new Keycloak({}, this.createKeycloakConfig(config));
  }

  public static getInstance(config?: KeycloakConnectConfig): KeycloakConnectClient {
    if (!KeycloakConnectClient.instance) {
      const finalConfig = config || KeycloakConnectClient.createConfigFromEnv();
      if (!finalConfig) {
        throw new Error('KeycloakConnectClient initialization failed. Please provide config or set environment variables.');
      }
      KeycloakConnectClient.instance = new KeycloakConnectClient(finalConfig);
    }
    return KeycloakConnectClient.instance;
  }

  /**
   * Create configuration from environment variables
   * Required: KEYCLOAK_REALM, KEYCLOAK_AUTH_SERVER_URL, KEYCLOAK_RESOURCE
   * Optional: KEYCLOAK_SSL_REQUIRED
   */
  private static createConfigFromEnv(): KeycloakConnectConfig | null {
    const realm = process.env.KEYCLOAK_REALM;
    const authServerUrl = process.env.KEYCLOAK_AUTH_SERVER_URL;
    const clientId = process.env.KEYCLOAK_RESOURCE; // Client ID
    const sslRequired = process.env.KEYCLOAK_SSL_REQUIRED as 'external' | 'all' | 'none';

    if (!realm || !authServerUrl || !clientId) {
      Logging.warn('Missing required Keycloak environment variables', {
        realm: !!realm,
        authServerUrl: !!authServerUrl,
        clientId: !!clientId
      });
      return null;
    }

    return {
      realm,
      'auth-server-url': authServerUrl,
      'ssl-required': sslRequired || 'external',
      resource: clientId
    };
  }

  /**
   * Create Keycloak configuration optimized for bearer-only token validation
   */
  private createKeycloakConfig(config: KeycloakConnectConfig): any {
    return {
      realm: config.realm,
      'auth-server-url': config['auth-server-url'],
      'ssl-required': config['ssl-required'],
      resource: config.resource, // Client ID from KEYCLOAK_RESOURCE
      // Bearer-only optimization for microservices
      'bearer-only': true,
      'public-client': true
    };
  }

  public async verifyToken(token: string): Promise<UserInfo> {
    try {
      const payload = await verifyAccessTokenWithIssuer(token, {
        issuer: ISSUER,
        audience: AUDIENCE,
        clockToleranceSec: 5,
      });
      const { realmRoles, clientRoles } = buildPrincipal(payload as KeycloakTokenPayload);

      return {
        sub: payload.sub || '',
        email: payload.email ?? payload.preferred_username,
        name: undefined,
        preferred_username: payload.preferred_username,
        roles: realmRoles,
        permissions: payload.resource_access?.[this.clientId]?.roles,
        realmRoles,
        clientRoles,
        raw: payload,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logging.error('Token verification failed', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Token verification failed: ${errorMessage}`);
    }
  }

  public hasRequiredRoles(userInfo: UserInfo, requiredRoles: string[]): boolean {
    if (!requiredRoles?.length) return true;
    
    const userRoles = [...(userInfo.roles || []), ...(userInfo.permissions || [])];
    return requiredRoles.some(role => userRoles.includes(role));
  }

  public async getUserInfo(token: string): Promise<UserInfo> {
    return this.verifyToken(token);
  }

  public validateAccessTokenScope(token: string, scope: string): boolean {
    const decoded = decodeJwt(token) as unknown as ExtendedJwtPayload;
    return decoded?.realm_access?.roles?.includes(scope) ?? false;
  }

  public extractRoles(token: string): string[] {
    const decoded = decodeJwt(token) as unknown as ExtendedJwtPayload;
    return [
      ...(decoded?.realm_access?.roles || []),
      ...(decoded?.resource_access?.[this.clientId]?.roles || []) // Client-specific roles
    ];
  }
} 