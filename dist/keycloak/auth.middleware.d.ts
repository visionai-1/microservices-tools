import { Request, Response, NextFunction } from 'express';
import { KeycloakConnectClient } from './keycloak-connect.client';
import { UserInfo } from './types';
declare global {
    namespace Express {
        interface Request {
            user?: UserInfo;
        }
    }
}
export declare const extractToken: (req: Request) => string | null;
export declare const getKeycloakConnectClient: () => KeycloakConnectClient | null;
export declare const authenticateKeycloakClient: () => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const authorizeKeycloakClient: (requiredRoles?: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
