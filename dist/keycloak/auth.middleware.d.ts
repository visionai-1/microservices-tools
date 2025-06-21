import { Request, Response, NextFunction } from 'express';
import { UserInfo } from './keycloak.service';
declare global {
    namespace Express {
        interface Request {
            user?: UserInfo;
        }
    }
}
export declare const authenticateKeycloak: () => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const authorizeKeycloak: (requiredRoles?: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
