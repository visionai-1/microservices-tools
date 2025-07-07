import { Request, Response, NextFunction } from 'express';
import { KeycloakConnectClient } from './keycloak-connect.client';
import { UserInfo } from './types';
import { Logging } from '../logging';

declare global {
  namespace Express {
    interface Request {
      user?: UserInfo;
    }
  }
}

// Helper function to extract and validate token
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    Logging.security('Unauthorized access attempt - no token', {
      ip: req.ip,
      path: req.path
    });
    return null;
  }
  return authHeader.split(' ')[1];
};

// Helper function to get KeycloakConnectClient instance
export const getKeycloakConnectClient = (): KeycloakConnectClient | null => {
  return KeycloakConnectClient.getInstance();
};

// Helper function to handle authentication errors
const handleAuthError = (error: unknown, req: Request, res: Response): void => {
  if (error instanceof Error && error.message.includes('Token validation failed')) {
    Logging.security('Invalid token', {
      path: req.path,
      error: error.message
    });
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  Logging.error('Authentication error', {
    path: req.path,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });
  
  res.status(500).json({ error: 'Internal server error' });
};

// Authentication middleware - only verifies token and extracts user info
export const authenticateKeycloakClient = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const keycloakConnectClient = getKeycloakConnectClient();
      if (!keycloakConnectClient) {
        return res.status(500).json({ error: 'Authentication service not available' });
      }

      const userInfo: UserInfo = await keycloakConnectClient.verifyToken(token);
      req.user = userInfo;
      next();
    } catch (error: unknown) {
      handleAuthError(error, req, res);
    }
  };
};

// Authorization middleware - checks if user has required roles
export const authorizeKeycloakClient = (requiredRoles?: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        Logging.security('Authorization attempted without authentication', {
          path: req.path
        });
        return res.status(401).json({ error: 'Authentication required' });
      }

      const keycloakConnectClient = getKeycloakConnectClient();
      if (!keycloakConnectClient) {
        return res.status(500).json({ error: 'Authorization service not available' });
      }

      if (!keycloakConnectClient.hasRequiredRoles(req.user, requiredRoles || [])) {
        Logging.security('Access denied - insufficient permissions', {
          userId: req.user.sub,
          path: req.path,
          requiredRoles,
          userRoles: [...(req.user.roles || []), ...(req.user.permissions || [])]
        });
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error: unknown) {
      Logging.error('Authorization error', {
        path: req.path,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}; 