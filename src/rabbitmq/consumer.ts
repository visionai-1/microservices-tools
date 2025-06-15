import * as amqp from 'amqplib';
import { RabbitMQConfig, EventMessage, EventHandler, EventSubscription } from './types';

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

export const createConsumer = async (
  config: RabbitMQConfig,
  options: ConsumerOptions = {}
): Promise<Consumer> => {
  const {
    maxReconnectAttempts = 5,
    reconnectDelay = 5000,
    maxRetries = 3,
    retryDelay = 1000,
    deadLetterExchange = `${config.exchange}.dlx`,
    deadLetterQueue = `${config.queueName}.dlq`
  } = options;

  let connection: any = null;
  let channel: any = null;
  let reconnectAttempts = 0;
  let isReconnecting = false;
  let subscriptions: { [key: string]: { consumerTag: string; handler: EventHandler<any> } } = {};

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

  const setupDeadLetterExchange = async () => {
    // Assert dead letter exchange
    await channel.assertExchange(deadLetterExchange, 'topic', {
      durable: true
    });

    // Assert dead letter queue
    await channel.assertQueue(deadLetterQueue, {
      durable: true
    });

    // Bind dead letter queue to exchange
    await channel.bindQueue(
      deadLetterQueue,
      deadLetterExchange,
      '#'
    );
  };

  const connect = async () => {
    try {
      connection = await amqp.connect(config.uri);
      channel = await connection.createChannel();

      // Set prefetch if specified
      if (config.prefetch) {
        await channel.prefetch(config.prefetch);
      }

      // Assert exchange
      await channel.assertExchange(config.exchange, config.exchangeType, {
        durable: true
      });

      // Setup dead letter exchange and queue
      await setupDeadLetterExchange();

      // Handle connection close
      connection.on('close', async () => {
        console.warn('Consumer connection closed');
        await handleReconnect();
      });

      // Handle errors
      connection.on('error', async (err: Error) => {
        console.error('Consumer connection error:', err);
        await handleReconnect();
      });

      // Resubscribe to all previous subscriptions
      for (const [routingKey, { handler }] of Object.entries(subscriptions)) {
        await subscribe(routingKey, handler);
      }

      reconnectAttempts = 0;
      isReconnecting = false;
    } catch (error) {
      console.error('Failed to connect:', error);
      await handleReconnect();
    }
  };

  const handleReconnect = async () => {
    if (isReconnecting) return;
    isReconnecting = true;

    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    reconnectAttempts++;
    console.log(`Reconnecting... Attempt ${reconnectAttempts}`);

    setTimeout(async () => {
      try {
        await connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, reconnectDelay);
  };

  const handleMessage = async <T>(
    msg: amqp.ConsumeMessage,
    handler: EventHandler<T>
  ): Promise<void> => {
    const retryCount = msg.properties.headers?.['x-retry-count'] || 0;
    const content = JSON.parse(msg.content.toString()) as EventMessage<T>;

    try {
      // Validate message
      validateMessage(content);

      // Process message
      await handler(content);
      channel.ack(msg);
    } catch (error) {
      console.error('Error processing message:', error);

      if (retryCount < maxRetries) {
        // Requeue with retry count
        channel.nack(msg, false, true);
        
        // Update retry count in headers
        msg.properties.headers = {
          ...msg.properties.headers,
          'x-retry-count': retryCount + 1,
          'x-last-error': (error as Error).message
        };
      } else {
        // Move to dead letter queue
        channel.publish(
          deadLetterExchange,
          msg.fields.routingKey,
          msg.content,
          {
            headers: {
              ...msg.properties.headers,
              'x-dead-letter-reason': (error as Error).message,
              'x-original-exchange': msg.fields.exchange,
              'x-original-routing-key': msg.fields.routingKey
            }
          }
        );
        channel.ack(msg);
      }
    }
  };

  const subscribe = async <T>(
    routingKey: string,
    handler: EventHandler<T>
  ): Promise<EventSubscription> => {
    if (!channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    // Assert queue with dead letter exchange
    await channel.assertQueue(config.queueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': deadLetterExchange,
        'x-dead-letter-routing-key': routingKey
      }
    });

    // Bind queue to exchange
    await channel.bindQueue(
      config.queueName,
      config.exchange,
      routingKey
    );

    // Consume messages
    const { consumerTag } = await channel.consume(
      config.queueName,
      async (msg: amqp.ConsumeMessage | null) => {
        if (!msg || !channel) return;
        await handleMessage(msg, handler);
      },
      {
        noAck: false
      }
    );

    // Store subscription for reconnection
    subscriptions[routingKey] = { consumerTag, handler };

    return {
      unsubscribe: async () => {
        if (channel && consumerTag) {
          await channel.cancel(consumerTag);
          delete subscriptions[routingKey];
        }
      }
    };
  };

  // Initial connection
  await connect();

  return {
    subscribe,
    close: async () => {
      if (channel) {
        await channel.close();
        channel = null;
      }
      if (connection) {
        await connection.close();
        connection = null;
      }
    }
  };
}; 