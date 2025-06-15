import { RabbitMQConfig, EventMessage } from './types';
export * from './types';
export * from './producer';
export * from './consumer';
export declare class RabbitMQProducer {
    private producer;
    private config;
    constructor(config: RabbitMQConfig);
    connect(): Promise<void>;
    publish<T>(routingKey: string, message: EventMessage<T>): Promise<boolean>;
    close(): Promise<void>;
}
export declare class RabbitMQConsumer {
    private consumer;
    private config;
    private options;
    constructor(config: RabbitMQConfig, options?: {
        maxReconnectAttempts?: number;
        reconnectDelay?: number;
    });
    connect(): Promise<void>;
    subscribe<T>(routingKey: string, handler: (message: EventMessage<T>) => Promise<void>): Promise<() => Promise<void>>;
    close(): Promise<void>;
}
declare class RabbitMQInstance {
    private static producer;
    private static consumer;
    private static config;
    private static options;
    static initialize(config: RabbitMQConfig, options?: {
        maxReconnectAttempts?: number;
        reconnectDelay?: number;
    }): void;
    static getProducer(): Promise<RabbitMQProducer>;
    static getConsumer(): Promise<RabbitMQConsumer>;
    static close(): Promise<void>;
}
export declare const rabbitMQ: typeof RabbitMQInstance;
