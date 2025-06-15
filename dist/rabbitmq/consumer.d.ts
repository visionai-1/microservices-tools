import { RabbitMQConfig, EventHandler, EventSubscription } from './types';
export interface Consumer {
    subscribe: <T>(routingKey: string, handler: EventHandler<T>) => Promise<EventSubscription>;
    close: () => Promise<void>;
}
interface ConsumerOptions {
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
    maxRetries?: number;
    retryDelay?: number;
    deadLetterExchange?: string;
    deadLetterQueue?: string;
}
export declare const createConsumer: (config: RabbitMQConfig, options?: ConsumerOptions) => Promise<Consumer>;
export {};
