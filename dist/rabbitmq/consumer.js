"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConsumer = void 0;
const amqp = __importStar(require("amqplib"));
const createConsumer = async (config, options = {}) => {
    const { maxReconnectAttempts = 5, reconnectDelay = 5000, maxRetries = 3, deadLetterExchange = `${config.exchange}.dlx`, deadLetterQueue = `${config.queueName}.dlq` } = options;
    let connection = null;
    let channel = null;
    let reconnectAttempts = 0;
    let isReconnecting = false;
    let subscriptions = {};
    const validateMessage = (message) => {
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
        await channel.bindQueue(deadLetterQueue, deadLetterExchange, '#');
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
            connection.on('error', async (err) => {
                console.error('Consumer connection error:', err);
                await handleReconnect();
            });
            // Resubscribe to all previous subscriptions
            for (const [routingKey, { handler }] of Object.entries(subscriptions)) {
                await subscribe(routingKey, handler);
            }
            reconnectAttempts = 0;
            isReconnecting = false;
        }
        catch (error) {
            console.error('Failed to connect:', error);
            await handleReconnect();
        }
    };
    const handleReconnect = async () => {
        if (isReconnecting)
            return;
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
            }
            catch (error) {
                console.error('Reconnection failed:', error);
            }
        }, reconnectDelay);
    };
    const handleMessage = async (msg, handler) => {
        var _a;
        const retryCount = ((_a = msg.properties.headers) === null || _a === void 0 ? void 0 : _a['x-retry-count']) || 0;
        const content = JSON.parse(msg.content.toString());
        try {
            // Validate message
            validateMessage(content);
            // Process message
            await handler(content);
            channel.ack(msg);
        }
        catch (error) {
            console.error('Error processing message:', error);
            if (retryCount < maxRetries) {
                // Requeue with retry count
                channel.nack(msg, false, true);
                // Update retry count in headers
                msg.properties.headers = {
                    ...msg.properties.headers,
                    'x-retry-count': retryCount + 1,
                    'x-last-error': error.message
                };
            }
            else {
                // Move to dead letter queue
                channel.publish(deadLetterExchange, msg.fields.routingKey, msg.content, {
                    headers: {
                        ...msg.properties.headers,
                        'x-dead-letter-reason': error.message,
                        'x-original-exchange': msg.fields.exchange,
                        'x-original-routing-key': msg.fields.routingKey
                    }
                });
                channel.ack(msg);
            }
        }
    };
    const subscribe = async (routingKey, handler) => {
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
        await channel.bindQueue(config.queueName, config.exchange, routingKey);
        // Consume messages
        const { consumerTag } = await channel.consume(config.queueName, async (msg) => {
            if (!msg || !channel)
                return;
            await handleMessage(msg, handler);
        }, {
            noAck: false
        });
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
exports.createConsumer = createConsumer;
