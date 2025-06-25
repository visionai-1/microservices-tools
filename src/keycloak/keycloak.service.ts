import { KeycloakConnectClient } from './keycloak-connect.client';
import { KeycloakAdminClient } from './keycloak-admin.client';
import { Logging } from '../logging';
import {
  KeycloakConfig,
  KeycloakConnectConfig,
  KeycloakAdminConfig,
  UserInfo,
  AdminKeycloakUser,
  AdminTokenResponse,
  UserSearchParams
} from './types';

export class KeycloakService {
  private static instance: KeycloakService;
  private connectClient: KeycloakConnectClient;
  private adminClient: KeycloakAdminClient | null = null;

  private constructor(config: KeycloakConfig) {
    // Initialize connect client
    const connectConfig: KeycloakConnectConfig = {
      realm: config.realm,
      'auth-server-url': config['auth-server-url'],
      'ssl-required': config['ssl-required'],
      resource: config.resource,
      'public-client': config['public-client'],
      'confidential-port': config['confidential-port'],
      'bearer-only': config['bearer-only'],
    };
    this.connectClient = KeycloakConnectClient.getInstance(connectConfig);

    // Initialize admin client if admin credentials are provided
    if (config.adminClientId && config.adminClientSecret) {
      const adminConfig: KeycloakAdminConfig = {
        realm: config.realm,
        'auth-server-url': config['auth-server-url'],
        adminClientId: config.adminClientId,
        adminClientSecret: config.adminClientSecret,
      };
      this.adminClient = KeycloakAdminClient.getInstance(adminConfig);
    }
  }

  public static getInstance(): KeycloakService {
    if (!KeycloakService.instance) {
      const envConfig = KeycloakService.createConfigFromEnv();
      if (envConfig) {
        KeycloakService.instance = new KeycloakService(envConfig);
      } else {
        throw new Error('KeycloakService initialization failed. Please ensure all required environment variables are set.');
      }
    }
    return KeycloakService.instance;
  }

  /**
   * Create configuration from environment variables
   */
  private static createConfigFromEnv(): KeycloakConfig | null {
    const realm = process.env.KEYCLOAK_REALM;
    const authServerUrl = process.env.KEYCLOAK_AUTH_SERVER_URL;
    const resource = process.env.KEYCLOAK_RESOURCE;
    const sslRequired = process.env.KEYCLOAK_SSL_REQUIRED as 'external' | 'all' | 'none';
    const confidentialPort = process.env.KEYCLOAK_CONFIDENTIAL_PORT;
    const publicClient = process.env.KEYCLOAK_PUBLIC_CLIENT === 'true';
    const bearerOnly = process.env.KEYCLOAK_BEARER_ONLY === 'true';
    const adminClientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID;
    const adminClientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;

    if (!realm || !authServerUrl || !resource) {
      Logging.warn('Missing required Keycloak environment variables', {
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
      adminClientId,
      adminClientSecret,
    };
  }

  // ==================== AUTHENTICATION METHODS ====================

  public async verifyToken(token: string): Promise<UserInfo> {
    return this.connectClient.verifyToken(token);
  }

  public hasRequiredRoles(userInfo: UserInfo, requiredRoles: string[]): boolean {
    return this.connectClient.hasRequiredRoles(userInfo, requiredRoles);
  }

  public async getUserInfo(token: string): Promise<UserInfo> {
    return this.connectClient.getUserInfo(token);
  }

  public validateAccessTokenScope(token: string, scope: string): boolean {
    return this.connectClient.validateAccessTokenScope(token, scope);
  }

  public extractRoles(token: string): string[] {
    return this.connectClient.extractRoles(token);
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
   * Get admin access token
   */
  public async getAdminToken(): Promise<AdminTokenResponse> {
    this.checkAdminAvailable();
    return this.adminClient!.getAdminToken();
  }

  /**
   * Create a new user
   */
  public async createUser(user: AdminKeycloakUser): Promise<string> {
    this.checkAdminAvailable();
    return this.adminClient!.createUser(user);
  }

  /**
   * Get user by email
   */
  public async getUserByEmail(email: string): Promise<AdminKeycloakUser | null> {
    this.checkAdminAvailable();
    return this.adminClient!.getUserByEmail(email);
  }

  /**
   * Get user by ID
   */
  public async getUserById(userId: string): Promise<AdminKeycloakUser> {
    this.checkAdminAvailable();
    return this.adminClient!.getUserById(userId);
  }

  /**
   * Update user
   */
  public async updateUser(userId: string, userData: Partial<AdminKeycloakUser>): Promise<void> {
    this.checkAdminAvailable();
    return this.adminClient!.updateUser(userId, userData);
  }

  /**
   * Delete user by ID
   */
  public async deleteUser(userId: string): Promise<void> {
    this.checkAdminAvailable();
    return this.adminClient!.deleteUser(userId);
  }

  /**
   * Get all users with optional filtering
   */
  public async getUsers(params?: UserSearchParams): Promise<AdminKeycloakUser[]> {
    this.checkAdminAvailable();
    return this.adminClient!.getUsers(params);
  }

  /**
   * Reset user password
   */
  public async resetUserPassword(userId: string, newPassword: string, temporary: boolean = false): Promise<void> {
    this.checkAdminAvailable();
    return this.adminClient!.resetUserPassword(userId, newPassword, temporary);
  }

  /**
   * Enable/disable user
   */
  public async setUserEnabled(userId: string, enabled: boolean): Promise<void> {
    this.checkAdminAvailable();
    return this.adminClient!.setUserEnabled(userId, enabled);
  }

  /**
   * Get user roles
   */
  public async getUserRoles(userId: string): Promise<any[]> {
    this.checkAdminAvailable();
    return this.adminClient!.getUserRoles(userId);
  }

  /**
   * Assign roles to user
   */
  public async assignRolesToUser(userId: string, roles: any[]): Promise<void> {
    this.checkAdminAvailable();
    return this.adminClient!.assignRolesToUser(userId, roles);
  }

  /**
   * Check if admin functionality is enabled
   */
  public isAdminEnabled(): boolean {
    return this.adminClient !== null;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get the connect client instance
   */
  public getConnectClient(): KeycloakConnectClient {
    return this.connectClient;
  }

  /**
   * Get the admin client instance
   */
  public getAdminClient(): KeycloakAdminClient | null {
    return this.adminClient;
  }
} 