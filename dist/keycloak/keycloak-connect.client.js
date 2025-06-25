"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeycloakConnectClient = void 0;
const keycloak_connect_1 = __importDefault(require("keycloak-connect"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logging_1 = require("../logging");
class KeycloakConnectClient {
    constructor(config) {
        this.config = config;
        this.keycloak = new keycloak_connect_1.default({}, config);
    }
    static getInstance(config) {
        if (!KeycloakConnectClient.instance) {
            if (config) {
                KeycloakConnectClient.instance = new KeycloakConnectClient(config);
            }
            else {
                // Try to create from environment variables
                const envConfig = KeycloakConnectClient.createConfigFromEnv();
                if (envConfig) {
                    KeycloakConnectClient.instance = new KeycloakConnectClient(envConfig);
                }
                else {
                    throw new Error('KeycloakConnectClient not initialized. Please provide config or set environment variables.');
                }
            }
        }
        return KeycloakConnectClient.instance;
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
        if (!realm || !authServerUrl || !resource) {
            logging_1.Logging.warn('Missing required Keycloak Connect environment variables', {
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
    /**
     * Get the underlying Keycloak instance
     */
    getKeycloakInstance() {
        return this.keycloak;
    }
    /**
     * Get the configuration
     */
    getConfig() {
        return this.config;
    }
}
exports.KeycloakConnectClient = KeycloakConnectClient;
