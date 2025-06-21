import rabbitMQ, { EventMessage, EventType } from '../src/rabbitmq';

// Simple example showing singleton pattern usage

async function main() {
  try {
    // 1. Initialize RabbitMQ once
    rabbitMQ.initialize({
      uri: 'amqp://localhost:5672',
      exchange: 'events',
      exchangeType: 'topic',
      queueName: 'events-queue',
    });

    console.log('RabbitMQ initialized');

    // 2. Subscribe to events
    const unsubscribe = await rabbitMQ.subscribe(EventType.USER_CREATED, async (message) => {
      console.log('Received user created event:', message.data);
    });

    console.log('Subscribed to user.created events');

    // 3. Publish events
    const event: EventMessage<{ userId: string; email: string }> = {
      type: EventType.USER_CREATED,
      data: {
        userId: '123',
        email: 'user@example.com',
      },
      timestamp: Date.now(),
    };

    await rabbitMQ.publish(EventType.USER_CREATED, event);
    console.log('Published user created event');

    // 4. Wait a bit to see the event processed
    setTimeout(async () => {
      await unsubscribe();
      await rabbitMQ.close();
      console.log('Cleanup completed');
    }, 2000);

  } catch (error) {
    console.error('Error:', error);
    await rabbitMQ.close();
  }
}

// Run the example
main().catch(console.error); 