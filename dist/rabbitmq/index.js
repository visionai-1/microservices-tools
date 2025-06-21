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
const producer_1 = require("./producer");
const consumer_1 = require("./consumer");
// Export types
__exportStar(require("./types"), exports);
__exportStar(require("./producer"), exports);
__exportStar(require("./consumer"), exports);
// Main RabbitMQ service for microservices - Singleton Pattern
class RabbitMQService {
    static initialize(config, options = {}) {
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
    static isConnected() {
        return this.producer !== null || this.consumer !== null;
    }
}
RabbitMQService.producer = null;
RabbitMQService.consumer = null;
RabbitMQService.config = null;
RabbitMQService.options = {};
RabbitMQService.isInitialized = false;
// Export the singleton instance as default export
exports.default = RabbitMQService;
