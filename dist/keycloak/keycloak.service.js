"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeycloakService = void 0;
const keycloak_connect_1 = __importDefault(require("keycloak-connect"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const keycloak_admin_client_1 = __importDefault(require("@keycloak/keycloak-admin-client"));
const logging_1 = require("../logging");
class KeycloakService {
    constructor(config) {
        this.adminClient = null;
        this.config = config;
        this.keycloak = new keycloak_connect_1.default({}, config);
        // Initialize admin client if admin credentials are provided
        if (config.adminClientId && config.adminClientSecret) {
            this.adminClient = new keycloak_admin_client_1.default({
                baseUrl: config['auth-server-url'],
                realmName: config.realm,
            });
        }
    }
    static getInstance(config) {
        if (!KeycloakService.instance && config) {
            KeycloakService.instance = new KeycloakService(config);
        }
        return KeycloakService.instance;
    }
    // ==================== AUTHENTICATION METHODS ====================
    async verifyToken(token) {
        var _a, _b, _c;
        try {
            const decoded = jsonwebtoken_1.default.decode(token, { complete: true });
            if (!decoded || typeof decoded.payload === 'string') {
                logging_1.Logging.security('Invalid token format', {
                    error: 'Token could not be decoded'
                });
                throw new Error('Invalid token');
            }
            const payload = decoded.payload;
            // Verify the token with Keycloak
            const verified = await this.keycloak.grantManager.validateToken(token);
            if (!verified) {
                logging_1.Logging.security('Token validation failed', {
                    userId: payload.sub
                });
                throw new Error('Token validation failed');
            }
            // Extract user information
            const userInfo = {
                sub: payload.sub || '',
                email: payload.email,
                name: payload.name,
                preferred_username: payload.preferred_username,
                roles: (_a = payload.realm_access) === null || _a === void 0 ? void 0 : _a.roles,
                permissions: (_c = (_b = payload.resource_access) === null || _b === void 0 ? void 0 : _b[this.config.resource]) === null || _c === void 0 ? void 0 : _c.roles,
            };
            return userInfo;
        }
        catch (error) {
            if (error instanceof Error) {
                logging_1.Logging.error('Token verification failed', {
                    error: error.message,
                    stack: error.stack
                });
                throw new Error(`Token verification failed: ${error.message}`);
            }
            logging_1.Logging.error('Token verification failed with unknown error');
            throw new Error('Token verification failed: Unknown error');
        }
    }
    hasRequiredRoles(userInfo, requiredRoles) {
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }
        const userRoles = [...(userInfo.roles || []), ...(userInfo.permissions || [])];
        return requiredRoles.some(role => userRoles.includes(role));
    }
    async getUserInfo(token) {
        return this.verifyToken(token);
    }
    validateAccessTokenScope(token, scope) {
        var _a, _b, _c;
        const decoded = jsonwebtoken_1.default.decode(token);
        return (_c = (_b = (_a = decoded === null || decoded === void 0 ? void 0 : decoded.realm_access) === null || _a === void 0 ? void 0 : _a.roles) === null || _b === void 0 ? void 0 : _b.includes(scope)) !== null && _c !== void 0 ? _c : false;
    }
    extractRoles(token) {
        var _a, _b, _c;
        const decoded = jsonwebtoken_1.default.decode(token);
        return [
            ...(((_a = decoded === null || decoded === void 0 ? void 0 : decoded.realm_access) === null || _a === void 0 ? void 0 : _a.roles) || []),
            ...(((_c = (_b = decoded === null || decoded === void 0 ? void 0 : decoded.resource_access) === null || _b === void 0 ? void 0 : _b[this.config.resource]) === null || _c === void 0 ? void 0 : _c.roles) || [])
        ];
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
     * Authenticate admin client
     */
    async authenticateAdminClient() {
        this.checkAdminAvailable();
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
        this.checkAdminAvailable();
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
        this.checkAdminAvailable();
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
        this.checkAdminAvailable();
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
        this.checkAdminAvailable();
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
        this.checkAdminAvailable();
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
        this.checkAdminAvailable();
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
        this.checkAdminAvailable();
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
        this.checkAdminAvailable();
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
        this.checkAdminAvailable();
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
        this.checkAdminAvailable();
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
        this.checkAdminAvailable();
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
     * Check if admin functionality is enabled
     */
    isAdminEnabled() {
        return this.adminClient !== null;
    }
}
exports.KeycloakService = KeycloakService;
