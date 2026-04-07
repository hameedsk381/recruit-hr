import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

// Define the transport for pretty logging in development
const transport = isDev ? pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  },
}) : undefined;

// Create the base logger
const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Redact sensitive fields from all logs automatically
  redact: {
    paths: ['email', 'password', 'phone', 'token', 'apiKey', 'authorization'],
    censor: '[REDACTED]'
  },
}, transport!);

export interface LogMeta {
  [key: string]: any;
}

/**
 * Enterprise Logger with Support for Traceability and Redaction
 */
export class AppLogger {
  constructor(
    public requestId: string = 'system',
    public context: string = 'App',
    public tenantId: string = 'system',
    public userId: string = 'system'
  ) { }

  private get childLogger() {
    return baseLogger.child({
      requestId: this.requestId,
      context: this.context,
      tenantId: this.tenantId,
      userId: this.userId
    });
  }

  info(message: string, meta?: LogMeta) {
    this.childLogger.info(meta || {}, message);
  }

  warn(message: string, meta?: LogMeta) {
    this.childLogger.warn(meta || {}, message);
  }

  error(message: string, error?: Error, meta?: LogMeta) {
    this.childLogger.error({
      ...meta,
      err: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    }, message);
  }

  debug(message: string, meta?: LogMeta) {
    this.childLogger.debug(meta || {}, message);
  }

  // Create a child logger with additional context
  child(context: string): AppLogger {
    return new AppLogger(this.requestId, context, this.tenantId, this.userId);
  }
}

// Global logger instance for system-level events
export const logger = new AppLogger();

export function createLogger(requestId?: string, context?: string, tenantId?: string, userId?: string): AppLogger {
  return new AppLogger(requestId, context, tenantId, userId);
}
