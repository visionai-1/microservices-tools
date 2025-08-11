"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeycloakConnectClient = void 0;
const keycloak_connect_1 = __importDefault(require("keycloak-connect"));
const jose_1 = require("jose");
const logging_1 = require("../logging");
const jwt_1 = require("../auth/jwt");
const ISSUER = process.env.KEYCLOAK_ISSUER;
const AUDIENCE = process.env.KEYCLOAK_AUDIENCE;
class KeycloakConnectClient {
    constructor(config) {
        this.clientId = config.resource;
        this.keycloak = new keycloak_connect_1.default({}, this.createKeycloakConfig(config));
    }
    static getInstance(config) {
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
    static createConfigFromEnv() {
        const realm = process.env.KEYCLOAK_REALM;
        const authServerUrl = process.env.KEYCLOAK_AUTH_SERVER_URL;
        const clientId = process.env.KEYCLOAK_RESOURCE; // Client ID
        const sslRequired = process.env.KEYCLOAK_SSL_REQUIRED;
        if (!realm || !authServerUrl || !clientId) {
            logging_1.Logging.warn('Missing required Keycloak environment variables', {
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
    createKeycloakConfig(config) {
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
    async verifyToken(token) {
        var _a, _b, _c;
        try {
            const payload = await (0, jwt_1.verifyAccessToken)(token, {
                issuer: ISSUER,
                audience: AUDIENCE,
                clockToleranceSec: 5,
            });
            const { realmRoles, clientRoles } = (0, jwt_1.buildPrincipal)(payload);
            return {
                sub: payload.sub || '',
                email: (_a = payload.email) !== null && _a !== void 0 ? _a : payload.preferred_username,
                name: undefined,
                preferred_username: payload.preferred_username,
                roles: realmRoles,
                permissions: (_c = (_b = payload.resource_access) === null || _b === void 0 ? void 0 : _b[this.clientId]) === null || _c === void 0 ? void 0 : _c.roles,
                realmRoles,
                clientRoles,
                raw: payload,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logging_1.Logging.error('Token verification failed', {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            throw new Error(`Token verification failed: ${errorMessage}`);
        }
    }
    hasRequiredRoles(userInfo, requiredRoles) {
        if (!(requiredRoles === null || requiredRoles === void 0 ? void 0 : requiredRoles.length))
            return true;
        const userRoles = [...(userInfo.roles || []), ...(userInfo.permissions || [])];
        return requiredRoles.some(role => userRoles.includes(role));
    }
    async getUserInfo(token) {
        return this.verifyToken(token);
    }
    validateAccessTokenScope(token, scope) {
        var _a, _b, _c;
        const decoded = (0, jose_1.decodeJwt)(token);
        return (_c = (_b = (_a = decoded === null || decoded === void 0 ? void 0 : decoded.realm_access) === null || _a === void 0 ? void 0 : _a.roles) === null || _b === void 0 ? void 0 : _b.includes(scope)) !== null && _c !== void 0 ? _c : false;
    }
    extractRoles(token) {
        var _a, _b, _c;
        const decoded = (0, jose_1.decodeJwt)(token);
        return [
            ...(((_a = decoded === null || decoded === void 0 ? void 0 : decoded.realm_access) === null || _a === void 0 ? void 0 : _a.roles) || []),
            ...(((_c = (_b = decoded === null || decoded === void 0 ? void 0 : decoded.resource_access) === null || _b === void 0 ? void 0 : _b[this.clientId]) === null || _c === void 0 ? void 0 : _c.roles) || []) // Client-specific roles
        ];
    }
}
exports.KeycloakConnectClient = KeycloakConnectClient;
