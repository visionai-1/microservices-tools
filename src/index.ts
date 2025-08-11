// ==================== CORE SERVICES ====================
export { Logging } from './logging';
export { 
    default as RabbitMQService,
    initializeRabbitMq,
    validateRabbitMQEnv,
    getMissingRabbitMQEnvVars
} from './rabbitmq';

// ==================== KEYCLOAK AUTHENTICATION & AUTHORIZATION ====================

// Main client and initialization
export { 
    KeycloakConnectClient,
    initializeKeycloakConnectClient,
    validateKeycloakEnv,
    authenticateKeycloakClient,
    authorizeKeycloakClient,
    getKeycloakConnectClient,
    KeycloakBaseConfig,
    KeycloakConnectConfig,
    UserInfo,
    ExtendedJwtPayload,
    KeycloakTokenPayload,
    Principal,
    extractToken,
} from './keycloak';
export { verifyAccessToken as verifyAccessTokenWithIssuer, buildPrincipal } from './auth/jwt';
export type { KeycloakTokenPayload as JwtKeycloakTokenPayload } from './auth/jwt';