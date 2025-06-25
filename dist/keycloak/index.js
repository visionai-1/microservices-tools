"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMissingKeycloakEnvVars = exports.validateKeycloakEnv = exports.initializeKeycloak = exports.getKeycloakAdminClient = exports.getKeycloakConnectClient = exports.authorizeKeycloak = exports.authenticateKeycloak = exports.KeycloakAdminClient = exports.KeycloakConnectClient = exports.KeycloakService = void 0;
// ==================== IMPORTS ====================
const keycloak_service_1 = require("./keycloak.service");
// ==================== MAIN SERVICE & INITIALIZATION ====================
var keycloak_service_2 = require("./keycloak.service");
Object.defineProperty(exports, "KeycloakService", { enumerable: true, get: function () { return keycloak_service_2.KeycloakService; } });
// ==================== INDIVIDUAL CLIENTS ====================
var keycloak_connect_client_1 = require("./keycloak-connect.client");
Object.defineProperty(exports, "KeycloakConnectClient", { enumerable: true, get: function () { return keycloak_connect_client_1.KeycloakConnectClient; } });
var keycloak_admin_client_1 = require("./keycloak-admin.client");
Object.defineProperty(exports, "KeycloakAdminClient", { enumerable: true, get: function () { return keycloak_admin_client_1.KeycloakAdminClient; } });
// ==================== EXPRESS MIDDLEWARE ====================
var auth_middleware_1 = require("./auth.middleware");
Object.defineProperty(exports, "authenticateKeycloak", { enumerable: true, get: function () { return auth_middleware_1.authenticateKeycloak; } });
Object.defineProperty(exports, "authorizeKeycloak", { enumerable: true, get: function () { return auth_middleware_1.authorizeKeycloak; } });
Object.defineProperty(exports, "getKeycloakConnectClient", { enumerable: true, get: function () { return auth_middleware_1.getKeycloakConnectClient; } });
Object.defineProperty(exports, "getKeycloakAdminClient", { enumerable: true, get: function () { return auth_middleware_1.getKeycloakAdminClient; } });
// ==================== ENVIRONMENT-BASED INITIALIZATION ====================
/**
 * Initialize KeycloakService from environment variables
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
 * - KEYCLOAK_ADMIN_CLIENT_ID (for admin functionality)
 * - KEYCLOAK_ADMIN_CLIENT_SECRET (for admin functionality)
 *
 * @returns KeycloakService singleton instance
 * @throws Error if required environment variables are missing
 */
const initializeKeycloak = () => {
    return keycloak_service_1.KeycloakService.getInstance();
};
exports.initializeKeycloak = initializeKeycloak;
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
/**
 * List missing required environment variables
 * @returns Array of missing environment variable names
 */
const getMissingKeycloakEnvVars = () => {
    const required = [
        'KEYCLOAK_REALM',
        'KEYCLOAK_AUTH_SERVER_URL',
        'KEYCLOAK_RESOURCE'
    ];
    return required.filter(envVar => !process.env[envVar]);
};
exports.getMissingKeycloakEnvVars = getMissingKeycloakEnvVars;
