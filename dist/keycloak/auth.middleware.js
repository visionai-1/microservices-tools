"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const keycloak_service_1 = require("./keycloak.service");
const logging_1 = require("../logging");
const authMiddleware = (requiredRoles) => {
    return async (req, res, next) => {
        const startTime = Date.now();
        const requestId = Math.random().toString(36).substring(7);
        try {
            logging_1.Logging.auth('Authentication request started', {
                requestId,
                method: req.method,
                path: req.path,
                ip: req.ip,
                requiredRoles
            });
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                logging_1.Logging.auth('No token provided', {
                    requestId,
                    ip: req.ip,
                    path: req.path
                });
                return res.status(401).json({ error: 'No token provided' });
            }
            const token = authHeader.split(' ')[1];
            const keycloakService = keycloak_service_1.KeycloakService.getInstance();
            if (!keycloakService) {
                logging_1.Logging.error('KeycloakService not initialized', {
                    requestId,
                    path: req.path
                });
                throw new Error('KeycloakService not initialized');
            }
            logging_1.Logging.auth('Verifying token', {
                requestId,
                path: req.path
            });
            const userInfo = await keycloakService.verifyToken(token);
            logging_1.Logging.auth('Token verified successfully', {
                requestId,
                userId: userInfo.sub,
                username: userInfo.preferred_username,
                roles: userInfo.roles
            });
            // Check if user has required roles
            if (!keycloakService.hasRequiredRoles(userInfo, requiredRoles || [])) {
                logging_1.Logging.security('Insufficient permissions', {
                    requestId,
                    userId: userInfo.sub,
                    username: userInfo.preferred_username,
                    userRoles: userInfo.roles,
                    requiredRoles
                });
                return res.status(403).json({ error: 'Insufficient permissions' });
            }
            // Attach user info to request
            req.user = userInfo;
            const duration = Date.now() - startTime;
            logging_1.Logging.auth('Authentication successful', {
                requestId,
                userId: userInfo.sub,
                username: userInfo.preferred_username,
                duration: `${duration}ms`
            });
            next();
        }
        catch (error) {
            const duration = Date.now() - startTime;
            if (error instanceof Error && error.message.includes('Token validation failed')) {
                logging_1.Logging.auth('Invalid token', {
                    requestId,
                    error: error.message,
                    duration: `${duration}ms`
                });
                return res.status(401).json({ error: 'Invalid token' });
            }
            logging_1.Logging.error('Authentication error', {
                requestId,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                duration: `${duration}ms`
            });
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
};
exports.authMiddleware = authMiddleware;
