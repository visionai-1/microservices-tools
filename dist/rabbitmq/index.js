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
exports.rabbitMQ = exports.RabbitMQConsumer = exports.RabbitMQProducer = void 0;
const producer_1 = require("./producer");
const consumer_1 = require("./consumer");
// Export types
__exportStar(require("./types"), exports);
__exportStar(require("./producer"), exports);
__exportStar(require("./consumer"), exports);
// Instance classes for direct usage
class RabbitMQProducer {
    constructor(config) {
        this.producer = null;
        this.config = config;
    }
    async connect() {
        if (!this.producer) {
            this.producer = await (0, producer_1.createProducer)(this.config);
        }
    }
    async publish(routingKey, message) {
        if (!this.producer) {
            throw new Error('Producer not connected. Call connect() first.');
        }
        return this.producer.publish(routingKey, message);
    }
    async close() {
        if (this.producer) {
            await this.producer.close();
            this.producer = null;
        }
    }
}
exports.RabbitMQProducer = RabbitMQProducer;
class RabbitMQConsumer {
    constructor(config, options = {}) {
        this.consumer = null;
        this.config = config;
        this.options = options;
    }
    async connect() {
        if (!this.consumer) {
            this.consumer = await (0, consumer_1.createConsumer)(this.config, this.options);
        }
    }
    async subscribe(routingKey, handler) {
        if (!this.consumer) {
            throw new Error('Consumer not connected. Call connect() first.');
        }
        const subscription = await this.consumer.subscribe(routingKey, handler);
        return subscription.unsubscribe;
    }
    async close() {
        if (this.consumer) {
            await this.consumer.close();
            this.consumer = null;
        }
    }
}
exports.RabbitMQConsumer = RabbitMQConsumer;
// Singleton instance for sharing between microservices
class RabbitMQInstance {
    static initialize(config, options = {}) {
        this.config = config;
        this.options = options;
    }
    static async getProducer() {
        if (!this.config) {
            throw new Error('RabbitMQ not initialized. Call initialize() first.');
        }
        if (!this.producer) {
            this.producer = new RabbitMQProducer(this.config);
            await this.producer.connect();
        }
        return this.producer;
    }
    static async getConsumer() {
        if (!this.config) {
            throw new Error('RabbitMQ not initialized. Call initialize() first.');
        }
        if (!this.consumer) {
            this.consumer = new RabbitMQConsumer(this.config, this.options);
            await this.consumer.connect();
        }
        return this.consumer;
    }
    static async close() {
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
RabbitMQInstance.producer = null;
RabbitMQInstance.consumer = null;
RabbitMQInstance.config = null;
RabbitMQInstance.options = {};
// Export singleton instance
exports.rabbitMQ = RabbitMQInstance;
