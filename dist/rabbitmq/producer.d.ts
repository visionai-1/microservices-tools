import { RabbitMQConfig, EventMessage } from './types';
export interface Producer {
    publish: <T>(routingKey: string, message: EventMessage<T>) => Promise<boolean>;
    close: () => Promise<void>;
}
export declare const createProducer: (config: RabbitMQConfig) => Promise<Producer>;
