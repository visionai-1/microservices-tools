import KcAdminClient from '@keycloak/keycloak-admin-client';
import { Logging } from '../logging';
import { 
  KeycloakAdminConfig, 
  AdminKeycloakUser, 
  AdminTokenResponse,
  UserSearchParams 
} from './types';

export class KeycloakAdminClient {
  private static instance: KeycloakAdminClient;
  private adminClient: KcAdminClient;
  private config: KeycloakAdminConfig;

  private constructor(config: KeycloakAdminConfig) {
    this.config = config;
    this.adminClient = new KcAdminClient({
      baseUrl: config['auth-server-url'],
      realmName: config.realm,
    });
  }

  public static getInstance(config?: KeycloakAdminConfig): KeycloakAdminClient {
    if (!KeycloakAdminClient.instance) {
      if (config) {
        KeycloakAdminClient.instance = new KeycloakAdminClient(config);
      } else {
        // Try to create from environment variables
        const envConfig = KeycloakAdminClient.createConfigFromEnv();
        if (envConfig) {
          KeycloakAdminClient.instance = new KeycloakAdminClient(envConfig);
        } else {
          throw new Error('KeycloakAdminClient not initialized. Please provide config or set environment variables.');
        }
      }
    }
    return KeycloakAdminClient.instance;
  }

  /**
   * Create configuration from environment variables
   */
  private static createConfigFromEnv(): KeycloakAdminConfig | null {
    const realm = process.env.KEYCLOAK_REALM;
    const authServerUrl = process.env.KEYCLOAK_AUTH_SERVER_URL;
    const adminClientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID;
    const adminClientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;

    if (!realm || !authServerUrl || !adminClientId || !adminClientSecret) {
      Logging.warn('Missing required Keycloak Admin environment variables', {
        realm: !!realm,
        authServerUrl: !!authServerUrl,
        adminClientId: !!adminClientId,
        adminClientSecret: !!adminClientSecret
      });
      return null;
    }

    return {
      realm,
      'auth-server-url': authServerUrl,
      adminClientId,
      adminClientSecret,
    };
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Authenticate admin client
   */
  private async authenticateAdminClient(): Promise<void> {
    try {
      await this.adminClient.auth({
        grantType: 'client_credentials',
        clientId: this.config.adminClientId,
        clientSecret: this.config.adminClientSecret,
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
    try {
      await this.authenticateAdminClient();
      
      // Get the access token from the admin client
      const token = this.adminClient.accessToken;
      
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
    try {
      await this.authenticateAdminClient();
      
      const createdUser = await this.adminClient.users.create({
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
    try {
      await this.authenticateAdminClient();
      
      const users = await this.adminClient.users.find({
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
    try {
      await this.authenticateAdminClient();
      
      const user = await this.adminClient.users.findOne({
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
    try {
      await this.authenticateAdminClient();
      
      await this.adminClient.users.update(
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
    try {
      await this.authenticateAdminClient();
      
      await this.adminClient.users.del({
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
  public async getUsers(params?: UserSearchParams): Promise<AdminKeycloakUser[]> {
    try {
      await this.authenticateAdminClient();
      
      const users = await this.adminClient.users.find({
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
    try {
      await this.authenticateAdminClient();
      
      await this.adminClient.users.resetPassword({
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
    try {
      await this.authenticateAdminClient();
      
      await this.adminClient.users.update(
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
    try {
      await this.authenticateAdminClient();
      
      const roles = await this.adminClient.users.listRealmRoleMappings({
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
    try {
      await this.authenticateAdminClient();
      
      await this.adminClient.users.addRealmRoleMappings({
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
   * Get the underlying admin client instance
   */
  public getAdminClientInstance(): KcAdminClient {
    return this.adminClient;
  }

  /**
   * Get the configuration
   */
  public getConfig(): KeycloakAdminConfig {
    return this.config;
  }
} 