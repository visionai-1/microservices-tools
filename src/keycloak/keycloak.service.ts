import Keycloak from 'keycloak-connect';
import jwt, { JwtPayload } from 'jsonwebtoken';
import KcAdminClient from '@keycloak/keycloak-admin-client';
import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import { Logging } from '../logging';

// Extended configuration interface with optional admin credentials
export interface KeycloakConfig {
  realm: string;
  'auth-server-url': string;
  'ssl-required': 'external' | 'all' | 'none';
  resource: string;
  'public-client'?: boolean;
  'confidential-port': string | number;
  'bearer-only'?: boolean;
  
  // Admin configuration (optional)
  adminClientId?: string;
  adminClientSecret?: string;
}

export interface UserInfo {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  roles?: string[];
  permissions?: string[];
}

// Use Keycloak's built-in UserRepresentation type
export type AdminKeycloakUser = UserRepresentation;

export interface AdminTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  'not-before-policy': number;
  session_state: string;
  scope: string;
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
  private adminClient: KcAdminClient | null = null;

  private constructor(config: KeycloakConfig) {
    this.config = config;
    this.keycloak = new Keycloak({}, config as any);
    
    // Initialize admin client if admin credentials are provided
    if (config.adminClientId && config.adminClientSecret) {
      this.adminClient = new KcAdminClient({
        baseUrl: config['auth-server-url'],
        realmName: config.realm,
      });
    }
  }

  public static getInstance(config?: KeycloakConfig): KeycloakService {
    if (!KeycloakService.instance && config) {
      KeycloakService.instance = new KeycloakService(config);
    }
    return KeycloakService.instance;
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

  // ==================== ADMIN METHODS ====================

  /**
   * Check if admin functionality is available
   */
  private checkAdminAvailable(): void {
    if (!this.adminClient) {
      throw new Error('Admin functionality not available. Please provide adminClientId and adminClientSecret in configuration.');
    }
  }

  /**
   * Authenticate admin client
   */
  private async authenticateAdminClient(): Promise<void> {
    this.checkAdminAvailable();
    
    try {
      await this.adminClient!.auth({
        grantType: 'client_credentials',
        clientId: this.config.adminClientId!,
        clientSecret: this.config.adminClientSecret!,
      });
      
      Logging.info('Admin client authenticated successfully', {
        realm: this.config.realm
      });
    } catch (error) {
      Logging.error('Failed to authenticate admin client', {
        realm: this.config.realm,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to authenticate admin client');
    }
  }

  /**
   * Get admin access token
   */
  public async getAdminToken(): Promise<AdminTokenResponse> {
    this.checkAdminAvailable();
    
    try {
      await this.authenticateAdminClient();
      
      // Get the access token from the admin client
      const token = this.adminClient!.accessToken;
      
      if (!token) {
        throw new Error('No access token available');
      }

      // Create a response object similar to the original format
      const tokenResponse: AdminTokenResponse = {
        access_token: token,
        expires_in: 300, // Default 5 minutes, adjust as needed
        refresh_expires_in: 1800, // Default 30 minutes
        refresh_token: '', // Not available with client credentials
        token_type: 'Bearer',
        'not-before-policy': 0,
        session_state: '',
        scope: 'admin'
      };

      Logging.info('Admin token retrieved successfully', {
        realm: this.config.realm
      });

      return tokenResponse;
    } catch (error) {
      Logging.error('Failed to get admin token', {
        realm: this.config.realm,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to get admin token');
    }
  }

  /**
   * Create a new user
   */
  public async createUser(user: AdminKeycloakUser): Promise<string> {
    this.checkAdminAvailable();
    
    try {
      await this.authenticateAdminClient();
      
      const createdUser = await this.adminClient!.users.create({
        realm: this.config.realm,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        enabled: user.enabled,
        emailVerified: user.emailVerified,
        attributes: user.attributes,
        credentials: user.credentials ? user.credentials : undefined,
      });
      
      Logging.info('User created successfully', {
        username: user.username,
        userId: createdUser.id
      });

      return createdUser.id!;
    } catch (error) {
      Logging.error('Failed to create user', {
        username: user.username,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user by email
   */
  public async getUserByEmail(email: string): Promise<AdminKeycloakUser | null> {
    this.checkAdminAvailable();
    
    try {
      await this.authenticateAdminClient();
      
      const users = await this.adminClient!.users.find({
        realm: this.config.realm,
        email: email,
        exact: true
      });
      
      if (users.length === 0) {
        return null;
      }

      const user = users[0];
      return {
        id: user.id,
        username: user.username!,
        email: user.email!,
        firstName: user.firstName,
        lastName: user.lastName,
        enabled: user.enabled!,
        emailVerified: user.emailVerified,
        attributes: user.attributes,
        credentials: user.credentials,
      };
    } catch (error) {
      Logging.error('Failed to get user by email', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user by ID
   */
  public async getUserById(userId: string): Promise<AdminKeycloakUser> {
    this.checkAdminAvailable();
    
    try {
      await this.authenticateAdminClient();
      
      const user = await this.adminClient!.users.findOne({
        id: userId
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        username: user.username!,
        email: user.email!,
        firstName: user.firstName,
        lastName: user.lastName,
        enabled: user.enabled!,
        emailVerified: user.emailVerified,
        attributes: user.attributes,
        credentials: user.credentials,
      };
    } catch (error) {
      Logging.error('Failed to get user by ID', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user
   */
  public async updateUser(userId: string, userData: Partial<AdminKeycloakUser>): Promise<void> {
    this.checkAdminAvailable();
    
    try {
      await this.authenticateAdminClient();
      
      await this.adminClient!.users.update(
        { id: userId },
        userData
      );
      
      Logging.info('User updated successfully', {
        userId
      });
    } catch (error) {
      Logging.error('Failed to update user', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete user by ID
   */
  public async deleteUser(userId: string): Promise<void> {
    this.checkAdminAvailable();
    
    try {
      await this.authenticateAdminClient();
      
      await this.adminClient!.users.del({
        realm: this.config.realm,
        id: userId
      });
      
      Logging.info('User deleted successfully', {
        userId
      });
    } catch (error) {
      Logging.error('Failed to delete user', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all users with optional filtering
   */
  public async getUsers(params?: {
    search?: string;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    enabled?: boolean;
    max?: number;
    first?: number;
  }): Promise<AdminKeycloakUser[]> {
    this.checkAdminAvailable();
    
    try {
      await this.authenticateAdminClient();
      
      const users = await this.adminClient!.users.find({
        realm: this.config.realm,
        ...params
      });

      return users.map(user => ({
        id: user.id,
        username: user.username!,
        email: user.email!,
        firstName: user.firstName,
        lastName: user.lastName,
        enabled: user.enabled!,
        emailVerified: user.emailVerified,
        attributes: user.attributes,
        credentials: user.credentials,
      }));
    } catch (error) {
      Logging.error('Failed to get users', {
        params,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to get users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reset user password
   */
  public async resetUserPassword(userId: string, newPassword: string, temporary: boolean = false): Promise<void> {
    this.checkAdminAvailable();
    
    try {
      await this.authenticateAdminClient();
      
      await this.adminClient!.users.resetPassword({
        realm: this.config.realm,
        id: userId,
        credential: {
          type: 'password',
          value: newPassword,
          temporary: temporary
        }
      });
      
      Logging.info('User password reset successfully', {
        userId,
        temporary
      });
    } catch (error) {
      Logging.error('Failed to reset user password', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to reset password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enable/disable user
   */
  public async setUserEnabled(userId: string, enabled: boolean): Promise<void> {
    this.checkAdminAvailable();
    
    try {
      await this.authenticateAdminClient();
      
      await this.adminClient!.users.update(
        { id: userId },
        { enabled: enabled }
      );
      
      Logging.info('User enabled status updated', {
        userId,
        enabled
      });
    } catch (error) {
      Logging.error('Failed to update user enabled status', {
        userId,
        enabled,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to update user status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user roles
   */
  public async getUserRoles(userId: string): Promise<any[]> {
    this.checkAdminAvailable();
    
    try {
      await this.authenticateAdminClient();
      
      const roles = await this.adminClient!.users.listRealmRoleMappings({
        realm: this.config.realm,
        id: userId
      });

      return roles;
    } catch (error) {
      Logging.error('Failed to get user roles', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to get user roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assign roles to user
   */
  public async assignRolesToUser(userId: string, roles: any[]): Promise<void> {
    this.checkAdminAvailable();
    
    try {
      await this.authenticateAdminClient();
      
      await this.adminClient!.users.addRealmRoleMappings({
        realm: this.config.realm,
        id: userId,
        roles: roles
      });
      
      Logging.info('Roles assigned to user successfully', {
        userId,
        roleCount: roles.length
      });
    } catch (error) {
      Logging.error('Failed to assign roles to user', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to assign roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if admin functionality is enabled
   */
  public isAdminEnabled(): boolean {
    return this.adminClient !== null;
  }
} 