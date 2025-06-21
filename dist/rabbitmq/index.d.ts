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
    }): void;
    static getProducer(): Promise<Producer>;
    static getConsumer(): Promise<Consumer>;
    static publish<T>(routingKey: string, message: EventMessage<T>): Promise<boolean>;
    static subscribe<T>(routingKey: string, handler: (message: EventMessage<T>) => Promise<void>): Promise<() => Promise<void>>;
    static close(): Promise<void>;
    static getInitializationStatus(): boolean;
    static getConfig(): RabbitMQConfig | null;
}
export default RabbitMQService;
