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