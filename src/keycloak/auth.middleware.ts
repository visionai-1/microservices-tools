import { Request, Response, NextFunction } from 'express';
import { KeycloakService } from './keycloak.service';
import { Logging } from '../logging';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authMiddleware = (requiredRoles?: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        Logging.security('Unauthorized access attempt', {
          ip: req.ip,
          path: req.path
        });
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      const keycloakService = KeycloakService.getInstance();

      if (!keycloakService) {
        Logging.error('KeycloakService not initialized', {
          path: req.path
        });
        throw new Error('KeycloakService not initialized');
      }

      const userInfo = await keycloakService.verifyToken(token);

      // Check if user has required roles
      if (!keycloakService.hasRequiredRoles(userInfo, requiredRoles || [])) {
        Logging.security('Access denied - insufficient permissions', {
          userId: userInfo.sub,
          path: req.path,
          requiredRoles
        });
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Attach user info to request
      req.user = userInfo;
      next();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Token validation failed')) {
        Logging.security('Invalid token', {
          path: req.path,
          error: error.message
        });
        return res.status(401).json({ error: 'Invalid token' });
      }

      Logging.error('Authentication error', {
        path: req.path,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}; 