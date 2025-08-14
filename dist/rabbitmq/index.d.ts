import { RabbitMQConfig, EventMessage } from './types';
import { Producer } from './producer';
import { Consumer } from './consumer';
export * from './types';
export * from './producer';
export * from './consumer';
declare class RabbitMQService {
    private static producer;
    private static consumer;
    private static config;
    private static options;
    private static isInitialized;
    static initialize(config: RabbitMQConfig, options?: {
        maxReconnectAttempts?: number;
        reconnectDelay?: number;
    }): Promise<void>;
    static getProducer(): Promise<Producer>;
    static getConsumer(): Promise<Consumer>;
    static publish<T>(routingKey: string, message: EventMessage<T>): Promise<boolean>;
    static subscribe<T>(routingKey: string, handler: (message: EventMessage<T>) => Promise<void>): Promise<() => Promise<void>>;
    static close(): Promise<void>;
    static getInitializationStatus(): boolean;
    static getConfig(): RabbitMQConfig | null;
}
export default RabbitMQService;
/**
 * Initialize RabbitMQ from environment variables
 * This should be called once at microservice startup
 *
 * Required environment variables:
 * - RABBITMQ_URI (e.g., "amqp://username:password@localhost:5672")
 * - RABBITMQ_EXCHANGE (e.g., "events")
 * - RABBITMQ_QUEUE_NAME (e.g., "user-service-queue")
 *
 * Optional environment variables:
 * - RABBITMQ_EXCHANGE_TYPE (defaults to 'topic')
 * - RABBITMQ_PREFETCH (defaults to undefined)
 * - RABBITMQ_MAX_RECONNECT_ATTEMPTS (defaults to undefined)
 * - RABBITMQ_RECONNECT_DELAY (defaults to undefined)
 *
 * @returns Promise<void>
 * @throws Error if required environment variables are missing
 */
export declare const initializeRabbitMq: () => Promise<void>;
/**
 * Check if all required RabbitMQ environment variables are set
 * @returns true if all required env vars are present, false otherwise
 */
export declare const validateRabbitMQEnv: () => boolean;
/**
 * List missing required RabbitMQ environment variables
 * @returns Array of missing environment variable names
 */
export declare const getMissingRabbitMQEnvVars: () => string[];
