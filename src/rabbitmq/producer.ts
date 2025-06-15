import * as amqp from 'amqplib';
import { RabbitMQConfig, EventMessage } from './types';

export interface Producer {
  publish: <T>(routingKey: string, message: EventMessage<T>) => Promise<boolean>;
  close: () => Promise<void>;
}

interface PublishOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

export const createProducer = async (config: RabbitMQConfig): Promise<Producer> => {
  const connection = await amqp.connect(config.uri);
  const channel = await connection.createChannel();

  // Set prefetch if specified
  if (config.prefetch) {
    await channel.prefetch(config.prefetch);
  }

  // Assert exchange
  await channel.assertExchange(config.exchange, config.exchangeType, {
    durable: true
  });

  // Handle connection close
  connection.on('close', () => {
    console.warn('Producer connection closed');
  });

  // Handle errors
  connection.on('error', (err) => {
    console.error('Producer connection error:', err);
  });

  const validateMessage = <T>(message: EventMessage<T>): void => {
    if (!message.type) {
      throw new Error('Message type is required');
    }
    if (!message.data) {
      throw new Error('Message data is required');
    }
    if (!message.timestamp) {
      throw new Error('Message timestamp is required');
    }
  };

  const publishWithRetry = async <T>(
    routingKey: string,
    message: EventMessage<T>,
    options: PublishOptions = {}
  ): Promise<boolean> => {
    const {
      retries = 3,
      retryDelay = 1000,
      timeout = 5000
    } = options;

    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < retries) {
      try {
        // Validate message before publishing
        validateMessage(message);

        // Add metadata
        const enrichedMessage = {
          ...message,
          metadata: {
            ...message.metadata,
            publishedAt: Date.now(),
            attempt: attempts + 1
          }
        };

        // Create a promise that resolves when the message is published or times out
        const publishPromise = channel.publish(
          config.exchange,
          routingKey,
          Buffer.from(JSON.stringify(enrichedMessage)),
          {
            persistent: true,
            contentType: 'application/json',
            headers: {
              'x-attempt': attempts + 1,
              'x-published-at': Date.now()
            }
          }
        );

        // Add timeout
        const timeoutPromise = new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error('Publish timeout')), timeout);
        });

        // Race between publish and timeout
        return await Promise.race([publishPromise, timeoutPromise]);
      } catch (error) {
        lastError = error as Error;
        attempts++;
        
        if (attempts < retries) {
          console.warn(`Publish attempt ${attempts} failed, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw new Error(`Failed to publish message after ${retries} attempts: ${lastError?.message}`);
  };

  return {
    publish: async <T>(
      routingKey: string,
      message: EventMessage<T>,
      options?: PublishOptions
    ): Promise<boolean> => {
      if (!channel) {
        throw new Error('Channel is not available');
      }
      return publishWithRetry(routingKey, message, options);
    },
    close: async () => {
      try {
        if (channel) {
          await channel.close();
        }
        if (connection) {
          await connection.close();
        }
      } catch (error) {
        console.error('Error closing producer:', error);
        throw error;
      }
    }
  };
}; 