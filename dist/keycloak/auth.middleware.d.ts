import { Request, Response, NextFunction } from 'express';
import { KeycloakService } from './keycloak.service';
import { KeycloakConnectClient } from './keycloak-connect.client';
import { KeycloakAdminClient } from './keycloak-admin.client';
import { UserInfo } from './types';
declare global {
    namespace Express {
        interface Request {
            user?: UserInfo;
        }
    }
}
export declare const getKeycloakService: () => KeycloakService | null;
export declare const getKeycloakConnectClient: () => KeycloakConnectClient | null;
export declare const getKeycloakAdminClient: () => KeycloakAdminClient | null;
export declare const authenticateKeycloak: () => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const authorizeKeycloak: (requiredRoles?: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
