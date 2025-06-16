"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeycloakService = void 0;
const keycloak_connect_1 = __importDefault(require("keycloak-connect"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logging_1 = require("../logging");
class KeycloakService {
    constructor(config) {
        this.config = config;
        this.keycloak = new keycloak_connect_1.default({}, config);
        logging_1.Logging.config('Keycloak service initialized', {
            realm: config.realm,
            authServerUrl: config['auth-server-url'],
            resource: config.resource
        });
    }
    static getInstance(config) {
        if (!KeycloakService.instance && config) {
            logging_1.Logging.startup('Creating Keycloak service instance');
            KeycloakService.instance = new KeycloakService(config);
        }
        return KeycloakService.instance;
    }
    async verifyToken(token) {
        var _a, _b, _c;
        const startTime = Date.now();
        try {
            logging_1.Logging.auth('Starting token verification');
            const decoded = jsonwebtoken_1.default.decode(token, { complete: true });
            if (!decoded || typeof decoded.payload === 'string') {
                logging_1.Logging.security('Invalid token format', {
                    error: 'Token could not be decoded'
                });
                throw new Error('Invalid token');
            }
            const payload = decoded.payload;
            logging_1.Logging.auth('Token decoded successfully', {
                userId: payload.sub,
                username: payload.preferred_username
            });
            // Verify the token with Keycloak
            logging_1.Logging.auth('Validating token with Keycloak');
            const verified = await this.keycloak.grantManager.validateToken(token);
            if (!verified) {
                logging_1.Logging.security('Token validation failed', {
                    userId: payload.sub,
                    username: payload.preferred_username
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
            const duration = Date.now() - startTime;
            logging_1.Logging.auth('Token verification completed', {
                userId: userInfo.sub,
                username: userInfo.preferred_username,
                roles: userInfo.roles,
                permissions: userInfo.permissions,
                duration: `${duration}ms`
            });
            return userInfo;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            if (error instanceof Error) {
                logging_1.Logging.error('Token verification failed', {
                    error: error.message,
                    stack: error.stack,
                    duration: `${duration}ms`
                });
                throw new Error(`Token verification failed: ${error.message}`);
            }
            logging_1.Logging.error('Token verification failed with unknown error', {
                duration: `${duration}ms`
            });
            throw new Error('Token verification failed: Unknown error');
        }
    }
    hasRequiredRoles(userInfo, requiredRoles) {
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }
        const userRoles = [...(userInfo.roles || []), ...(userInfo.permissions || [])];
        const hasRoles = requiredRoles.some(role => userRoles.includes(role));
        logging_1.Logging.auth('Role check completed', {
            userId: userInfo.sub,
            username: userInfo.preferred_username,
            userRoles,
            requiredRoles,
            hasRequiredRoles: hasRoles
        });
        return hasRoles;
    }
    async getUserInfo(token) {
        return this.verifyToken(token);
    }
}
exports.KeycloakService = KeycloakService;
