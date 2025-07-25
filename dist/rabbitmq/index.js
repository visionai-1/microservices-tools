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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMissingRabbitMQEnvVars = exports.validateRabbitMQEnv = exports.initializeRabbitMq = void 0;
const producer_1 = require("./producer");
const consumer_1 = require("./consumer");
// Export types
__exportStar(require("./types"), exports);
__exportStar(require("./producer"), exports);
__exportStar(require("./consumer"), exports);
// Main RabbitMQ service for microservices - Singleton Pattern
class RabbitMQService {
    static async initialize(config, options = {}) {
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
    static async getProducer() {
        if (!this.isInitialized || !this.config) {
            throw new Error('RabbitMQ not initialized. Call initialize() first.');
        }
        if (!this.producer) {
            this.producer = await (0, producer_1.createProducer)(this.config);
        }
        return this.producer;
    }
    static async getConsumer() {
        if (!this.isInitialized || !this.config) {
            throw new Error('RabbitMQ not initialized. Call initialize() first.');
        }
        if (!this.consumer) {
            this.consumer = await (0, consumer_1.createConsumer)(this.config, this.options);
        }
        return this.consumer;
    }
    static async publish(routingKey, message) {
        const producer = await this.getProducer();
        return producer.publish(routingKey, message);
    }
    static async subscribe(routingKey, handler) {
        const consumer = await this.getConsumer();
        const subscription = await consumer.subscribe(routingKey, handler);
        return subscription.unsubscribe;
    }
    static async close() {
        const closePromises = [];
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
    static getInitializationStatus() {
        return this.isInitialized;
    }
    static getConfig() {
        return this.config;
    }
}
RabbitMQService.producer = null;
RabbitMQService.consumer = null;
RabbitMQService.config = null;
RabbitMQService.options = {};
RabbitMQService.isInitialized = false;
// Export the singleton instance as default export
exports.default = RabbitMQService;
// ==================== ENVIRONMENT-BASED INITIALIZATION ====================
/**
 * Create RabbitMQ configuration from environment variables
 */
function createRabbitMQConfigFromEnv() {
    const uri = process.env.RABBITMQ_URI;
    const exchange = process.env.RABBITMQ_EXCHANGE;
    const exchangeType = process.env.RABBITMQ_EXCHANGE_TYPE;
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
 * @returns Promise<void>
 * @throws Error if required environment variables are missing
 */
const initializeRabbitMq = async () => {
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
    await RabbitMQService.initialize(config, options);
    // Test the connection by creating a producer
    try {
        const producer = await RabbitMQService.getProducer();
        console.log('✅ RabbitMQ connection verified');
    }
    catch (error) {
        console.error('❌ RabbitMQ connection failed:', error instanceof Error ? error.message : 'Unknown error');
        throw new Error(`RabbitMQ initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.initializeRabbitMq = initializeRabbitMq;
/**
 * Check if all required RabbitMQ environment variables are set
 * @returns true if all required env vars are present, false otherwise
 */
const validateRabbitMQEnv = () => {
    const required = [
        'RABBITMQ_URI',
        'RABBITMQ_EXCHANGE',
        'RABBITMQ_QUEUE_NAME'
    ];
    return required.every(envVar => !!process.env[envVar]);
};
exports.validateRabbitMQEnv = validateRabbitMQEnv;
/**
 * List missing required RabbitMQ environment variables
 * @returns Array of missing environment variable names
 */
const getMissingRabbitMQEnvVars = () => {
    const required = [
        'RABBITMQ_URI',
        'RABBITMQ_EXCHANGE',
        'RABBITMQ_QUEUE_NAME'
    ];
    return required.filter(envVar => !process.env[envVar]);
};
exports.getMissingRabbitMQEnvVars = getMissingRabbitMQEnvVars;
