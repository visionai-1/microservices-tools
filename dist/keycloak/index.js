"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateKeycloakEnv = exports.initializeKeycloakConnectClient = exports.extractToken = exports.getKeycloakConnectClient = exports.authorizeKeycloakClient = exports.authenticateKeycloakClient = exports.verifyAccessToken = exports.KeycloakConnectClient = void 0;
// ==================== IMPORTS ====================
const keycloak_connect_client_1 = require("./keycloak-connect.client");
// ==================== MAIN CLIENT & INITIALIZATION ====================
var keycloak_connect_client_2 = require("./keycloak-connect.client");
Object.defineProperty(exports, "KeycloakConnectClient", { enumerable: true, get: function () { return keycloak_connect_client_2.KeycloakConnectClient; } });
var keycloak_connect_client_3 = require("./keycloak-connect.client");
Object.defineProperty(exports, "verifyAccessToken", { enumerable: true, get: function () { return keycloak_connect_client_3.verifyAccessToken; } });
// ==================== EXPRESS MIDDLEWARE ====================
var auth_middleware_1 = require("./auth.middleware");
Object.defineProperty(exports, "authenticateKeycloakClient", { enumerable: true, get: function () { return auth_middleware_1.authenticateKeycloakClient; } });
Object.defineProperty(exports, "authorizeKeycloakClient", { enumerable: true, get: function () { return auth_middleware_1.authorizeKeycloakClient; } });
Object.defineProperty(exports, "getKeycloakConnectClient", { enumerable: true, get: function () { return auth_middleware_1.getKeycloakConnectClient; } });
Object.defineProperty(exports, "extractToken", { enumerable: true, get: function () { return auth_middleware_1.extractToken; } });
// ==================== ENVIRONMENT-BASED INITIALIZATION ====================
/**
 * Initialize KeycloakConnectClient from environment variables
 * This should be called once at microservice startup
 *
 * Required environment variables:
 * - KEYCLOAK_REALM
 * - KEYCLOAK_AUTH_SERVER_URL
 * - KEYCLOAK_RESOURCE
 *
 * Optional environment variables:
 * - KEYCLOAK_SSL_REQUIRED (defaults to 'external')
 * - KEYCLOAK_PUBLIC_CLIENT (defaults to 'false')
 * - KEYCLOAK_CONFIDENTIAL_PORT (defaults to '0')
 * - KEYCLOAK_BEARER_ONLY (defaults to 'false')
 *
 * @returns Promise<KeycloakConnectClient> singleton instance
 * @throws Error if required environment variables are missing
 */
const initializeKeycloakConnectClient = async () => {
    return keycloak_connect_client_1.KeycloakConnectClient.getInstance();
};
exports.initializeKeycloakConnectClient = initializeKeycloakConnectClient;
/**
 * Check if all required Keycloak environment variables are set
 * @returns true if all required env vars are present, false otherwise
 */
const validateKeycloakEnv = () => {
    const required = [
        'KEYCLOAK_REALM',
        'KEYCLOAK_AUTH_SERVER_URL',
        'KEYCLOAK_RESOURCE'
    ];
    return required.every(envVar => !!process.env[envVar]);
};
exports.validateKeycloakEnv = validateKeycloakEnv;
