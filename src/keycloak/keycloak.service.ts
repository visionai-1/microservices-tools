import Keycloak from 'keycloak-connect';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Logging } from '../logging';

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

interface ExtendedJwtPayload extends JwtPayload {
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [key: string]: {
      roles: string[];
    };
  };
}

export class KeycloakService {
  private static instance: KeycloakService;
  private keycloak: Keycloak.Keycloak;
  private config: KeycloakConfig;

  private constructor(config: KeycloakConfig) {
    this.config = config;
    this.keycloak = new Keycloak({}, config as any);
  }

  public static getInstance(config?: KeycloakConfig): KeycloakService {
    if (!KeycloakService.instance && config) {
      KeycloakService.instance = new KeycloakService(config);
    }
    return KeycloakService.instance;
  }

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
} 