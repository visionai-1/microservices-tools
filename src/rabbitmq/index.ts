import { RabbitMQConfig, EventMessage } from './types';
import { createProducer, Producer } from './producer';
import { createConsumer, Consumer } from './consumer';

// Export types
export * from './types';
export * from './producer';
export * from './consumer';

// Instance classes for direct usage
export class RabbitMQProducer {
  private producer: Producer | null = null;
  private config: RabbitMQConfig;

  constructor(config: RabbitMQConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.producer) {
      this.producer = await createProducer(this.config);
    }
  }

  async publish<T>(routingKey: string, message: EventMessage<T>): Promise<boolean> {
    if (!this.producer) {
      throw new Error('Producer not connected. Call connect() first.');
    }
    return this.producer.publish(routingKey, message);
  }

  async close(): Promise<void> {
    if (this.producer) {
      await this.producer.close();
      this.producer = null;
    }
  }
}

export class RabbitMQConsumer {
  private consumer: Consumer | null = null;
  private config: RabbitMQConfig;
  private options: {
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
  };

  constructor(
    config: RabbitMQConfig,
    options: {
      maxReconnectAttempts?: number;
      reconnectDelay?: number;
    } = {}
  ) {
    this.config = config;
    this.options = options;
  }

  async connect(): Promise<void> {
    if (!this.consumer) {
      this.consumer = await createConsumer(this.config, this.options);
    }
  }

  async subscribe<T>(routingKey: string, handler: (message: EventMessage<T>) => Promise<void>): Promise<() => Promise<void>> {
    if (!this.consumer) {
      throw new Error('Consumer not connected. Call connect() first.');
    }
    const subscription = await this.consumer.subscribe(routingKey, handler);
    return subscription.unsubscribe;
  }

  async close(): Promise<void> {
    if (this.consumer) {
      await this.consumer.close();
      this.consumer = null;
    }
  }
}

// Singleton instance for sharing between microservices
class RabbitMQInstance {
  private static producer: RabbitMQProducer | null = null;
  private static consumer: RabbitMQConsumer | null = null;
  private static config: RabbitMQConfig | null = null;
  private static options: {
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
  } = {};

  static initialize(config: RabbitMQConfig, options: {
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
  } = {}) {
    this.config = config;
    this.options = options;
  }

  static async getProducer(): Promise<RabbitMQProducer> {
    if (!this.config) {
      throw new Error('RabbitMQ not initialized. Call initialize() first.');
    }

    if (!this.producer) {
      this.producer = new RabbitMQProducer(this.config);
      await this.producer.connect();
    }

    return this.producer;
  }

  static async getConsumer(): Promise<RabbitMQConsumer> {
    if (!this.config) {
      throw new Error('RabbitMQ not initialized. Call initialize() first.');
    }

    if (!this.consumer) {
      this.consumer = new RabbitMQConsumer(this.config, this.options);
      await this.consumer.connect();
    }

    return this.consumer;
  }

  static async close(): Promise<void> {
    if (this.producer) {
      await this.producer.close();
      this.producer = null;
    }
    if (this.consumer) {
      await this.consumer.close();
      this.consumer = null;
    }
  }
}

// Export singleton instance
export const rabbitMQ = RabbitMQInstance;