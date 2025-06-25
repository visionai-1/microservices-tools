import rabbitMQ, { 
  EventMessage, 
  EventType, 
  initializeRabbitMq, 
  validateRabbitMQEnv, 
  getMissingRabbitMQEnvVars 
} from '../src/rabbitmq';

// Example showing both config-based and environment-based initialization

async function demonstrateEnvironmentInit() {
  console.log('=== Environment-based RabbitMQ Initialization ===\n');

  // 1. Validate environment variables first
  console.log('1. Validating required environment variables...');
  if (validateRabbitMQEnv()) {
    console.log('✅ All required environment variables are set');
  } else {
    const missing = getMissingRabbitMQEnvVars();
    console.log('❌ Missing required environment variables:', missing.join(', '));
    console.log('⚠️  Please set these environment variables:\n');
    console.log('Required:');
    console.log('- RABBITMQ_URI (e.g., "amqp://localhost:5672")');
    console.log('- RABBITMQ_EXCHANGE (e.g., "events")');
    console.log('- RABBITMQ_QUEUE_NAME (e.g., "user-service-queue")');
    console.log('\nOptional:');
    console.log('- RABBITMQ_EXCHANGE_TYPE (defaults to "topic")');
    console.log('- RABBITMQ_PREFETCH (defaults to undefined)');
    console.log('- RABBITMQ_MAX_RECONNECT_ATTEMPTS (defaults to undefined)');
    console.log('- RABBITMQ_RECONNECT_DELAY (defaults to undefined)\n');
  }

  // 2. Initialize from environment
  console.log('2. Initializing RabbitMQ from environment variables...');
  try {
    await initializeRabbitMq(); // No config - uses env vars only
    console.log('✅ RabbitMQ initialized from environment variables\n');
  } catch (error) {
    console.log('❌ Failed to initialize from environment:', error instanceof Error ? error.message : 'Unknown error');
    console.log('⚠️  Using fallback config-based initialization\n');
    return false;
  }

  return true;
}

async function demonstrateConfigInit() {
  console.log('=== Config-based RabbitMQ Initialization ===\n');

  // 1. Initialize RabbitMQ with explicit config
  rabbitMQ.initialize({
    uri: 'amqp://localhost:5672',
    exchange: 'events',
    exchangeType: 'topic',
    queueName: 'events-queue',
  });

  console.log('✅ RabbitMQ initialized with explicit config');
}

async function main() {
  try {
    // Try environment-based initialization first
    const envInitSuccess = await demonstrateEnvironmentInit();
    
    if (!envInitSuccess) {
      // Fallback to config-based initialization
      await demonstrateConfigInit();
    }

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