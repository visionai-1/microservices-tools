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
exports.createProducer = void 0;
const amqp = __importStar(require("amqplib"));
const logging_1 = require("../logging");
const createProducer = async (config) => {
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
        logging_1.Logging.error('Producer connection closed');
    });
    // Handle errors
    connection.on('error', (err) => {
        logging_1.Logging.error('Producer connection error', { error: err.message });
    });
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
    const publishWithRetry = async (routingKey, message, options = {}) => {
        const { retries = 3, retryDelay = 1000, timeout = 5000 } = options;
        let attempts = 0;
        let lastError = null;
        logging_1.Logging.debug('Starting message publish', {
            type: message.type,
            routingKey,
            attempt: attempts + 1
        });
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
                const publishPromise = channel.publish(config.exchange, routingKey, Buffer.from(JSON.stringify(enrichedMessage)), {
                    persistent: true,
                    contentType: 'application/json',
                    headers: {
                        'x-attempt': attempts + 1,
                        'x-published-at': Date.now()
                    }
                });
                // Add timeout
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Publish timeout')), timeout);
                });
                // Race between publish and timeout
                const result = await Promise.race([publishPromise, timeoutPromise]);
                logging_1.Logging.info('Message published successfully', {
                    type: message.type,
                    routingKey,
                    attempt: attempts + 1
                });
                return result;
            }
            catch (error) {
                lastError = error;
                attempts++;
                if (attempts < retries) {
                    logging_1.Logging.warn('Publish attempt failed, retrying', {
                        type: message.type,
                        routingKey,
                        attempt: attempts,
                        error: lastError.message
                    });
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        }
        logging_1.Logging.error('Failed to publish message after all attempts', {
            type: message.type,
            routingKey,
            attempts,
            error: lastError === null || lastError === void 0 ? void 0 : lastError.message
        });
        throw new Error(`Failed to publish message after ${retries} attempts: ${lastError === null || lastError === void 0 ? void 0 : lastError.message}`);
    };
    return {
        publish: async (routingKey, message, options) => {
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
            }
            catch (error) {
                logging_1.Logging.error('Error closing producer', { error: error.message });
                throw error;
            }
        }
    };
};
exports.createProducer = createProducer;
