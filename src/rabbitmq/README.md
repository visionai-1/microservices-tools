# RabbitMQ Module

A robust RabbitMQ client module for microservices communication using a **singleton pattern** for easy sharing across services.

## Features

- **Singleton Pattern**: Single shared RabbitMQ instance across microservices
- **Simple API**: Direct `publish()` and `subscribe()` methods
- **Automatic Reconnection**: Built-in connection recovery
- **Dead Letter Queues**: Failed message handling
- **Message Retry**: Configurable retry logic
- **Type Safety**: Full TypeScript support
- **Connection Pooling**: Efficient resource management

## Installation

```bash
npm install amqplib
npm install @types/amqplib --save-dev
```

## Quick Start

### 1. Initialize the Singleton

```typescript
import rabbitMQ, { EventMessage, EventType } from './rabbitmq';

// Initialize once at application startup
rabbitMQ.initialize({
  uri: 'amqp://localhost:5672',
  exchange: 'events',
  exchangeType: 'topic',
  queueName: 'events-queue',
});
```

### 2. Publish Events

```typescript
// Publish an event
const event: EventMessage<{ userId: string }> = {
  type: EventType.USER_CREATED,
  data: { userId: '123' },
  timestamp: Date.now(),
};

await rabbitMQ.publish(EventType.USER_CREATED, event);
```

### 3. Subscribe to Events

```typescript
// Subscribe to events
const unsubscribe = await rabbitMQ.subscribe(EventType.USER_CREATED, async (message) => {
  console.log('Received:', message.data);
  // Process the event
});

// Later, unsubscribe when needed
await unsubscribe();
```

## Configuration

### RabbitMQConfig

```typescript
interface RabbitMQConfig {
  uri: string;                    // RabbitMQ connection URI
  exchange: string;               // Exchange name
  exchangeType: 'topic' | 'direct' | 'fanout' | 'headers';  // Exchange type
  queueName: string;              // Queue name
  prefetch?: number;              // Prefetch count (optional)
}
```

### Initialization Options

```typescript
rabbitMQ.initialize(config, {
  maxReconnectAttempts: 5,        // Max reconnection attempts (default: 5)
  reconnectDelay: 5000,           // Delay between reconnections in ms (default: 5000)
});
```

## Event Types

Predefined event types for common microservice operations:

```typescript
enum EventType {
  // Payment Service Events
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  
  // Media Service Events
  MEDIA_UPLOADED = 'media.uploaded',
  MEDIA_PROCESSED = 'media.processed',
  MEDIA_DELETED = 'media.deleted',
  
  // User Management Events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_ROLE_CHANGED = 'user.role.changed'
}
```

## Message Structure

```typescript
interface EventMessage<T> {
  type: string;                   // Event type
  data: T;                        // Event payload
  timestamp: number;              // Event timestamp
  metadata?: {                    // Optional metadata
    publishedAt?: number;
    attempt?: number;
    [key: string]: any;
  };
}
```

## Microservices Architecture Example

### User Service (Publishes Events)

```typescript
import rabbitMQ, { EventMessage, EventType } from './rabbitmq';

export class UserService {
  async createUser(userData: { email: string; name: string }) {
    const event: EventMessage<{ userId: string; email: string; name: string }> = {
      type: EventType.USER_CREATED,
      data: {
        userId: `user_${Date.now()}`,
        email: userData.email,
        name: userData.name,
      },
      timestamp: Date.now(),
    };

    await rabbitMQ.publish(EventType.USER_CREATED, event);
  }
}
```

### Notification Service (Consumes Events)

```typescript
import rabbitMQ, { EventType } from './rabbitmq';

export class NotificationService {
  async start() {
    await rabbitMQ.subscribe(EventType.USER_CREATED, async (message) => {
      console.log('Sending welcome email to:', message.data.email);
      // Send welcome email logic here
    });
  }
}
```

### REST API Controller

```typescript
import rabbitMQ, { EventMessage, EventType } from './rabbitmq';

export class UserController {
  async createUser(req: any, res: any) {
    try {
      const { email, name } = req.body;
      const userId = `user_${Date.now()}`;
      
      // Publish event
      const event: EventMessage<{ userId: string; email: string; name: string }> = {
        type: EventType.USER_CREATED,
        data: { userId, email, name },
        timestamp: Date.now(),
      };
      
      await rabbitMQ.publish(EventType.USER_CREATED, event);
      
      res.status(201).json({ success: true, userId });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create user' });
    }
  }
}
```

## Application Lifecycle

### Startup

```typescript
// app.ts or server.ts
import rabbitMQ from './rabbitmq';

async function startApplication() {
  // Initialize RabbitMQ first
  rabbitMQ.initialize({
    uri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
    exchange: 'events',
    exchangeType: 'topic',
    queueName: 'events-queue',
  });
  
  // Start your Express/Fastify server
  const app = express();
  app.listen(3000);
}
```

### Shutdown

```typescript
import rabbitMQ from './rabbitmq';

process.on('SIGTERM', async () => {
  await rabbitMQ.close();
  process.exit(0);
});
```

## API Reference

### Singleton Methods

```typescript
// Initialize
rabbitMQ.initialize(config: RabbitMQConfig, options?: ConsumerOptions): void

// Publish events
rabbitMQ.publish<T>(routingKey: string, message: EventMessage<T>): Promise<boolean>

// Subscribe to events
rabbitMQ.subscribe<T>(routingKey: string, handler: (message: EventMessage<T>) => Promise<void>): Promise<() => Promise<void>>

// Close all connections
rabbitMQ.close(): Promise<void>

// Check status
rabbitMQ.getInitializationStatus(): boolean
rabbitMQ.isConnected(): boolean
rabbitMQ.getConfig(): RabbitMQConfig | null
```

## Error Handling

The module includes comprehensive error handling:

- **Connection Failures**: Automatic reconnection with exponential backoff
- **Message Processing**: Retry logic with configurable attempts
- **Dead Letter Queues**: Failed messages are moved to DLQ after max retries
- **Validation**: Message structure validation before processing

## Best Practices

1. **Initialize Once**: Call `rabbitMQ.initialize()` only once at application startup
2. **Handle Lifecycle**: Always call `rabbitMQ.close()` when shutting down
3. **Use Type-Safe Events**: Define proper TypeScript interfaces for your events
4. **Implement Idempotency**: Make your event handlers idempotent
5. **Monitor Dead Letter Queues**: Set up monitoring for failed messages
6. **Use Meaningful Event Types**: Use descriptive event type names

## Examples

See the `examples/` directory for complete usage examples:

- `simple-singleton.ts`: Basic singleton pattern usage

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure RabbitMQ server is running and accessible
2. **Permission Denied**: Check RabbitMQ user permissions
3. **Queue Not Found**: Verify queue name and exchange configuration
4. **Message Not Delivered**: Check routing key and exchange type

### Debugging

Enable debug logging by setting the appropriate log level in your application.

## License

MIT 