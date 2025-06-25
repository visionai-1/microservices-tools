import { RabbitMQConfig, EventMessage } from './types';
import { createProducer, Producer } from './producer';
import { createConsumer, Consumer } from './consumer';

// Export types
export * from './types';
export * from './producer';
export * from './consumer';

// Main RabbitMQ service for microservices - Singleton Pattern
class RabbitMQService {
  private static producer: Producer | null = null;
  private static consumer: Consumer | null = null;
  private static config: RabbitMQConfig | null = null;
  private static options: {
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
  } = {};
  private static isInitialized: boolean = false;

  static initialize(config: RabbitMQConfig, options: {
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
  } = {}): void {
    if (this.isInitialized) {
      console.warn('RabbitMQ already initialized. Reinitializing with new config.');
    }
    
    this.config = config;
    this.options = options;
    this.isInitialized = true;
    
    // Reset instances when reinitializing
    this.producer = null;
    this.consumer = null;
  }

  static async getProducer(): Promise<Producer> {
    if (!this.isInitialized || !this.config) {
      throw new Error('RabbitMQ not initialized. Call initialize() first.');
    }

    if (!this.producer) {
      this.producer = await createProducer(this.config);
    }

    return this.producer;
  }

  static async getConsumer(): Promise<Consumer> {
    if (!this.isInitialized || !this.config) {
      throw new Error('RabbitMQ not initialized. Call initialize() first.');
    }

    if (!this.consumer) {
      this.consumer = await createConsumer(this.config, this.options);
    }

    return this.consumer;
  }

  static async publish<T>(routingKey: string, message: EventMessage<T>): Promise<boolean> {
    const producer = await this.getProducer();
    return producer.publish(routingKey, message);
  }

  static async subscribe<T>(routingKey: string, handler: (message: EventMessage<T>) => Promise<void>): Promise<() => Promise<void>> {
    const consumer = await this.getConsumer();
    const subscription = await consumer.subscribe(routingKey, handler);
    return subscription.unsubscribe;
  }

  static async close(): Promise<void> {
    const closePromises: Promise<void>[] = [];
    
    if (this.producer) {
      closePromises.push(this.producer.close());
      this.producer = null;
    }
    
    if (this.consumer) {
      closePromises.push(this.consumer.close());
      this.consumer = null;
    }
    
    await Promise.all(closePromises);
    this.isInitialized = false;
  }

  static getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  static getConfig(): RabbitMQConfig | null {
    return this.config;
  }
}

// Export the singleton instance as default export
export default RabbitMQService;

// ==================== ENVIRONMENT-BASED INITIALIZATION ====================
/**
 * Create RabbitMQ configuration from environment variables
 */
function createRabbitMQConfigFromEnv(): RabbitMQConfig | null {
  const uri = process.env.RABBITMQ_URI;
  const exchange = process.env.RABBITMQ_EXCHANGE;
  const exchangeType = process.env.RABBITMQ_EXCHANGE_TYPE as 'topic' | 'direct' | 'fanout' | 'headers';
  const queueName = process.env.RABBITMQ_QUEUE_NAME;
  const prefetch = process.env.RABBITMQ_PREFETCH;

  if (!uri || !exchange || !queueName) {
    console.warn('Missing required RabbitMQ environment variables', {
      uri: !!uri,
      exchange: !!exchange,
      queueName: !!queueName
    });
    return null;
  }

  return {
    uri,
    exchange,
    exchangeType: exchangeType || 'topic',
    queueName,
    prefetch: prefetch ? parseInt(prefetch) : undefined,
  };
}

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
 * @returns void
 * @throws Error if required environment variables are missing
 */
export const initRabbitMq = (): void => {
  const config = createRabbitMQConfigFromEnv();
  if (!config) {
    throw new Error('RabbitMQ initialization failed. Please ensure all required environment variables are set.');
  }

  const maxReconnectAttempts = process.env.RABBITMQ_MAX_RECONNECT_ATTEMPTS 
    ? parseInt(process.env.RABBITMQ_MAX_RECONNECT_ATTEMPTS) 
    : undefined;
  
  const reconnectDelay = process.env.RABBITMQ_RECONNECT_DELAY 
    ? parseInt(process.env.RABBITMQ_RECONNECT_DELAY) 
    : undefined;

  const options = {
    maxReconnectAttempts,
    reconnectDelay,
  };

  RabbitMQService.initialize(config, options);
};

/**
 * Check if all required RabbitMQ environment variables are set
 * @returns true if all required env vars are present, false otherwise
 */
export const validateRabbitMQEnv = (): boolean => {
  const required = [
    'RABBITMQ_URI',
    'RABBITMQ_EXCHANGE',
    'RABBITMQ_QUEUE_NAME'
  ];
  
  return required.every(envVar => !!process.env[envVar]);
};

/**
 * List missing required RabbitMQ environment variables
 * @returns Array of missing environment variable names
 */
export const getMissingRabbitMQEnvVars = (): string[] => {
  const required = [
    'RABBITMQ_URI',
    'RABBITMQ_EXCHANGE',
    'RABBITMQ_QUEUE_NAME'
  ];
  
  return required.filter(envVar => !process.env[envVar]);
};