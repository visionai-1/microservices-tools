// logging.ts
import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Enhanced Winston Logger with Colors and Production-Ready Configuration
 * Based on Winston best practices: https://github.com/winstonjs/winston
 */

const { combine, timestamp, printf, errors, splat, json } = winston.format;

// ANSI color codes for direct terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

// Level to color mapping
const levelColors: { [key: string]: string } = {
  error: colors.red,
  warn: colors.yellow,
  info: colors.cyan,
  http: colors.magenta,
  verbose: colors.blue,
  debug: colors.green,
  silly: colors.white
};

// Custom format for console output with emojis and colors
const consoleFormat = printf(({ level, message, timestamp, stack, service, ...meta }) => {
  const emoji = getLogEmoji(level);
  const color = levelColors[level] || colors.white;
  const coloredLevel = `${color}${level.toUpperCase()}${colors.reset}`;
  const coloredTime = `${colors.gray}${timestamp}${colors.reset}`;
  
  // Clean up metadata - only show meaningful information
  const filteredMeta = { ...meta };
  
  // Remove default/common fields that clutter the output
  delete filteredMeta.environment;
  delete filteredMeta.service;
  delete filteredMeta.type;
  
  // Process metadata for display - prioritize important fields but show all meaningful data
  const displayMeta: any = {};
  
  // Add request ID first if present (prioritize it for visibility)
  if (filteredMeta.requestId) displayMeta.reqId = filteredMeta.requestId;
  
  // Add other essential fields
  if (filteredMeta.error) displayMeta.error = filteredMeta.error;
  if (filteredMeta.userId) displayMeta.userId = filteredMeta.userId;
  if (filteredMeta.ip) displayMeta.ip = filteredMeta.ip;
  if (filteredMeta.method && filteredMeta.url) {
    displayMeta.request = `${filteredMeta.method} ${filteredMeta.url}`;
  }
  if (filteredMeta.statusCode) displayMeta.status = filteredMeta.statusCode;
  if (filteredMeta.duration || filteredMeta.responseTime) {
    displayMeta.time = filteredMeta.duration || filteredMeta.responseTime;
  }
  
  // Add any remaining metadata that users explicitly passed
  const remainingMeta = { ...filteredMeta };
  delete remainingMeta.requestId;
  delete remainingMeta.error;
  delete remainingMeta.userId;
  delete remainingMeta.ip;
  delete remainingMeta.method;
  delete remainingMeta.url;
  delete remainingMeta.statusCode;
  delete remainingMeta.duration;
  delete remainingMeta.responseTime;
  delete remainingMeta.stack; // Stack is handled separately
  
  // Merge remaining metadata
  Object.assign(displayMeta, remainingMeta);
  
  // Show metadata only if there's something meaningful to show
  const metaStr = Object.keys(displayMeta).length > 0 ? 
    ` ${colors.gray}[${Object.entries(displayMeta).map(([k, v]) => {
      // Handle objects and arrays by stringifying them
      const displayValue = typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
      return `${k}: ${displayValue}`;
    }).join(', ')}]${colors.reset}` : '';
  
  // Use stack trace if available, otherwise use message
  // If both stack and message exist, prefer stack for errors
  const messageContent = (stack && (level === 'error' || level === 'warn')) ? stack : (stack || message);
  const coloredMessage = `${color}${messageContent}${colors.reset}`;
  
  return `${emoji} ${coloredTime} ${coloredLevel}: ${coloredMessage}${metaStr}`;
});

// Custom format for file output (structured JSON)
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  splat(),
  json()
);

// Get emoji for log level with enhanced visual mapping
function getLogEmoji(level: string): string {
  const emojis: { [key: string]: string } = {
    error: '🚨',      // Red siren for errors
    warn: '⚠️',       // Warning sign
    info: '💡',       // Light bulb for information
    http: '🌐',       // Globe for HTTP requests
    verbose: '📝',    // Memo for verbose logs
    debug: '🔍',      // Magnifying glass for debugging
    silly: '🎭',      // Theater masks for silly
    
    // Special category emojis
    auth: '🔐',       // Lock for authentication
    database: '🗄️',   // File cabinet for database
    email: '📧',      // Email for email operations
    performance: '⚡', // Lightning for performance
    security: '🛡️',   // Shield for security
    api: '🔌',        // Plug for API calls
    config: '⚙️',     // Gear for configuration
    startup: '🚀',    // Rocket for startup
    shutdown: '🛑'    // Stop sign for shutdown
  };
  return emojis[level] || '📌';
}

// Create logger with environment-specific configuration
const createLogger = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'development';
  // If NODE_ENV is not set, default to development behavior for better terminal display
  const isDefaultEnv = !process.env.NODE_ENV;

  const transports: winston.transport[] = [];

  // Console transport - ALWAYS enabled for terminal display
  // Enhanced for better visibility in terminal
  if (!isProduction || isDefaultEnv) {
    transports.push(
      new winston.transports.Console({
        level: 'debug',
        handleExceptions: true,
        handleRejections: true,
        stderrLevels: ['error'],
        format: combine(
          timestamp({ format: 'HH:mm:ss' }),
          errors({ stack: true }),
          splat(),
          consoleFormat
        ),
      })
    );
  } else {
    // Production console transport (structured but still visible)
    transports.push(
      new winston.transports.Console({
        level: 'info',
        handleExceptions: true,
        handleRejections: true,
        format: combine(
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          errors({ stack: true }),
          printf(({ level, message, timestamp, stack, ...meta }) => {
            const emoji = getLogEmoji(level);
            // Clean up metadata for production - remove clutter but keep all user-provided info
            const cleanMeta = { ...meta };
            delete cleanMeta.environment;
            delete cleanMeta.service;
            delete cleanMeta.type;
            
            const metaStr = Object.keys(cleanMeta).length ? ` ${JSON.stringify(cleanMeta)}` : '';
            // Prefer stack trace for errors in production as well
            const messageContent = (stack && (level === 'error' || level === 'warn')) ? stack : (stack || message);
            return `${emoji} [${timestamp}] ${level.toUpperCase()}: ${messageContent}${metaStr}`;
          })
        ),
      })
    );
  }

  // File transports for persistent logging (only in dev/prod environments)
  if (isDevelopment || isProduction) {
    // Error logs file
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 10,
      })
    );

    // Combined logs file
    transports.push(
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 10,
      })
    );

    // HTTP logs file for API requests
    transports.push(
      new winston.transports.File({
        filename: 'logs/http.log',
        level: 'http',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  }

  return winston.createLogger({
    level: isProduction ? 'info' : 'debug',
    defaultMeta: { 
      service: 'node-typescript-boilerplate',
      environment: process.env.NODE_ENV || 'development'
    },
    transports,
    // Handle exceptions and rejections
    exceptionHandlers: isProduction ? [
      new winston.transports.File({ filename: 'logs/exceptions.log' })
    ] : [],
    rejectionHandlers: isProduction ? [
      new winston.transports.File({ filename: 'logs/rejections.log' })
    ] : [],
    exitOnError: false, // Don't exit on handled exceptions
  });
};

const logger = createLogger();

// Request context storage for thread-safe request ID management
const requestContext = new AsyncLocalStorage<{ requestId?: string }>();

/**
 * Helper function to get current request ID from context
 */
function getCurrentRequestId(): string | undefined {
  const context = requestContext.getStore();
  return context?.requestId;
}

/**
 * Helper function to process message input (handles Error objects, extracts stack traces)
 */
function processMessage(message: any): { message: string; stack?: string } {
  if (message instanceof Error) {
    return {
      message: message.message,
      stack: message.stack
    };
  } else if (typeof message === 'string') {
    return { message };
  } else {
    return { message: JSON.stringify(message) };
  }
}

/**
 * Helper function to process metadata (merges request ID from context)
 */
function processMetadata(meta?: any): any {
  const currentRequestId = getCurrentRequestId();
  const baseMeta = meta || {};
  
  // If there's a current request ID and it's not already in meta, add it
  if (currentRequestId && !baseMeta.requestId) {
    return { requestId: currentRequestId, ...baseMeta };
  }
  
  return baseMeta;
}

// Enhanced Logging class with more methods and better error handling
export class Logging {
  /**
   * Set request ID context for all subsequent logs in this async context
   */
  public static setRequestContext = (requestId: string, callback: () => void | Promise<void>) => {
    return requestContext.run({ requestId }, callback);
  };

  /**
   * Set request ID for current context (useful for middleware)
   */
  public static setRequestId = (requestId: string) => {
    const store = requestContext.getStore();
    if (store) {
      store.requestId = requestId;
    }
  };

  /**
   * Get current request ID from context
   */
  public static getCurrentRequestId = () => {
    return getCurrentRequestId();
  };

  /**
   * Generic log method
   */
  public static log = (level: string, message: any, meta?: any) => {
    const { message: processedMessage, stack } = processMessage(message);
    const processedMeta = processMetadata(meta);
    
    if (stack) {
      processedMeta.stack = stack;
    }
    
    logger.log(level, processedMessage, processedMeta);
  };

  /**
   * Info level logging - general information
   */
  public static info = (message: any, meta?: any) => {
    const { message: processedMessage, stack } = processMessage(message);
    const processedMeta = processMetadata(meta);
    
    if (stack) {
      processedMeta.stack = stack;
    }
    
    logger.info(processedMessage, processedMeta);
  };

  /**
   * Warning level logging - potential issues
   */
  public static warn = (message: any, meta?: any) => {
    const { message: processedMessage, stack } = processMessage(message);
    const processedMeta = processMetadata(meta);
    
    if (stack) {
      processedMeta.stack = stack;
    }
    
    logger.warn(processedMessage, processedMeta);
  };

  /**
   * Error level logging - errors and exceptions
   */
  public static error = (message: any, meta?: any) => {
    const { message: processedMessage, stack } = processMessage(message);
    const processedMeta = processMetadata(meta);
    
    if (stack) {
      processedMeta.stack = stack;
    }
    
    logger.error(processedMessage, processedMeta);
  };

  /**
   * Debug level logging - detailed debugging information
   */
  public static debug = (message: any, meta?: any) => {
    const { message: processedMessage, stack } = processMessage(message);
    const processedMeta = processMetadata(meta);
    
    if (stack) {
      processedMeta.stack = stack;
    }
    
    logger.debug(processedMessage, processedMeta);
  };

  /**
   * HTTP level logging - for API requests and responses
   */
  public static http = (message: any, meta?: any) => {
    const { message: processedMessage, stack } = processMessage(message);
    const processedMeta = processMetadata(meta);
    
    if (stack) {
      processedMeta.stack = stack;
    }
    
    logger.http(processedMessage, processedMeta);
  };

  /**
   * Verbose level logging - detailed operational information
   */
  public static verbose = (message: any, meta?: any) => {
    const { message: processedMessage, stack } = processMessage(message);
    const processedMeta = processMetadata(meta);
    
    if (stack) {
      processedMeta.stack = stack;
    }
    
    logger.verbose(processedMessage, processedMeta);
  };

  /**
   * Silly level logging - very detailed debugging
   */
  public static silly = (message: any, meta?: any) => {
    const { message: processedMessage, stack } = processMessage(message);
    const processedMeta = processMetadata(meta);
    
    if (stack) {
      processedMeta.stack = stack;
    }
    
    logger.silly(processedMessage, processedMeta);
  };

  /**
   * Performance profiling
   */
  public static profile = (id: string, meta?: any) => {
    const processedMeta = processMetadata(meta);
    logger.profile(id, processedMeta);
  };

  /**
   * Start a timer for performance measurement
   */
  public static startTimer = () => {
    return logger.startTimer();
  };

  /**
   * Log database operations
   */
  public static database = (operation: string | Error, details?: any) => {
    const { message: processedMessage, stack } = processMessage(
      typeof operation === 'string' ? `🗄️ Database: ${operation}` : operation
    );
    const processedMeta = processMetadata({ 
      type: 'database',
      operation: typeof operation === 'string' ? operation : 'error',
      ...(stack && { stack }),
      ...details 
    });
    
    logger.info(processedMessage, processedMeta);
  };

  /**
   * Log authentication events
   */
  public static auth = (event: string | Error, details?: any) => {
    const { message: processedMessage, stack } = processMessage(
      typeof event === 'string' ? `🔐 Auth: ${event}` : event
    );
    const processedMeta = processMetadata({ 
      type: 'authentication',
      event: typeof event === 'string' ? event : 'error',
      ...(stack && { stack }),
      ...details 
    });
    
    logger.info(processedMessage, processedMeta);
  };

  /**
   * Log email events
   */
  public static email = (event: string | Error, details?: any) => {
    const { message: processedMessage, stack } = processMessage(
      typeof event === 'string' ? `📧 Email: ${event}` : event
    );
    const processedMeta = processMetadata({ 
      type: 'email',
      event: typeof event === 'string' ? event : 'error',
      ...(stack && { stack }),
      ...details 
    });
    
    logger.info(processedMessage, processedMeta);
  };

  /**
   * Log API requests (middleware helper)
   */
  public static request = (method: string, url: string, statusCode?: number, responseTime?: number, ip?: string) => {
    const level = statusCode && statusCode >= 400 ? 'warn' : 'http';
    const processedMeta = processMetadata({
      type: 'request',
      method,
      url,
      statusCode,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
      ip
    });
    
    logger.log(level, `${method} ${url}`, processedMeta);
  };

  /**
   * Log with request ID context
   */
  public static withRequestId = (requestId: string, level: string, message: any, meta?: any) => {
    const { message: processedMessage, stack } = processMessage(message);
    const processedMeta = processMetadata({ requestId, ...meta });
    
    if (stack) {
      processedMeta.stack = stack;
    }
    
    logger.log(level, processedMessage, processedMeta);
  };

  /**
   * Get the underlying Winston logger instance
   */
  public static getLogger = () => logger;

  /**
   * Startup and configuration logging
   */
  public static startup = (message: string | Error, meta?: any) => {
    const { message: processedMessage, stack } = processMessage(
      typeof message === 'string' ? `🚀 Startup: ${message}` : message
    );
    const processedMeta = processMetadata({ 
      type: 'startup',
      ...(stack && { stack }),
      ...meta 
    });
    
    logger.info(processedMessage, processedMeta);
  };

  /**
   * Performance and metrics logging  
   */
  public static performance = (message: string | Error, meta?: any) => {
    const { message: processedMessage, stack } = processMessage(
      typeof message === 'string' ? `⚡ Performance: ${message}` : message
    );
    const processedMeta = processMetadata({ 
      type: 'performance',
      ...(stack && { stack }),
      ...meta 
    });
    
    logger.info(processedMessage, processedMeta);
  };

  /**
   * Security-related logging
   */
  public static security = (message: string | Error, meta?: any) => {
    const { message: processedMessage, stack } = processMessage(
      typeof message === 'string' ? `🛡️ Security: ${message}` : message
    );
    const processedMeta = processMetadata({ 
      type: 'security',
      ...(stack && { stack }),
      ...meta 
    });
    
    logger.warn(processedMessage, processedMeta);
  };

  /**
   * API operation logging
   */
  public static api = (message: string | Error, meta?: any) => {
    const { message: processedMessage, stack } = processMessage(
      typeof message === 'string' ? `🔌 API: ${message}` : message
    );
    const processedMeta = processMetadata({ 
      type: 'api',
      ...(stack && { stack }),
      ...meta 
    });
    
    logger.info(processedMessage, processedMeta);
  };

  /**
   * Configuration logging
   */
  public static config = (message: string | Error, meta?: any) => {
    const { message: processedMessage, stack } = processMessage(
      typeof message === 'string' ? `⚙️ Config: ${message}` : message
    );
    const processedMeta = processMetadata({ 
      type: 'config',
      ...(stack && { stack }),
      ...meta 
    });
    
    logger.info(processedMessage, processedMeta);
  };

  /**
   * Shutdown logging
   */
  public static shutdown = (message: string | Error, meta?: any) => {
    const { message: processedMessage, stack } = processMessage(
      typeof message === 'string' ? `🛑 Shutdown: ${message}` : message
    );
    const processedMeta = processMetadata({ 
      type: 'shutdown',
      ...(stack && { stack }),
      ...meta 
    });
    
    logger.info(processedMessage, processedMeta);
  };

  /**
   * Display a beautiful startup banner in terminal
   */
  public static banner = (appName: string, version?: string, port?: number) => {
    const banner = [
      '',
      '╔══════════════════════════════════════════════════════════════╗',
      '║                                                              ║',
      `║  🚀 ${appName.padEnd(50)} 🚀  ║`,
      version ? `║     Version: ${version.padEnd(43)} ║` : '',
      port ? `║     Port: ${port.toString().padEnd(46)} ║` : '',
      '║                                                              ║',
      '║  Ready to handle requests! 💪                                ║',
      '║                                                              ║',
      '╚══════════════════════════════════════════════════════════════╝',
      ''
    ].filter(line => line !== '');

    // Log each line of the banner with cyan color
    banner.forEach(line => {
      console.log(`${colors.cyan}${line}${colors.reset}`);
    });

    // Also log to file if configured
    this.startup(`Application started: ${appName}`, { version, port });
  };

  /**
   * Clear terminal and show fresh start
   */
  public static clearAndStart = (message?: string) => {
    // Clear terminal
    console.clear();
    
    // Show fresh start message
    console.log(`${colors.green}🔄 Starting fresh...${colors.reset}\n`);
    
    if (message) {
      this.info(message);
    }
  };

  /**
   * Log colorful separator for better readability
   */
  public static separator = (label?: string) => {
    const sep = '═'.repeat(60);
    const message = label ? `═══ ${label} ═══` : sep;
    console.log(`${colors.gray}${message}${colors.reset}`);
  };

  /**
   * Force immediate console output (useful for debugging)
   */
  public static forceOutput = (message: string | Error, color: 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' = 'cyan') => {
    const { message: processedMessage } = processMessage(message);
    const colorCode = colors[color] || colors.cyan;
    console.log(`${colorCode}${processedMessage}${colors.reset}`);
    
    // Also log normally
    this.info(message);
  };
}
