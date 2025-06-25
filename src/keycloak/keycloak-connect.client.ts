import Keycloak from 'keycloak-connect';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Logging } from '../logging';
import { 
  KeycloakConnectConfig, 
  UserInfo, 
  ExtendedJwtPayload 
} from './types';

export class KeycloakConnectClient {
  private static instance: KeycloakConnectClient;
  private keycloak: Keycloak.Keycloak;
  private config: KeycloakConnectConfig;

  private constructor(config: KeycloakConnectConfig) {
    this.config = config;
    this.keycloak = new Keycloak({}, config as any);
  }

  public static getInstance(config?: KeycloakConnectConfig): KeycloakConnectClient {
    if (!KeycloakConnectClient.instance) {
      if (config) {
        KeycloakConnectClient.instance = new KeycloakConnectClient(config);
      } else {
        // Try to create from environment variables
        const envConfig = KeycloakConnectClient.createConfigFromEnv();
        if (envConfig) {
          KeycloakConnectClient.instance = new KeycloakConnectClient(envConfig);
        } else {
          throw new Error('KeycloakConnectClient not initialized. Please provide config or set environment variables.');
        }
      }
    }
    return KeycloakConnectClient.instance;
  }

  /**
   * Create configuration from environment variables
   */
  private static createConfigFromEnv(): KeycloakConnectConfig | null {
    const realm = process.env.KEYCLOAK_REALM;
    const authServerUrl = process.env.KEYCLOAK_AUTH_SERVER_URL;
    const resource = process.env.KEYCLOAK_RESOURCE;
    const sslRequired = process.env.KEYCLOAK_SSL_REQUIRED as 'external' | 'all' | 'none';
    const confidentialPort = process.env.KEYCLOAK_CONFIDENTIAL_PORT;
    const publicClient = process.env.KEYCLOAK_PUBLIC_CLIENT === 'true';
    const bearerOnly = process.env.KEYCLOAK_BEARER_ONLY === 'true';

    if (!realm || !authServerUrl || !resource) {
      Logging.warn('Missing required Keycloak Connect environment variables', {
        realm: !!realm,
        authServerUrl: !!authServerUrl,
        resource: !!resource
      });
      return null;
    }

    return {
      realm,
      'auth-server-url': authServerUrl,
      'ssl-required': sslRequired || 'external',
      resource,
      'public-client': publicClient,
      'confidential-port': confidentialPort ? parseInt(confidentialPort) : 0,
      'bearer-only': bearerOnly,
    };
  }

  // ==================== AUTHENTICATION METHODS ====================

  public async verifyToken(token: string): Promise<UserInfo> {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded.payload === 'string') {
        Logging.security('Invalid token format', {
          error: 'Token could not be decoded'
        });
        throw new Error('Invalid token');
      }

      const payload = decoded.payload as ExtendedJwtPayload;

      // Verify the token with Keycloak
      const verified = await this.keycloak.grantManager.validateToken(token as any);
      if (!verified) {
        Logging.security('Token validation failed', {
          userId: payload.sub
        });
        throw new Error('Token validation failed');
      }

      // Extract user information
      const userInfo: UserInfo = {
        sub: payload.sub || '',
        email: payload.email,
        name: payload.name,
        preferred_username: payload.preferred_username,
        roles: payload.realm_access?.roles,
        permissions: payload.resource_access?.[this.config.resource]?.roles,
      };

      return userInfo;
    } catch (error: unknown) {
      if (error instanceof Error) {
        Logging.error('Token verification failed', {
          error: error.message,
          stack: error.stack
        });
        throw new Error(`Token verification failed: ${error.message}`);
      }
      Logging.error('Token verification failed with unknown error');
      throw new Error('Token verification failed: Unknown error');
    }
  }

  public hasRequiredRoles(userInfo: UserInfo, requiredRoles: string[]): boolean {
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const userRoles = [...(userInfo.roles || []), ...(userInfo.permissions || [])];
    return requiredRoles.some(role => userRoles.includes(role));
  }

  public async getUserInfo(token: string): Promise<UserInfo> {
    return this.verifyToken(token);
  }

  public validateAccessTokenScope(token: string, scope: string): boolean {
    const decoded = jwt.decode(token) as ExtendedJwtPayload;
    return decoded?.realm_access?.roles?.includes(scope) ?? false;
  }

  public extractRoles(token: string): string[] {
    const decoded = jwt.decode(token) as ExtendedJwtPayload;
    return [
      ...(decoded?.realm_access?.roles || []),
      ...(decoded?.resource_access?.[this.config.resource]?.roles || [])
    ];
  }

  /**
   * Get the underlying Keycloak instance
   */
  public getKeycloakInstance(): Keycloak.Keycloak {
    return this.keycloak;
  }

  /**
   * Get the configuration
   */
  public getConfig(): KeycloakConnectConfig {
    return this.config;
  }
} 