"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeycloakService = void 0;
const keycloak_connect_1 = __importDefault(require("keycloak-connect"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class KeycloakService {
    constructor(config) {
        this.config = config;
        this.keycloak = new keycloak_connect_1.default({}, config);
    }
    static getInstance(config) {
        if (!KeycloakService.instance && config) {
            KeycloakService.instance = new KeycloakService(config);
        }
        return KeycloakService.instance;
    }
    async verifyToken(token) {
        var _a, _b, _c;
        try {
            const decoded = jsonwebtoken_1.default.decode(token, { complete: true });
            if (!decoded || typeof decoded.payload === 'string') {
                throw new Error('Invalid token');
            }
            const payload = decoded.payload;
            // Verify the token with Keycloak
            const verified = await this.keycloak.grantManager.validateToken(token);
            if (!verified) {
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
                throw new Error(`Token verification failed: ${error.message}`);
            }
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
}
exports.KeycloakService = KeycloakService;
