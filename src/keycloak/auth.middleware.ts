import { Request, Response, NextFunction } from 'express';
import { KeycloakService } from './keycloak.service';

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
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      const keycloakService = KeycloakService.getInstance();

      if (!keycloakService) {
        throw new Error('KeycloakService not initialized');
      }

      const userInfo = await keycloakService.verifyToken(token);

      // Check if user has required roles
      if (!keycloakService.hasRequiredRoles(userInfo, requiredRoles || [])) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Attach user info to request
      req.user = userInfo;
      next();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Token validation failed')) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}; 