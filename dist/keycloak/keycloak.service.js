"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeycloakService = void 0;
const keycloak_connect_client_1 = require("./keycloak-connect.client");
const keycloak_admin_client_1 = require("./keycloak-admin.client");
const logging_1 = require("../logging");
class KeycloakService {
    constructor(config) {
        this.adminClient = null;
        // Initialize connect client
        const connectConfig = {
            realm: config.realm,
            'auth-server-url': config['auth-server-url'],
            'ssl-required': config['ssl-required'],
            resource: config.resource,
            'public-client': config['public-client'],
            'confidential-port': config['confidential-port'],
            'bearer-only': config['bearer-only'],
        };
        this.connectClient = keycloak_connect_client_1.KeycloakConnectClient.getInstance(connectConfig);
        // Initialize admin client if admin credentials are provided
        if (config.adminClientId && config.adminClientSecret) {
            const adminConfig = {
                realm: config.realm,
                'auth-server-url': config['auth-server-url'],
                adminClientId: config.adminClientId,
                adminClientSecret: config.adminClientSecret,
            };
            this.adminClient = keycloak_admin_client_1.KeycloakAdminClient.getInstance(adminConfig);
        }
    }
    static getInstance() {
        if (!KeycloakService.instance) {
            const envConfig = KeycloakService.createConfigFromEnv();
            if (envConfig) {
                KeycloakService.instance = new KeycloakService(envConfig);
            }
            else {
                throw new Error('KeycloakService initialization failed. Please ensure all required environment variables are set.');
            }
        }
        return KeycloakService.instance;
    }
    /**
     * Create configuration from environment variables
     */
    static createConfigFromEnv() {
        const realm = process.env.KEYCLOAK_REALM;
        const authServerUrl = process.env.KEYCLOAK_AUTH_SERVER_URL;
        const resource = process.env.KEYCLOAK_RESOURCE;
        const sslRequired = process.env.KEYCLOAK_SSL_REQUIRED;
        const confidentialPort = process.env.KEYCLOAK_CONFIDENTIAL_PORT;
        const publicClient = process.env.KEYCLOAK_PUBLIC_CLIENT === 'true';
        const bearerOnly = process.env.KEYCLOAK_BEARER_ONLY === 'true';
        const adminClientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID;
        const adminClientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;
        if (!realm || !authServerUrl || !resource) {
            logging_1.Logging.warn('Missing required Keycloak environment variables', {
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
    async verifyToken(token) {
        return this.connectClient.verifyToken(token);
    }
    hasRequiredRoles(userInfo, requiredRoles) {
        return this.connectClient.hasRequiredRoles(userInfo, requiredRoles);
    }
    async getUserInfo(token) {
        return this.connectClient.getUserInfo(token);
    }
    validateAccessTokenScope(token, scope) {
        return this.connectClient.validateAccessTokenScope(token, scope);
    }
    extractRoles(token) {
        return this.connectClient.extractRoles(token);
    }
    // ==================== ADMIN METHODS ====================
    /**
     * Check if admin functionality is available
     */
    checkAdminAvailable() {
        if (!this.adminClient) {
            throw new Error('Admin functionality not available. Please provide adminClientId and adminClientSecret in configuration.');
        }
    }
    /**
     * Get admin access token
     */
    async getAdminToken() {
        this.checkAdminAvailable();
        return this.adminClient.getAdminToken();
    }
    /**
     * Create a new user
     */
    async createUser(user) {
        this.checkAdminAvailable();
        return this.adminClient.createUser(user);
    }
    /**
     * Get user by email
     */
    async getUserByEmail(email) {
        this.checkAdminAvailable();
        return this.adminClient.getUserByEmail(email);
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        this.checkAdminAvailable();
        return this.adminClient.getUserById(userId);
    }
    /**
     * Update user
     */
    async updateUser(userId, userData) {
        this.checkAdminAvailable();
        return this.adminClient.updateUser(userId, userData);
    }
    /**
     * Delete user by ID
     */
    async deleteUser(userId) {
        this.checkAdminAvailable();
        return this.adminClient.deleteUser(userId);
    }
    /**
     * Get all users with optional filtering
     */
    async getUsers(params) {
        this.checkAdminAvailable();
        return this.adminClient.getUsers(params);
    }
    /**
     * Reset user password
     */
    async resetUserPassword(userId, newPassword, temporary = false) {
        this.checkAdminAvailable();
        return this.adminClient.resetUserPassword(userId, newPassword, temporary);
    }
    /**
     * Enable/disable user
     */
    async setUserEnabled(userId, enabled) {
        this.checkAdminAvailable();
        return this.adminClient.setUserEnabled(userId, enabled);
    }
    /**
     * Get user roles
     */
    async getUserRoles(userId) {
        this.checkAdminAvailable();
        return this.adminClient.getUserRoles(userId);
    }
    /**
     * Assign roles to user
     */
    async assignRolesToUser(userId, roles) {
        this.checkAdminAvailable();
        return this.adminClient.assignRolesToUser(userId, roles);
    }
    /**
     * Check if admin functionality is enabled
     */
    isAdminEnabled() {
        return this.adminClient !== null;
    }
    // ==================== UTILITY METHODS ====================
    /**
     * Get the connect client instance
     */
    getConnectClient() {
        return this.connectClient;
    }
    /**
     * Get the admin client instance
     */
    getAdminClient() {
        return this.adminClient;
    }
}
exports.KeycloakService = KeycloakService;
