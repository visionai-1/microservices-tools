"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeKeycloak = exports.authenticateKeycloak = void 0;
const keycloak_service_1 = require("./keycloak.service");
const logging_1 = require("../logging");
// Helper function to extract and validate token
const extractToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logging_1.Logging.security('Unauthorized access attempt - no token', {
            ip: req.ip,
            path: req.path
        });
        return null;
    }
    return authHeader.split(' ')[1];
};
// Helper function to get KeycloakService instance
const getKeycloakService = () => {
    const keycloakService = keycloak_service_1.KeycloakService.getInstance();
    if (!keycloakService) {
        logging_1.Logging.error('KeycloakService not initialized');
        return null;
    }
    return keycloakService;
};
// Helper function to handle authentication errors
const handleAuthError = (error, req, res) => {
    if (error instanceof Error && error.message.includes('Token validation failed')) {
        logging_1.Logging.security('Invalid token', {
            path: req.path,
            error: error.message
        });
        res.status(401).json({ error: 'Invalid token' });
        return;
    }
    logging_1.Logging.error('Authentication error', {
        path: req.path,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ error: 'Internal server error' });
};
// Authentication middleware - only verifies token and extracts user info
const authenticateKeycloak = () => {
    return async (req, res, next) => {
        try {
            const token = extractToken(req);
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const keycloakService = getKeycloakService();
            if (!keycloakService) {
                return res.status(500).json({ error: 'Authentication service not available' });
            }
            const userInfo = await keycloakService.verifyToken(token);
            req.user = userInfo;
            next();
        }
        catch (error) {
            handleAuthError(error, req, res);
        }
    };
};
exports.authenticateKeycloak = authenticateKeycloak;
// Authorization middleware - checks if user has required roles
const authorizeKeycloak = (requiredRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                logging_1.Logging.security('Authorization attempted without authentication', {
                    path: req.path
                });
                return res.status(401).json({ error: 'Authentication required' });
            }
            const keycloakService = getKeycloakService();
            if (!keycloakService) {
                return res.status(500).json({ error: 'Authorization service not available' });
            }
            if (!keycloakService.hasRequiredRoles(req.user, requiredRoles || [])) {
                logging_1.Logging.security('Access denied - insufficient permissions', {
                    userId: req.user.sub,
                    path: req.path,
                    requiredRoles,
                    userRoles: [...(req.user.roles || []), ...(req.user.permissions || [])]
                });
                return res.status(403).json({ error: 'Insufficient permissions' });
            }
            next();
        }
        catch (error) {
            logging_1.Logging.error('Authorization error', {
                path: req.path,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    };
};
exports.authorizeKeycloak = authorizeKeycloak;
