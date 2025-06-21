"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const keycloak_service_1 = require("./keycloak.service");
const logging_1 = require("../logging");
const authMiddleware = (requiredRoles) => {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                logging_1.Logging.security('Unauthorized access attempt', {
                    ip: req.ip,
                    path: req.path
                });
                return res.status(401).json({ error: 'No token provided' });
            }
            const token = authHeader.split(' ')[1];
            const keycloakService = keycloak_service_1.KeycloakService.getInstance();
            if (!keycloakService) {
                logging_1.Logging.error('KeycloakService not initialized', {
                    path: req.path
                });
                throw new Error('KeycloakService not initialized');
            }
            const userInfo = await keycloakService.verifyToken(token);
            // Check if user has required roles
            if (!keycloakService.hasRequiredRoles(userInfo, requiredRoles || [])) {
                logging_1.Logging.security('Access denied - insufficient permissions', {
                    userId: userInfo.sub,
                    path: req.path,
                    requiredRoles
                });
                return res.status(403).json({ error: 'Insufficient permissions' });
            }
            // Attach user info to request
            req.user = userInfo;
            next();
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('Token validation failed')) {
                logging_1.Logging.security('Invalid token', {
                    path: req.path,
                    error: error.message
                });
                return res.status(401).json({ error: 'Invalid token' });
            }
            logging_1.Logging.error('Authentication error', {
                path: req.path,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
};
exports.authMiddleware = authMiddleware;
