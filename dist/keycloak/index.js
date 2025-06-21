"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeKeycloak = exports.authorizeKeycloak = exports.authenticateKeycloak = exports.KeycloakService = void 0;
const keycloak_service_1 = require("./keycloak.service");
// KeycloakService exports (now includes both auth and admin functionality)
var keycloak_service_2 = require("./keycloak.service");
Object.defineProperty(exports, "KeycloakService", { enumerable: true, get: function () { return keycloak_service_2.KeycloakService; } });
// Auth middleware exports
var auth_middleware_1 = require("./auth.middleware");
Object.defineProperty(exports, "authenticateKeycloak", { enumerable: true, get: function () { return auth_middleware_1.authenticateKeycloak; } });
Object.defineProperty(exports, "authorizeKeycloak", { enumerable: true, get: function () { return auth_middleware_1.authorizeKeycloak; } });
/**
 * Initialize KeycloakService with configuration
 * This should be called once at application startup
 */
const initializeKeycloak = (config) => {
    return keycloak_service_1.KeycloakService.getInstance(config);
};
exports.initializeKeycloak = initializeKeycloak;
