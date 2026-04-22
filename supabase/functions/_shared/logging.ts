/**
 * Structured logging utility for wallet payment operations
 * Provides consistent error tracking and debugging information
 */

interface LogContext {
  timestamp: string;
  [key: string]: any;
}

export const createLogContext = (operation: string, userId?: string): LogContext => ({
  timestamp: new Date().toISOString(),
  operation,
  ...(userId && { userId }),
});

export const logError = (context: string, error: unknown, details?: Record<string, any>) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    context,
    error: errorMessage,
    ...(error instanceof Error && { stack: error.stack }),
    ...details,
  };
  console.error(JSON.stringify(logEntry));
};

export const logWarning = (context: string, message: string, details?: Record<string, any>) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'WARNING',
    context,
    message,
    ...details,
  };
  console.warn(JSON.stringify(logEntry));
};

export const logInfo = (context: string, message: string, details?: Record<string, any>) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    context,
    message,
    ...details,
  };
  console.log(JSON.stringify(logEntry));
};

export const logPaymentEvent = (
  event: 'PAYMENT_INITIATED' | 'WEBHOOK_RECEIVED' | 'VERIFICATION_COMPLETED' | 'SETTLEMENT_PROCESSED',
  reference: string,
  details?: Record<string, any>
) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    event,
    reference,
    ...details,
  };
  console.log(JSON.stringify(logEntry));
};

export const logTransactionEvent = (
  transactionId: string,
  status: 'pending' | 'processing' | 'success' | 'failed' | 'reversed',
  provider: string,
  details?: Record<string, any>
) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    event: 'TRANSACTION_STATUS_CHANGED',
    transactionId,
    status,
    provider,
    ...details,
  };
  console.log(JSON.stringify(logEntry));
};
