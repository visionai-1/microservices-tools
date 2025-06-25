"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeycloakAdminClient = void 0;
const keycloak_admin_client_1 = __importDefault(require("@keycloak/keycloak-admin-client"));
const logging_1 = require("../logging");
class KeycloakAdminClient {
    constructor(config) {
        this.config = config;
        this.adminClient = new keycloak_admin_client_1.default({
            baseUrl: config['auth-server-url'],
            realmName: config.realm,
        });
    }
    static getInstance(config) {
        if (!KeycloakAdminClient.instance) {
            if (config) {
                KeycloakAdminClient.instance = new KeycloakAdminClient(config);
            }
            else {
                // Try to create from environment variables
                const envConfig = KeycloakAdminClient.createConfigFromEnv();
                if (envConfig) {
                    KeycloakAdminClient.instance = new KeycloakAdminClient(envConfig);
                }
                else {
                    throw new Error('KeycloakAdminClient not initialized. Please provide config or set environment variables.');
                }
            }
        }
        return KeycloakAdminClient.instance;
    }
    /**
     * Create configuration from environment variables
     */
    static createConfigFromEnv() {
        const realm = process.env.KEYCLOAK_REALM;
        const authServerUrl = process.env.KEYCLOAK_AUTH_SERVER_URL;
        const adminClientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID;
        const adminClientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;
        if (!realm || !authServerUrl || !adminClientId || !adminClientSecret) {
            logging_1.Logging.warn('Missing required Keycloak Admin environment variables', {
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
    async authenticateAdminClient() {
        try {
            await this.adminClient.auth({
                grantType: 'client_credentials',
                clientId: this.config.adminClientId,
                clientSecret: this.config.adminClientSecret,
            });
            logging_1.Logging.info('Admin client authenticated successfully', {
                realm: this.config.realm
            });
        }
        catch (error) {
            logging_1.Logging.error('Failed to authenticate admin client', {
                realm: this.config.realm,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error('Failed to authenticate admin client');
        }
    }
    /**
     * Get admin access token
     */
    async getAdminToken() {
        try {
            await this.authenticateAdminClient();
            // Get the access token from the admin client
            const token = this.adminClient.accessToken;
            if (!token) {
                throw new Error('No access token available');
            }
            // Create a response object similar to the original format
            const tokenResponse = {
                access_token: token,
                expires_in: 300, // Default 5 minutes, adjust as needed
                refresh_expires_in: 1800, // Default 30 minutes
                refresh_token: '', // Not available with client credentials
                token_type: 'Bearer',
                'not-before-policy': 0,
                session_state: '',
                scope: 'admin'
            };
            logging_1.Logging.info('Admin token retrieved successfully', {
                realm: this.config.realm
            });
            return tokenResponse;
        }
        catch (error) {
            logging_1.Logging.error('Failed to get admin token', {
                realm: this.config.realm,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error('Failed to get admin token');
        }
    }
    /**
     * Create a new user
     */
    async createUser(user) {
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
            logging_1.Logging.info('User created successfully', {
                username: user.username,
                userId: createdUser.id
            });
            return createdUser.id;
        }
        catch (error) {
            logging_1.Logging.error('Failed to create user', {
                username: user.username,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get user by email
     */
    async getUserByEmail(email) {
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
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                enabled: user.enabled,
                emailVerified: user.emailVerified,
                attributes: user.attributes,
                credentials: user.credentials,
            };
        }
        catch (error) {
            logging_1.Logging.error('Failed to get user by email', {
                email,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
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
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                enabled: user.enabled,
                emailVerified: user.emailVerified,
                attributes: user.attributes,
                credentials: user.credentials,
            };
        }
        catch (error) {
            logging_1.Logging.error('Failed to get user by ID', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Update user
     */
    async updateUser(userId, userData) {
        try {
            await this.authenticateAdminClient();
            await this.adminClient.users.update({ id: userId }, userData);
            logging_1.Logging.info('User updated successfully', {
                userId
            });
        }
        catch (error) {
            logging_1.Logging.error('Failed to update user', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Delete user by ID
     */
    async deleteUser(userId) {
        try {
            await this.authenticateAdminClient();
            await this.adminClient.users.del({
                realm: this.config.realm,
                id: userId
            });
            logging_1.Logging.info('User deleted successfully', {
                userId
            });
        }
        catch (error) {
            logging_1.Logging.error('Failed to delete user', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get all users with optional filtering
     */
    async getUsers(params) {
        try {
            await this.authenticateAdminClient();
            const users = await this.adminClient.users.find({
                realm: this.config.realm,
                ...params
            });
            return users.map(user => ({
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                enabled: user.enabled,
                emailVerified: user.emailVerified,
                attributes: user.attributes,
                credentials: user.credentials,
            }));
        }
        catch (error) {
            logging_1.Logging.error('Failed to get users', {
                params,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error(`Failed to get users: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Reset user password
     */
    async resetUserPassword(userId, newPassword, temporary = false) {
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
            logging_1.Logging.info('User password reset successfully', {
                userId,
                temporary
            });
        }
        catch (error) {
            logging_1.Logging.error('Failed to reset user password', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error(`Failed to reset password: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Enable/disable user
     */
    async setUserEnabled(userId, enabled) {
        try {
            await this.authenticateAdminClient();
            await this.adminClient.users.update({ id: userId }, { enabled: enabled });
            logging_1.Logging.info('User enabled status updated', {
                userId,
                enabled
            });
        }
        catch (error) {
            logging_1.Logging.error('Failed to update user enabled status', {
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
    async getUserRoles(userId) {
        try {
            await this.authenticateAdminClient();
            const roles = await this.adminClient.users.listRealmRoleMappings({
                realm: this.config.realm,
                id: userId
            });
            return roles;
        }
        catch (error) {
            logging_1.Logging.error('Failed to get user roles', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error(`Failed to get user roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Assign roles to user
     */
    async assignRolesToUser(userId, roles) {
        try {
            await this.authenticateAdminClient();
            await this.adminClient.users.addRealmRoleMappings({
                realm: this.config.realm,
                id: userId,
                roles: roles
            });
            logging_1.Logging.info('Roles assigned to user successfully', {
                userId,
                roleCount: roles.length
            });
        }
        catch (error) {
            logging_1.Logging.error('Failed to assign roles to user', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error(`Failed to assign roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get the underlying admin client instance
     */
    getAdminClientInstance() {
        return this.adminClient;
    }
    /**
     * Get the configuration
     */
    getConfig() {
        return this.config;
    }
}
exports.KeycloakAdminClient = KeycloakAdminClient;
