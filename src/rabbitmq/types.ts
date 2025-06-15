export interface RabbitMQConfig {
  uri: string;
  exchange: string;
  exchangeType: 'topic' | 'direct' | 'fanout' | 'headers';
  queueName: string;
  prefetch?: number;
}

export interface EventMessage<T> {
  type: string;
  data: T;
  timestamp: number;
  metadata?: {
    publishedAt?: number;
    attempt?: number;
    [key: string]: any;
  };
}

export type EventHandler<T> = (message: EventMessage<T>) => Promise<void>;

export interface EventSubscription {
  unsubscribe: () => Promise<void>;
}

// Event types for different services
export enum EventType {
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