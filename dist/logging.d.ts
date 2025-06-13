import winston from 'winston';
export declare class Logging {
    /**
     * Generic log method
     */
    static log: (level: string, message: any, meta?: any) => void;
    /**
     * Info level logging - general information
     */
    static info: (message: any, meta?: any) => void;
    /**
     * Warning level logging - potential issues
     */
    static warn: (message: any, meta?: any) => void;
    /**
     * Error level logging - errors and exceptions
     */
    static error: (message: any, meta?: any) => void;
    /**
     * Debug level logging - detailed debugging information
     */
    static debug: (message: any, meta?: any) => void;
    /**
     * HTTP level logging - for API requests and responses
     */
    static http: (message: any, meta?: any) => void;
    /**
     * Verbose level logging - detailed operational information
     */
    static verbose: (message: any, meta?: any) => void;
    /**
     * Silly level logging - very detailed debugging
     */
    static silly: (message: any, meta?: any) => void;
    /**
     * Performance profiling
     */
    static profile: (id: string, meta?: any) => void;
    /**
     * Start a timer for performance measurement
     */
    static startTimer: () => winston.Profiler;
    /**
     * Log database operations
     */
    static database: (operation: string, details?: any) => void;
    /**
     * Log authentication events
     */
    static auth: (event: string, details?: any) => void;
    /**
     * Log email events
     */
    static email: (event: string, details?: any) => void;
    /**
     * Log API requests (middleware helper)
     */
    static request: (method: string, url: string, statusCode?: number, responseTime?: number, ip?: string) => void;
    /**
     * Get the underlying Winston logger instance
     */
    static getLogger: () => winston.Logger;
    /**
     * Startup and configuration logging
     */
    static startup: (message: string, meta?: any) => void;
    /**
     * Performance and metrics logging
     */
    static performance: (message: string, meta?: any) => void;
    /**
     * Security-related logging
     */
    static security: (message: string, meta?: any) => void;
    /**
     * API operation logging
     */
    static api: (message: string, meta?: any) => void;
    /**
     * Configuration logging
     */
    static config: (message: string, meta?: any) => void;
    /**
     * Shutdown logging
     */
    static shutdown: (message: string, meta?: any) => void;
    /**
     * Display a beautiful startup banner in terminal
     */
    static banner: (appName: string, version?: string, port?: number) => void;
    /**
     * Clear terminal and show fresh start
     */
    static clearAndStart: (message?: string) => void;
    /**
     * Log colorful separator for better readability
     */
    static separator: (label?: string) => void;
    /**
     * Force immediate console output (useful for debugging)
     */
    static forceOutput: (message: string, color?: "red" | "green" | "yellow" | "blue" | "magenta" | "cyan") => void;
}
